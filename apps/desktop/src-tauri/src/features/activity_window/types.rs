use mado::{AppInfo as MadoAppInfo, WindowInfo as MadoWindowInfo};
use serde::{Deserialize, Serialize};

// MARK: - DTO

#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct WindowActivityDto {
    // App fields
    pub app_bundle_id: Option<String>,
    pub app_name: Option<String>,
    pub app_icon: Option<String>,
    pub app_color: Option<String>,
    // Website fields (NULL for non-browser)
    pub website_domain: Option<String>,
    pub website_name: Option<String>,
    pub website_icon: Option<String>,
    pub website_color: Option<String>,
    // Window fields
    pub window_title: Option<String>,
    pub browser_url: Option<String>,
    // Focus profile category at the time of recording (NULL = no active profile)
    pub category: Option<String>,
    #[specta(type = specta_typescript::Number)]
    pub started_at: f64,
    #[specta(type = specta_typescript::Number)]
    pub ended_at: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum CurrentActivityDto {
    AppActivated { app: MadoAppInfo },
    WindowChanged { window: MadoWindowInfo },
}

// MARK: - Event

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct CurrentActivityEvent(pub CurrentActivityDto);
