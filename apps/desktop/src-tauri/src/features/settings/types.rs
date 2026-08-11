use super::persistence::load_settings;
use serde::{Deserialize, Serialize};
use std::{ops::Deref, sync::Mutex};
use tauri::App;

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub version: SettingsVersion,
    pub launch_at_login: bool,
    pub features: FeaturesSettings,
    pub appearance: AppearanceSettings,
    pub audio: AudioSettings,
    pub developer: DeveloperSettings,
    pub timer: TimerSettings,
    pub goals: GoalSettings,
    pub activity: ActivitySettings,
    pub focus: FocusSettings,
    pub cat: CatSettings,
}

impl Default for AppSettings {
    fn default() -> Self {
        return Self {
            version: SettingsVersion::current(),
            launch_at_login: false,
            features: FeaturesSettings::default(),
            appearance: AppearanceSettings::default(),
            audio: AudioSettings::default(),
            developer: DeveloperSettings::default(),
            timer: TimerSettings::default(),
            goals: GoalSettings::default(),
            activity: ActivitySettings::default(),
            focus: FocusSettings::default(),
            cat: CatSettings::default(),
        };
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum SettingsVersion {
    #[serde(rename = "0.0.1")]
    V0_0_1,
    #[serde(rename = "0.0.2")]
    V0_0_2,
    #[serde(rename = "0.0.3")]
    V0_0_3,
}

impl SettingsVersion {
    pub fn current() -> Self {
        return Self::V0_0_3;
    }
}

impl Default for SettingsVersion {
    fn default() -> Self {
        return Self::current();
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct FeaturesSettings {
    pub goals: bool,
    pub activity: bool,
    pub focus: bool,
    pub cat_window: bool,
    pub developer: bool,
}

impl Default for FeaturesSettings {
    fn default() -> Self {
        return Self {
            goals: true,
            activity: true,
            focus: true,
            cat_window: !cfg!(feature = "app-store"),
            developer: false,
        };
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct AppearanceSettings {
    pub theme: Theme,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type, Default)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    Light,
    Dark,
    #[default]
    Auto,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AudioSettings {
    pub session: AudioChannelSettings,
    pub session_end: AudioChannelSettings,
    pub effects: AudioChannelSettings,
}

impl Default for AudioSettings {
    fn default() -> Self {
        return Self {
            session: AudioChannelSettings::default(),
            session_end: AudioChannelSettings::default(),
            effects: AudioChannelSettings::default(),
        };
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AudioChannelSettings {
    pub enabled: bool,
    /// Volume 0.0..=1.0 (linear scale)
    #[specta(type = specta_typescript::Number)]
    pub volume: f32,
}

impl Default for AudioChannelSettings {
    fn default() -> Self {
        return Self {
            enabled: true,
            volume: 0.6,
        };
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DeveloperSettings {
    pub cat: bool,
    pub timer_speed: u32,
}

impl Default for DeveloperSettings {
    fn default() -> Self {
        return Self {
            cat: false,
            timer_speed: 1,
        };
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TimerSettings {
    pub timer_mode: TimerModeEnum,
    pub pomodoro: PomodoroSettings,
    pub progressive: ProgressivePomodoroSettings,
    pub countdown: CountdownSettings,
}

impl Default for TimerSettings {
    fn default() -> Self {
        return Self {
            timer_mode: TimerModeEnum::Pomodoro,
            pomodoro: PomodoroSettings::default(),
            progressive: ProgressivePomodoroSettings::default(),
            countdown: CountdownSettings::default(),
        };
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type, Default)]
#[serde(rename_all = "lowercase")]
pub enum TimerModeEnum {
    #[default]
    Pomodoro,
    Progressive,
    Countdown,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct PomodoroSettings {
    pub work_duration_minutes: u32,
    pub short_break_minutes: u32,
    pub long_break_minutes: u32,
    pub sessions_before_long_break: u32,
    pub auto_advance: bool,
    pub auto_advance_countdown_seconds: u32,
    pub show_session_setup: bool,
}

impl Default for PomodoroSettings {
    fn default() -> Self {
        return Self {
            work_duration_minutes: 25,
            short_break_minutes: 5,
            long_break_minutes: 15,
            sessions_before_long_break: 4,
            auto_advance: false,
            auto_advance_countdown_seconds: 5,
            show_session_setup: false,
        };
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ProgressivePomodoroSettings {
    pub ratings: Vec<ProgressiveRatingSetting>,
    pub auto_advance: bool,
    pub auto_advance_countdown_seconds: u32,
    pub show_session_setup: bool,
}

impl Default for ProgressivePomodoroSettings {
    fn default() -> Self {
        fn s(work: u32, brk: impl Into<Option<u32>>) -> ProgressiveSuggestion {
            ProgressiveSuggestion {
                work_minutes: work,
                break_minutes: brk.into(),
            }
        }
        fn r(
            key: &str,
            label: &str,
            desc: &str,
            suggestions: Vec<ProgressiveSuggestion>,
        ) -> ProgressiveRatingSetting {
            ProgressiveRatingSetting {
                key: key.into(),
                label: label.into(),
                description: desc.into(),
                suggestions,
            }
        }
        return Self {
            ratings: vec![
                r(
                    "distracted",
                    "Distracted",
                    "Hard to focus, lots of interruptions",
                    vec![s(3, 5), s(5, 5), s(10, 5)],
                ),
                r(
                    "okay",
                    "Okay",
                    "Some focus, manageable",
                    vec![s(10, 5), s(15, 5), s(20, 5)],
                ),
                r(
                    "focused",
                    "Focused",
                    "Solid focus throughout",
                    vec![s(20, 2), s(25, 2), s(30, 2)],
                ),
                r(
                    "flow",
                    "Flow",
                    "Deep focus — keep going",
                    vec![s(30, None), s(45, None), s(60, None)],
                ),
            ],
            auto_advance: false,
            auto_advance_countdown_seconds: 5,
            show_session_setup: false,
        };
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ProgressiveSuggestion {
    pub work_minutes: u32,
    pub break_minutes: Option<u32>, // None = skip break (flow)
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ProgressiveRatingSetting {
    pub key: String,
    pub label: String,
    pub description: String,
    pub suggestions: Vec<ProgressiveSuggestion>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CountdownSettings {
    pub duration_minutes: u32,
    pub show_session_setup: bool,
}

impl Default for CountdownSettings {
    fn default() -> Self {
        return Self {
            duration_minutes: 25,
            show_session_setup: false,
        };
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct GoalSettings {
    /// Daily focus goal in minutes (default: 120 = 2h)
    pub daily_goal_minutes: u32,
}

impl Default for GoalSettings {
    fn default() -> Self {
        return Self {
            daily_goal_minutes: 120,
        };
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ActivitySettings {
    /// Whether to record app usage (app switches)
    pub track_apps: bool,
    /// Whether to track window changes (not just app switches)
    pub track_windows: bool,
    /// Whether to track browser URLs
    pub track_browser: bool,
}

impl Default for ActivitySettings {
    fn default() -> Self {
        return Self {
            track_apps: true,
            track_windows: !cfg!(feature = "app-store"),
            track_browser: !cfg!(feature = "app-store"),
        };
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CatSettings {
    pub equipped_fur: String,
    pub equipped_face: String,
    pub equipped_hat: Option<String>,
}

impl Default for CatSettings {
    fn default() -> Self {
        return Self {
            equipped_fur: "white".to_string(),
            equipped_face: "cute".to_string(),
            equipped_hat: None,
        };
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct FocusSettings {
    pub block_threshold: BlockThreshold,
}

impl Default for FocusSettings {
    fn default() -> Self {
        return Self {
            block_threshold: BlockThreshold::Distracting,
        };
    }
}

/// Which category and above gets blocked when a focus profile is active.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type, Default)]
#[serde(rename_all = "snake_case")]
pub enum BlockThreshold {
    /// Do not block any apps/websites.
    None,
    /// Block only Distracting apps/websites.
    #[default]
    Distracting,
    /// Block Neutral and Distracting apps/websites.
    Neutral,
}

impl BlockThreshold {
    pub fn as_str(&self) -> &'static str {
        return match self {
            BlockThreshold::None => "none",
            BlockThreshold::Distracting => "distracting",
            BlockThreshold::Neutral => "neutral",
        };
    }

    pub fn from_str(value: &str) -> Option<Self> {
        return match value {
            "none" => Some(BlockThreshold::None),
            "distracting" => Some(BlockThreshold::Distracting),
            "neutral" => Some(BlockThreshold::Neutral),
            _ => None,
        };
    }
}

// MARK: - State

pub struct AppSettingsState(Mutex<AppSettings>);

impl AppSettingsState {
    pub fn init(app: &App) -> Self {
        let settings = load_settings(app);
        return Self(Mutex::new(settings));
    }
}

impl Deref for AppSettingsState {
    type Target = Mutex<AppSettings>;

    fn deref(&self) -> &Self::Target {
        return &self.0;
    }
}

// MARK: - Events

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct AppSettingsChangedEvent(pub AppSettings);
