#![allow(clippy::collapsible_if)]
#![allow(clippy::too_many_arguments)]
#![allow(dead_code)]
#![allow(clippy::io_other_error)]
#![allow(clippy::needless_borrows_for_generic_args)]
#![allow(clippy::redundant_closure)]
#![allow(clippy::unnecessary_sort_by)]

use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

use ed25519_dalek::{Signer, SigningKey};
use enigo::{
    Enigo, Key as EnigoKey, KeyboardControllable, MouseButton as EnigoMouseButton,
    MouseControllable,
};
use rand_core::OsRng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::webview::{NewWindowResponse, WebviewWindowBuilder};
use tauri::{
    menu::{MenuBuilder, MenuEvent, MenuItemBuilder, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, State, WindowEvent,
};
use tauri_plugin_opener::OpenerExt;
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::TcpListener,
    sync::{oneshot, Mutex as AsyncMutex, RwLock},
    time::{timeout, Duration},
};

mod agent;
// ACTIVE PRODUCTION PATH for all chat/assistant LLM functionality
// See module docs for architecture details and provider usage
mod llm;
mod workspace;

// Build-time environment flag check (evaluated at compile time)
fn desktop_updater_enabled() -> bool {
    option_env!("VITE_DESKTOP_UPDATER_ENABLED").unwrap_or("false") == "true"
}

// Display info structure
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DisplayInfo {
    display_id: String,
    name: Option<String>,
    width: u32,
    height: u32,
}

