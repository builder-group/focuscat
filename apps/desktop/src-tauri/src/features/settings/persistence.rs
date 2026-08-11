use crate::{
    common::path::get_app_data_dir,
    environment::configs::settings::SettingsConfig,
    features::settings::types::{AppSettings, SettingsVersion},
};
use serde_json::Value;
use std::{fs, path::PathBuf};
use tauri::{Manager, Runtime};

fn get_settings_path<R: Runtime, M: Manager<R>>(app: &M) -> PathBuf {
    let data_dir = get_app_data_dir(app);
    return data_dir.join(SettingsConfig::settings_file_name());
}

/// Load settings from disk, or return defaults if file doesn't exist.
pub fn load_settings<R: Runtime, M: Manager<R>>(app: &M) -> AppSettings {
    let settings_path = get_settings_path(app);

    if !settings_path.exists() {
        return AppSettings::default();
    }

    match fs::read_to_string(&settings_path) {
        Ok(content) => {
            let mut value: Value = match serde_json::from_str(&content) {
                Ok(v) => v,
                Err(e) => {
                    eprintln!("[Settings] Failed to parse settings file: {}", e);
                    return AppSettings::default();
                }
            };

            let version_before = version_from_value(&value);
            while version_from_value(&value) != SettingsVersion::current() {
                migrate_value_one_step(&mut value);
            }

            match serde_json::from_value::<AppSettings>(value) {
                Ok(settings) => {
                    if version_before != SettingsVersion::current() {
                        if let Err(e) = save_settings(app, &settings) {
                            eprintln!("[Settings] Failed to persist migrated settings: {}", e);
                        }
                    }
                    return settings;
                }
                Err(e) => {
                    eprintln!(
                        "[Settings] Failed to deserialize settings after migration: {}",
                        e
                    );
                    return AppSettings::default();
                }
            }
        }
        Err(e) => {
            eprintln!("[Settings] Failed to read settings file: {}", e);
            return AppSettings::default();
        }
    }
}

/// Save settings to disk.
pub fn save_settings<R: Runtime, M: Manager<R>>(
    app: &M,
    settings: &AppSettings,
) -> Result<(), String> {
    let settings_path = get_settings_path(app);

    let json = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    fs::write(&settings_path, json).map_err(|e| format!("Failed to write settings file: {}", e))?;

    return Ok(());
}

fn migrate_value_one_step(value: &mut Value) {
    match version_from_value(value) {
        SettingsVersion::V0_0_1 => migrate_v0_0_1_to_v0_0_2(value),
        SettingsVersion::V0_0_2 => migrate_v0_0_2_to_v0_0_3(value),
        SettingsVersion::V0_0_3 => {}
    }
}

fn version_from_value(value: &Value) -> SettingsVersion {
    return value
        .get("version")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_else(SettingsVersion::default);
}

fn migrate_v0_0_1_to_v0_0_2(value: &mut Value) {
    // Migrate flat audio.enabled/audio.volume → nested audio channels
    if let Some(audio) = value.get("audio").cloned() {
        let enabled = audio
            .get("enabled")
            .and_then(|v| v.as_bool())
            .unwrap_or(true);
        let volume = audio.get("volume").and_then(|v| v.as_f64()).unwrap_or(0.6);
        let channel = serde_json::json!({ "enabled": enabled, "volume": volume });
        value["audio"] = serde_json::json!({
            "session": channel,
            "sessionEnd": channel.clone(),
            "effects": channel.clone()
        });
    }
    value["version"] = serde_json::json!("0.0.2");
}

fn migrate_v0_0_2_to_v0_0_3(value: &mut Value) {
    // One-time transition from Serde-defaulted settings to a required settings schema
    let defaults =
        serde_json::to_value(AppSettings::default()).expect("default app settings must serialize");
    merge_missing_defaults(value, &defaults);
    value["version"] = serde_json::json!("0.0.3");
}

fn merge_missing_defaults(value: &mut Value, defaults: &Value) {
    let (Some(value), Some(defaults)) = (value.as_object_mut(), defaults.as_object()) else {
        return;
    };

    for (key, default) in defaults {
        if let Some(value) = value.get_mut(key) {
            merge_missing_defaults(value, default);
        } else {
            value.insert(key.clone(), default.clone());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{migrate_value_one_step, version_from_value};
    use crate::features::settings::types::{AppSettings, SettingsVersion, Theme};
    use serde_json::json;

    #[test]
    fn migrates_v0_0_1_settings_to_current_without_losing_values() {
        let mut value = json!({
            "version": "0.0.1",
            "appearance": { "theme": "dark" },
            "audio": { "enabled": false, "volume": 0.25 }
        });

        while version_from_value(&value) != SettingsVersion::current() {
            migrate_value_one_step(&mut value);
        }

        let settings = serde_json::from_value::<AppSettings>(value)
            .expect("fully migrated settings should satisfy the required schema");
        assert_eq!(settings.version, SettingsVersion::current());
        assert_eq!(settings.appearance.theme, Theme::Dark);
        assert!(!settings.audio.session.enabled);
        assert_eq!(settings.audio.session.volume, 0.25);
        assert!(!settings.audio.session_end.enabled);
        assert_eq!(settings.audio.session_end.volume, 0.25);
        assert!(!settings.audio.effects.enabled);
        assert_eq!(settings.audio.effects.volume, 0.25);
    }

    #[test]
    fn v0_0_3_migration_fills_defaults_without_overwriting_existing_values() {
        let mut value = json!({
            "version": "0.0.2",
            "appearance": { "theme": "dark" },
            "features": { "goals": false }
        });

        migrate_value_one_step(&mut value);

        assert_eq!(version_from_value(&value), SettingsVersion::V0_0_3);
        assert_eq!(value["appearance"]["theme"], json!("dark"));
        assert_eq!(value["features"]["goals"], json!(false));
        assert_eq!(value["features"]["activity"], json!(true));
        serde_json::from_value::<AppSettings>(value)
            .expect("migrated settings should satisfy the required schema");
    }
}
