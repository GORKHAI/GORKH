---
name: desktop-tauri
description: >
  GORKH desktop app engineering with Tauri 2 + Rust + React. Covers the full desktop
  surface: Tauri commands, Rust backend, IPC bridge, window management, tray agent behavior,
  macOS/Windows permissions (Screen Recording, Accessibility), local AI runtime process
  management, updater integration, app packaging, code signing, notarization, keychain
  credential storage, and overlay UX. Use this skill for ANY work touching the desktop app
  at apps/desktop/ or apps/desktop/src-tauri/. Trigger for "Tauri", "desktop", "Rust",
  "tray", "updater", "permissions", "notarization", "signing", "packaging", "IPC",
  "invoke", "local runtime", "process management", "keychain", "screen capture",
  "accessibility", "overlay", "window", "system tray", ".app", ".msi", ".dmg",
  "src-tauri", "Cargo.toml", or any native desktop behavior.
---

# Desktop App — GORKH (Tauri 2 + Rust + React)

The desktop app is the **primary product surface**. Everything else (web, API) is secondary.

## Architecture

```
apps/desktop/
├── src/                        # React frontend (Vite)
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── chat/               # Chat/task UX
│   │   ├── approvals/          # Local approval dialogs
│   │   ├── providers/          # AI provider config UI
│   │   ├── permissions/        # OS permission guidance
│   │   ├── runtime/            # Free AI runtime status
│   │   ├── overlay/            # Overlay UX layer
│   │   └── tray/               # Tray menu components
│   ├── hooks/
│   │   ├── use-tauri-invoke.ts
│   │   ├── use-permissions.ts
│   │   ├── use-runtime.ts
│   │   └── use-auth.ts
│   ├── lib/
│   │   ├── ipc.ts              # Typed Tauri invoke wrappers
│   │   ├── keychain.ts         # Keychain access via Tauri
│   │   └── ws-client.ts        # WebSocket to API
│   └── stores/                 # State management
│
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json         # Tauri configuration
│   ├── capabilities/           # Tauri 2 capability files
│   ├── src/
│   │   ├── main.rs             # Entry point, plugin registration
│   │   ├── lib.rs              # Tauri app builder
│   │   ├── commands/           # Tauri command handlers
│   │   │   ├── mod.rs
│   │   │   ├── auth.rs         # Sign-in handoff commands
│   │   │   ├── runtime.rs      # Local AI runtime management
│   │   │   ├── permissions.rs  # OS permission checks
│   │   │   ├── keychain.rs     # Credential storage
│   │   │   ├── approvals.rs    # Action approval logic
│   │   │   ├── tools.rs        # Local tool execution
│   │   │   └── screen.rs       # Screen capture
│   │   ├── runtime/            # Local AI runtime (Qwen/Ollama management)
│   │   │   ├── mod.rs
│   │   │   ├── detect.rs       # Detect installed runtimes
│   │   │   ├── install.rs      # Download and install runtime
│   │   │   ├── process.rs      # Start/stop/monitor process
│   │   │   └── models.rs       # Model availability checks
│   │   ├── permissions/        # OS permission helpers
│   │   │   ├── mod.rs
│   │   │   ├── macos.rs        # Screen Recording, Accessibility
│   │   │   └── windows.rs      # Windows permissions
│   │   ├── tray.rs             # System tray setup
│   │   ├── updater.rs          # Auto-updater integration
│   │   └── window.rs           # Window management
│   └── icons/                  # App icons
│
├── package.json
└── vite.config.ts
```

## Tauri Configuration (tauri.conf.json)

```json
{
  "$schema": "https://raw.githubusercontent.com/nicholasrice/tauri-plugin-websocket/v2/schemas/config.schema.json",
  "productName": "GORKH",
  "version": "0.1.0",
  "identifier": "com.gorkh.desktop",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173",
    "beforeDevCommand": "pnpm dev:frontend",
    "beforeBuildCommand": "pnpm build:frontend"
  },
  "app": {
    "withGlobalTauri": false,
    "trayIcon": {
      "iconPath": "icons/tray-icon.png",
      "iconAsTemplate": true
    },
    "windows": [
      {
        "title": "GORKH",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "decorations": true,
        "transparent": false,
        "visible": false,
        "closeBehavior": "minimize"
      }
    ],
    "security": {
      "csp": "default-src 'self'; connect-src 'self' ws://localhost:* wss://*.gorkh.com https://*.gorkh.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'"
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "macOS": {
      "minimumSystemVersion": "10.15",
      "signingIdentity": null,
      "entitlements": "./Entitlements.plist"
    },
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.digicert.com"
    }
  },
  "plugins": {
    "updater": {
      "pubkey": "",
      "endpoints": []
    }
  }
}
```

