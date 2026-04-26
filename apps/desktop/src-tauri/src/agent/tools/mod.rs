//! GORKH tool registry for system-level and app-level tools.
//!
//! These tools are separate from workspace tools (file system, terminal)
//! and desktop actions (click, type, hotkey). They wrap OS-level operations
//! like emptying trash and clipboard access.

use serde_json::json;
use std::process::Command;

/// Risk level for a tool call.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ToolRiskLevel {
    Low,
    Medium,
    High,
}

/// Result of executing a tool.
#[derive(Debug, Clone)]
pub struct ToolResult {
    pub success: bool,
    pub message: String,
}

/// Empty the system trash / recycle bin.
/// macOS: osascript tell Finder to empty trash
/// Windows: PowerShell Clear-RecycleBin
/// Linux: rm -rf ~/.local/share/Trash/*
pub fn empty_trash() -> ToolResult {
    let output = if cfg!(target_os = "macos") {
        Command::new("osascript")
            .arg("-e")
            .arg("tell application \"Finder\" to empty trash")
            .output()
    } else if cfg!(target_os = "windows") {
        Command::new("powershell")
            .arg("-Command")
            .arg("Clear-RecycleBin -Confirm:$false")
            .output()
    } else {
        Command::new("sh")
            .arg("-c")
            .arg("rm -rf ~/.local/share/Trash/files/* ~/.local/share/Trash/info/*")
            .output()
    };

    match output {
        Ok(out) if out.status.success() => ToolResult {
            success: true,
            message: "Trash emptied successfully.".to_string(),
        },
        Ok(out) => ToolResult {
            success: false,
            message: format!(
                "Failed to empty trash: {}",
                String::from_utf8_lossy(&out.stderr)
            ),
        },
        Err(e) => ToolResult {
            success: false,
            message: format!("Failed to run empty-trash command: {}", e),
        },
    }
}

/// Read the system clipboard.
/// macOS: pbpaste
/// Windows: PowerShell Get-Clipboard
/// Linux: xclip -selection clipboard -o (falls back to xsel)
pub fn get_clipboard() -> ToolResult {
    let output = if cfg!(target_os = "macos") {
        Command::new("pbpaste").output()
    } else if cfg!(target_os = "windows") {
        Command::new("powershell")
            .arg("-Command")
            .arg("Get-Clipboard")
            .output()
    } else {
        Command::new("sh")
            .arg("-c")
            .arg("xclip -selection clipboard -o 2>/dev/null || xsel --clipboard --output 2>/dev/null || echo ''")
            .output()
    };

    match output {
        Ok(out) if out.status.success() => ToolResult {
            success: true,
            message: String::from_utf8_lossy(&out.stdout).trim().to_string(),
        },
        Ok(out) => ToolResult {
            success: false,
            message: format!(
                "Failed to read clipboard: {}",
                String::from_utf8_lossy(&out.stderr)
            ),
        },
        Err(e) => ToolResult {
            success: false,
            message: format!("Failed to run clipboard command: {}", e),
        },
    }
}

/// Write to the system clipboard.
/// macOS: pbcopy
/// Windows: PowerShell Set-Clipboard
/// Linux: xclip -selection clipboard
pub fn set_clipboard(text: &str) -> ToolResult {
    let output = if cfg!(target_os = "macos") {
        let mut child = Command::new("pbcopy")
            .stdin(std::process::Stdio::piped())
            .spawn()
            .ok();
        if let Some(ref mut c) = child {
            use std::io::Write;
            let _ = c.stdin.take().unwrap().write_all(text.as_bytes());
        }
        child.and_then(|mut c| c.wait().ok().map(|s| Ok(s)))
            .unwrap_or_else(|| Err(std::io::Error::new(std::io::ErrorKind::Other, "pbcopy failed")))
            .map(|status| std::process::Output {
                status,
                stdout: vec![],
                stderr: vec![],
            })
    } else if cfg!(target_os = "windows") {
        Command::new("powershell")
            .arg("-Command")
            .arg(format!("Set-Clipboard -Value '{}'", text.replace("'", "''")))
            .output()
    } else {
        let mut child = Command::new("sh")
            .arg("-c")
            .arg("xclip -selection clipboard || xsel --clipboard --input")
            .stdin(std::process::Stdio::piped())
            .spawn()
            .ok();
        if let Some(ref mut c) = child {
            use std::io::Write;
            let _ = c.stdin.take().unwrap().write_all(text.as_bytes());
        }
        child.and_then(|mut c| c.wait().ok().map(|s| Ok(s)))
            .unwrap_or_else(|| Err(std::io::Error::new(std::io::ErrorKind::Other, "xclip failed")))
            .map(|status| std::process::Output {
                status,
                stdout: vec![],
                stderr: vec![],
            })
    };

    match output {
        Ok(out) if out.status.success() => ToolResult {
            success: true,
            message: "Clipboard updated.".to_string(),
        },
        Ok(out) => ToolResult {
            success: false,
            message: format!(
                "Failed to set clipboard: {}",
                String::from_utf8_lossy(&out.stderr)
            ),
        },
        Err(e) => ToolResult {
            success: false,
            message: format!("Failed to run clipboard command: {}", e),
        },
    }
}

