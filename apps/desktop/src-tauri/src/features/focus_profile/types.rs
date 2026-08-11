use crate::features::{
    focus_profile::resolution::ResolutionProfile, session::session::SessionType,
};
use serde::{Deserialize, Serialize};
use std::{ops::Deref, sync::Mutex};

/// Focus category for an app or website within a profile.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum FocusCategory {
    Focused,
    Neutral,
    Distracting,
}

impl FocusCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            FocusCategory::Focused => "focused",
            FocusCategory::Neutral => "neutral",
            FocusCategory::Distracting => "distracting",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "focused" => Some(FocusCategory::Focused),
            "neutral" => Some(FocusCategory::Neutral),
            "distracting" => Some(FocusCategory::Distracting),
            _ => None,
        }
    }
}

/// Activation mode for a focus profile activation rule.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum ActivationMode {
    AlwaysOn,
    PreSelected,
}

impl ActivationMode {
    pub fn as_str(&self) -> &'static str {
        match self {
            ActivationMode::AlwaysOn => "always_on",
            ActivationMode::PreSelected => "pre_selected",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "always_on" => Some(ActivationMode::AlwaysOn),
            "pre_selected" => Some(ActivationMode::PreSelected),
            _ => None,
        }
    }
}

/// Session type for focus profile activation filtering.
/// Focus = any focus/work session (pomodoro work, progressive work, countdown).
/// Break = any rest session (pomodoro breaks, progressive break).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "PascalCase")]
pub enum FocusSessionType {
    Focus,
    Break,
}

impl From<&SessionType> for FocusSessionType {
    fn from(t: &SessionType) -> Self {
        match t {
            SessionType::PomodoroWork | SessionType::ProgressiveWork | SessionType::Countdown => {
                FocusSessionType::Focus
            }
            SessionType::PomodoroShortBreak
            | SessionType::PomodoroLongBreak
            | SessionType::ProgressiveBreak => FocusSessionType::Break,
        }
    }
}

// MARK: - DTO

/// The target of a category assignment: all, a specific app, or a specific website.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum FocusTargetDto {
    #[serde(rename = "all")]
    All,
    #[serde(rename = "app")]
    App {
        bundle_id: String,
        name: Option<String>,
        icon: Option<String>,
        color: Option<String>,
    },
    #[serde(rename = "website")]
    Website {
        domain: String,
        name: Option<String>,
        icon: Option<String>,
        color: Option<String>,
    },
}

/// Focus profile with its category assignments and activation rules.
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct FocusProfileDto {
    pub id: i32,
    pub name: String,
    pub color: Option<String>,
    pub enabled: bool,
    pub categories: Vec<CategoryAssignmentDto>,
    pub activations: Vec<FocusProfileActivationDto>,
    #[specta(type = specta_typescript::Number)]
    pub created_at: f64,
}

/// A category assignment within a focus profile (target + category).
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CategoryAssignmentDto {
    pub id: i32,
    pub category: FocusCategory,
    pub target: FocusTargetDto,
}

/// An activation rule for a focus profile.
/// session_types: None = all session types; Some([...]) = restricted to listed types.
/// schedule_*: None = no time restriction; Some = AND condition with session_types.
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct FocusProfileActivationDto {
    pub id: i32,
    pub mode: ActivationMode,
    pub session_types: Option<Vec<FocusSessionType>>,
    pub schedule_days: Option<Vec<i32>>,
    pub schedule_start_time: Option<String>,
    pub schedule_end_time: Option<String>,
}

/// A profile shown in session setup, with how it was activated.
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SessionProfileDto {
    pub profile: FocusProfileDto,
    pub activation: ProfileActivation,
}

/// How a profile was activated for session selection.
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum ProfileActivation {
    /// Always-on activation is active, shown in session setup, not removable.
    AlwaysOn,
    /// Pre-selected by activation rule, shown in session setup, removable.
    PreSelected,
    /// Manually added by the user.
    Manual,
}

// MARK: - Event

/// Event emitted when a focus profile is created, updated, or deleted.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, tauri_specta::Event)]
pub struct ProfileChangedEvent;

// MARK: - State

pub struct FocusProfiles {
    pub active_profiles: Vec<ResolutionProfile>,
}

pub struct FocusProfileState(Mutex<FocusProfiles>);

impl FocusProfileState {
    pub fn new() -> Self {
        Self(Mutex::new(FocusProfiles {
            active_profiles: vec![],
        }))
    }
}

impl Deref for FocusProfileState {
    type Target = Mutex<FocusProfiles>;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}