## Tauri 2 Capabilities

Tauri 2 uses capability-based permissions. Define them in `src-tauri/capabilities/`:

```json
// src-tauri/capabilities/main.json
{
  "identifier": "main-capability",
  "description": "Main window capabilities",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:allow-close",
    "core:window:allow-hide",
    "core:window:allow-show",
    "core:window:allow-set-focus",
    "core:window:allow-minimize",
    "shell:allow-open",
    "os:default",
    "process:default",
    "updater:default",
    "notification:default"
  ]
}
```

## Tauri Commands (Rust → JS Bridge)

### Command Pattern

```rust
// src-tauri/src/commands/auth.rs
use tauri::command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceSession {
    pub device_id: String,
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: i64,
}

#[derive(Debug, Serialize)]
pub struct CommandError {
    pub code: String,
    pub message: String,
}

impl From<String> for CommandError {
    fn from(msg: String) -> Self {
        CommandError {
            code: "UNKNOWN".to_string(),
            message: msg,
        }
    }
}

/// Complete browser-based auth handoff
#[command]
pub async fn complete_auth_handoff(
    app: tauri::AppHandle,
    session: DeviceSession,
) -> Result<(), CommandError> {
    // Store tokens in OS keychain
    let keychain = app.state::<KeychainManager>();
    keychain.store_session(&session).map_err(|e| CommandError {
        code: "KEYCHAIN_ERROR".to_string(),
        message: format!("Failed to store session: {}", e),
    })?;

    // Establish WebSocket connection to API
    let ws = app.state::<WsClient>();
    ws.connect_with_token(&session.access_token).await.map_err(|e| CommandError {
        code: "WS_ERROR".to_string(),
        message: format!("Failed to connect: {}", e),
    })?;

    Ok(())
}

/// Get current auth status
#[command]
pub async fn get_auth_status(
    app: tauri::AppHandle,
) -> Result<Option<DeviceSession>, CommandError> {
    let keychain = app.state::<KeychainManager>();
    Ok(keychain.get_session().ok())
}

/// Sign out and clear credentials
#[command]
pub async fn sign_out(app: tauri::AppHandle) -> Result<(), CommandError> {
    let keychain = app.state::<KeychainManager>();
    keychain.clear_session().map_err(|e| CommandError {
        code: "KEYCHAIN_ERROR".to_string(),
        message: e.to_string(),
    })?;

    let ws = app.state::<WsClient>();
    ws.disconnect().await;

    Ok(())
}
```

### Frontend Invoke Wrapper

```typescript
// apps/desktop/src/lib/ipc.ts
import { invoke } from "@tauri-apps/api/core";

export interface DeviceSession {
  device_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface CommandError {
  code: string;
  message: string;
}

// Typed invoke wrapper — every Tauri command gets a typed function here
export const ipc = {
  // Auth
  completeAuthHandoff: (session: DeviceSession) =>
    invoke<void>("complete_auth_handoff", { session }),
  getAuthStatus: () =>
    invoke<DeviceSession | null>("get_auth_status"),
  signOut: () =>
    invoke<void>("sign_out"),

  // Runtime
  detectRuntime: () =>
    invoke<RuntimeStatus>("detect_runtime"),
  installRuntime: () =>
    invoke<void>("install_runtime"),
  startRuntime: () =>
    invoke<void>("start_runtime"),
  stopRuntime: () =>
    invoke<void>("stop_runtime"),
  checkModelAvailability: (model: string) =>
    invoke<boolean>("check_model_availability", { model }),

  // Permissions
  checkPermissions: () =>
    invoke<PermissionStatus>("check_permissions"),
  requestPermission: (kind: PermissionKind) =>
    invoke<boolean>("request_permission", { kind }),
  openPermissionSettings: (kind: PermissionKind) =>
    invoke<void>("open_permission_settings", { kind }),

  // Keychain
  storeProviderKey: (provider: string, key: string) =>
    invoke<void>("store_provider_key", { provider, key }),
  getProviderKey: (provider: string) =>
    invoke<string | null>("get_provider_key", { provider }),
  deleteProviderKey: (provider: string) =>
    invoke<void>("delete_provider_key", { provider }),

  // Approvals
  requestApproval: (action: PendingAction) =>
    invoke<boolean>("request_approval", { action }),

  // Tools
  executeTool: (tool: ToolInvocation) =>
    invoke<ToolResult>("execute_tool", { tool }),
} as const;
```

