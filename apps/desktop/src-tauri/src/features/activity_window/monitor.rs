use super::repository::{
    AppActivityRepository, InsertAppActivityInput, InsertWindowActivityInput,
    WindowActivityRepository,
};
use super::types::{CurrentActivityDto, CurrentActivityEvent};
use crate::common::url::extract_domain;
use crate::environment::db::DatabaseState;
use crate::environment::logger::{log_error, log_info, log_warn};
use crate::features::app::repository::{
    AppRepository, UpsertAppInput, UpsertWebsiteInput, WebsiteRepository,
};
use crate::features::blocking::types::BlockerState;
use crate::features::focus_profile::{
    resolution::{resolve_category_for_app, resolve_category_for_website},
    types::{FocusCategory, FocusProfileState},
};
use crate::features::settings::types::AppSettingsState;
use chrono::Utc;
use mado::{MonitorConfig, WindowEvent, WindowListener, WindowMonitor as MadoWindowMonitor};
use std::sync::Arc;
use tauri::{AppHandle, Manager};
use tauri_specta::Event;
use tokio::sync::Mutex as TokioMutex;

// MARK: - Start Monitoring

pub fn start_monitoring(app: AppHandle) {
    let handler = WindowMonitor::new(app.clone());
    let monitor = MadoWindowMonitor::with_config(
        handler,
        MonitorConfig {
            include_app_icon: true,
            include_app_color: true,
            include_browser_info: !cfg!(feature = "app-store"),
            include_website_info: false, // We only need the domain (not favicon/color) at this point, so we extract it ourselves to avoid overhead (like fetching the favicon)
            track_window_changes: !cfg!(feature = "app-store"),
            track_window_bounds_changes: false,
        },
    );

    std::thread::spawn(move || {
        log_info!("Window Monitor", "Started");

        match monitor.run() {
            Ok(()) => log_warn!("Window Monitor", "Monitor exited unexpectedly"),
            Err(e) => log_error!("Window Monitor", "Monitor failed: {}", e),
        }
    });
}

// MARK: - Window Monitor

struct WindowMonitor {
    app: AppHandle,
    active_app: Arc<TokioMutex<Option<ActiveApp>>>,
    active_window: Arc<TokioMutex<Option<ActiveWindow>>>,
}

impl WindowMonitor {
    fn new(app: AppHandle) -> Self {
        return Self {
            app,
            active_app: Arc::new(TokioMutex::new(None)),
            active_window: Arc::new(TokioMutex::new(None)),
        };
    }

    fn can_track_windows() -> bool {
        return !cfg!(feature = "app-store") && mado::is_accessibility_trusted();
    }

    fn is_app_tracking_enabled(&self) -> bool {
        self.app
            .try_state::<AppSettingsState>()
            .map(|state| {
                let settings = state.lock().unwrap();
                settings.features.activity && settings.activity.track_apps
            })
            .unwrap_or(false)
    }

    fn is_window_tracking_enabled(&self) -> bool {
        self.app
            .try_state::<AppSettingsState>()
            .map(|state| {
                let settings = state.lock().unwrap();
                settings.features.activity
                    && settings.activity.track_apps
                    && settings.activity.track_windows
            })
            .unwrap_or(false)
    }

    fn is_browser_tracking_enabled(&self) -> bool {
        self.app
            .try_state::<AppSettingsState>()
            .map(|state| {
                let settings = state.lock().unwrap();
                settings.features.activity
                    && settings.activity.track_apps
                    && settings.activity.track_windows
                    && settings.activity.track_browser
            })
            .unwrap_or(false)
    }

    fn is_developer_enabled(&self) -> bool {
        self.app
            .try_state::<AppSettingsState>()
            .map(|state| state.lock().unwrap().features.developer)
            .unwrap_or(false)
    }
}