/// Move files from one location to another.
/// Paths are expected to be absolute or resolved by the caller.
pub fn move_files(paths: &[String], destination: &str) -> ToolResult {
    use std::fs;
    let mut moved = 0;
    let mut errors = Vec::new();

    for path in paths {
        let dest = format!("{}/{}", destination, std::path::Path::new(path).file_name()
            .and_then(|n| n.to_str())
            .unwrap_or(path));
        match fs::rename(path, &dest) {
            Ok(_) => moved += 1,
            Err(e) => errors.push(format!("{}: {}", path, e)),
        }
    }

    if errors.is_empty() {
        ToolResult {
            success: true,
            message: format!("Moved {} file(s) to {}.", moved, destination),
        }
    } else {
        ToolResult {
            success: false,
            message: format!("Moved {} file(s). Errors: {}", moved, errors.join("; ")),
        }
    }
}

/// Get GORKH app runtime state.
pub fn get_app_state() -> ToolResult {
    ToolResult {
        success: true,
        message: json!({
            "app": "GORKH",
            "version": env!("CARGO_PKG_VERSION"),
            "mode": "advanced_agent",
        })
        .to_string(),
    }
}

/// Execute a GORKH system tool by name.
pub fn execute_gorkh_tool(tool_call: &crate::llm::ToolCall) -> ToolResult {
    match tool_call {
        crate::llm::ToolCall::EmptyTrash => empty_trash(),
        crate::llm::ToolCall::GetClipboard => get_clipboard(),
        crate::llm::ToolCall::SetClipboard { text } => set_clipboard(text),
        crate::llm::ToolCall::MoveFiles { paths, destination } => move_files(paths, destination),
        crate::llm::ToolCall::AppGetState => get_app_state(),
        _ => ToolResult {
            success: false,
            message: format!("Tool {} is not a GORKH system tool", tool_call.target()),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::llm::ToolCall;

    #[test]
    fn app_get_state_returns_json() {
        let result = get_app_state();
        assert!(result.success);
        assert!(result.message.contains("GORKH"));
        assert!(result.message.contains("advanced_agent"));
    }

    #[test]
    fn execute_gorkh_tool_routes_app_get_state() {
        let result = execute_gorkh_tool(&ToolCall::AppGetState);
        assert!(result.success);
        assert!(result.message.contains("GORKH"));
    }

    #[test]
    fn execute_gorkh_tool_routes_empty_trash() {
        // On Linux in CI/codespace, this should succeed silently if trash is empty
        let result = execute_gorkh_tool(&ToolCall::EmptyTrash);
        // We can't assert success because the trash dir may not exist or the command may fail
        // but we can assert it doesn't panic and returns a result
        assert!(
            result.success || result.message.contains("Failed") || result.message.contains("trash"),
            "Unexpected result: {:?}",
            result
        );
    }

    #[test]
    fn execute_gorkh_tool_rejects_unknown() {
        let result = execute_gorkh_tool(&ToolCall::FsList { path: "/tmp".to_string() });
        assert!(!result.success);
        assert!(result.message.contains("not a GORKH system tool"));
    }
}