## Tray Agent Behavior

The app behaves as a **tray agent**. Closing the window hides it; it does not exit.

```rust
// src-tauri/src/tray.rs
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

pub fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Show GORKH", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .icon_as_template(true)
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}
```

### Window Close → Hide

```rust
// In lib.rs or main.rs setup
use tauri::Manager;

app.on_window_event(|window, event| {
    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        // Prevent actual close, hide instead
        api.prevent_close();
        let _ = window.hide();
    }
});
```

## macOS Permissions

```rust
// src-tauri/src/permissions/macos.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PermissionStatus {
    pub screen_recording: PermissionState,
    pub accessibility: PermissionState,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum PermissionState {
    Granted,
    Denied,
    NotDetermined,
    Restricted,
}

#[cfg(target_os = "macos")]
pub fn check_screen_recording_permission() -> PermissionState {
    // Use CGPreflightScreenCaptureAccess / CGRequestScreenCaptureAccess
    // via objc2 or core-graphics crate
    use core_graphics::display::CGDisplayStreamCreate;
    // Implementation uses CGPreflightScreenCaptureAccess()
    PermissionState::NotDetermined // real impl checks actual state
}

#[cfg(target_os = "macos")]
pub fn open_privacy_settings(pane: &str) {
    // pane: "ScreenCapture" or "Accessibility"
    let url = format!(
        "x-apple.systempreferences:com.apple.preference.security?Privacy_{}",
        pane
    );
    let _ = std::process::Command::new("open").arg(&url).spawn();
}
```

## Local AI Runtime Management

```rust
// src-tauri/src/runtime/process.rs
use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::State;

pub struct RuntimeManager {
    process: Mutex<Option<Child>>,
    status: Mutex<RuntimeStatus>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct RuntimeStatus {
    pub installed: bool,
    pub running: bool,
    pub port: Option<u16>,
    pub model_loaded: Option<String>,
    pub error: Option<String>,
}

impl RuntimeManager {
    pub fn new() -> Self {
        Self {
            process: Mutex::new(None),
            status: Mutex::new(RuntimeStatus {
                installed: false,
                running: false,
                port: None,
                model_loaded: None,
                error: None,
            }),
        }
    }

    /// Detect if Ollama or compatible runtime is installed
    pub fn detect(&self) -> RuntimeStatus {
        let ollama_path = Self::find_ollama_binary();
        let installed = ollama_path.is_some();

        let running = if installed {
            // Check if already running by hitting the API
            Self::probe_runtime_api(11434).unwrap_or(false)
        } else {
            false
        };

        let status = RuntimeStatus {
            installed,
            running,
            port: if running { Some(11434) } else { None },
            model_loaded: None,
            error: None,
        };

        *self.status.lock().unwrap() = status.clone();
        status
    }

    /// Start the local runtime process
    pub fn start(&self) -> Result<(), String> {
        let binary = Self::find_ollama_binary()
            .ok_or("Ollama not found. Please install it first.")?;

        let child = Command::new(&binary)
            .arg("serve")
            .spawn()
            .map_err(|e| format!("Failed to start runtime: {}", e))?;

        *self.process.lock().unwrap() = Some(child);

        let mut status = self.status.lock().unwrap();
        status.running = true;
        status.port = Some(11434);

        Ok(())
    }

    /// Stop the runtime process
    pub fn stop(&self) -> Result<(), String> {
        if let Some(mut child) = self.process.lock().unwrap().take() {
            child.kill().map_err(|e| format!("Failed to stop: {}", e))?;
        }

        let mut status = self.status.lock().unwrap();
        status.running = false;
        status.port = None;
        status.model_loaded = None;

        Ok(())
    }

    fn find_ollama_binary() -> Option<String> {
        #[cfg(target_os = "macos")]
        let paths = vec![
            "/usr/local/bin/ollama",
            "/opt/homebrew/bin/ollama",
        ];
        #[cfg(target_os = "windows")]
        let paths = vec![
            "C:\\Users\\Default\\AppData\\Local\\Programs\\Ollama\\ollama.exe",
        ];
        #[cfg(target_os = "linux")]
        let paths = vec!["/usr/bin/ollama", "/usr/local/bin/ollama"];

        paths.into_iter()
            .find(|p| std::path::Path::new(p).exists())
            .map(String::from)
    }

    fn probe_runtime_api(port: u16) -> Result<bool, ()> {
        // Quick HTTP check to localhost:{port}/api/tags
        let url = format!("http://localhost:{}/api/tags", port);
        match ureq::get(&url).timeout(std::time::Duration::from_secs(2)).call() {
            Ok(resp) => Ok(resp.status() == 200),
            Err(_) => Ok(false),
        }
    }
}
```