impl WindowListener for WindowMonitor {
    fn on_focus_change(&self, event: WindowEvent) {
        match event {
            WindowEvent::AppActivated { app: app_info } => {
                // Only drive blocker from AppActivated when we can't track windows.
                // Otherwise: AppActivated has no URL so blocker hides (app not blocked);
                // WindowChanged then shows again (has URL, e.g. instagram blocked) → flicker.
                if !Self::can_track_windows() {
                    if let Some(state) = self.app.try_state::<BlockerState>() {
                        state
                            .lock()
                            .unwrap()
                            .handle_app_activated(app_info.pid, app_info.bundle_id.as_deref());
                    }
                }

                if !self.is_app_tracking_enabled() {
                    return;
                }

                let active_app: Arc<TokioMutex<Option<ActiveApp>>> = Arc::clone(&self.active_app);

                if self.is_developer_enabled() {
                    log_info!("Window Monitor", "App Activated:\n{}", app_info);
                    let _ = CurrentActivityEvent(CurrentActivityDto::AppActivated {
                        app: app_info.clone(),
                    })
                    .emit(&self.app);
                }

                let app = self.app.clone();
                tauri::async_runtime::spawn(async move {
                    let mut active_app_guard = active_app.lock().await;
                    let now = Utc::now().timestamp_millis();

                    // Save previous active app if app changed
                    if let Some(prev) = active_app_guard.take() {
                        if prev.bundle_id != app_info.bundle_id {
                            if let Some(state) = app.try_state::<DatabaseState>() {
                                let category =
                                    app.try_state::<FocusProfileState>().and_then(|state| {
                                        let guard = state.lock().unwrap();
                                        if guard.active_profiles.is_empty() {
                                            return None;
                                        }
                                        let category = prev
                                            .bundle_id
                                            .as_deref()
                                            .map(|bid| {
                                                resolve_category_for_app(
                                                    bid,
                                                    &guard.active_profiles,
                                                )
                                                .0
                                            })
                                            .unwrap_or(FocusCategory::Neutral);
                                        Some(category.as_str().to_string())
                                    });

                                let _ = AppActivityRepository::insert(
                                    &state.pool,
                                    &InsertAppActivityInput {
                                        app_id: prev.app_id,
                                        started_at: prev.started_at,
                                        ended_at: now,
                                        category,
                                    },
                                )
                                .await;
                            }
                        } else {
                            // Same app reactivated, restore
                            *active_app_guard = Some(prev);
                            return;
                        }
                    }

                    // Upsert new app and start tracking
                    if let Some(state) = app.try_state::<DatabaseState>() {
                        if let Ok(app_id) = AppRepository::upsert(
                            &state.pool,
                            &UpsertAppInput {
                                bundle_id: app_info.bundle_id.clone(),
                                name: app_info.name,
                                process_path: app_info.process_path,
                                icon: app_info.icon.as_ref().and_then(|i| i.data_url.clone()),
                                color: app_info.icon.as_ref().and_then(|i| i.color.clone()),
                            },
                        )
                        .await
                        {
                            *active_app_guard = Some(ActiveApp {
                                app_id,
                                bundle_id: app_info.bundle_id,
                                started_at: now,
                            });
                        }
                    }
                });
            }
            WindowEvent::WindowChanged {
                window: window_info,
            } => {
                if let Some(state) = self.app.try_state::<BlockerState>() {
                    let browser_url = window_info.browser.as_ref().and_then(|b| b.url.as_deref());
                    let bounds = window_info
                        .bounds
                        .as_ref()
                        .map(|b| (b.x, b.y, b.width, b.height));
                    state.lock().unwrap().handle_window_changed(
                        window_info.app.pid,
                        window_info.app.bundle_id.as_deref(),
                        browser_url,
                        bounds,
                    );
                }

                if !self.is_window_tracking_enabled() {
                    return;
                }

                let active_window: Arc<TokioMutex<Option<ActiveWindow>>> =
                    Arc::clone(&self.active_window);
                let track_browser_urls = self.is_browser_tracking_enabled();

                if self.is_developer_enabled() {
                    log_info!("Window Monitor", "Window Changed:\n{}", window_info);
                    let _ = CurrentActivityEvent(CurrentActivityDto::WindowChanged {
                        window: window_info.clone(),
                    })
                    .emit(&self.app);
                }

                let app = self.app.clone();
                tauri::async_runtime::spawn(async move {
                    let mut active_window_guard = active_window.lock().await;
                    let now = Utc::now().timestamp_millis();

                    // Save previous active window if window changed
                    if let Some(prev) = active_window_guard.take() {
                        if prev.bundle_id != window_info.app.bundle_id
                            || prev.window_title != window_info.title
                        {
                            if let Some(state) = app.try_state::<DatabaseState>() {
                                let category =
                                    app.try_state::<FocusProfileState>().and_then(|state| {
                                        let guard = state.lock().unwrap();
                                        if guard.active_profiles.is_empty() {
                                            return None;
                                        }
                                        if let Some(ref url) = prev.browser_url {
                                            if let Some(domain) = extract_domain(url) {
                                                return Some(
                                                    resolve_category_for_website(
                                                        &domain,
                                                        &guard.active_profiles,
                                                    )
                                                    .0
                                                    .as_str()
                                                    .to_string(),
                                                );
                                            }
                                        }
                                        let category = prev
                                            .bundle_id
                                            .as_deref()
                                            .map(|bid| {
                                                resolve_category_for_app(
                                                    bid,
                                                    &guard.active_profiles,
                                                )
                                                .0
                                            })
                                            .unwrap_or(FocusCategory::Neutral);
                                        Some(category.as_str().to_string())
                                    });

                                let _ = WindowActivityRepository::insert(
                                    &state.pool,
                                    &InsertWindowActivityInput {
                                        app_id: prev.app_id,
                                        website_id: prev.website_id,
                                        window_title: prev.window_title,
                                        window_id: prev.window_id,
                                        window_x: prev.window_x,
                                        window_y: prev.window_y,
                                        window_width: prev.window_width,
                                        window_height: prev.window_height,
                                        browser_url: prev.browser_url,
                                        browser_is_private: prev.browser_is_private,
                                        started_at: prev.started_at,
                                        ended_at: now,
                                        category,
                                    },
                                )
                                .await;
                            }
                        } else {
                            // Same window, restore
                            *active_window_guard = Some(prev);
                            return;
                        }
                    }

                    // Extract browser info (only if tracking is enabled)
                    let (browser_url, browser_is_private) = if track_browser_urls {
                        window_info
                            .browser
                            .as_ref()
                            .map(|b| (b.url.clone(), b.is_private))
                            .unwrap_or((None, None))
                    } else {
                        (None, None)
                    };

                    // Extract bounds
                    let (window_x, window_y, window_width, window_height) = window_info
                        .bounds
                        .as_ref()
                        .map(|b| (Some(b.x), Some(b.y), Some(b.width), Some(b.height)))
                        .unwrap_or((None, None, None, None));

                    // Upsert new app and start tracking window
                    if let Some(state) = app.try_state::<DatabaseState>() {
                        if let Ok(app_id) = AppRepository::upsert(
                            &state.pool,
                            &UpsertAppInput {
                                bundle_id: window_info.app.bundle_id.clone(),
                                name: window_info.app.name,
                                process_path: window_info.app.process_path,
                                icon: window_info
                                    .app
                                    .icon
                                    .as_ref()
                                    .and_then(|i| i.data_url.clone()),
                                color: window_info.app.icon.as_ref().and_then(|i| i.color.clone()),
                            },
                        )
                        .await
                        {
                            // Extract website_id for browser activities
                            let website_id = if let Some(ref url) = browser_url {
                                if let Some(domain) = extract_domain(url) {
                                    WebsiteRepository::upsert(
                                        &state.pool,
                                        &UpsertWebsiteInput {
                                            domain,
                                            name: None,
                                            icon: None,
                                            color: None,
                                        },
                                    )
                                    .await
                                    .ok()
                                } else {
                                    None
                                }
                            } else {
                                None
                            };

                            *active_window_guard = Some(ActiveWindow {
                                app_id,
                                website_id,
                                bundle_id: window_info.app.bundle_id,
                                window_title: window_info.title,
                                window_id: window_info.window_id,
                                window_x,
                                window_y,
                                window_width,
                                window_height,
                                browser_url,
                                browser_is_private,
                                started_at: now,
                            });
                        }
                    }
                });
            }
            WindowEvent::AppTerminated { .. }
            | WindowEvent::WindowBoundsChanged { .. }
            | WindowEvent::WindowMinimized { .. }
            | WindowEvent::WindowRestored { .. }
            | WindowEvent::WindowDestroyed { .. } => {}
        }
    }
}

/// Tracks currently active app (in-memory, pending write to DB on change).
pub struct ActiveApp {
    pub app_id: i64,
    pub bundle_id: Option<String>,
    pub started_at: i64,
}

/// Tracks currently active window (in-memory, pending write to DB on change).
pub struct ActiveWindow {
    pub app_id: i64,
    pub website_id: Option<i64>,
    pub bundle_id: Option<String>,
    // Window fields
    pub window_title: Option<String>,
    pub window_id: Option<u32>,
    pub window_x: Option<f64>,
    pub window_y: Option<f64>,
    pub window_width: Option<f64>,
    pub window_height: Option<f64>,
    // Browser fields
    pub browser_url: Option<String>,
    pub browser_is_private: Option<bool>,
    // Timestamps
    pub started_at: i64,
}