// Screen capture result
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CaptureResult {
    png_base64: String,
    width: u32,
    height: u32,
    byte_length: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CaptureError {
    message: String,
    needs_permission: bool,
}

// Input injection error
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct InputError {
    message: String,
    needs_permission: bool,
}

impl std::fmt::Debug for InputError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("InputError")
            .field("message", &self.message)
            .field("needs_permission", &self.needs_permission)
            .finish()
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct DisplayBounds {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
}

fn resolve_display_point(x_norm: f64, y_norm: f64, bounds: DisplayBounds) -> (i32, i32) {
    let x = bounds.x + (x_norm * bounds.width as f64) as i32;
    let y = bounds.y + (y_norm * bounds.height as f64) as i32;
    (x, y)
}

/// Pure validation for normalized click coordinates.
/// Rejects NaN/Infinity and clamps to [0.0, 1.0].
/// Safe to unit-test without OS dependencies.
fn validate_normalized_coordinates(x_norm: f64, y_norm: f64) -> Result<(f64, f64), InputError> {
    if x_norm.is_nan() || x_norm.is_infinite() || y_norm.is_nan() || y_norm.is_infinite() {
        return Err(InputError {
            message: "Invalid coordinates: NaN or Infinity".to_string(),
            needs_permission: false,
        });
    }
    Ok((x_norm.clamp(0.0, 1.0), y_norm.clamp(0.0, 1.0)))
}

#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "lowercase")]
enum PermissionState {
    Granted,
    Denied,
    Unknown,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PermissionStatusPayload {
    screen_recording: PermissionState,
    accessibility: PermissionState,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
enum PermissionTarget {
    ScreenRecording,
    Accessibility,
}

#[cfg(target_os = "macos")]
#[link(name = "ApplicationServices", kind = "framework")]
unsafe extern "C" {
    fn AXIsProcessTrusted() -> bool;
}

#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
fn is_permission_error(message: &str) -> bool {
    let lower = message.to_ascii_lowercase();
    lower.contains("permission") || lower.contains("denied") || lower.contains("screen recording")
}

fn detect_screen_recording_status() -> PermissionState {
    #[cfg(target_os = "macos")]
    {
        match screenshots::Screen::all() {
            Ok(screens) => {
                let Some(screen) = screens.first() else {
                    return PermissionState::Unknown;
                };
                match screen.capture() {
                    Ok(_) => PermissionState::Granted,
                    Err(err) => {
                        let message = err.to_string();
                        if is_permission_error(&message) {
                            PermissionState::Denied
                        } else {
                            PermissionState::Unknown
                        }
                    }
                }
            }
            Err(err) => {
                let message = err.to_string();
                if is_permission_error(&message) {
                    PermissionState::Denied
                } else {
                    PermissionState::Unknown
                }
            }
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        PermissionState::Unknown
    }
}

fn detect_accessibility_status() -> PermissionState {
    #[cfg(target_os = "macos")]
    {
        if unsafe { AXIsProcessTrusted() } {
            PermissionState::Granted
        } else {
            PermissionState::Denied
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        PermissionState::Unknown
    }
}

#[cfg(test)]
mod tests {
    use super::{
        resolve_display_point, validate_normalized_coordinates, ConversationTurnRequest,
        DisplayBounds, ProposalRequest,
    };

    #[test]
    fn resolve_display_point_keeps_primary_display_coordinates_stable() {
        let bounds = DisplayBounds {
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
        };

        assert_eq!(resolve_display_point(0.5, 0.5, bounds), (960, 540));
    }

    #[test]
    fn resolve_display_point_offsets_coordinates_for_secondary_display_origin() {
        let bounds = DisplayBounds {
            x: 1440,
            y: -900,
            width: 2000,
            height: 1000,
        };

        assert_eq!(resolve_display_point(0.25, 0.6, bounds), (1940, -300));
    }

    #[test]
    fn proposal_request_deserializes_camel_case_fields() {
        let parsed: ProposalRequest = serde_json::from_value(serde_json::json!({
            "provider": "gorkh_free",
            "baseUrl": "http://localhost:3001",
            "model": "gorkh-free",
            "goal": "Do the thing",
            "constraints": {
                "maxActions": 5,
                "maxRuntimeMinutes": 10
            },
            "workspaceConfigured": true,
            "appContext": "ready"
        }))
        .expect("proposal request should deserialize camelCase fields");

        assert_eq!(parsed.base_url, "http://localhost:3001");
        assert_eq!(parsed.app_context.as_deref(), Some("ready"));
        assert_eq!(parsed.workspace_configured, Some(true));
        assert_eq!(parsed.constraints.max_actions, 5);
        assert_eq!(parsed.constraints.max_runtime_minutes, 10);
    }

    #[test]
    fn conversation_turn_request_deserializes_camel_case_fields() {
        let parsed: ConversationTurnRequest = serde_json::from_value(serde_json::json!({
            "provider": "gorkh_free",
            "baseUrl": "http://localhost:3001",
            "model": "gorkh-free",
            "messages": [
                {
                    "role": "user",
                    "text": "Hi"
                }
            ],
            "appContext": "desktop-ready"
        }))
        .expect("conversation turn request should deserialize camelCase fields");

        assert_eq!(parsed.base_url, "http://localhost:3001");
        assert_eq!(parsed.app_context.as_deref(), Some("desktop-ready"));
        assert_eq!(parsed.messages.len(), 1);
        assert_eq!(parsed.messages[0].role, "user");
        assert_eq!(parsed.messages[0].text, "Hi");
    }

    #[test]
    fn validate_normalized_coordinates_rejects_nan() {
        let result = validate_normalized_coordinates(f64::NAN, 0.5);
        assert!(result.is_err());
        assert!(result.unwrap_err().message.contains("NaN"));
    }

    #[test]
    fn validate_normalized_coordinates_rejects_infinity() {
        let result = validate_normalized_coordinates(f64::INFINITY, 0.5);
        assert!(result.is_err());
        assert!(result.unwrap_err().message.contains("Infinity"));

        let result = validate_normalized_coordinates(f64::NEG_INFINITY, 0.5);
        assert!(result.is_err());
        assert!(result.unwrap_err().message.contains("Infinity"));
    }

    #[test]
    fn validate_normalized_coordinates_clamps_below_zero() {
        let (x, y) = validate_normalized_coordinates(-0.5, -0.1).unwrap();
        assert_eq!(x, 0.0);
        assert_eq!(y, 0.0);
    }

    #[test]
    fn validate_normalized_coordinates_clamps_above_one() {
        let (x, y) = validate_normalized_coordinates(1.4, 2.0).unwrap();
        assert_eq!(x, 1.0);
        assert_eq!(y, 1.0);
    }

    #[test]
    fn validate_normalized_coordinates_passes_valid_values() {
        let (x, y) = validate_normalized_coordinates(0.5, 0.75).unwrap();
        assert_eq!(x, 0.5);
        assert_eq!(y, 0.75);
    }

    #[test]
    fn resolve_display_point_never_exceeds_bounds_after_clamping() {
        let bounds = DisplayBounds {
            x: 100,
            y: 200,
            width: 1920,
            height: 1080,
        };
        // Even with extreme inputs, clamping keeps coordinates inside [0,1]
        let (x_norm, y_norm) = validate_normalized_coordinates(-10.0, 99.0).unwrap();
        let (x, y) = resolve_display_point(x_norm, y_norm, bounds);
        assert_eq!(x, bounds.x);
        assert_eq!(y, bounds.y + bounds.height as i32);
    }
}

#[cfg_attr(not(any(target_os = "macos", target_os = "windows")), allow(dead_code))]
fn open_permission_settings_url(app: &AppHandle, url: &str) -> Result<(), String> {
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| format!("Failed to open settings: {}", e))
}

fn open_permission_settings_impl(app: &AppHandle, target: PermissionTarget) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let preferred = match target {
            PermissionTarget::ScreenRecording => {
                "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
            }
            PermissionTarget::Accessibility => {
                "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
            }
        };

        open_permission_settings_url(app, preferred).or_else(|_| {
            open_permission_settings_url(
                app,
                "x-apple.systempreferences:com.apple.preference.security?Privacy",
            )
        })
    }

    #[cfg(target_os = "windows")]
    {
        let target_url = match target {
            PermissionTarget::ScreenRecording => "ms-settings:privacy",
            PermissionTarget::Accessibility => "ms-settings:easeofaccess",
        };
        open_permission_settings_url(app, target_url)
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = app;
        let _ = target;
        Ok(())
    }
}

// List all available displays
#[tauri::command]
fn list_displays() -> Result<Vec<DisplayInfo>, String> {
    let screens =
        screenshots::Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;

    let displays: Vec<DisplayInfo> = screens
        .into_iter()
        .enumerate()
        .map(|(idx, screen)| {
            let info = screen.display_info;
            DisplayInfo {
                display_id: format!("display-{}", idx),
                name: Some(format!(
                    "Display {} ({}x{})",
                    idx + 1,
                    info.width,
                    info.height
                )),
                width: info.width,
                height: info.height,
            }
        })
        .collect();

    Ok(displays)
}

// Capture a display and return PNG as base64
#[tauri::command]
fn capture_display_png(
    display_id: String,
    max_width: Option<u32>,
) -> Result<CaptureResult, CaptureError> {
    let screen = get_capture_target_screen(&display_id)?;

    let image = screen.capture().map_err(|e| {
        let msg = format!("{}", e);
        let needs_perm = msg.contains("permission")
            || msg.contains("denied")
            || msg.contains("Screen Recording");
        CaptureError {
            message: msg,
            needs_permission: needs_perm,
        }
    })?;

    let width = image.width();
    let height = image.height();
    let rgba = image.into_raw();

    let (final_width, final_height, final_rgba) = if let Some(max_w) = max_width {
        if width > max_w {
            let ratio = max_w as f32 / width as f32;
            let new_height = (height as f32 * ratio) as u32;
            let resized = resize_rgba(&rgba, width, height, max_w, new_height);
            (max_w, new_height, resized)
        } else {
            (width, height, rgba)
        }
    } else {
        (width, height, rgba)
    };

    let png_bytes =
        rgba_to_png(&final_rgba, final_width, final_height).map_err(|e| CaptureError {
            message: format!("Failed to encode PNG: {}", e),
            needs_permission: false,
        })?;

    let png_base64 = base64::encode(&png_bytes);

    Ok(CaptureResult {
        png_base64,
        width: final_width,
        height: final_height,
        byte_length: png_bytes.len(),
    })
}

// Input injection commands
fn parse_display_index(display_id: &str) -> Result<usize, String> {
    display_id
        .strip_prefix("display-")
        .and_then(|s| s.parse().ok())
        .ok_or_else(|| "Invalid display ID".to_string())
}

fn get_capture_target_screen(display_id: &str) -> Result<screenshots::Screen, CaptureError> {
    let screens = screenshots::Screen::all().map_err(|e| CaptureError {
        message: format!("Failed to get screens: {}", e),
        needs_permission: false,
    })?;

    let idx = parse_display_index(display_id).map_err(|message| CaptureError {
        message,
        needs_permission: false,
    })?;

    screens.into_iter().nth(idx).ok_or_else(|| CaptureError {
        message: "Display not found".to_string(),
        needs_permission: false,
    })
}

fn get_input_target_screen(display_id: &str) -> Result<screenshots::Screen, InputError> {
    let screens = screenshots::Screen::all().map_err(|e| InputError {
        message: format!("Failed to get screen: {}", e),
        needs_permission: false,
    })?;

    let idx = parse_display_index(display_id).map_err(|message| InputError {
        message,
        needs_permission: false,
    })?;

    screens.into_iter().nth(idx).ok_or_else(|| InputError {
        message: "No display found".to_string(),
        needs_permission: false,
    })
}

#[tauri::command]
fn input_click(
    x_norm: f64,
    y_norm: f64,
    button: String,
    display_id: String,
) -> Result<(), InputError> {
    let (x_norm, y_norm) = validate_normalized_coordinates(x_norm, y_norm)?;
    let mut enigo = Enigo::new();

    let screen = get_input_target_screen(&display_id)?;
    let (x, y) = resolve_display_point(
        x_norm,
        y_norm,
        DisplayBounds {
            x: screen.display_info.x,
            y: screen.display_info.y,
            width: screen.display_info.width,
            height: screen.display_info.height,
        },
    );

    let mouse_button = match button.as_str() {
        "right" => EnigoMouseButton::Right,
        "middle" => EnigoMouseButton::Middle,
        _ => EnigoMouseButton::Left,
    };

    enigo.mouse_move_to(x, y);
    enigo.mouse_click(mouse_button);

    Ok(())
}

#[tauri::command]
fn input_double_click(
    x_norm: f64,
    y_norm: f64,
    button: String,
    display_id: String,
) -> Result<(), InputError> {
    let (x_norm, y_norm) = validate_normalized_coordinates(x_norm, y_norm)?;
    let mut enigo = Enigo::new();

    let screen = get_input_target_screen(&display_id)?;
    let (x, y) = resolve_display_point(
        x_norm,
        y_norm,
        DisplayBounds {
            x: screen.display_info.x,
            y: screen.display_info.y,
            width: screen.display_info.width,
            height: screen.display_info.height,
        },
    );

    let mouse_button = match button.as_str() {
        "right" => EnigoMouseButton::Right,
        "middle" => EnigoMouseButton::Middle,
        _ => EnigoMouseButton::Left,
    };

    enigo.mouse_move_to(x, y);
    enigo.mouse_click(mouse_button);
    enigo.mouse_click(mouse_button);

    Ok(())
}

#[tauri::command]
fn input_scroll(dx: i32, dy: i32) -> Result<(), InputError> {
    let mut enigo = Enigo::new();
    enigo.mouse_scroll_y(dy);
    enigo.mouse_scroll_x(dx);
    Ok(())
}

#[tauri::command]
fn input_type(text: String) -> Result<(), InputError> {
    let mut enigo = Enigo::new();
    enigo.key_sequence(&text);
    Ok(())
}

#[tauri::command]
fn input_hotkey(key: String, modifiers: Vec<String>) -> Result<(), InputError> {
    let mut enigo = Enigo::new();

    // Parse key
    let enigo_key = match key.as_str() {
        "enter" => EnigoKey::Return,
        "tab" => EnigoKey::Tab,
        "escape" => EnigoKey::Escape,
        "backspace" => EnigoKey::Backspace,
        "up" => EnigoKey::UpArrow,
        "down" => EnigoKey::DownArrow,
        "left" => EnigoKey::LeftArrow,
        "right" => EnigoKey::RightArrow,
        _ => {
            return Err(InputError {
                message: format!("Unknown key: {}", key),
                needs_permission: false,
            })
        }
    };

    // Hold modifiers
    for modifier in &modifiers {
        match modifier.as_str() {
            "shift" => enigo.key_down(EnigoKey::Shift),
            "ctrl" => enigo.key_down(EnigoKey::Control),
            "alt" => enigo.key_down(EnigoKey::Alt),
            "meta" => enigo.key_down(EnigoKey::Meta),
            _ => {}
        }
    }

    // Press key
    enigo.key_click(enigo_key);

    // Release modifiers
    for modifier in modifiers.iter().rev() {
        match modifier.as_str() {
            "shift" => enigo.key_up(EnigoKey::Shift),
            "ctrl" => enigo.key_up(EnigoKey::Control),
            "alt" => enigo.key_up(EnigoKey::Alt),
            "meta" => enigo.key_up(EnigoKey::Meta),
            _ => {}
        }
    }

    Ok(())
}

// ============================================================================
// Iteration 6: AI Assist - Secure Key Storage
// ============================================================================

#[derive(Serialize)]
struct KeyResult {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Default)]
struct TrayRuntimeState {
    menu: Mutex<TrayMenuState>,
}

#[derive(Default)]
struct OverlayModeRuntimeState {
    state: Mutex<OverlayModeState>,
}

#[derive(Default, Clone)]
struct OverlayModeState {
    active: bool,
    previous: Option<OverlayWindowSnapshot>,
    last_error: Option<String>,
}

#[derive(Clone)]
struct OverlayWindowSnapshot {
    fullscreen: bool,
    maximized: bool,
    decorations: bool,
    resizable: bool,
    width: u32,
    height: u32,
    x: i32,
    y: i32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OverlayWindowStatusPayload {
    active: bool,
    supported: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    last_error: Option<String>,
}

#[derive(Clone)]
struct TrayMenuState {
    window_visible: bool,
    screen_preview_enabled: bool,
    allow_control_enabled: bool,
    ai_assist_active: bool,
    ai_assist_paused: bool,
    has_shown_tray_tip: bool,
}

impl Default for TrayMenuState {
    fn default() -> Self {
        Self {
            window_visible: true,
            screen_preview_enabled: false,
            allow_control_enabled: false,
            ai_assist_active: false,
            ai_assist_paused: false,
            has_shown_tray_tip: false,
        }
    }
}

const DESKTOP_AUTH_CALLBACK_PATH: &str = "/desktop-auth/callback";
const DESKTOP_AUTH_MAX_WAIT_MS: u64 = 125_000;
const KEYRING_SERVICE_NAME: &str = "gorkh";
const LEGACY_KEYRING_SERVICE_NAME: &str = "ai-operator";

#[derive(Default)]
struct DesktopAuthRuntimeState {
    pending: AsyncMutex<Option<PendingDesktopAuthListener>>,
}

#[derive(Default)]
struct CloakSigningRuntimeState {
    sessions: Mutex<HashMap<String, CloakSigningSession>>,
}

#[derive(Clone)]
struct CloakSigningSession {
    session_id: String,
    draft_id: String,
    wallet_id: String,
    public_address: String,
    operation_kind: String,
    operation_digest: String,
    expires_at: u64,
    transaction_signatures_remaining: u8,
    message_signatures_remaining: u8,
}

struct PendingDesktopAuthListener {
    result_rx: Option<oneshot::Receiver<Result<DesktopAuthLoopbackPayload, String>>>,
    shutdown_tx: Option<oneshot::Sender<()>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopAuthLoopbackStartPayload {
    callback_url: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopAuthLoopbackPayload {
    handoff_token: String,
    state: String,
}

fn normalized_timeout_ms(requested_timeout_ms: Option<u64>) -> u64 {
    requested_timeout_ms
        .unwrap_or(DESKTOP_AUTH_MAX_WAIT_MS)
        .clamp(1, DESKTOP_AUTH_MAX_WAIT_MS)
}

fn device_token_account(device_id: &str) -> String {
    format!("device_token::{}", device_id)
}

fn wallet_vault_account(wallet_id: &str) -> String {
    format!("wallet:v1:{}", wallet_id)
}

fn cloak_note_account(wallet_id: &str, note_id: &str) -> String {
    format!("cloak-note:v1:{}:{}", wallet_id, note_id)
}

fn cloak_note_meta_account(wallet_id: &str) -> String {
    format!("cloak-note-meta:v1:{}", wallet_id)
}

fn cloak_deposit_draft_account(draft_id: &str) -> String {
    format!("cloak-deposit-draft:v1:{}", draft_id)
}

fn cloak_deposit_used_account(draft_id: &str) -> String {
    format!("cloak-deposit-used:v1:{}", draft_id)
}

fn keyring_entry_for_service(service: &str, account: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(service, account)
        .map_err(|e| format!("Failed to access secure storage: {}", e))
}

fn keyring_entry(account: &str) -> Result<keyring::Entry, String> {
    keyring_entry_for_service(KEYRING_SERVICE_NAME, account)
}

fn legacy_keyring_entry(account: &str) -> Result<keyring::Entry, String> {
    keyring_entry_for_service(LEGACY_KEYRING_SERVICE_NAME, account)
}

fn keyring_set_secret(account: &str, value: &str) -> Result<(), String> {
    let entry = keyring_entry(account)?;
    entry
        .set_password(value)
        .map_err(|e| format!("Failed to store secure value: {}", e))?;

    if let Ok(legacy) = legacy_keyring_entry(account) {
        let _ = legacy.delete_credential();
    }

    Ok(())
}

fn keyring_get_secret(account: &str) -> Option<String> {
    let primary = keyring_entry(account).ok();
    if let Some(entry) = primary.as_ref() {
        if let Ok(value) = entry.get_password() {
            return Some(value);
        }
    }

    let legacy_value = legacy_keyring_entry(account)
        .ok()
        .and_then(|entry| entry.get_password().ok())?;

    if let Some(entry) = primary {
        let _ = entry.set_password(&legacy_value);
    }
    if let Ok(legacy) = legacy_keyring_entry(account) {
        let _ = legacy.delete_credential();
    }

    Some(legacy_value)
}

fn keyring_delete_secret(account: &str) -> Result<(), String> {
    let primary_result = keyring_entry(account)
        .and_then(|entry| entry.delete_credential().map_err(|e| e.to_string()));
    let legacy_result = legacy_keyring_entry(account)
        .and_then(|entry| entry.delete_credential().map_err(|e| e.to_string()));

    if primary_result.is_ok() || legacy_result.is_ok() {
        return Ok(());
    }

    let primary_error = primary_result.err();
    let legacy_error = legacy_result.err();
    Err(match (primary_error, legacy_error) {
        (Some(primary), Some(legacy)) => format!(
            "Failed to clear secure value: {} (legacy fallback also failed: {})",
            primary, legacy
        ),
        (Some(primary), None) => format!("Failed to clear secure value: {}", primary),
        (None, Some(legacy)) => format!("Failed to clear secure value: {}", legacy),
        (None, None) => "Failed to clear secure value".to_string(),
    })
}

fn zerion_api_key_account() -> &'static str {
    "zerion-api-key:v1"
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ZerionApiKeyStatusPayload {
    configured: bool,
    source: String,
    redacted: bool,
    updated_at: Option<u64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ZerionCliStatusPayload {
    binary: String,
    detected: bool,
    version: Option<String>,
    help_available: Option<bool>,
    error: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ZerionCliRunPayload {
    ok: bool,
    command_kind: String,
    command_preview: Vec<String>,
    exit_code: Option<i32>,
    stdout_json: Option<serde_json::Value>,
    stdout_text: Option<String>,
    stderr_json: Option<serde_json::Value>,
    stderr_text: Option<String>,
    error_code: Option<String>,
    timed_out: bool,
    executed_at: u64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ZerionBinaryRequest {
    binary: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ZerionApiKeySetRequest {
    api_key: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ZerionPolicyCreateRequest {
    binary: String,
    policy_name: String,
    expires: String,
    deny_transfers: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ZerionTokenCreateRequest {
    binary: String,
    token_name: String,
    wallet_name: String,
    policy_name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ZerionAddressRequest {
    binary: String,
    address: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ZerionAgentPolicyRequest {
    name: String,
    chain: String,
    #[serde(rename = "allowedFromToken")]
    allowed_from_token: String,
    #[serde(rename = "allowedToToken")]
    allowed_to_token: String,
    #[serde(rename = "maxSolAmount")]
    max_sol_amount: String,
    #[serde(rename = "expiresAt")]
    expires_at: u64,
    #[serde(rename = "maxExecutions")]
    max_executions: u8,
    #[serde(rename = "executionsUsed")]
    executions_used: u8,
    #[serde(rename = "bridgeDisabled")]
    bridge_disabled: bool,
    #[serde(rename = "sendDisabled")]
    send_disabled: bool,
    #[serde(rename = "denyTransfers")]
    deny_transfers: bool,
    #[serde(rename = "localOnlyDigest")]
    local_only_digest: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ZerionAgentProposalRequest {
    id: String,
    kind: String,
    source: String,
    chain: String,
    wallet_name: String,
    amount_sol: String,
    from_token: String,
    to_token: String,
    policy_name: String,
    local_policy_digest: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ZerionExecutionApprovalRequest {
    proposal_id: String,
    source: String,
    approved: bool,
    approved_at: u64,
    approval_text: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ZerionSwapExecuteRequest {
    binary: String,
    proposal: ZerionAgentProposalRequest,
    policy: ZerionAgentPolicyRequest,
    approval: ZerionExecutionApprovalRequest,
}

fn now_millis_u64() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

fn validate_zerion_binary(binary: &str) -> Result<(), String> {
    match binary {
        "zerion" | "gorkh-zerion" => Ok(()),
        _ => Err("Only zerion or gorkh-zerion binaries are allowed.".to_string()),
    }
}

fn validate_zerion_name(value: &str, label: &str) -> Result<(), String> {
    if value.is_empty() || value.len() > 64 {
        return Err(format!("{} must be 1-64 characters.", label));
    }
    if !value
        .chars()
        .enumerate()
        .all(|(index, c)| c.is_ascii_alphanumeric() || (index > 0 && matches!(c, '_' | '-' | '.')))
    {
        return Err(format!(
            "{} must use only letters, numbers, dot, dash, and underscore.",
            label
        ));
    }
    Ok(())
}

fn validate_zerion_address(value: &str) -> Result<(), String> {
    if value.len() < 16 || value.len() > 128 || contains_shell_metachar(value) {
        return Err("Zerion address is not valid for a read-only command.".to_string());
    }
    Ok(())
}

fn contains_shell_metachar(value: &str) -> bool {
    value.chars().any(|c| {
        matches!(
            c,
            ';' | '&'
                | '|'
                | '`'
                | '$'
                | '<'
                | '>'
                | '('
                | ')'
                | '{'
                | '}'
                | '['
                | ']'
                | '\\'
                | '\n'
                | '\r'
        )
    })
}

fn parse_decimal_nanos(value: &str) -> Result<u128, String> {
    if value.is_empty() || value.contains('e') || value.contains('E') || value.starts_with('-') {
        return Err("SOL amount must be a positive decimal.".to_string());
    }
    let parts: Vec<&str> = value.split('.').collect();
    if parts.len() > 2 || parts[0].is_empty() || !parts[0].chars().all(|c| c.is_ascii_digit()) {
        return Err("SOL amount must be a positive decimal.".to_string());
    }
    let fraction = if parts.len() == 2 { parts[1] } else { "" };
    if fraction.len() > 9 || !fraction.chars().all(|c| c.is_ascii_digit()) {
        return Err("SOL amount can have at most 9 decimals.".to_string());
    }
    let whole = parts[0]
        .parse::<u128>()
        .map_err(|_| "SOL amount is too large.".to_string())?;
    let mut fraction_padded = fraction.to_string();
    while fraction_padded.len() < 9 {
        fraction_padded.push('0');
    }
    let fractional = if fraction_padded.is_empty() {
        0
    } else {
        fraction_padded
            .parse::<u128>()
            .map_err(|_| "SOL amount is invalid.".to_string())?
    };
    let total = whole
        .checked_mul(1_000_000_000)
        .and_then(|value| value.checked_add(fractional))
        .ok_or_else(|| "SOL amount is too large.".to_string())?;
    if total == 0 {
        return Err("SOL amount must be greater than zero.".to_string());
    }
    Ok(total)
}

fn redact_zerion_output(input: &str) -> String {
    let api_key_redacted = regex::Regex::new(r"zk_[A-Za-z0-9_-]+")
        .map(|re| {
            re.replace_all(input, "[redacted_zerion_api_key]")
                .to_string()
        })
        .unwrap_or_else(|_| input.to_string());
    regex::Regex::new(r#"(?i)"(apiKey|agentToken|token|privateKey|seed|mnemonic)"\s*:\s*"[^"]+""#)
        .map(|re| {
            re.replace_all(&api_key_redacted, r#""$1":"[redacted]""#)
                .to_string()
        })
        .unwrap_or(api_key_redacted)
}

fn parse_json_if_possible(input: &str) -> Option<serde_json::Value> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return None;
    }
    serde_json::from_str(trimmed).ok()
}

fn run_zerion_command(
    command_kind: &str,
    binary: &str,
    args: Vec<String>,
    timeout_ms: u64,
) -> ZerionCliRunPayload {
    let executed_at = now_millis_u64();
    let command_preview = std::iter::once(binary.to_string())
        .chain(args.iter().cloned())
        .collect::<Vec<_>>();

    let mut command = std::process::Command::new(binary);
    command
        .args(&args)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());
    if let Some(api_key) = keyring_get_secret(zerion_api_key_account()) {
        command.env("ZERION_API_KEY", api_key);
    }

    let mut child = match command.spawn() {
        Ok(child) => child,
        Err(error) => {
            return ZerionCliRunPayload {
                ok: false,
                command_kind: command_kind.to_string(),
                command_preview,
                exit_code: None,
                stdout_json: None,
                stdout_text: None,
                stderr_json: None,
                stderr_text: Some(redact_zerion_output(&error.to_string())),
                error_code: Some("SPAWN_FAILED".to_string()),
                timed_out: false,
                executed_at,
            };
        }
    };

    let start = std::time::Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(_status)) => break,
            Ok(None) => {
                if start.elapsed() > std::time::Duration::from_millis(timeout_ms) {
                    let _ = child.kill();
                    let output = child.wait_with_output().ok();
                    let stderr = output
                        .as_ref()
                        .map(|o| redact_zerion_output(&String::from_utf8_lossy(&o.stderr)))
                        .unwrap_or_else(|| "Zerion CLI command timed out.".to_string());
                    return ZerionCliRunPayload {
                        ok: false,
                        command_kind: command_kind.to_string(),
                        command_preview,
                        exit_code: None,
                        stdout_json: None,
                        stdout_text: None,
                        stderr_json: parse_json_if_possible(&stderr),
                        stderr_text: Some(stderr),
                        error_code: Some("TIMEOUT".to_string()),
                        timed_out: true,
                        executed_at,
                    };
                }
                std::thread::sleep(std::time::Duration::from_millis(20));
            }
            Err(error) => {
                return ZerionCliRunPayload {
                    ok: false,
                    command_kind: command_kind.to_string(),
                    command_preview,
                    exit_code: None,
                    stdout_json: None,
                    stdout_text: None,
                    stderr_json: None,
                    stderr_text: Some(redact_zerion_output(&error.to_string())),
                    error_code: Some("WAIT_FAILED".to_string()),
                    timed_out: false,
                    executed_at,
                };
            }
        }
    }

    let output = match child.wait_with_output() {
        Ok(output) => output,
        Err(error) => {
            return ZerionCliRunPayload {
                ok: false,
                command_kind: command_kind.to_string(),
                command_preview,
                exit_code: None,
                stdout_json: None,
                stdout_text: None,
                stderr_json: None,
                stderr_text: Some(redact_zerion_output(&error.to_string())),
                error_code: Some("OUTPUT_FAILED".to_string()),
                timed_out: false,
                executed_at,
            };
        }
    };

    let stdout = redact_zerion_output(&String::from_utf8_lossy(&output.stdout));
    let stderr = redact_zerion_output(&String::from_utf8_lossy(&output.stderr));
    ZerionCliRunPayload {
        ok: output.status.success(),
        command_kind: command_kind.to_string(),
        command_preview,
        exit_code: output.status.code(),
        stdout_json: parse_json_if_possible(&stdout),
        stdout_text: if stdout.trim().is_empty() {
            None
        } else {
            Some(stdout)
        },
        stderr_json: parse_json_if_possible(&stderr),
        stderr_text: if stderr.trim().is_empty() {
            None
        } else {
            Some(stderr)
        },
        error_code: if output.status.success() {
            None
        } else {
            Some(format!("EXIT_{}", output.status.code().unwrap_or(-1)))
        },
        timed_out: false,
        executed_at,
    }
}

fn validate_zerion_args(args: &[String]) -> Result<(), String> {
    for arg in args {
        if contains_shell_metachar(arg) {
            return Err(
                "Zerion command argument contains blocked shell metacharacters.".to_string(),
            );
        }
    }
    Ok(())
}

fn run_allowed_zerion(
    command_kind: &str,
    binary: &str,
    args: Vec<String>,
    timeout_ms: u64,
) -> Result<ZerionCliRunPayload, String> {
    validate_zerion_binary(binary)?;
    validate_zerion_args(&args)?;
    Ok(run_zerion_command(command_kind, binary, args, timeout_ms))
}

fn validate_zerion_swap_request(request: &ZerionSwapExecuteRequest) -> Result<(), String> {
    validate_zerion_binary(&request.binary)?;
    validate_zerion_name(&request.proposal.wallet_name, "Wallet name")?;
    validate_zerion_name(&request.policy.name, "Policy name")?;
    if request.proposal.kind != "zerion_solana_swap" {
        return Err("Only Zerion Solana swap proposals are executable.".to_string());
    }
    if request.proposal.source != "agent_zerion_panel"
        || request.approval.source != "agent_zerion_panel"
    {
        return Err("Zerion execution must originate from Agent Zerion panel.".to_string());
    }
    if !request.approval.approved || request.approval.proposal_id != request.proposal.id {
        return Err("Explicit matching Zerion approval is required.".to_string());
    }
    if !request
        .approval
        .approval_text
        .contains("real onchain transaction")
    {
        return Err("Approval text must acknowledge real onchain execution.".to_string());
    }
    if request.proposal.chain != "solana" || request.policy.chain != "solana" {
        return Err("Only Solana Zerion execution is allowed.".to_string());
    }
    if request.proposal.from_token != "SOL"
        || request.proposal.to_token != "USDC"
        || request.policy.allowed_from_token != "SOL"
        || request.policy.allowed_to_token != "USDC"
    {
        return Err("Only SOL to USDC swaps are allowed.".to_string());
    }
    if request.proposal.policy_name != request.policy.name {
        return Err("Zerion proposal policy mismatch.".to_string());
    }
    if request.policy.local_only_digest.as_deref() != Some(&request.proposal.local_policy_digest) {
        return Err("Zerion local policy digest mismatch.".to_string());
    }
    if !request.policy.bridge_disabled
        || !request.policy.send_disabled
        || !request.policy.deny_transfers
    {
        return Err("Bridge, send, and transfer bypasses must be disabled.".to_string());
    }
    if request.policy.max_executions != 1 || request.policy.executions_used > 0 {
        return Err("Zerion policy execution limit blocks this command.".to_string());
    }
    if request.policy.expires_at <= now_millis_u64() {
        return Err("Zerion local policy has expired.".to_string());
    }
    let amount = parse_decimal_nanos(&request.proposal.amount_sol)?;
    let max_amount = parse_decimal_nanos(&request.policy.max_sol_amount)?;
    if amount > max_amount {
        return Err("Zerion swap amount exceeds local maximum.".to_string());
    }
    Ok(())
}

#[tauri::command]
fn zerion_cli_detect(request: ZerionBinaryRequest) -> ZerionCliStatusPayload {
    if let Err(error) = validate_zerion_binary(&request.binary) {
        return ZerionCliStatusPayload {
            binary: request.binary,
            detected: false,
            version: None,
            help_available: Some(false),
            error: Some(error),
        };
    }
    let result = run_zerion_command("detect", &request.binary, vec!["--help".to_string()], 5_000);
    ZerionCliStatusPayload {
        binary: request.binary,
        detected: result.ok,
        version: None,
        help_available: Some(result.ok),
        error: if result.ok {
            None
        } else {
            result.stderr_text.or(result.error_code)
        },
    }
}

#[tauri::command]
fn zerion_cli_version(request: ZerionBinaryRequest) -> Result<ZerionCliRunPayload, String> {
    run_allowed_zerion(
        "version",
        &request.binary,
        vec!["--version".to_string()],
        5_000,
    )
}

#[tauri::command]
fn zerion_cli_config_status() -> ZerionApiKeyStatusPayload {
    let keychain_configured = keyring_get_secret(zerion_api_key_account()).is_some();
    let env_configured = std::env::var("ZERION_API_KEY").is_ok();
    ZerionApiKeyStatusPayload {
        configured: keychain_configured || env_configured,
        source: if keychain_configured {
            "keychain".to_string()
        } else if env_configured {
            "cli_config_or_env".to_string()
        } else {
            "missing".to_string()
        },
        redacted: true,
        updated_at: None,
    }
}

#[tauri::command]
fn zerion_api_key_set(
    request: ZerionApiKeySetRequest,
) -> Result<ZerionApiKeyStatusPayload, String> {
    if !request.api_key.starts_with("zk_") || request.api_key.len() < 8 {
        return Err("Zerion API key must start with zk_.".to_string());
    }
    keyring_set_secret(zerion_api_key_account(), &request.api_key)?;
    Ok(ZerionApiKeyStatusPayload {
        configured: true,
        source: "keychain".to_string(),
        redacted: true,
        updated_at: Some(now_millis_u64()),
    })
}

#[tauri::command]
fn zerion_api_key_clear() -> ZerionApiKeyStatusPayload {
    let _ = keyring_delete_secret(zerion_api_key_account());
    ZerionApiKeyStatusPayload {
        configured: false,
        source: "missing".to_string(),
        redacted: true,
        updated_at: Some(now_millis_u64()),
    }
}

#[tauri::command]
fn zerion_cli_wallet_list(request: ZerionBinaryRequest) -> Result<ZerionCliRunPayload, String> {
    run_allowed_zerion(
        "wallet_list",
        &request.binary,
        vec![
            "wallet".to_string(),
            "list".to_string(),
            "--json".to_string(),
        ],
        15_000,
    )
}

#[tauri::command]
fn zerion_cli_agent_list_policies(
    request: ZerionBinaryRequest,
) -> Result<ZerionCliRunPayload, String> {
    run_allowed_zerion(
        "agent_list_policies",
        &request.binary,
        vec![
            "agent".to_string(),
            "list-policies".to_string(),
            "--json".to_string(),
        ],
        15_000,
    )
}

#[tauri::command]
fn zerion_cli_agent_create_policy(
    request: ZerionPolicyCreateRequest,
) -> Result<ZerionCliRunPayload, String> {
    validate_zerion_name(&request.policy_name, "Policy name")?;
    if request.expires != "24h" {
        return Err("Only 24h Zerion policy expiry is allowed in this phase.".to_string());
    }
    if !request.deny_transfers {
        return Err("Zerion policy must deny transfers in this phase.".to_string());
    }
    run_allowed_zerion(
        "agent_create_policy",
        &request.binary,
        vec![
            "agent".to_string(),
            "create-policy".to_string(),
            "--name".to_string(),
            request.policy_name,
            "--chains".to_string(),
            "solana".to_string(),
            "--expires".to_string(),
            "24h".to_string(),
            "--deny-transfers".to_string(),
            "--json".to_string(),
        ],
        20_000,
    )
}

#[tauri::command]
fn zerion_cli_agent_list_tokens(
    request: ZerionBinaryRequest,
) -> Result<ZerionCliRunPayload, String> {
    run_allowed_zerion(
        "agent_list_tokens",
        &request.binary,
        vec![
            "agent".to_string(),
            "list-tokens".to_string(),
            "--json".to_string(),
        ],
        15_000,
    )
}

#[tauri::command]
fn zerion_cli_agent_create_token(
    request: ZerionTokenCreateRequest,
) -> Result<ZerionCliRunPayload, String> {
    validate_zerion_name(&request.token_name, "Token name")?;
    validate_zerion_name(&request.wallet_name, "Wallet name")?;
    validate_zerion_name(&request.policy_name, "Policy name")?;
    run_allowed_zerion(
        "agent_create_token",
        &request.binary,
        vec![
            "agent".to_string(),
            "create-token".to_string(),
            "--name".to_string(),
            request.token_name,
            "--wallet".to_string(),
            request.wallet_name,
            "--policy".to_string(),
            request.policy_name,
            "--json".to_string(),
        ],
        20_000,
    )
}

#[tauri::command]
fn zerion_cli_portfolio(request: ZerionAddressRequest) -> Result<ZerionCliRunPayload, String> {
    validate_zerion_address(&request.address)?;
    run_allowed_zerion(
        "portfolio",
        &request.binary,
        vec![
            "portfolio".to_string(),
            request.address,
            "--json".to_string(),
        ],
        20_000,
    )
}

#[tauri::command]
fn zerion_cli_positions(request: ZerionAddressRequest) -> Result<ZerionCliRunPayload, String> {
    validate_zerion_address(&request.address)?;
    run_allowed_zerion(
        "positions",
        &request.binary,
        vec![
            "positions".to_string(),
            request.address,
            "--json".to_string(),
        ],
        20_000,
    )
}

#[tauri::command]
fn zerion_cli_swap_tokens(request: ZerionBinaryRequest) -> Result<ZerionCliRunPayload, String> {
    run_allowed_zerion(
        "swap_tokens",
        &request.binary,
        vec![
            "swap".to_string(),
            "tokens".to_string(),
            "solana".to_string(),
            "--json".to_string(),
        ],
        15_000,
    )
}

#[tauri::command]
fn zerion_cli_swap_execute(
    request: ZerionSwapExecuteRequest,
) -> Result<ZerionCliRunPayload, String> {
    validate_zerion_swap_request(&request)?;
    run_allowed_zerion(
        "swap_execute",
        &request.binary,
        vec![
            "swap".to_string(),
            "solana".to_string(),
            request.proposal.amount_sol,
            "SOL".to_string(),
            "USDC".to_string(),
            "--wallet".to_string(),
            request.proposal.wallet_name,
            "--json".to_string(),
        ],
        90_000,
    )
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WalletVaultCreateRequest {
    label: String,
    network: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WalletVaultImportRequest {
    label: String,
    network: String,
    secret: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WalletVaultProfilePayload {
    wallet_id: String,
    label: String,
    public_address: String,
    source: String,
    security_status: String,
    keychain_account: String,
    network: String,
    created_at: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WalletVaultStatusPayload {
    wallet_id: String,
    public_address: Option<String>,
    security_status: String,
    keychain_account: String,
    secret_available: bool,
}

fn validate_wallet_label(label: &str) -> Result<String, String> {
    let trimmed = label.trim();
    if trimmed.is_empty() {
        return Err("Wallet label is required.".to_string());
    }
    if trimmed.len() > 80 {
        return Err("Wallet label must be 80 characters or fewer.".to_string());
    }
    Ok(trimmed.to_string())
}

fn validate_wallet_network(network: &str) -> Result<String, String> {
    match network {
        "localnet" | "devnet" | "mainnet-beta" | "mainnet" => Ok(network.to_string()),
        _ => Err("Unsupported wallet network.".to_string()),
    }
}

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

fn keypair_bytes_from_signing_key(signing_key: &SigningKey) -> [u8; 64] {
    let verifying_key = signing_key.verifying_key();
    let mut keypair = [0u8; 64];
    keypair[..32].copy_from_slice(&signing_key.to_bytes());
    keypair[32..].copy_from_slice(verifying_key.as_bytes());
    keypair
}

fn public_address_from_keypair_bytes(bytes: &[u8]) -> Result<String, String> {
    if bytes.len() != 64 {
        return Err("Wallet secret must normalize to a 64-byte Solana keypair.".to_string());
    }
    Ok(bs58::encode(&bytes[32..64]).into_string())
}

fn parse_json_secret_array(secret: &str) -> Result<Option<Vec<u8>>, String> {
    let trimmed = secret.trim();
    if !trimmed.starts_with('[') {
        return Ok(None);
    }
    let values: Vec<u16> = serde_json::from_str(trimmed)
        .map_err(|_| "Wallet JSON must be an array of byte values.".to_string())?;
    let mut bytes = Vec::with_capacity(values.len());
    for value in values {
        if value > u8::MAX as u16 {
            return Err("Wallet JSON contains a byte outside 0..255.".to_string());
        }
        bytes.push(value as u8);
    }
    Ok(Some(bytes))
}

fn normalize_imported_secret(secret: &str) -> Result<[u8; 64], String> {
    let bytes = match parse_json_secret_array(secret)? {
        Some(bytes) => bytes,
        None => bs58::decode(secret.trim()).into_vec().map_err(|_| {
            "Secret must be a Solana CLI JSON array or base58 secret key.".to_string()
        })?,
    };

    let seed: [u8; 32] = match bytes.len() {
        32 => bytes
            .as_slice()
            .try_into()
            .map_err(|_| "Invalid 32-byte seed.".to_string())?,
        64 => {
            let seed: [u8; 32] = bytes[..32]
                .try_into()
                .map_err(|_| "Invalid 64-byte keypair seed.".to_string())?;
            let signing_key = SigningKey::from_bytes(&seed);
            let expected_public = signing_key.verifying_key();
            if expected_public.as_bytes() != &bytes[32..64] {
                return Err("Secret key public half does not match derived public key.".to_string());
            }
            seed
        }
        _ => {
            return Err(
                "Wallet secret must be 32 seed bytes or 64 Solana keypair bytes.".to_string(),
            );
        }
    };

    let signing_key = SigningKey::from_bytes(&seed);
    Ok(keypair_bytes_from_signing_key(&signing_key))
}

fn store_wallet_keypair(
    label: String,
    network: String,
    source: &str,
    keypair_bytes: [u8; 64],
) -> Result<WalletVaultProfilePayload, String> {
    let wallet_id = format!("local-wallet-{}", uuid::Uuid::new_v4());
    let account = wallet_vault_account(&wallet_id);
    let public_address = public_address_from_keypair_bytes(&keypair_bytes)?;
    let encoded_secret = bs58::encode(keypair_bytes).into_string();
    keyring_set_secret(&account, &encoded_secret)?;
    Ok(WalletVaultProfilePayload {
        wallet_id,
        label,
        public_address,
        source: source.to_string(),
        security_status: "locked".to_string(),
        keychain_account: account,
        network,
        created_at: now_ms(),
    })
}

#[tauri::command]
fn wallet_vault_create(
    request: WalletVaultCreateRequest,
) -> Result<WalletVaultProfilePayload, String> {
    let label = validate_wallet_label(&request.label)?;
    let network = validate_wallet_network(&request.network)?;
    let signing_key = SigningKey::generate(&mut OsRng);
    let keypair_bytes = keypair_bytes_from_signing_key(&signing_key);
    store_wallet_keypair(label, network, "generated", keypair_bytes)
}

#[tauri::command]
fn wallet_vault_import(
    request: WalletVaultImportRequest,
) -> Result<WalletVaultProfilePayload, String> {
    let label = validate_wallet_label(&request.label)?;
    let network = validate_wallet_network(&request.network)?;
    let keypair_bytes = normalize_imported_secret(&request.secret)?;
    store_wallet_keypair(label, network, "imported", keypair_bytes)
}

#[tauri::command]
fn wallet_vault_status(wallet_id: String) -> WalletVaultStatusPayload {
    let account = wallet_vault_account(&wallet_id);
    let secret = keyring_get_secret(&account);
    let public_address = secret.as_deref().and_then(|encoded| {
        bs58::decode(encoded)
            .into_vec()
            .ok()
            .and_then(|bytes| public_address_from_keypair_bytes(&bytes).ok())
    });
    WalletVaultStatusPayload {
        wallet_id,
        public_address,
        security_status: if secret.is_some() {
            "locked".to_string()
        } else {
            "error".to_string()
        },
        keychain_account: account,
        secret_available: secret.is_some(),
    }
}

#[tauri::command]
fn wallet_vault_forget(wallet_id: String) -> KeyResult {
    match keyring_delete_secret(&wallet_vault_account(&wallet_id)) {
        Ok(()) => KeyResult {
            ok: true,
            error: None,
        },
        Err(error) => KeyResult {
            ok: false,
            error: Some(error),
        },
    }
}

const CLOAK_MAINNET_PROGRAM_ID: &str = "zh1eLd6rSphLejbFfJEneUwzHRfMKxgzrgkfwA6qRkW";
const CLOAK_NATIVE_SOL_MINT: &str = "So11111111111111111111111111111111111111112";
const CLOAK_DEFAULT_RELAY_URL: &str = "https://api.cloak.ag";
const CLOAK_MIN_SOL_DEPOSIT_LAMPORTS: u128 = 10_000_000;
const CLOAK_FIXED_FEE_LAMPORTS: u128 = 5_000_000;
const CLOAK_VARIABLE_FEE_NUMERATOR: u128 = 3;
const CLOAK_VARIABLE_FEE_DENOMINATOR: u128 = 1_000;
const CLOAK_APPROVAL_TTL_MS: u64 = 5 * 60 * 1_000;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CloakDepositPrepareRequest {
    wallet_id: String,
    amount_lamports: String,
    asset: String,
    network: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CloakDepositExecuteRequest {
    draft_id: String,
    wallet_id: String,
    amount_lamports: String,
    asset: String,
    network: String,
    approval_digest: String,
    approval_confirmed: bool,
    initiated_by: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CloakBeginSigningSessionRequest {
    draft_id: String,
    wallet_id: String,
    amount_lamports: String,
    asset: String,
    network: String,
    approval_digest: String,
    approval_confirmed: bool,
    initiated_by: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CloakSigningSessionPayload {
    session_id: String,
    draft_id: String,
    wallet_id: String,
    operation_kind: String,
    operation_digest: String,
    expires_at: u64,
    allowed_message_kind: String,
    allowed_transaction_kind: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CloakEndSigningSessionRequest {
    session_id: String,
    wallet_id: String,
    operation_digest: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CloakSignTransactionRequest {
    session_id: String,
    wallet_id: String,
    operation_digest: String,
    serialized_transaction: Vec<u8>,
    purpose: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CloakSignTransactionPayload {
    signed_transaction: Vec<u8>,
    signer_public_address: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CloakSignMessageRequest {
    session_id: String,
    wallet_id: String,
    operation_digest: String,
    message: Vec<u8>,
    purpose: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CloakSignMessagePayload {
    signature: Vec<u8>,
    signer_public_address: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CloakNoteSaveSecureRequest {
    wallet_id: String,
    draft_id: String,
    operation_digest: String,
    asset: String,
    amount_lamports: String,
    deposit_signature: Option<String>,
    leaf_index: Option<u64>,
    raw_note_payload: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct CloakDepositDraftPayload {
    id: String,
    wallet_id: String,
    public_address: String,
    network: String,
    asset: String,
    mint: String,
    amount_lamports: String,
    estimated_fixed_fee_lamports: String,
    estimated_variable_fee_lamports: String,
    estimated_total_fee_lamports: String,
    estimated_private_amount_lamports: String,
    relay_url: String,
    program_id: String,
    created_at: u64,
    expires_at: u64,
    status: String,
    risk_level: String,
    warnings: Vec<String>,
    approval_digest: String,
    approval_required: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CloakDepositResultPayload {
    draft_id: String,
    status: String,
    signature: Option<String>,
    request_id: Option<String>,
    note_id: Option<String>,
    submitted_at: Option<u64>,
    error: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct CloakNoteMetadataPayload {
    note_id: String,
    wallet_id: String,
    asset: String,
    amount_lamports: String,
    created_at: u64,
    signature: Option<String>,
    leaf_index: Option<u64>,
    status: String,
}

fn parse_lamports(value: &str) -> Result<u128, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() || !trimmed.chars().all(|character| character.is_ascii_digit()) {
        return Err("Amount must be a positive integer lamport string.".to_string());
    }
    let amount = trimmed
        .parse::<u128>()
        .map_err(|_| "Amount is too large.".to_string())?;
    if amount == 0 {
        return Err("Amount must be greater than zero.".to_string());
    }
    Ok(amount)
}

fn cloak_variable_fee_lamports(amount: u128) -> u128 {
    amount.saturating_mul(CLOAK_VARIABLE_FEE_NUMERATOR) / CLOAK_VARIABLE_FEE_DENOMINATOR
}

fn cloak_digest_hex(fields: &[(&str, &str)]) -> String {
    let mut hasher = Sha256::new();
    for (key, value) in fields {
        hasher.update(key.as_bytes());
        hasher.update(b"=");
        hasher.update(value.as_bytes());
        hasher.update(b"\n");
    }
    hasher
        .finalize()
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

fn cloak_deposit_approval_digest(
    wallet_id: &str,
    public_address: &str,
    network: &str,
    asset: &str,
    amount_lamports: &str,
    variable_fee_lamports: &str,
) -> String {
    cloak_digest_hex(&[
        ("operation", "cloak_deposit"),
        ("walletId", wallet_id),
        ("publicAddress", public_address),
        ("network", network),
        ("asset", asset),
        ("mint", CLOAK_NATIVE_SOL_MINT),
        ("amountLamports", amount_lamports),
        (
            "estimatedFixedFeeLamports",
            &CLOAK_FIXED_FEE_LAMPORTS.to_string(),
        ),
        ("estimatedVariableFeeLamports", variable_fee_lamports),
        ("relayUrl", CLOAK_DEFAULT_RELAY_URL),
        ("programId", CLOAK_MAINNET_PROGRAM_ID),
    ])
}

fn load_wallet_keypair(wallet_id: &str) -> Result<(String, Vec<u8>), String> {
    let account = wallet_vault_account(wallet_id);
    let encoded = keyring_get_secret(&account)
        .ok_or_else(|| "Selected local wallet is missing from secure storage.".to_string())?;
    let bytes = bs58::decode(encoded)
        .into_vec()
        .map_err(|_| "Stored wallet secret is not valid base58.".to_string())?;
    let public_address = public_address_from_keypair_bytes(&bytes)?;
    Ok((public_address, bytes))
}

fn validate_cloak_deposit_request(
    wallet_id: &str,
    amount_lamports: &str,
    asset: &str,
    network: &str,
) -> Result<(String, u128, u128, u128), String> {
    if wallet_id.trim().is_empty() {
        return Err("Wallet id is required.".to_string());
    }
    if asset != "SOL" {
        return Err("Cloak deposit supports SOL only in this phase.".to_string());
    }
    if network != "mainnet" {
        return Err("Cloak deposit is mainnet-only in this phase.".to_string());
    }
    let amount = parse_lamports(amount_lamports)?;
    if amount < CLOAK_MIN_SOL_DEPOSIT_LAMPORTS {
        return Err(format!(
            "Minimum Cloak SOL deposit is {} lamports.",
            CLOAK_MIN_SOL_DEPOSIT_LAMPORTS
        ));
    }
    let variable_fee = cloak_variable_fee_lamports(amount);
    let total_fee = CLOAK_FIXED_FEE_LAMPORTS.saturating_add(variable_fee);
    let estimated_private_amount = amount.saturating_sub(total_fee);
    Ok((
        estimated_private_amount.to_string(),
        variable_fee,
        total_fee,
        amount,
    ))
}

fn load_cloak_deposit_draft(draft_id: &str) -> Result<CloakDepositDraftPayload, String> {
    let encoded = keyring_get_secret(&cloak_deposit_draft_account(draft_id))
        .ok_or_else(|| "Cloak deposit draft is missing or expired locally.".to_string())?;
    serde_json::from_str(&encoded)
        .map_err(|_| "Cloak deposit draft metadata is invalid.".to_string())
}

fn load_cloak_note_metadata(wallet_id: &str) -> Vec<CloakNoteMetadataPayload> {
    keyring_get_secret(&cloak_note_meta_account(wallet_id))
        .and_then(|encoded| serde_json::from_str::<Vec<CloakNoteMetadataPayload>>(&encoded).ok())
        .unwrap_or_default()
}

fn save_cloak_note_metadata(
    wallet_id: &str,
    notes: &[CloakNoteMetadataPayload],
) -> Result<(), String> {
    let encoded = serde_json::to_string(notes)
        .map_err(|_| "Failed to serialize Cloak note metadata.".to_string())?;
    keyring_set_secret(&cloak_note_meta_account(wallet_id), &encoded)
}

fn validate_cloak_execution_approval(
    draft_id: &str,
    wallet_id: &str,
    amount_lamports: &str,
    asset: &str,
    network: &str,
    approval_digest: &str,
    approval_confirmed: bool,
    initiated_by: &str,
) -> Result<CloakDepositDraftPayload, String> {
    if !approval_confirmed {
        return Err("Explicit local approval is required for Cloak deposit.".to_string());
    }
    if initiated_by != "wallet_ui" {
        return Err("Cloak deposit execution is only allowed from the Wallet UI.".to_string());
    }
    if keyring_get_secret(&cloak_deposit_used_account(draft_id)).is_some() {
        return Err("Cloak deposit approval has already been used.".to_string());
    }
    let draft = load_cloak_deposit_draft(draft_id)?;
    if now_ms() > draft.expires_at {
        return Err("Cloak deposit approval has expired.".to_string());
    }
    if draft.wallet_id != wallet_id
        || draft.amount_lamports != amount_lamports.trim()
        || draft.asset != asset
        || draft.network != network
        || draft.approval_digest != approval_digest
    {
        return Err("Cloak deposit approval digest does not match the prepared draft.".to_string());
    }
    let (_estimated_private_amount, variable_fee, _total_fee, _amount) =
        validate_cloak_deposit_request(wallet_id, amount_lamports, asset, network)?;
    let expected_digest = cloak_deposit_approval_digest(
        &draft.wallet_id,
        &draft.public_address,
        &draft.network,
        &draft.asset,
        &draft.amount_lamports,
        &variable_fee.to_string(),
    );
    if expected_digest != approval_digest {
        return Err("Cloak deposit approval digest failed native verification.".to_string());
    }
    let (public_address, keypair_bytes) = load_wallet_keypair(wallet_id)?;
    if public_address != draft.public_address || keypair_bytes.len() != 64 {
        return Err("Selected local wallet does not match the prepared Cloak draft.".to_string());
    }
    Ok(draft)
}

fn validate_signing_session(
    state: &State<'_, CloakSigningRuntimeState>,
    session_id: &str,
    wallet_id: &str,
    operation_digest: &str,
    purpose: &str,
    signing_kind: &str,
) -> Result<CloakSigningSession, String> {
    let mut sessions = state
        .sessions
        .lock()
        .map_err(|_| "Cloak signing session state is unavailable.".to_string())?;
    let session = sessions
        .get_mut(session_id)
        .ok_or_else(|| "Cloak signing session is missing.".to_string())?;
    if now_ms() > session.expires_at {
        sessions.remove(session_id);
        return Err("Cloak signing session has expired.".to_string());
    }
    if session.wallet_id != wallet_id || session.operation_digest != operation_digest {
        return Err("Cloak signing session does not match the approved operation.".to_string());
    }
    if session.operation_kind != "cloak_deposit" {
        return Err("Cloak signing session is not approved for deposits.".to_string());
    }
    match signing_kind {
        "transaction" => {
            if purpose != "cloak_deposit" {
                return Err("Transaction signing is scoped to Cloak deposit only.".to_string());
            }
            if session.transaction_signatures_remaining == 0 {
                return Err(
                    "Cloak transaction signing allowance has already been used.".to_string()
                );
            }
            session.transaction_signatures_remaining =
                session.transaction_signatures_remaining.saturating_sub(1);
        }
        "message" => {
            if purpose != "cloak_viewing_key_registration" {
                return Err(
                    "Message signing is scoped to Cloak viewing-key registration only.".to_string(),
                );
            }
            if session.message_signatures_remaining == 0 {
                return Err("Cloak message signing allowance has already been used.".to_string());
            }
            session.message_signatures_remaining =
                session.message_signatures_remaining.saturating_sub(1);
        }
        _ => return Err("Unsupported Cloak signing kind.".to_string()),
    }
    Ok(session.clone())
}

fn read_shortvec(bytes: &[u8], cursor: &mut usize) -> Result<usize, String> {
    let mut value = 0usize;
    let mut shift = 0usize;
    loop {
        if *cursor >= bytes.len() {
            return Err("Serialized transaction ended while reading a compact length.".to_string());
        }
        let byte = bytes[*cursor];
        *cursor += 1;
        value |= ((byte & 0x7f) as usize) << shift;
        if byte & 0x80 == 0 {
            return Ok(value);
        }
        shift += 7;
        if shift > 21 {
            return Err("Serialized transaction compact length is too large.".to_string());
        }
    }
}

fn skip_shortvec_bytes(bytes: &[u8], cursor: &mut usize) -> Result<(), String> {
    let len = read_shortvec(bytes, cursor)?;
    *cursor = cursor
        .checked_add(len)
        .ok_or_else(|| "Serialized transaction cursor overflow.".to_string())?;
    if *cursor > bytes.len() {
        return Err("Serialized transaction ended unexpectedly.".to_string());
    }
    Ok(())
}

fn parse_solana_transaction_for_signing(
    transaction: &[u8],
    signer_public_key: &[u8],
) -> Result<(usize, usize, bool), String> {
    let mut cursor = 0usize;
    let signature_count = read_shortvec(transaction, &mut cursor)?;
    if signature_count == 0 || signature_count > 32 {
        return Err("Serialized transaction has an invalid signature count.".to_string());
    }
    let signature_start = cursor;
    let signatures_len = signature_count
        .checked_mul(64)
        .ok_or_else(|| "Serialized transaction signature section is too large.".to_string())?;
    cursor = cursor
        .checked_add(signatures_len)
        .ok_or_else(|| "Serialized transaction cursor overflow.".to_string())?;
    if cursor >= transaction.len() {
        return Err("Serialized transaction is missing a message.".to_string());
    }
    let message_start = cursor;
    let message = &transaction[message_start..];
    let mut message_cursor = 0usize;
    let versioned = message[0] & 0x80 != 0;
    if versioned {
        if message[0] & 0x7f != 0 {
            return Err(
                "Only legacy and v0 Solana transactions are supported for Cloak signing."
                    .to_string(),
            );
        }
        message_cursor += 1;
    }
    if message_cursor + 3 > message.len() {
        return Err("Serialized transaction message header is missing.".to_string());
    }
    let required_signatures = message[message_cursor] as usize;
    message_cursor += 3;
    if required_signatures == 0 || required_signatures > signature_count {
        return Err("Serialized transaction required signer count is invalid.".to_string());
    }
    let account_count = read_shortvec(message, &mut message_cursor)?;
    if account_count == 0 || account_count > 256 {
        return Err("Serialized transaction account list is invalid.".to_string());
    }
    let account_keys_start = message_cursor;
    let account_keys_len = account_count
        .checked_mul(32)
        .ok_or_else(|| "Serialized transaction account list is too large.".to_string())?;
    message_cursor = message_cursor
        .checked_add(account_keys_len)
        .ok_or_else(|| "Serialized transaction cursor overflow.".to_string())?;
    if message_cursor + 32 > message.len() {
        return Err(
            "Serialized transaction account or blockhash section is truncated.".to_string(),
        );
    }
    let mut signer_index = None;
    for index in 0..required_signatures {
        let start = account_keys_start + index * 32;
        let end = start + 32;
        if &message[start..end] == signer_public_key {
            signer_index = Some(index);
            break;
        }
    }
    let signer_index = signer_index.ok_or_else(|| {
        "Selected wallet is not a required signer for this transaction.".to_string()
    })?;

    message_cursor += 32;
    let instruction_count = read_shortvec(message, &mut message_cursor)?;
    let cloak_program_bytes = bs58::decode(CLOAK_MAINNET_PROGRAM_ID)
        .into_vec()
        .map_err(|_| "Cloak program id is invalid.".to_string())?;
    let mut contains_cloak_program = false;
    for _ in 0..instruction_count {
        if message_cursor >= message.len() {
            return Err("Serialized transaction instruction is truncated.".to_string());
        }
        let program_index = message[message_cursor] as usize;
        message_cursor += 1;
        let account_index_count = read_shortvec(message, &mut message_cursor)?;
        message_cursor = message_cursor
            .checked_add(account_index_count)
            .ok_or_else(|| {
                "Serialized transaction instruction account list is too large.".to_string()
            })?;
        if message_cursor > message.len() {
            return Err(
                "Serialized transaction instruction account list is truncated.".to_string(),
            );
        }
        skip_shortvec_bytes(message, &mut message_cursor)?;
        if program_index < account_count {
            let start = account_keys_start + program_index * 32;
            let end = start + 32;
            if &message[start..end] == cloak_program_bytes.as_slice() {
                contains_cloak_program = true;
            }
        }
    }
    if !contains_cloak_program {
        return Err(
            "Cloak deposit transaction must reference the Cloak mainnet program id.".to_string(),
        );
    }
    let signature_offset = signature_start + signer_index * 64;
    Ok((message_start, signature_offset, versioned))
}

fn sign_approved_solana_transaction(
    wallet_id: &str,
    serialized_transaction: &[u8],
) -> Result<(Vec<u8>, String), String> {
    let (public_address, keypair_bytes) = load_wallet_keypair(wallet_id)?;
    if keypair_bytes.len() != 64 {
        return Err("Stored wallet secret is not a 64-byte Solana keypair.".to_string());
    }
    let signing_seed: [u8; 32] = keypair_bytes[..32]
        .try_into()
        .map_err(|_| "Stored wallet seed is invalid.".to_string())?;
    let signing_key = SigningKey::from_bytes(&signing_seed);
    let derived_public = signing_key.verifying_key();
    if derived_public.as_bytes() != &keypair_bytes[32..64] {
        return Err("Stored wallet public key does not match the signing key.".to_string());
    }
    let (message_start, signature_offset, _versioned) =
        parse_solana_transaction_for_signing(serialized_transaction, derived_public.as_bytes())?;
    let signature = signing_key.sign(&serialized_transaction[message_start..]);
    let mut signed = serialized_transaction.to_vec();
    signed[signature_offset..signature_offset + 64].copy_from_slice(&signature.to_bytes());
    Ok((signed, public_address))
}

#[tauri::command]
fn wallet_cloak_deposit_prepare(
    request: CloakDepositPrepareRequest,
) -> Result<CloakDepositDraftPayload, String> {
    let (estimated_private_amount, variable_fee, total_fee, _amount) =
        validate_cloak_deposit_request(
            &request.wallet_id,
            &request.amount_lamports,
            &request.asset,
            &request.network,
        )?;
    let (public_address, _keypair_bytes) = load_wallet_keypair(&request.wallet_id)?;
    let created_at = now_ms();
    let expires_at = created_at.saturating_add(CLOAK_APPROVAL_TTL_MS);
    let amount_lamports = request.amount_lamports.trim().to_string();
    let variable_fee_lamports = variable_fee.to_string();
    let approval_digest = cloak_deposit_approval_digest(
        &request.wallet_id,
        &public_address,
        &request.network,
        &request.asset,
        &amount_lamports,
        &variable_fee_lamports,
    );
    let draft = CloakDepositDraftPayload {
        id: format!("cloak-deposit-{}", uuid::Uuid::new_v4()),
        wallet_id: request.wallet_id,
        public_address,
        network: request.network,
        asset: request.asset,
        mint: CLOAK_NATIVE_SOL_MINT.to_string(),
        amount_lamports,
        estimated_fixed_fee_lamports: CLOAK_FIXED_FEE_LAMPORTS.to_string(),
        estimated_variable_fee_lamports: variable_fee_lamports,
        estimated_total_fee_lamports: total_fee.to_string(),
        estimated_private_amount_lamports: estimated_private_amount,
        relay_url: CLOAK_DEFAULT_RELAY_URL.to_string(),
        program_id: CLOAK_MAINNET_PROGRAM_ID.to_string(),
        created_at,
        expires_at,
        status: "requires_approval".to_string(),
        risk_level: "high".to_string(),
        warnings: vec![
            "Cloak currently uses mainnet defaults. Use tiny test amounts first.".to_string(),
            "Deposit execution requires a one-time explicit local approval.".to_string(),
            "Private keys and Cloak notes remain in Rust secure storage.".to_string(),
        ],
        approval_digest,
        approval_required: true,
    };
    let encoded = serde_json::to_string(&draft)
        .map_err(|_| "Failed to serialize Cloak deposit draft.".to_string())?;
    keyring_set_secret(&cloak_deposit_draft_account(&draft.id), &encoded)?;
    Ok(draft)
}

#[tauri::command]
fn wallet_cloak_deposit_execute(
    request: CloakDepositExecuteRequest,
) -> Result<CloakDepositResultPayload, String> {
    validate_cloak_execution_approval(
        &request.draft_id,
        &request.wallet_id,
        &request.amount_lamports,
        &request.asset,
        &request.network,
        &request.approval_digest,
        request.approval_confirmed,
        &request.initiated_by,
    )?;
    Ok(CloakDepositResultPayload {
        draft_id: request.draft_id,
        status: "approved".to_string(),
        signature: None,
        request_id: None,
        note_id: None,
        submitted_at: None,
        error: None,
    })
}

#[tauri::command]
fn wallet_cloak_begin_signing_session(
    state: State<'_, CloakSigningRuntimeState>,
    request: CloakBeginSigningSessionRequest,
) -> Result<CloakSigningSessionPayload, String> {
    let draft = validate_cloak_execution_approval(
        &request.draft_id,
        &request.wallet_id,
        &request.amount_lamports,
        &request.asset,
        &request.network,
        &request.approval_digest,
        request.approval_confirmed,
        &request.initiated_by,
    )?;
    let session_id = format!("cloak-signing-{}", uuid::Uuid::new_v4());
    let session = CloakSigningSession {
        session_id: session_id.clone(),
        draft_id: draft.id.clone(),
        wallet_id: draft.wallet_id.clone(),
        public_address: draft.public_address.clone(),
        operation_kind: "cloak_deposit".to_string(),
        operation_digest: draft.approval_digest.clone(),
        expires_at: now_ms().saturating_add(90_000),
        transaction_signatures_remaining: 1,
        message_signatures_remaining: 1,
    };
    state
        .sessions
        .lock()
        .map_err(|_| "Cloak signing session state is unavailable.".to_string())?
        .insert(session_id.clone(), session);

    Ok(CloakSigningSessionPayload {
        session_id,
        draft_id: draft.id,
        wallet_id: draft.wallet_id,
        operation_kind: "cloak_deposit".to_string(),
        operation_digest: draft.approval_digest,
        expires_at: now_ms().saturating_add(90_000),
        allowed_message_kind: "cloak_viewing_key_registration".to_string(),
        allowed_transaction_kind: "cloak_deposit".to_string(),
    })
}

#[tauri::command]
fn wallet_cloak_end_signing_session(
    state: State<'_, CloakSigningRuntimeState>,
    request: CloakEndSigningSessionRequest,
) -> KeyResult {
    let mut sessions = match state.sessions.lock() {
        Ok(sessions) => sessions,
        Err(_) => {
            return KeyResult {
                ok: false,
                error: Some("Cloak signing session state is unavailable.".to_string()),
            }
        }
    };
    let removed = sessions.remove(&request.session_id);
    match removed {
        Some(session)
            if session.wallet_id == request.wallet_id
                && session.operation_digest == request.operation_digest =>
        {
            KeyResult {
                ok: true,
                error: None,
            }
        }
        Some(session) => {
            sessions.insert(session.session_id.clone(), session);
            KeyResult {
                ok: false,
                error: Some(
                    "Cloak signing session did not match the approved operation.".to_string(),
                ),
            }
        }
        None => KeyResult {
            ok: true,
            error: None,
        },
    }
}

#[tauri::command]
fn wallet_cloak_sign_transaction(
    state: State<'_, CloakSigningRuntimeState>,
    request: CloakSignTransactionRequest,
) -> Result<CloakSignTransactionPayload, String> {
    let session = validate_signing_session(
        &state,
        &request.session_id,
        &request.wallet_id,
        &request.operation_digest,
        &request.purpose,
        "transaction",
    )?;
    let (signed_transaction, signer_public_address) =
        sign_approved_solana_transaction(&request.wallet_id, &request.serialized_transaction)?;
    if signer_public_address != session.public_address {
        return Err("Signed transaction wallet does not match Cloak session.".to_string());
    }
    keyring_set_secret(&cloak_deposit_used_account(&session.draft_id), "used")?;
    Ok(CloakSignTransactionPayload {
        signed_transaction,
        signer_public_address,
    })
}

#[tauri::command]
fn wallet_cloak_sign_message(
    state: State<'_, CloakSigningRuntimeState>,
    request: CloakSignMessageRequest,
) -> Result<CloakSignMessagePayload, String> {
    if request.message.is_empty() || request.message.len() > 2_048 {
        return Err("Cloak viewing-key registration message size is invalid.".to_string());
    }
    let session = validate_signing_session(
        &state,
        &request.session_id,
        &request.wallet_id,
        &request.operation_digest,
        &request.purpose,
        "message",
    )?;
    let (public_address, keypair_bytes) = load_wallet_keypair(&request.wallet_id)?;
    if public_address != session.public_address || keypair_bytes.len() != 64 {
        return Err("Selected local wallet does not match the Cloak signing session.".to_string());
    }
    let signing_seed: [u8; 32] = keypair_bytes[..32]
        .try_into()
        .map_err(|_| "Stored wallet seed is invalid.".to_string())?;
    let signing_key = SigningKey::from_bytes(&signing_seed);
    let signature = signing_key.sign(&request.message);
    Ok(CloakSignMessagePayload {
        signature: signature.to_bytes().to_vec(),
        signer_public_address: public_address,
    })
}

#[tauri::command]
fn wallet_cloak_note_save_secure(
    request: CloakNoteSaveSecureRequest,
) -> Result<CloakNoteMetadataPayload, String> {
    if request.wallet_id.trim().is_empty() {
        return Err("Wallet id is required.".to_string());
    }
    if request.asset != "SOL" {
        return Err("Only SOL Cloak note metadata is supported in this phase.".to_string());
    }
    parse_lamports(&request.amount_lamports)?;
    if request.raw_note_payload.trim().is_empty() || request.raw_note_payload.len() > 128_000 {
        return Err("Cloak note payload size is invalid.".to_string());
    }
    let draft = load_cloak_deposit_draft(&request.draft_id)?;
    if draft.wallet_id != request.wallet_id || draft.approval_digest != request.operation_digest {
        return Err("Cloak note save request does not match the approved draft.".to_string());
    }
    let note_id = format!("cloak-note-{}", uuid::Uuid::new_v4());
    keyring_set_secret(
        &cloak_note_account(&request.wallet_id, &note_id),
        &request.raw_note_payload,
    )?;
    let metadata = CloakNoteMetadataPayload {
        note_id: note_id.clone(),
        wallet_id: request.wallet_id.clone(),
        asset: request.asset,
        amount_lamports: request.amount_lamports,
        created_at: now_ms(),
        signature: request.deposit_signature,
        leaf_index: request.leaf_index,
        status: "confirmed".to_string(),
    };
    let mut notes = load_cloak_note_metadata(&request.wallet_id);
    notes.push(metadata.clone());
    save_cloak_note_metadata(&request.wallet_id, &notes)?;
    Ok(metadata)
}

#[tauri::command]
fn wallet_cloak_notes_list(wallet_id: String) -> Vec<CloakNoteMetadataPayload> {
    load_cloak_note_metadata(&wallet_id)
}

#[tauri::command]
fn wallet_cloak_note_status(
    wallet_id: String,
    note_id: String,
) -> Result<CloakNoteMetadataPayload, String> {
    load_cloak_note_metadata(&wallet_id)
        .into_iter()
        .find(|note| note.note_id == note_id)
        .ok_or_else(|| "Cloak note metadata was not found.".to_string())
}

#[tauri::command]
fn wallet_cloak_note_forget(wallet_id: String, note_id: String) -> KeyResult {
    let mut notes = load_cloak_note_metadata(&wallet_id);
    notes.retain(|note| note.note_id != note_id);
    let raw_deleted = keyring_delete_secret(&cloak_note_account(&wallet_id, &note_id)).is_ok();
    let meta_saved = save_cloak_note_metadata(&wallet_id, &notes).is_ok();
    KeyResult {
        ok: raw_deleted || meta_saved,
        error: if raw_deleted || meta_saved {
            None
        } else {
            Some("Failed to forget Cloak note metadata.".to_string())
        },
    }
}

fn is_local_dev_host(host: Option<&str>) -> bool {
    matches!(host, Some("localhost" | "127.0.0.1"))
}

fn is_allowed_webview_url(url: &tauri::Url) -> bool {
    if url.scheme() == "tauri" {
        return true;
    }

    if url.host_str() == Some("tauri.localhost") {
        return true;
    }

    cfg!(dev) && matches!(url.scheme(), "http" | "https") && is_local_dev_host(url.host_str())
}

fn app_base_origin() -> Option<(String, String, u16)> {
    option_env!("APP_BASE_URL")
        .and_then(|value| tauri::Url::parse(value).ok())
        .and_then(|url| {
            Some((
                url.scheme().to_string(),
                url.host_str()?.to_ascii_lowercase(),
                url.port_or_known_default()?,
            ))
        })
}

fn is_allowed_external_url(url: &tauri::Url) -> bool {
    let Some(host) = url.host_str().map(|value| value.to_ascii_lowercase()) else {
        return false;
    };

    if url.scheme() == "https" && (host == "stripe.com" || host.ends_with(".stripe.com")) {
        return true;
    }

    if url.scheme() == "https" && (host == "github.com" || host.ends_with(".github.com")) {
        return true;
    }

    let Some(port) = url.port_or_known_default() else {
        return false;
    };

    app_base_origin()
        .map(|(allowed_scheme, allowed_host, allowed_port)| {
            url.scheme() == allowed_scheme && host == allowed_host && port == allowed_port
        })
        .unwrap_or(false)
}

fn desktop_auth_html_page(title: &str, message: &str) -> String {
    format!(
        "<!doctype html><html><head><meta charset=\"utf-8\"><title>{}</title><style>body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;background:#f5f7fb;color:#111827}}main{{max-width:30rem;margin:15vh auto;padding:2rem;background:#fff;border:1px solid #dbe3f0;border-radius:1rem;box-shadow:0 18px 50px rgba(15,23,42,.08)}}h1{{margin:0 0 .75rem;font-size:1.25rem}}p{{margin:0;line-height:1.5;color:#4b5563}}</style></head><body><main><h1>{}</h1><p>{}</p></main></body></html>",
        title, title, message
    )
}

async fn write_desktop_auth_response(
    socket: &mut tokio::net::TcpStream,
    status_line: &str,
    body: &str,
) -> Result<(), String> {
    let response = format!(
        "{status_line}\r\ncontent-type: text/html; charset=utf-8\r\ncontent-length: {}\r\ncache-control: no-store\r\nconnection: close\r\n\r\n{}",
        body.len(),
        body
    );

    socket
        .write_all(response.as_bytes())
        .await
        .map_err(|e| format!("Failed to write desktop auth response: {}", e))
}

async fn read_desktop_auth_request(socket: &mut tokio::net::TcpStream) -> Result<String, String> {
    let mut buffer = vec![0_u8; 8192];
    let mut total = 0_usize;

    loop {
        if total == buffer.len() {
            return Err("Desktop auth callback request was too large".to_string());
        }

        let read = socket
            .read(&mut buffer[total..])
            .await
            .map_err(|e| format!("Failed to read desktop auth callback: {}", e))?;

        if read == 0 {
            break;
        }

        total += read;

        if buffer[..total]
            .windows(4)
            .any(|window| window == b"\r\n\r\n")
        {
            break;
        }
    }

    if total == 0 {
        return Err("Desktop auth callback closed before a request was received".to_string());
    }

    Ok(String::from_utf8_lossy(&buffer[..total]).into_owned())
}

async fn handle_desktop_auth_connection(
    mut socket: tokio::net::TcpStream,
    expected_state: &str,
) -> Result<DesktopAuthLoopbackPayload, String> {
    let request = read_desktop_auth_request(&mut socket).await?;
    let request_line = request
        .lines()
        .next()
        .ok_or_else(|| "Desktop auth callback request was malformed".to_string())?;

    let mut parts = request_line.split_whitespace();
    let method = parts.next().unwrap_or_default();
    let target = parts.next().unwrap_or_default();

    if method != "GET" {
        let body = desktop_auth_html_page(
            "Desktop sign-in failed",
            "The browser callback used an unsupported HTTP method.",
        );
        let _ = write_desktop_auth_response(&mut socket, "HTTP/1.1 405 Method Not Allowed", &body)
            .await;
        return Err("Desktop auth callback must use GET".to_string());
    }

    let parsed = tauri::Url::parse(&format!("http://127.0.0.1{}", target))
        .map_err(|e| format!("Desktop auth callback URL was invalid: {}", e))?;

    if parsed.path() != DESKTOP_AUTH_CALLBACK_PATH {
        let body = desktop_auth_html_page(
            "Desktop sign-in failed",
            "The browser callback path was not recognized.",
        );
        let _ = write_desktop_auth_response(&mut socket, "HTTP/1.1 404 Not Found", &body).await;
        return Err(
            "Desktop auth callback path did not match the expected listener path".to_string(),
        );
    }

    let state = match parsed
        .query_pairs()
        .find(|(key, _)| key == "state")
        .map(|(_, value)| value.into_owned())
    {
        Some(value) => value,
        None => {
            let body = desktop_auth_html_page(
                "Desktop sign-in failed",
                "The browser callback was missing its state value.",
            );
            let _ =
                write_desktop_auth_response(&mut socket, "HTTP/1.1 400 Bad Request", &body).await;
            return Err("Desktop auth callback was missing state".to_string());
        }
    };

    let handoff_token = match parsed
        .query_pairs()
        .find(|(key, _)| key == "handoffToken")
        .map(|(_, value)| value.into_owned())
    {
        Some(value) => value,
        None => {
            let body = desktop_auth_html_page(
                "Desktop sign-in failed",
                "The browser callback was missing the handoff token.",
            );
            let _ =
                write_desktop_auth_response(&mut socket, "HTTP/1.1 400 Bad Request", &body).await;
            return Err("Desktop auth callback was missing the handoff token".to_string());
        }
    };

    if state != expected_state {
        let body = desktop_auth_html_page(
            "Desktop sign-in failed",
            "The sign-in state did not match this desktop session.",
        );
        let _ = write_desktop_auth_response(&mut socket, "HTTP/1.1 400 Bad Request", &body).await;
        return Err("Desktop auth callback state mismatch".to_string());
    }

    let body = desktop_auth_html_page("Desktop sign-in complete", "You can return to GORKH.");
    write_desktop_auth_response(&mut socket, "HTTP/1.1 200 OK", &body).await?;

    Ok(DesktopAuthLoopbackPayload {
        handoff_token,
        state,
    })
}

async fn run_desktop_auth_listener(
    listener: TcpListener,
    expected_state: String,
    mut shutdown_rx: oneshot::Receiver<()>,
    result_tx: oneshot::Sender<Result<DesktopAuthLoopbackPayload, String>>,
) {
    let outcome = tokio::select! {
        _ = &mut shutdown_rx => Err("Desktop auth listener canceled".to_string()),
        accept_result = listener.accept() => {
            match accept_result {
                Ok((socket, _)) => handle_desktop_auth_connection(socket, &expected_state).await,
                Err(e) => Err(format!("Failed to accept desktop auth callback: {}", e)),
            }
        }
    };

    let _ = result_tx.send(outcome);
}

fn create_main_window(app: &AppHandle) -> Result<(), tauri::Error> {
    let window_config = app
        .config()
        .app
        .windows
        .iter()
        .find(|window| window.label == "main")
        .cloned()
        .or_else(|| app.config().app.windows.first().cloned())
        .expect("main window config missing");

    WebviewWindowBuilder::from_config(app, &window_config)?
        .on_navigation(is_allowed_webview_url)
        .on_new_window(|_url, _features| NewWindowResponse::Deny)
        .build()?;

    Ok(())
}

fn create_autolaunch() -> Result<auto_launch::AutoLaunch, String> {
    let current_exe = std::env::current_exe()
        .map_err(|e| format!("Failed to resolve current executable: {}", e))?;
    let app_path = current_exe
        .to_str()
        .ok_or_else(|| "Executable path is not valid UTF-8".to_string())?;

    auto_launch::AutoLaunchBuilder::new()
        .set_app_name("GORKH")
        .set_app_path(app_path)
        .build()
        .map_err(|e| format!("Failed to configure auto-start: {}", e))
}

fn build_tray_menu(
    app: &AppHandle,
    state: &TrayMenuState,
) -> Result<tauri::menu::Menu<tauri::Wry>, tauri::Error> {
    let toggle_window = MenuItemBuilder::with_id(
        "toggle_window",
        if state.window_visible {
            "Hide GORKH"
        } else {
            "Show GORKH"
        },
    )
    .build(app)?;

    let toggle_screen = MenuItemBuilder::with_id(
        "toggle_screen_preview",
        if state.screen_preview_enabled {
            "Disable Screen Preview"
        } else {
            "Enable Screen Preview"
        },
    )
    .build(app)?;

    let toggle_control = MenuItemBuilder::with_id(
        "toggle_allow_control",
        if state.allow_control_enabled {
            "Disable Allow Control"
        } else {
            "Enable Allow Control"
        },
    )
    .build(app)?;

    let ai_label = if !state.ai_assist_active {
        "AI Assist Not Running"
    } else if state.ai_assist_paused {
        "Resume AI Assist"
    } else {
        "Pause AI Assist"
    };

    let toggle_ai = MenuItemBuilder::with_id("toggle_ai_pause", ai_label).build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit GORKH").build(app)?;
    let separator = PredefinedMenuItem::separator(app)?;

    MenuBuilder::new(app)
        .items(&[
            &toggle_window,
            &toggle_screen,
            &toggle_control,
            &toggle_ai,
            &separator,
            &quit,
        ])
        .build()
}

fn refresh_tray_menu(app: &AppHandle, state: &TrayMenuState) -> Result<(), String> {
    let tray = app
        .tray_by_id("main-tray")
        .ok_or_else(|| "Tray icon not initialized".to_string())?;
    let menu =
        build_tray_menu(app, state).map_err(|e| format!("Failed to build tray menu: {}", e))?;
    tray.set_menu(Some(menu))
        .map_err(|e| format!("Failed to update tray menu: {}", e))?;
    Ok(())
}

fn hide_window_to_tray(window: &tauri::WebviewWindow, runtime: &TrayRuntimeState) {
    let _ = window.hide();
    let _ = window.emit("tray.hide", ());

    let mut guard = runtime.menu.lock().unwrap();
    guard.window_visible = false;

    if !guard.has_shown_tray_tip {
        guard.has_shown_tray_tip = true;
        let _ = window.emit("tray.tip", ());
    }

    let app = window.app_handle();
    let _ = refresh_tray_menu(app, &guard.clone());
}

fn overlay_mode_supported() -> bool {
    cfg!(target_os = "macos") || cfg!(target_os = "windows")
}

fn capture_overlay_window_snapshot(window: &tauri::WebviewWindow) -> OverlayWindowSnapshot {
    let size = window
        .inner_size()
        .unwrap_or(tauri::PhysicalSize::new(1200, 800));
    let pos = window
        .inner_position()
        .unwrap_or(tauri::PhysicalPosition::new(0, 0));
    OverlayWindowSnapshot {
        fullscreen: window.is_fullscreen().unwrap_or(false),
        maximized: window.is_maximized().unwrap_or(false),
        decorations: window.is_decorated().unwrap_or(true),
        resizable: window.is_resizable().unwrap_or(true),
        width: size.width,
        height: size.height,
        x: pos.x,
        y: pos.y,
    }
}

fn restore_overlay_window_snapshot(
    window: &tauri::WebviewWindow,
    snapshot: &OverlayWindowSnapshot,
) -> Result<(), String> {
    window
        .set_fullscreen(snapshot.fullscreen)
        .map_err(|e| format!("Failed to restore fullscreen state: {}", e))?;
    window
        .set_always_on_top(false)
        .map_err(|e| format!("Failed to restore always-on-top state: {}", e))?;
    window
        .set_decorations(snapshot.decorations)
        .map_err(|e| format!("Failed to restore window decorations: {}", e))?;
    window
        .set_resizable(snapshot.resizable)
        .map_err(|e| format!("Failed to restore window resize state: {}", e))?;
    window
        .set_size(tauri::Size::Physical(tauri::PhysicalSize::new(
            snapshot.width,
            snapshot.height,
        )))
        .map_err(|e| format!("Failed to restore window size: {}", e))?;
    window
        .set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(
            snapshot.x, snapshot.y,
        )))
        .map_err(|e| format!("Failed to restore window position: {}", e))?;
    if snapshot.maximized {
        window
            .maximize()
            .map_err(|e| format!("Failed to restore maximized state: {}", e))?;
    } else {
        window
            .unmaximize()
            .map_err(|e| format!("Failed to restore maximized state: {}", e))?;
    }
    Ok(())
}

fn main_window_enter_overlay_mode_impl(
    app: &AppHandle,
    runtime: &OverlayModeRuntimeState,
) -> Result<(), String> {
    if !overlay_mode_supported() {
        let mut guard = runtime.state.lock().unwrap();
        guard.active = false;
        guard.last_error =
            Some("Overlay mode is not supported on this OS in this build.".to_string());
        return Err("Overlay mode is not supported on this OS in this build.".to_string());
    }

    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;

    let snapshot = capture_overlay_window_snapshot(&window);

    window
        .show()
        .map_err(|e| format!("Failed to show window for overlay mode: {}", e))?;
    let _ = window.set_focus();
    window.set_decorations(false).map_err(|e| {
        format!(
            "Failed to remove window decorations for overlay mode: {}",
            e
        )
    })?;
    window
        .set_resizable(false)
        .map_err(|e| format!("Failed to lock window resizing for overlay mode: {}", e))?;
    window
        .set_always_on_top(true)
        .map_err(|e| format!("Failed to enable always-on-top for overlay mode: {}", e))?;

    // Instead of native fullscreen (which traps the window in its own Space
    // on macOS and blocks seeing other apps), size the window to the current
    // monitor so it covers the screen while remaining on the normal desktop.
    let monitor = window
        .current_monitor()
        .map_err(|e| format!("Failed to get current monitor: {}", e))?
        .ok_or_else(|| "No current monitor found".to_string())?;
    let monitor_size = monitor.size();
    let monitor_pos = monitor.position();
    if let Err(error) = window.set_size(tauri::Size::Physical(*monitor_size)) {
        let _ = restore_overlay_window_snapshot(&window, &snapshot);
        let message = format!("Failed to resize window for overlay mode: {}", error);
        let mut guard = runtime.state.lock().unwrap();
        guard.active = false;
        guard.previous = None;
        guard.last_error = Some(message.clone());
        return Err(message);
    }
    if let Err(error) = window.set_position(tauri::Position::Physical(*monitor_pos)) {
        let _ = restore_overlay_window_snapshot(&window, &snapshot);
        let message = format!("Failed to position window for overlay mode: {}", error);
        let mut guard = runtime.state.lock().unwrap();
        guard.active = false;
        guard.previous = None;
        guard.last_error = Some(message.clone());
        return Err(message);
    }

    // Apply macOS vibrancy for the frosted-glass see-through effect.
    #[cfg(target_os = "macos")]
    {
        let _ = window_vibrancy::apply_vibrancy(
            &window,
            window_vibrancy::NSVisualEffectMaterial::HudWindow,
            None,
            None,
        );
    }

    let mut guard = runtime.state.lock().unwrap();
    guard.active = true;
    guard.previous = Some(snapshot);
    guard.last_error = None;
    Ok(())
}

fn main_window_exit_overlay_mode_impl(
    app: &AppHandle,
    runtime: &OverlayModeRuntimeState,
) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;

    // Clear macOS vibrancy before restoring normal window state.
    #[cfg(target_os = "macos")]
    {
        let _ = window_vibrancy::clear_vibrancy(&window);
    }

    let previous = {
        let guard = runtime.state.lock().unwrap();
        guard.previous.clone()
    };

    if let Some(snapshot) = previous.as_ref() {
        restore_overlay_window_snapshot(&window, snapshot)?;
    } else {
        window
            .set_always_on_top(false)
            .map_err(|e| format!("Failed to clear always-on-top overlay mode: {}", e))?;
        window
            .set_decorations(true)
            .map_err(|e| format!("Failed to restore window decorations: {}", e))?;
        window
            .set_resizable(true)
            .map_err(|e| format!("Failed to restore window resizing: {}", e))?;
    }

    let mut guard = runtime.state.lock().unwrap();
    guard.active = false;
    guard.previous = None;
    guard.last_error = None;
    Ok(())
}

#[tauri::command]
fn main_window_enter_overlay_mode(
    app: AppHandle,
    runtime: State<'_, OverlayModeRuntimeState>,
) -> KeyResult {
    match main_window_enter_overlay_mode_impl(&app, &runtime) {
        Ok(()) => KeyResult {
            ok: true,
            error: None,
        },
        Err(error) => KeyResult {
            ok: false,
            error: Some(error),
        },
    }
}

#[tauri::command]
fn main_window_exit_overlay_mode(
    app: AppHandle,
    runtime: State<'_, OverlayModeRuntimeState>,
) -> KeyResult {
    match main_window_exit_overlay_mode_impl(&app, &runtime) {
        Ok(()) => KeyResult {
            ok: true,
            error: None,
        },
        Err(error) => KeyResult {
            ok: false,
            error: Some(error),
        },
    }
}

#[tauri::command]
fn main_window_overlay_status(
    runtime: State<'_, OverlayModeRuntimeState>,
) -> OverlayWindowStatusPayload {
    let guard = runtime.state.lock().unwrap();
    OverlayWindowStatusPayload {
        active: guard.active,
        supported: overlay_mode_supported(),
        last_error: guard.last_error.clone(),
    }
}

#[tauri::command]
fn tray_update_state(
    app: AppHandle,
    runtime: State<'_, TrayRuntimeState>,
    window_visible: bool,
    screen_preview_enabled: bool,
    allow_control_enabled: bool,
    ai_assist_active: bool,
    ai_assist_paused: bool,
) -> KeyResult {
    let mut guard = runtime.menu.lock().unwrap();
    guard.window_visible = window_visible;
    guard.screen_preview_enabled = screen_preview_enabled;
    guard.allow_control_enabled = allow_control_enabled;
    guard.ai_assist_active = ai_assist_active;
    guard.ai_assist_paused = ai_assist_paused;

    match refresh_tray_menu(&app, &guard.clone()) {
        Ok(()) => KeyResult {
            ok: true,
            error: None,
        },
        Err(e) => KeyResult {
            ok: false,
            error: Some(e),
        },
    }
}

#[tauri::command]
fn main_window_show(app: AppHandle, runtime: State<'_, TrayRuntimeState>) -> KeyResult {
    let Some(window) = app.get_webview_window("main") else {
        return KeyResult {
            ok: false,
            error: Some("Main window not found".to_string()),
        };
    };

    if let Err(e) = window.show() {
        return KeyResult {
            ok: false,
            error: Some(format!("Failed to show window: {}", e)),
        };
    }
    let _ = window.set_focus();
    let _ = window.emit("tray.show", ());

    let mut guard = runtime.menu.lock().unwrap();
    guard.window_visible = true;
    let _ = refresh_tray_menu(&app, &guard.clone());

    KeyResult {
        ok: true,
        error: None,
    }
}

#[tauri::command]
fn main_window_hide(app: AppHandle, runtime: State<'_, TrayRuntimeState>) -> KeyResult {
    let Some(window) = app.get_webview_window("main") else {
        return KeyResult {
            ok: false,
            error: Some("Main window not found".to_string()),
        };
    };

    hide_window_to_tray(&window, &runtime);
    let mut guard = runtime.menu.lock().unwrap();
    guard.window_visible = false;
    let _ = refresh_tray_menu(&app, &guard.clone());

    KeyResult {
        ok: true,
        error: None,
    }
}

#[tauri::command]
fn permissions_get_status() -> PermissionStatusPayload {
    PermissionStatusPayload {
        // Do not probe Screen Recording here. On macOS, probing requires a screen
        // capture attempt and can trigger the OS permission prompt on app launch.
        // Desktop Vision/screen capture must stay explicit opt-in.
        screen_recording: PermissionState::Unknown,
        accessibility: detect_accessibility_status(),
    }
}

#[tauri::command]
fn permissions_open_settings(app: AppHandle, target: PermissionTarget) -> KeyResult {
    match open_permission_settings_impl(&app, target) {
        Ok(()) => KeyResult {
            ok: true,
            error: None,
        },
        Err(error) => KeyResult {
            ok: false,
            error: Some(error),
        },
    }
}

#[tauri::command]
fn open_external_url(app: AppHandle, url: String) -> KeyResult {
    let parsed = match tauri::Url::parse(&url) {
        Ok(value) => value,
        Err(e) => {
            return KeyResult {
                ok: false,
                error: Some(format!("Invalid URL: {}", e)),
            }
        }
    };

    if !is_allowed_external_url(&parsed) {
        return KeyResult {
            ok: false,
            error: Some("External URL blocked by desktop allowlist".to_string()),
        };
    }

    match app.opener().open_url(parsed.as_str(), None::<&str>) {
        Ok(()) => KeyResult {
            ok: true,
            error: None,
        },
        Err(e) => KeyResult {
            ok: false,
            error: Some(format!("Failed to open URL: {}", e)),
        },
    }
}

fn launch_app_by_name(app_name: &str) -> Result<(), String> {
    let trimmed = app_name.trim();
    if trimmed.is_empty() {
        return Err("Application name cannot be empty".to_string());
    }

    #[cfg(target_os = "macos")]
    {
        let status = std::process::Command::new("open")
            .arg("-a")
            .arg(trimmed)
            .status()
            .map_err(|e| format!("Failed to launch application: {}", e))?;

        if status.success() {
            return Ok(());
        }

        Err(format!(
            "Application launcher exited with status {}",
            status
        ))
    }

    #[cfg(target_os = "windows")]
    {
        let status = std::process::Command::new("cmd")
            .args(["/C", "start", "", trimmed])
            .status()
            .map_err(|e| format!("Failed to launch application: {}", e))?;

        if status.success() {
            return Ok(());
        }

        Err(format!(
            "Application launcher exited with status {}",
            status
        ))
    }

    #[cfg(target_os = "linux")]
    {
        let candidates = [
            trimmed.to_string(),
            trimmed.to_ascii_lowercase(),
            trimmed.to_ascii_lowercase().replace(' ', "-"),
            trimmed.to_ascii_lowercase().replace(' ', ""),
        ];

        for candidate in candidates {
            let mut launched = false;

            if let Ok(status) = std::process::Command::new("gtk-launch")
                .arg(&candidate)
                .status()
            {
                launched = status.success();
            }

            if launched {
                return Ok(());
            }
        }

        Err(format!(
            "Failed to launch application '{}'. Try installing a desktop launcher or use a full app id.",
            trimmed
        ))
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        let _ = trimmed;
        Err("Application launch is not supported on this platform".to_string())
    }
}

#[tauri::command]
fn open_application(app_name: String) -> KeyResult {
    match launch_app_by_name(&app_name) {
        Ok(()) => KeyResult {
            ok: true,
            error: None,
        },
        Err(error) => KeyResult {
            ok: false,
            error: Some(error),
        },
    }
}

#[tauri::command]
async fn desktop_auth_listen_start(
    runtime: State<'_, DesktopAuthRuntimeState>,
    state: String,
    timeout_ms: Option<u64>,
) -> Result<DesktopAuthLoopbackStartPayload, String> {
    let _ = normalized_timeout_ms(timeout_ms);
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| format!("Failed to bind desktop auth loopback listener: {}", e))?;
    let addr = listener
        .local_addr()
        .map_err(|e| format!("Failed to resolve desktop auth loopback port: {}", e))?;
    let callback_url = format!(
        "http://127.0.0.1:{}{}",
        addr.port(),
        DESKTOP_AUTH_CALLBACK_PATH
    );

    let (result_tx, result_rx) = oneshot::channel();
    let (shutdown_tx, shutdown_rx) = oneshot::channel();

    {
        let mut guard = runtime.pending.lock().await;
        if let Some(mut existing) = guard.take() {
            if let Some(existing_shutdown) = existing.shutdown_tx.take() {
                let _ = existing_shutdown.send(());
            }
        }

        *guard = Some(PendingDesktopAuthListener {
            result_rx: Some(result_rx),
            shutdown_tx: Some(shutdown_tx),
        });
    }

    tauri::async_runtime::spawn(run_desktop_auth_listener(
        listener,
        state,
        shutdown_rx,
        result_tx,
    ));

    Ok(DesktopAuthLoopbackStartPayload { callback_url })
}

#[tauri::command]
async fn desktop_auth_listen_finish(
    runtime: State<'_, DesktopAuthRuntimeState>,
    timeout_ms: Option<u64>,
) -> Result<DesktopAuthLoopbackPayload, String> {
    let timeout_ms = normalized_timeout_ms(timeout_ms);
    let result_rx = {
        let mut guard = runtime.pending.lock().await;
        let pending = guard
            .as_mut()
            .ok_or_else(|| "Desktop auth listener is not running".to_string())?;

        pending
            .result_rx
            .take()
            .ok_or_else(|| "Desktop auth callback is already being awaited".to_string())?
    };

    let outcome = timeout(Duration::from_millis(timeout_ms), result_rx).await;

    let mut guard = runtime.pending.lock().await;
    if let Some(mut pending) = guard.take() {
        if let Some(shutdown_tx) = pending.shutdown_tx.take() {
            let _ = shutdown_tx.send(());
        }
    }

    match outcome {
        Ok(result) => match result {
            Ok(payload) => payload,
            Err(_) => Err("Desktop auth listener ended unexpectedly".to_string()),
        },
        Err(_) => Err("Desktop sign-in timed out before the browser callback arrived".to_string()),
    }
}

#[tauri::command]
async fn desktop_auth_listen_cancel(
    runtime: State<'_, DesktopAuthRuntimeState>,
) -> Result<KeyResult, String> {
    let mut guard = runtime.pending.lock().await;

    if let Some(mut pending) = guard.take() {
        if let Some(shutdown_tx) = pending.shutdown_tx.take() {
            let _ = shutdown_tx.send(());
        }
    }

    Ok(KeyResult {
        ok: true,
        error: None,
    })
}

#[tauri::command]
fn autostart_supported() -> bool {
    cfg!(target_os = "macos") || cfg!(target_os = "windows")
}

#[tauri::command]
fn autostart_is_enabled() -> Result<bool, String> {
    if !autostart_supported() {
        return Ok(false);
    }

    let auto = create_autolaunch()?;
    auto.is_enabled()
        .map_err(|e| format!("Failed to read auto-start state: {}", e))
}

#[tauri::command]
fn autostart_set_enabled(enabled: bool) -> KeyResult {
    if !autostart_supported() {
        return KeyResult {
            ok: false,
            error: Some("Auto-start is not supported on this OS".to_string()),
        };
    }

    match create_autolaunch() {
        Ok(auto) => {
            let result = if enabled {
                auto.enable()
            } else {
                auto.disable()
            };

            match result {
                Ok(()) => KeyResult {
                    ok: true,
                    error: None,
                },
                Err(e) => KeyResult {
                    ok: false,
                    error: Some(format!("Failed to update auto-start: {}", e)),
                },
            }
        }
        Err(e) => KeyResult {
            ok: false,
            error: Some(e),
        },
    }
}

#[tauri::command]
fn device_token_set(device_id: String, token: String) -> KeyResult {
    match keyring_set_secret(&device_token_account(&device_id), &token) {
        Ok(()) => KeyResult {
            ok: true,
            error: None,
        },
        Err(error) => KeyResult {
            ok: false,
            error: Some(error),
        },
    }
}

#[tauri::command]
fn device_token_get(device_id: String) -> Option<String> {
    keyring_get_secret(&device_token_account(&device_id))
}

#[tauri::command]
fn device_token_clear(device_id: String) -> KeyResult {
    match keyring_delete_secret(&device_token_account(&device_id)) {
        Ok(()) => KeyResult {
            ok: true,
            error: None,
        },
        Err(error) => KeyResult {
            ok: false,
            error: Some(error),
        },
    }
}

#[tauri::command]
fn set_llm_api_key(provider: String, key: String) -> KeyResult {
    match keyring_set_secret(&format!("llm_api_key:{}", provider), &key) {
        Ok(()) => KeyResult {
            ok: true,
            error: None,
        },
        Err(error) => KeyResult {
            ok: false,
            error: Some(error),
        },
    }
}

#[tauri::command]
fn has_llm_api_key(provider: String) -> bool {
    keyring_get_secret(&format!("llm_api_key:{}", provider)).is_some()
}

#[tauri::command]
fn clear_llm_api_key(provider: String) -> KeyResult {
    match keyring_delete_secret(&format!("llm_api_key:{}", provider)) {
        Ok(()) => KeyResult {
            ok: true,
            error: None,
        },
        Err(error) => KeyResult {
            ok: false,
            error: Some(error),
        },
    }
}

// ============================================================================
// Iteration 6: AI Assist - LLM Proposal
// ============================================================================

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProposalRequest {
    provider: String,
    base_url: String,
    model: String,
    goal: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    api_key_override: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    screenshot_png_base64: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    screenshot_width: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    screenshot_height: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    display_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    history: Option<llm::ActionHistory>,
    constraints: llm::RunConstraints,
    #[serde(skip_serializing_if = "Option::is_none")]
    workspace_configured: Option<bool>,
    /// Structured GORKH app state for grounding — no sensitive data.
    #[serde(skip_serializing_if = "Option::is_none")]
    app_context: Option<String>,
    /// Correlation ID for tracing requests across desktop/API boundaries
    #[serde(skip_serializing_if = "Option::is_none")]
    correlation_id: Option<String>,
}

#[derive(Serialize)]
struct ProposalResult {
    #[serde(flatten)]
    proposal: llm::AgentProposal,
}

#[derive(Serialize)]
struct ProposalError {
    code: String,
    message: String,
}

fn proposal_error_from_llm(error: llm::LlmError) -> ProposalError {
    ProposalError {
        code: error.code.to_string(),
        message: error.message,
    }
}

fn resolve_llm_api_key(provider: &str) -> Result<String, ProposalError> {
    match provider {
        "openai_compat" => {
            Ok(keyring_get_secret(&format!("llm_api_key:{}", provider)).unwrap_or_default())
        }
        "openai" | "claude" | "deepseek" | "minimax" | "kimi" => {
            keyring_get_secret(&format!("llm_api_key:{}", provider)).ok_or_else(|| ProposalError {
                code: "NO_API_KEY".to_string(),
                message: "No API key configured".to_string(),
            })
        }
        _ => Ok(String::new()),
    }
}

#[tauri::command]
async fn llm_propose_next_action(params: ProposalRequest) -> Result<ProposalResult, ProposalError> {
    let api_key = params
        .api_key_override
        .clone()
        .unwrap_or(resolve_llm_api_key(&params.provider)?);

    // Get workspace configuration status
    let workspace_configured = params
        .workspace_configured
        .or_else(|| Some(workspace::current_workspace_root().is_some()));

    let proposal_params = llm::ProposalParams {
        provider: params.provider,
        base_url: params.base_url,
        model: params.model,
        api_key,
        goal: params.goal,
        screenshot_png_base64: params.screenshot_png_base64,
        screenshot_width: params.screenshot_width,
        screenshot_height: params.screenshot_height,
        display_id: params.display_id,
        history: params.history,
        constraints: params.constraints,
        workspace_configured,
        app_context: params.app_context,
        correlation_id: params.correlation_id,
    };

    let provider =
        llm::create_provider(&proposal_params.provider).map_err(proposal_error_from_llm)?;

    let proposal = provider
        .propose_next_action(&proposal_params)
        .await
        .map_err(proposal_error_from_llm)?;

    Ok(ProposalResult { proposal })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConversationTurnRequest {
    provider: String,
    base_url: String,
    model: String,
    messages: Vec<llm::ConversationTurnMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    api_key_override: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    app_context: Option<String>,
    /// Correlation ID for tracing requests across desktop/API boundaries
    #[serde(skip_serializing_if = "Option::is_none")]
    correlation_id: Option<String>,
}

#[derive(Serialize)]
struct ConversationTurnResponse {
    #[serde(flatten)]
    result: llm::ConversationTurnResult,
}

#[tauri::command]
async fn assistant_conversation_turn(
    params: ConversationTurnRequest,
) -> Result<ConversationTurnResponse, ProposalError> {
    let api_key = params
        .api_key_override
        .clone()
        .unwrap_or(resolve_llm_api_key(&params.provider)?);
    let conversation_params = llm::ConversationTurnParams {
        provider: params.provider,
        base_url: params.base_url,
        model: params.model,
        api_key,
        messages: params.messages,
        app_context: params.app_context,
        correlation_id: params.correlation_id,
    };

    let provider =
        llm::create_provider(&conversation_params.provider).map_err(proposal_error_from_llm)?;

    let result = provider
        .conversation_turn(&conversation_params)
        .await
        .map_err(proposal_error_from_llm)?;

    Ok(ConversationTurnResponse { result })
}

// Resize RGBA image
fn resize_rgba(
    rgba: &[u8],
    src_width: u32,
    src_height: u32,
    dst_width: u32,
    dst_height: u32,
) -> Vec<u8> {
    let mut result = vec![0u8; (dst_width * dst_height * 4) as usize];

    let x_ratio = src_width as f32 / dst_width as f32;
    let y_ratio = src_height as f32 / dst_height as f32;

    for y in 0..dst_height {
        for x in 0..dst_width {
            let src_x = (x as f32 * x_ratio) as u32;
            let src_y = (y as f32 * y_ratio) as u32;
            let src_idx = ((src_y * src_width + src_x) * 4) as usize;
            let dst_idx = ((y * dst_width + x) * 4) as usize;

            if src_idx + 3 < rgba.len() && dst_idx + 3 < result.len() {
                result[dst_idx] = rgba[src_idx];
                result[dst_idx + 1] = rgba[src_idx + 1];
                result[dst_idx + 2] = rgba[src_idx + 2];
                result[dst_idx + 3] = rgba[src_idx + 3];
            }
        }
    }

    result
}

// Convert RGBA to PNG
fn rgba_to_png(rgba: &[u8], width: u32, height: u32) -> Result<Vec<u8>, String> {
    use image::ImageEncoder;

    let mut output = Vec::new();
    let encoder = image::codecs::png::PngEncoder::new(&mut output);
    encoder
        .write_image(rgba, width, height, image::ColorType::Rgba8)
        .map_err(|e| e.to_string())?;

    Ok(output)
}

// Base64 encoding module
mod base64 {
    const TABLE: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    pub fn encode(input: &[u8]) -> String {
        let mut result = String::with_capacity(input.len().div_ceil(3) * 4);

        for chunk in input.chunks(3) {
            let buf = match chunk.len() {
                3 => ((chunk[0] as u32) << 16) | ((chunk[1] as u32) << 8) | (chunk[2] as u32),
                2 => ((chunk[0] as u32) << 16) | ((chunk[1] as u32) << 8),
                1 => (chunk[0] as u32) << 16,
                _ => continue,
            };

            result.push(TABLE[(buf >> 18) as usize] as char);
            result.push(TABLE[(buf >> 12) as usize & 0x3F] as char);

            if chunk.len() > 1 {
                result.push(TABLE[(buf >> 6) as usize & 0x3F] as char);
            } else {
                result.push('=');
            }

            if chunk.len() > 2 {
                result.push(TABLE[buf as usize & 0x3F] as char);
            } else {
                result.push('=');
            }
        }

        result
    }
}

// ============================================================================
// Iteration 31: Advanced Agent System - State and Commands (EXPERIMENTAL)
// ============================================================================
// ⚠️  EXPERIMENTAL: This is the advanced agent system, separate from the main
//     chat/assistant flow. It has its own provider hierarchy and is NOT the
//     active production path for standard LLM functionality.
//
//     For chat, Free AI, and test connection: use `llm::create_provider()`
//     For advanced agent features: use `agent::providers` (incomplete)
// ============================================================================

use agent::providers::{ProviderRouter, ProviderType};
use agent::{AdvancedAgent, AgentConfig, AgentEvent};

/// State for the advanced agent
pub struct AgentState {
    router: Arc<ProviderRouter>,
    agent: Arc<RwLock<Option<AdvancedAgent>>>,
}

impl Default for AgentState {
    fn default() -> Self {
        Self::new()
    }
}

impl AgentState {
    pub fn new() -> Self {
        let router = Arc::new(ProviderRouter::new());
        Self {
            router,
            agent: Arc::new(RwLock::new(None)),
        }
    }

    pub fn router(&self) -> Arc<ProviderRouter> {
        self.router.clone()
    }
}

/// Provider info for UI
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderInfo {
    pub provider_type: String,
    pub name: String,
    pub available: bool,
    pub is_free: bool,
    pub supports_vision: bool,
}

fn agent_provider_kind(provider_type: &str) -> Result<ProviderType, String> {
    match provider_type {
        "openai" => Ok(ProviderType::OpenAi),
        "claude" => Ok(ProviderType::Claude),
        "deepseek" => Ok(ProviderType::DeepSeek),
        "kimi" => Ok(ProviderType::Moonshot),
        "gorkh_free" => Ok(ProviderType::GorkhFree),
        _ => Err(format!("Unknown provider: {}", provider_type)),
    }
}

async fn is_agent_provider_available(provider_type: &str) -> Result<bool, String> {
    match agent_provider_kind(provider_type)? {
        ProviderType::OpenAi
        | ProviderType::Claude
        | ProviderType::DeepSeek
        | ProviderType::Moonshot => {
            Ok(keyring_get_secret(&format!("llm_api_key:{}", provider_type)).is_some())
        }
        ProviderType::GorkhFree => {
            // GORKH Free tier availability depends on backend connectivity
            Ok(true)
        }
    }
}

/// List available providers
#[tauri::command]
async fn list_agent_providers(_state: State<'_, AgentState>) -> Result<Vec<ProviderInfo>, String> {
    let mut providers = Vec::new();

    for (provider_type, name, is_free, supports_vision) in [
        ("openai", "OpenAI-compatible cloud", false, true),
        ("claude", "Claude", false, true),
        ("deepseek", "DeepSeek", false, false),
        ("kimi", "Moonshot (Kimi)", false, false),
        ("gorkh_free", "GORKH AI (Free)", true, false),
    ] {
        providers.push(ProviderInfo {
            provider_type: provider_type.to_string(),
            name: name.to_string(),
            available: is_agent_provider_available(provider_type).await?,
            is_free,
            supports_vision,
        });
    }

    Ok(providers)
}

/// Test a provider connection with a lightweight API call.
#[tauri::command]
async fn test_provider(
    provider_type: String,
    base_url: String,
    model: String,
) -> Result<bool, String> {
    // For key-requiring providers, verify the key exists first
    if matches!(
        provider_type.as_str(),
        "openai" | "claude" | "deepseek" | "minimax" | "kimi"
    ) {
        if keyring_get_secret(&format!("llm_api_key:{}", provider_type)).is_none() {
            return Ok(false);
        }
    }

    let api_key = resolve_llm_api_key(&provider_type).unwrap_or_default();
    let conversation_params = llm::ConversationTurnParams {
        provider: provider_type,
        base_url,
        model,
        api_key,
        messages: vec![llm::ConversationTurnMessage {
            role: "user".to_string(),
            text: "Hello".to_string(),
        }],
        app_context: None,
        correlation_id: None,
    };

    let provider = llm::create_provider(&conversation_params.provider)
        .map_err(|e| format!("Failed to create provider: {}", e.message))?;

    match provider.conversation_turn(&conversation_params).await {
        Ok(_) => Ok(true),
        Err(e) => Err(format!("Provider test failed: {}", e.message)),
    }
}

/// Set provider API key (stored in keychain)
#[tauri::command]
fn set_provider_api_key(provider_type: String, api_key: String) -> Result<(), String> {
    keyring_set_secret(&format!("llm_api_key:{}", provider_type), &api_key)
}

/// Check if provider API key exists
#[tauri::command]
fn has_provider_api_key(provider_type: String) -> bool {
    keyring_get_secret(&format!("llm_api_key:{}", provider_type)).is_some()
}

/// Start a new agent task
#[tauri::command]
async fn start_agent_task(
    app: AppHandle,
    state: State<'_, AgentState>,
    goal: String,
    preferred_provider: Option<String>,
    credential_provider: Option<String>,
    provider_base_url: Option<String>,
    provider_model: Option<String>,
    provider_api_key: Option<String>,
    provider_supports_vision: Option<bool>,
    display_id: Option<String>,
    // Structured GORKH app state for grounding — injected before the goal so the planner
    // sees current app state without the model needing to guess.
    app_context: Option<String>,
) -> Result<String, String> {
    let provider_name = preferred_provider.unwrap_or_else(|| "gorkh_free".to_string());
    let primary_provider = agent_provider_kind(&provider_name)?;
    let key_provider = credential_provider.unwrap_or_else(|| provider_name.clone());
    let resolved_provider_api_key = provider_api_key.or_else(|| match primary_provider {
        ProviderType::OpenAi
        | ProviderType::Claude
        | ProviderType::DeepSeek
        | ProviderType::Moonshot => keyring_get_secret(&format!("llm_api_key:{}", key_provider)),
        _ => None,
    });

    // Create agent config
    let config = AgentConfig {
        primary_provider,
        provider_base_url,
        provider_model,
        display_id: display_id.unwrap_or_else(|| "display-0".to_string()),
        provider_api_key: resolved_provider_api_key,
        provider_supports_vision,
        ..Default::default()
    };

    // Create event callback
    let app_handle = app.clone();
    let callback = Box::new(move |event: AgentEvent| {
        let _ = app_handle.emit("agent:event", event);
    });

    let agent = AdvancedAgent::new(config, state.router.clone(), callback);
    // Prepend structured GORKH app context so the planner sees current app state.
    let grounded_goal = match app_context.as_deref() {
        Some(ctx) if !ctx.trim().is_empty() => format!("{}\n\n{}", ctx, goal),
        _ => goal,
    };
    let task_id = agent
        .start_task(grounded_goal)
        .await
        .map_err(|e| e.to_string())?;

    // Store agent
    let mut guard = state.agent.write().await;
    *guard = Some(agent);

    Ok(task_id)
}

/// Get current task status
#[tauri::command]
async fn get_agent_task_status(
    state: State<'_, AgentState>,
) -> Result<Option<agent::AgentTask>, String> {
    let guard = state.agent.read().await;
    if let Some(agent) = guard.as_ref() {
        if let Some(task) = agent.get_current_task().await {
            return Ok(Some(task));
        }
    }
    Ok(None)
}

/// Cancel current task
#[tauri::command]
async fn cancel_agent_task(state: State<'_, AgentState>) -> Result<(), String> {
    let guard = state.agent.read().await;
    if let Some(agent) = guard.as_ref() {
        agent.cancel().await;
    }
    Ok(())
}

#[tauri::command]
async fn approve_agent_proposal(state: State<'_, AgentState>) -> Result<(), String> {
    let guard = state.agent.read().await;
    if let Some(agent) = guard.as_ref() {
        return agent
            .approve_proposal()
            .await
            .map_err(|error| error.to_string());
    }
    Err("No active agent task".to_string())
}

#[tauri::command]
async fn deny_agent_proposal(
    state: State<'_, AgentState>,
    reason: Option<String>,
) -> Result<(), String> {
    let guard = state.agent.read().await;
    if let Some(agent) = guard.as_ref() {
        return agent
            .deny_proposal(reason)
            .await
            .map_err(|error| error.to_string());
    }
    Err("No active agent task".to_string())
}

#[tauri::command]
async fn submit_agent_user_response(
    state: State<'_, AgentState>,
    response: String,
) -> Result<(), String> {
    let guard = state.agent.read().await;
    if let Some(agent) = guard.as_ref() {
        return agent
            .submit_user_response(response)
            .await
            .map_err(|error| error.to_string());
    }
    Err("No active agent task".to_string())
}

// ============================================================================
// GORKH App Tools — STEP 2
// ============================================================================

/// Aggregated snapshot of GORKH app state readable by the assistant.
/// Contains no sensitive data: no API keys, no file contents, no typed text, no absolute paths.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GorkhAppSnapshot {
    permissions: PermissionStatusPayload,
    workspace_configured: bool,
    workspace_root_name: Option<String>,
    autostart_enabled: bool,
}

/// Read a unified snapshot of safe GORKH app state for the assistant.
#[tauri::command]
async fn gorkh_app_snapshot() -> Result<GorkhAppSnapshot, String> {
    let permissions = PermissionStatusPayload {
        // Keep assistant context reads non-prompting; capture status is discovered
        // only after the user explicitly enables Desktop Vision.
        screen_recording: PermissionState::Unknown,
        accessibility: detect_accessibility_status(),
    };
    let workspace_root = workspace::WORKSPACE_ROOT.lock().unwrap().clone();
    let workspace_configured = workspace_root.is_some();
    let workspace_root_name =
        workspace_root.and_then(|p| p.file_name().map(|n| n.to_string_lossy().into_owned()));
    let autostart_enabled = autostart_is_enabled().unwrap_or(false);

    Ok(GorkhAppSnapshot {
        permissions,
        workspace_configured,
        workspace_root_name,
        autostart_enabled,
    })
}

/// Set a safe GORKH setting. Currently supports: "autostart" (bool).
#[tauri::command]
fn gorkh_settings_set(key: String, value: bool) -> KeyResult {
    match key.as_str() {
        "autostart" => autostart_set_enabled(value),
        _ => KeyResult {
            ok: false,
            error: Some(format!(
                "Unknown setting key '{}'. Settable: autostart",
                key
            )),
        },
    }
}

/// Start recording a demonstration
#[tauri::command]
fn start_recording(_goal: String, _description: String) -> Result<String, String> {
    // This would be implemented with a recorder instance
    Ok(format!(
        "demo_{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs()
    ))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .manage(TrayRuntimeState::default())
        .manage(OverlayModeRuntimeState::default())
        .manage(DesktopAuthRuntimeState::default())
        .manage(CloakSigningRuntimeState::default())
        .manage(AgentState::new())
        .plugin(
            tauri_plugin_opener::Builder::new()
                .open_js_links_on_click(false)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init());

    let builder = builder.plugin(tauri_plugin_updater::Builder::new().build());

    builder
        .invoke_handler(tauri::generate_handler![
            list_displays,
            capture_display_png,
            input_click,
            input_double_click,
            input_scroll,
            input_type,
            input_hotkey,
            open_application,
            device_token_set,
            device_token_get,
            device_token_clear,
            wallet_vault_create,
            wallet_vault_import,
            wallet_vault_status,
            wallet_vault_forget,
            wallet_cloak_deposit_prepare,
            wallet_cloak_deposit_execute,
            wallet_cloak_begin_signing_session,
            wallet_cloak_end_signing_session,
            wallet_cloak_sign_transaction,
            wallet_cloak_sign_message,
            wallet_cloak_note_save_secure,
            wallet_cloak_notes_list,
            wallet_cloak_note_status,
            wallet_cloak_note_forget,
            zerion_cli_detect,
            zerion_cli_version,
            zerion_cli_config_status,
            zerion_api_key_set,
            zerion_api_key_clear,
            zerion_cli_wallet_list,
            zerion_cli_agent_list_policies,
            zerion_cli_agent_create_policy,
            zerion_cli_agent_list_tokens,
            zerion_cli_agent_create_token,
            zerion_cli_portfolio,
            zerion_cli_positions,
            zerion_cli_swap_tokens,
            zerion_cli_swap_execute,
            desktop_auth_listen_start,
            desktop_auth_listen_finish,
            desktop_auth_listen_cancel,
            tray_update_state,
            main_window_show,
            main_window_hide,
            main_window_enter_overlay_mode,
            main_window_exit_overlay_mode,
            main_window_overlay_status,
            permissions_get_status,
            permissions_open_settings,
            open_external_url,
            autostart_supported,
            autostart_is_enabled,
            autostart_set_enabled,
            // Iteration 6: AI Assist
            set_llm_api_key,
            has_llm_api_key,
            clear_llm_api_key,
            llm_propose_next_action,
            assistant_conversation_turn,
            // Iteration 7: Workspace Tools
            workspace::workspace_configure,
            workspace::workspace_get_state,
            workspace::workspace_select_directory,
            workspace::workspace_clear,
            workspace::tool_execute,
            // Iteration 31: Advanced Agent System
            list_agent_providers,
            test_provider,
            set_provider_api_key,
            has_provider_api_key,
            start_agent_task,
            get_agent_task_status,
            cancel_agent_task,
            approve_agent_proposal,
            deny_agent_proposal,
            submit_agent_user_response,
            start_recording,
            // GORKH App Tools (STEP 2)
            gorkh_app_snapshot,
            gorkh_settings_set,
        ])
        .setup(|app| {
            let app_handle = app.app_handle();
            create_main_window(app_handle)?;

            let runtime = app.state::<TrayRuntimeState>();
            let initial_state = runtime.menu.lock().unwrap().clone();
            let tray_menu = build_tray_menu(app_handle, &initial_state)?;

            TrayIconBuilder::with_id("main-tray")
                .menu(&tray_menu)
                .on_menu_event(
                    |app: &AppHandle, event: MenuEvent| match event.id().as_ref() {
                        "toggle_window" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let runtime = app.state::<TrayRuntimeState>();
                                let visible = window.is_visible().unwrap_or(true);
                                if visible {
                                    hide_window_to_tray(&window, &runtime);
                                } else {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                    let _ = window.emit("tray.show", ());
                                    let mut guard = runtime.menu.lock().unwrap();
                                    guard.window_visible = true;
                                    let _ = refresh_tray_menu(app, &guard.clone());
                                }
                            }
                        }
                        "toggle_screen_preview" => {
                            let _ = app.emit("tray.toggle_screen_preview", ());
                        }
                        "toggle_allow_control" => {
                            let _ = app.emit("tray.toggle_allow_control", ());
                        }
                        "toggle_ai_pause" => {
                            let _ = app.emit("tray.toggle_ai_pause", ());
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    },
                )
                .build(app)?;

            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                WindowEvent::CloseRequested { api, .. } => {
                    api.prevent_close();
                    let overlay_runtime = window.state::<OverlayModeRuntimeState>();
                    let is_overlay_active = overlay_runtime.state.lock().unwrap().active;
                    if is_overlay_active {
                        let _ = main_window_exit_overlay_mode_impl(
                            window.app_handle(),
                            &overlay_runtime,
                        );
                    }
                    let runtime = window.state::<TrayRuntimeState>();
                    if let Some(main_window) = window.app_handle().get_webview_window("main") {
                        hide_window_to_tray(&main_window, &runtime);
                    } else {
                        let _ = window.hide();
                    }
                }
                WindowEvent::Focused(true) => {
                    // macOS dock-icon click (and other app-activation paths)
                    // should show the window if it is currently hidden.
                    if let Ok(false) = window.is_visible() {
                        let runtime = window.state::<TrayRuntimeState>();
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = window.emit("tray.show", ());
                        let mut guard = runtime.menu.lock().unwrap();
                        guard.window_visible = true;
                        let _ = refresh_tray_menu(window.app_handle(), &guard.clone());
                    }
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
