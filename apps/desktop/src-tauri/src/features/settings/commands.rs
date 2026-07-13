use super::{
    persistence,
    types::{AppSettings, AppSettingsChangedEvent, AppSettingsState},
};
use crate::features::autostart;
use crate::{
    common::path::get_app_data_dir,
    environment::db::DatabaseState,
    features::timer::{
        timer::TimerStatus,
        types::{TimerDto, TimerState, TimerUpdatedEvent},
    },
};
use std::process::Command;
use tauri::{AppHandle, Manager, State};
use tauri_specta::Event;

#[tauri::command]
#[specta::specta]
pub fn get_settings(state: State<'_, AppSettingsState>) -> AppSettings {
    return state.lock().unwrap().clone();
}

#[tauri::command]
#[specta::specta]
pub fn set_settings(
    app: AppHandle,
    state: State<'_, AppSettingsState>,
    settings: AppSettings,
) -> Result<(), String> {
    let (prev_launch_at_login, prev_timer) = {
        let guard = state.lock().unwrap();
        (guard.launch_at_login, guard.timer.clone())
    };

    // Update in-memory state
    *state.lock().unwrap() = settings.clone();

    // Persist to disk
    persistence::save_settings(&app, &settings)?;

    // Apply new autostart setting
    if prev_launch_at_login != settings.launch_at_login {
        autostart::apply(&app, settings.launch_at_login);
    }

    // Apply new timer settings (if idle and timer settings changed)
    if prev_timer != settings.timer {
        if let Some(timer_state) = app.try_state::<TimerState>() {
            let mut timer = timer_state.lock().unwrap();
            if timer.status == TimerStatus::Idle {
                timer.reset_to_idle(&settings);
                let _ = TimerUpdatedEvent(TimerDto::from(&*timer)).emit(&app);
            }
        }
    }

    // Emit event to notify frontend
    let _ = AppSettingsChangedEvent(settings).emit(&app);

    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub async fn clear_history(db: State<'_, DatabaseState>) -> Result<(), String> {
    sqlx::query("DELETE FROM session_events")
        .execute(&db.pool)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM session_focus_profile")
        .execute(&db.pool)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM activity_window")
        .execute(&db.pool)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM activity_app")
        .execute(&db.pool)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM sessions")
        .execute(&db.pool)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM app")
        .execute(&db.pool)
        .await
        .map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM website")
        .execute(&db.pool)
        .await
        .map_err(|e| e.to_string())?;
    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub fn reset_settings(app: AppHandle, state: State<'_, AppSettingsState>) -> Result<(), String> {
    let defaults = AppSettings::default();
    *state.lock().unwrap() = defaults.clone();
    persistence::save_settings(&app, &defaults)?;
    let _ = AppSettingsChangedEvent(defaults).emit(&app);
    return Ok(());
}

#[tauri::command]
#[specta::specta]
pub fn get_data_directory_path(app: AppHandle) -> String {
    let data_dir_path = get_app_data_dir(&app);
    return data_dir_path.to_string_lossy().to_string();
}

#[tauri::command]
#[specta::specta]
pub fn open_data_directory(app: AppHandle) -> Result<(), String> {
    let data_dir_path = get_app_data_dir(&app);

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&data_dir_path)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }

    #[cfg(not(target_os = "macos"))]
    {
        Command::new("xdg-open")
            .arg(&data_dir_path)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }

    return Ok(());
}
