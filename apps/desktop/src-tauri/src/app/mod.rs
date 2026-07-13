mod commands;
pub mod tray;
pub mod window;

use crate::environment::db;
use crate::features::autostart;
use crate::features::{
    activity_window,
    activity_window::types::CurrentActivityEvent,
    app as app_feature, audio, blocking,
    blocking::types::BlockingViolationEvent,
    focus_profile::{self, types::ProfileChangedEvent},
    input::{self, types::InputDetectedEvent},
    permission,
    session::{
        self,
        types::{SessionChangedEvent, SessionCompletedEvent},
    },
    settings::{
        self,
        types::{AppSettingsChangedEvent, AppSettingsState},
    },
    timer::{self, types::TimerUpdatedEvent},
    updater,
    updater::types::UpdateAvailableEvent,
};
use specta_typescript::Typescript;
use tauri::Manager;
use tauri_plugin_autostart::MacosLauncher;
use tauri_specta::{collect_commands, collect_events, Builder};

pub fn run() {
    let builder = Builder::<tauri::Wry>::new()
        .commands(collect_commands![
            // App commands
            commands::get_app_info,
            // Window commands
            commands::show_main_window,
            commands::show_main_window_at_path,
            commands::show_cat_window,
            commands::show_settings_window,
            commands::show_settings_window_at_path,
            commands::show_activity_window,
            commands::show_activity_window_at_session,
            commands::hide_main_window,
            commands::navigate_main_window_to_path,
            commands::hide_cat_window,
            commands::hide_settings_window,
            commands::navigate_settings_window_to_path,
            commands::restart_app,
            commands::quit_app,
            // Updater commands
            updater::commands::install_update,
            // Settings commands
            settings::commands::get_settings,
            settings::commands::set_settings,
            settings::commands::clear_history,
            settings::commands::reset_settings,
            settings::commands::get_data_directory_path,
            settings::commands::open_data_directory,
            // Timer commands
            timer::commands::get_timer,
            timer::commands::start_timer,
            timer::commands::pause_timer,
            timer::commands::resume_timer,
            timer::commands::reset_timer,
            timer::commands::advance_pomodoro_timer,
            timer::commands::advance_progressive_timer,
            timer::commands::complete_timer,
            timer::commands::set_timer_duration,
            // Activity window commands
            activity_window::commands::get_current_activity,
            activity_window::commands::get_window_activities,
            // Session commands
            session::commands::get_today_focus_seconds,
            session::commands::get_sessions,
            session::commands::get_most_recent_session_id,
            session::commands::get_session,
            session::commands::get_last_work_session,
            // Permission commands
            permission::commands::is_accessibility_granted,
            permission::commands::open_accessibility_settings,
            permission::commands::is_input_monitoring_granted,
            permission::commands::open_input_monitoring_settings,
            // App search commands
            app_feature::commands::search,
            app_feature::commands::refresh_search_cache,
            // Audio commands
            audio::commands::play_sound,
            // Focus profile commands
            focus_profile::commands::get_focus_profiles,
            focus_profile::commands::get_focus_profile,
            focus_profile::commands::create_focus_profile,
            focus_profile::commands::update_focus_profile,
            focus_profile::commands::delete_focus_profile,
            focus_profile::commands::get_session_profiles,
            focus_profile::commands::get_active_focus_profiles,
            // Blocking commands
            blocking::commands::get_blocking_violation,
        ])
        .events(collect_events![
            // Settings events
            AppSettingsChangedEvent,
            // Timer events
            TimerUpdatedEvent,
            // Session events
            SessionCompletedEvent,
            SessionChangedEvent,
            // Focus profile events
            ProfileChangedEvent,
            // Blocking events
            BlockingViolationEvent,
            // Input events
            InputDetectedEvent,
            // Activity window
            CurrentActivityEvent,
            // Updater
            UpdateAvailableEvent,
        ]);

    #[cfg(debug_assertions)]
    if let Err(e) = builder.export(
        Typescript::default(),
        "../src/environment/specta/bindings.gen.ts",
    ) {
        eprintln!("Skipping TypeScript bindings export: {}", e);
    }

    let tauri_builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ));
    #[cfg(all(desktop, not(feature = "app-store"), not(debug_assertions)))]
    let tauri_builder = tauri_builder.plugin(tauri_plugin_updater::Builder::new().build());

    tauri_builder
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            // https://docs.rs/tauri-specta/2.0.0-rc.21/tauri_specta/index.html
            builder.mount_events(app);

            // Setup modules
            db::setup(app);
            audio::setup(app);
            session::setup(app);
            settings::setup(app);
            timer::setup(app);
            input::setup(app);
            focus_profile::setup(app);
            blocking::setup(app);
            activity_window::setup(app);
            app_feature::setup(app);
            #[cfg(target_os = "macos")]
            tray::setup(app);
            #[cfg(all(desktop, not(feature = "app-store"), not(debug_assertions)))]
            updater::setup(app.handle());

            // Apply autostart settings on startup
            if let Some(state) = app.try_state::<AppSettingsState>() {
                let enabled = state.lock().unwrap().launch_at_login;
                autostart::apply(app.handle(), enabled);
            }

            // Show main window on startup
            let _ = window::Window::Main.show(app.handle());

            return Ok(());
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                window::Window::handle_close(window.label(), window, api);
            }
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                session::exit(app_handle);
            }
        });
}
