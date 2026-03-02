use serde::{Deserialize, Serialize};
use tauri::Manager;
use enigo::{Enigo, MouseControllable, KeyboardControllable, Key as EnigoKey, MouseButton as EnigoMouseButton};
use std::sync::Mutex;

// Display info structure
#[derive(Serialize)]
struct DisplayInfo {
    display_id: String,
    name: Option<String>,
    width: u32,
    height: u32,
}

// Screen capture result
#[derive(Serialize)]
struct CaptureResult {
    png_base64: String,
    width: u32,
    height: u32,
    byte_length: usize,
}

#[derive(Serialize)]
struct CaptureError {
    message: String,
    needs_permission: bool,
}

// Input injection error
#[derive(Serialize)]
struct InputError {
    message: String,
    needs_permission: bool,
}

// Store Enigo instance
struct InputState {
    enigo: Enigo,
}

// List all available displays
#[tauri::command]
fn list_displays() -> Result<Vec<DisplayInfo>, String> {
    let screens = screenshots::Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;
    
    let displays: Vec<DisplayInfo> = screens
        .into_iter()
        .enumerate()
        .map(|(idx, screen)| {
            let info = screen.display_info;
            DisplayInfo {
                display_id: format!("display-{}", idx),
                name: Some(format!("Display {} ({}x{})", idx + 1, info.width, info.height)),
                width: info.width,
                height: info.height,
            }
        })
        .collect();
    
    Ok(displays)
}

// Capture a display and return PNG as base64
#[tauri::command]
fn capture_display_png(display_id: String, max_width: Option<u32>) -> Result<CaptureResult, CaptureError> {
    let screens = screenshots::Screen::all().map_err(|e| CaptureError {
        message: format!("Failed to get screens: {}", e),
        needs_permission: false,
    })?;
    
    let idx: usize = display_id
        .strip_prefix("display-")
        .and_then(|s| s.parse().ok())
        .ok_or_else(|| CaptureError {
            message: "Invalid display ID".to_string(),
            needs_permission: false,
        })?;
    
    let screen = screens.get(idx).ok_or_else(|| CaptureError {
        message: "Display not found".to_string(),
        needs_permission: false,
    })?;
    
    let image = screen.capture().map_err(|e| {
        let msg = format!("{}", e);
        let needs_perm = msg.contains("permission") || msg.contains("denied") || msg.contains("Screen Recording");
        CaptureError {
            message: msg,
            needs_permission: needs_perm,
        }
    })?;
    
    let width = image.width();
    let height = image.height();
    let rgba = image.rgba();
    
    let (final_width, final_height, final_rgba) = if let Some(max_w) = max_width {
        if width > max_w {
            let ratio = max_w as f32 / width as f32;
            let new_height = (height as f32 * ratio) as u32;
            let resized = resize_rgba(rgba, width, height, max_w, new_height);
            (max_w, new_height, resized)
        } else {
            (width, height, rgba.to_vec())
        }
    } else {
        (width, height, rgba.to_vec())
    };
    
    let png_bytes = rgba_to_png(&final_rgba, final_width, final_height).map_err(|e| CaptureError {
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
#[tauri::command]
fn input_click(x_norm: f64, y_norm: f64, button: String) -> Result<(), InputError> {
    let mut enigo = Enigo::new();
    
    // Get screen dimensions (use primary display)
    let screens = screenshots::Screen::all().map_err(|e| InputError {
        message: format!("Failed to get screen: {}", e),
        needs_permission: false,
    })?;
    
    let screen = screens.first().ok_or_else(|| InputError {
        message: "No display found".to_string(),
        needs_permission: false,
    })?;
    
    let width = screen.display_info.width as f64;
    let height = screen.display_info.height as f64;
    
    // Convert normalized to absolute
    let x = (x_norm * width) as i32;
    let y = (y_norm * height) as i32;
    
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
fn input_double_click(x_norm: f64, y_norm: f64, button: String) -> Result<(), InputError> {
    let mut enigo = Enigo::new();
    
    let screens = screenshots::Screen::all().map_err(|e| InputError {
        message: format!("Failed to get screen: {}", e),
        needs_permission: false,
    })?;
    
    let screen = screens.first().ok_or_else(|| InputError {
        message: "No display found".to_string(),
        needs_permission: false,
    })?;
    
    let width = screen.display_info.width as f64;
    let height = screen.display_info.height as f64;
    
    let x = (x_norm * width) as i32;
    let y = (y_norm * height) as i32;
    
    let mouse_button = match button.as_str() {
        "right" => EnigoMouseButton::Right,
        "middle" => EnigoMouseButton::Middle,
        _ => EnigoMouseButton::Left,
    };
    
    enigo.mouse_move_to(x, y);
    enigo.mouse_double_click(mouse_button);
    
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
        _ => return Err(InputError {
            message: format!("Unknown key: {}", key),
            needs_permission: false,
        }),
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

// Resize RGBA image
fn resize_rgba(rgba: &[u8], src_width: u32, src_height: u32, dst_width: u32, dst_height: u32) -> Vec<u8> {
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
        let mut result = String::with_capacity((input.len() + 2) / 3 * 4);
        
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_displays, 
            capture_display_png,
            input_click,
            input_double_click,
            input_scroll,
            input_type,
            input_hotkey,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