## Keychain Credential Storage

API keys NEVER go to the server. They stay in the OS keychain.

```rust
// src-tauri/src/commands/keychain.rs
use keyring::Entry;

const SERVICE_NAME: &str = "com.gorkh.desktop";

pub struct KeychainManager;

impl KeychainManager {
    pub fn store_provider_key(provider: &str, key: &str) -> Result<(), String> {
        let entry = Entry::new(SERVICE_NAME, &format!("provider_{}", provider))
            .map_err(|e| e.to_string())?;
        entry.set_password(key).map_err(|e| e.to_string())
    }

    pub fn get_provider_key(provider: &str) -> Result<Option<String>, String> {
        let entry = Entry::new(SERVICE_NAME, &format!("provider_{}", provider))
            .map_err(|e| e.to_string())?;
        match entry.get_password() {
            Ok(pw) => Ok(Some(pw)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn delete_provider_key(provider: &str) -> Result<(), String> {
        let entry = Entry::new(SERVICE_NAME, &format!("provider_{}", provider))
            .map_err(|e| e.to_string())?;
        entry.delete_credential().map_err(|e| e.to_string())
    }

    pub fn store_session(session: &DeviceSession) -> Result<(), String> {
        let json = serde_json::to_string(session).map_err(|e| e.to_string())?;
        let entry = Entry::new(SERVICE_NAME, "device_session")
            .map_err(|e| e.to_string())?;
        entry.set_password(&json).map_err(|e| e.to_string())
    }

    pub fn get_session() -> Result<DeviceSession, String> {
        let entry = Entry::new(SERVICE_NAME, "device_session")
            .map_err(|e| e.to_string())?;
        let json = entry.get_password().map_err(|e| e.to_string())?;
        serde_json::from_str(&json).map_err(|e| e.to_string())
    }

    pub fn clear_session() -> Result<(), String> {
        let entry = Entry::new(SERVICE_NAME, "device_session")
            .map_err(|e| e.to_string())?;
        entry.delete_credential().map_err(|e| e.to_string())
    }
}
```

## Updater Integration

```rust
// src-tauri/src/updater.rs
use tauri::updater::UpdaterExt;

pub async fn check_for_updates(app: &tauri::AppHandle) -> Result<Option<UpdateInfo>, String> {
    if !is_updater_enabled() {
        return Ok(None);
    }

    let update = app.updater()
        .check()
        .await
        .map_err(|e| e.to_string())?;

    Ok(update.map(|u| UpdateInfo {
        version: u.version.clone(),
        body: u.body.clone(),
        date: u.date.clone(),
    }))
}

fn is_updater_enabled() -> bool {
    std::env::var("VITE_DESKTOP_UPDATER_ENABLED")
        .unwrap_or_default()
        .eq_ignore_ascii_case("true")
}
```

## Cargo.toml Dependencies

```toml
[package]
name = "gorkh-desktop"
version = "0.1.0"
edition = "2021"

[dependencies]
tauri = { version = "2", features = ["tray-icon", "image-png"] }
tauri-plugin-shell = "2"
tauri-plugin-os = "2"
tauri-plugin-process = "2"
tauri-plugin-updater = "2"
tauri-plugin-notification = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
keyring = "3"
ureq = { version = "2", features = ["json"] }
log = "0.4"
env_logger = "0.11"

[target.'cfg(target_os = "macos")'.dependencies]
objc2 = "0.5"

[build-dependencies]
tauri-build = { version = "2", features = [] }
```

## Rules

- The desktop app is the **main product surface**. Treat it with production seriousness.
- Window close = hide, not exit. Users quit via tray menu or Cmd+Q.
- API keys never leave the machine. Store in OS keychain, not files or localStorage.
- Screen data is never persisted or sent to the server.
- Local approvals gate all sensitive actions — never auto-execute.
- Every Tauri command returns `Result<T, CommandError>` — never panic in commands.
- All IPC functions in `ipc.ts` are fully typed — no `any`, no untyped `invoke` calls.
- Runtime management must handle: not installed, installed but stopped, running, running but model not loaded.
- Permissions checks must be non-blocking — show guidance UI, never hard-block the app.
- The tray icon on macOS uses `iconAsTemplate: true` for dark/light mode.
- Desktop-specific env vars use `VITE_` prefix for frontend, direct env for Rust.
- All Rust code passes `cargo clippy --all-targets --all-features -- -D warnings`.
