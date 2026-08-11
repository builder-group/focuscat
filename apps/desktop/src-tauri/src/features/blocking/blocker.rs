use super::{
    config::BlockingConfig,
    types::{BlockingViolationDto, BlockingViolationEvent},
};
use crate::{
    app::window::Window,
    common::url::extract_domain,
    environment::logger::log_info,
    features::{
        focus_profile::{
            resolution::{
                is_blocked, resolve_category_for_app, resolve_category_for_website,
                ResolutionProfile,
            },
            types::FocusProfileState,
        },
        settings::types::{AppSettingsState, BlockThreshold},
        timer::types::TimerState,
    },
};
use tauri::{AppHandle, Manager};
use tauri_specta::Event;

pub struct Blocker {
    app: AppHandle,
    active_violation: Option<BlockingViolation>,
}

impl Blocker {
    pub fn new(app: AppHandle) -> Self {
        return Self {
            app,
            active_violation: None,
        };
    }

    fn is_developer_enabled(&self) -> bool {
        self.app
            .try_state::<AppSettingsState>()
            .map(|state| state.lock().unwrap().features.developer)
            .unwrap_or(false)
    }

    fn get_threshold(&self) -> BlockThreshold {
        if let Some(state) = self.app.try_state::<TimerState>() {
            if let Some(block_threshold) = state
                .lock()
                .unwrap()
                .session
                .as_ref()
                .and_then(|session| session.block_threshold)
            {
                return block_threshold;
            }
        }

        self.app
            .try_state::<AppSettingsState>()
            .map(|state| state.lock().unwrap().focus.block_threshold)
            .unwrap_or(BlockThreshold::Distracting)
    }

    fn get_active_profiles(&self) -> Vec<ResolutionProfile> {
        self.app
            .try_state::<FocusProfileState>()
            .map(|s| s.lock().unwrap().active_profiles.clone())
            .unwrap_or_default()
    }

    /// Handle an app switch. Checks if the app is blocked and updates the overlay.
    pub fn handle_app_activated(&mut self, pid: i32, bundle_id: Option<&str>) {
        if Self::is_own_app(pid, bundle_id) {
            return;
        }

        let profiles = self.get_active_profiles();
        let violation = self.check_app(bundle_id, &profiles);

        if self.is_developer_enabled() {
            log_info!(
                "Blocker",
                "App Activated: bundle_id={:?} violation={:?}",
                bundle_id,
                violation
                    .as_ref()
                    .map(|v| format!("{:?}", v.blocked_target))
            );
        }

        if violation.is_none() {
            let _ = Window::Blocker.hide(&self.app);
        } else {
            let _ = Window::Blocker.show(&self.app);
        }

        self.set_violation(violation);
    }

    /// Handle a window focus change. Checks app + browser URL and positions the overlay.
    pub fn handle_window_changed(
        &mut self,
        pid: i32,
        bundle_id: Option<&str>,
        browser_url: Option<&str>,
        bounds: Option<(f64, f64, f64, f64)>,
    ) {
        if Self::is_own_app(pid, bundle_id) {
            return;
        }

        let profiles = self.get_active_profiles();
        let violation = self.check_window(bundle_id, browser_url, &profiles);

        if self.is_developer_enabled() {
            log_info!(
                "Blocker",
                "Window Changed: bundle_id={:?} browser_url={:?} violation={:?}",
                bundle_id,
                browser_url,
                violation
                    .as_ref()
                    .map(|v| format!("{:?}", v.blocked_target))
            );
        }

        if violation.is_some() {
            if let Some((x, y, w, h)) = bounds {
                let _ = Window::Blocker.show_at_bounds(&self.app, x, y, w, h);
            }
        } else {
            let _ = Window::Blocker.hide(&self.app);
        }

        self.set_violation(violation);
    }

    pub fn active_violation(&self) -> Option<BlockingViolation> {
        return self.active_violation.clone();
    }

    fn set_violation(&mut self, violation: Option<BlockingViolation>) {
        // Skip when unchanged so we don't re-emit.
        // Handlers still run overlay show/hide, so e.g. user focuses our app then back to blocked tab
        // → we re-show overlay; only state/emit skipped here.
        if violation == self.active_violation {
            return;
        }

        self.active_violation = violation.clone();
        let dto = violation.map(BlockingViolationDto::from);
        let _ = BlockingViolationEvent(dto).emit(&self.app);
    }

    /// Check if the given app belongs to our own app (never block ourselves).
    fn is_own_app(pid: i32, bundle_id: Option<&str>) -> bool {
        if let Some(bid) = bundle_id {
            if BlockingConfig::own_bundle_ids().contains(&bid) {
                return true;
            }
        }
        // Dev builds may not have a bundle ID, so fall back to the current process ID
        if pid == std::process::id() as i32 {
            return true;
        }
        return false;
    }

    /// Check if an app is blocked.
    fn check_app(
        &self,
        bundle_id: Option<&str>,
        profiles: &[ResolutionProfile],
    ) -> Option<BlockingViolation> {
        let bid = bundle_id?;
        let threshold = self.get_threshold();
        let (category, profile) = resolve_category_for_app(bid, profiles);
        if is_blocked(&category, &threshold) {
            return Some(BlockingViolation {
                profile_id: profile.map(|p| p.profile_id),
                profile_name: profile.map(|p| p.profile_name.clone()),
                profile_color: profile.and_then(|p| p.profile_color.clone()),
                blocked_target: BlockedTarget::App {
                    bundle_id: bid.to_string(),
                },
            });
        }
        return None;
    }

    /// Check if a website is blocked.
    fn check_website(
        &self,
        domain: &str,
        profiles: &[ResolutionProfile],
    ) -> Option<BlockingViolation> {
        let threshold = self.get_threshold();
        let (category, profile) = resolve_category_for_website(domain, profiles);
        if is_blocked(&category, &threshold) {
            return Some(BlockingViolation {
                profile_id: profile.map(|p| p.profile_id),
                profile_name: profile.map(|p| p.profile_name.clone()),
                profile_color: profile.and_then(|p| p.profile_color.clone()),
                blocked_target: BlockedTarget::Website {
                    domain: domain.to_string(),
                },
            });
        }
        return None;
    }

    /// Check if a window is blocked (app + browser URL).
    fn check_window(
        &self,
        bundle_id: Option<&str>,
        browser_url: Option<&str>,
        profiles: &[ResolutionProfile],
    ) -> Option<BlockingViolation> {
        // App blocked -> everything inside it is blocked
        if let Some(violation) = self.check_app(bundle_id, profiles) {
            return Some(violation);
        }
        // App not blocked -> check browser URL
        if let Some(url) = browser_url {
            if let Some(domain) = extract_domain(url) {
                return self.check_website(&domain, profiles);
            }
        }
        return None;
    }
}

/// Violation reported when a blocked app or website is detected.
#[derive(Debug, Clone, PartialEq)]
pub struct BlockingViolation {
    pub profile_id: Option<i64>,
    pub profile_name: Option<String>,
    pub profile_color: Option<String>,
    pub blocked_target: BlockedTarget,
}

/// What was blocked: app (by bundle ID) or website (by domain).
#[derive(Debug, Clone, PartialEq)]
pub enum BlockedTarget {
    App { bundle_id: String },
    Website { domain: String },
}
