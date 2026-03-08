# Qwen Computer-Use Agent - Implementation Summary

## What You're Building

A fully autonomous AI agent that uses **Qwen2.5-VL** (or alternatives like ShowUI/UI-TARS) to:

- **Creative Work**: Use Photoshop, Blender, GIMP, Figma
- **File Management**: Organize files, clean desktop, sort downloads
- **Web Browsing**: Open browsers, fill forms, send emails
- **Office Work**: Excel automation, document creation
- **System Tasks**: Install apps, change settings

## Architecture Overview

```
User Request (Natural Language)
         |
         v
┌─────────────────┐
│  Task Planner   │ <- Breaks goal into steps using Qwen
│  (Qwen2.5-VL)   │
└────────┬────────┘
         |
         v
┌─────────────────┐
│  Vision Engine  │ <- Analyzes screenshots
│  (Qwen + Omni   │    - Detects UI elements
│   Parser)       │    - Understands context
└────────┬────────┘
         |
         v
┌─────────────────┐
│ Action Executor │ <- Executes actions
│   (Rust/Tauri)  │    - Mouse/keyboard
│                 │    - File operations
└────────┬────────┘
         |
         v
    Screen Changes
         |
         v
   [Repeat until done]
```

## Key Components

### 1. Vision Models (Choose One)

| Model | Size | VRAM | Best For | Download |
|-------|------|------|----------|----------|
| **Qwen2.5-VL-7B** | 7B | 14GB | General use | `ollama pull qwen2.5-vl:7b` |
| **Qwen2.5-VL-3B** | 3B | 6GB | Fast inference | `ollama pull qwen2.5-vl:3b` |
| **ShowUI-2B** | 2B | 4GB | Lightweight | HuggingFace |
| **UI-TARS-7B** | 7B | 14GB | Desktop focus | HuggingFace |
| **CogAgent-9B** | 9B | 18GB | Best accuracy | HuggingFace |

### 2. Screen Parser

**OmniParser V2** (Microsoft) - Detects UI elements:
- Buttons, text fields, icons
- OCR for text
- Bounding boxes

Setup:
```bash
git clone https://github.com/microsoft/OmniParser.git
cd OmniParser
pip install -r requirements.txt
python app.py --port 7861
```

### 3. Action Types

| Action | Example | Use Case |
|--------|---------|----------|
| `click(x, y)` | `click(0.5, 0.3)` | Press buttons |
| `type(text)` | `type("Hello")` | Enter text |
| `hotkey(keys)` | `hotkey(["ctrl", "s"])` | Shortcuts |
| `scroll(dx, dy)` | `scroll(0, -100)` | Scroll page |
| `open_app(name)` | `open_app("photoshop")` | Launch apps |
| `find_and_click(desc)` | `find_and_click("File menu")` | Smart clicking |

## Implementation Roadmap

### Phase 1: Foundation (2 weeks)

**Week 1: Setup**
- [ ] Install Ollama + Qwen2.5-VL
- [ ] Create Rust agent module structure
- [ ] Implement basic LLM client

**Week 2: Vision**
- [ ] Screenshot capture
- [ ] Qwen screen analysis
- [ ] OmniParser integration
- [ ] UI element detection

### Phase 2: Core (2 weeks)

**Week 3: Action System**
- [ ] Mouse control (enigo)
- [ ] Keyboard control
- [ ] App launching
- [ ] File operations

**Week 4: Planning**
- [ ] Task decomposition
- [ ] Step-by-step execution
- [ ] Error recovery
- [ ] Memory/context

### Phase 3: Safety & UI (2 weeks)

**Week 5: Safety**
- [ ] Approval system
- [ ] Sensitive action detection
- [ ] Blocked paths/apps
- [ ] Audit logging

**Week 6: Frontend**
- [ ] Agent task panel
- [ ] Live screenshot view
- [ ] Approval modal
- [ ] Progress tracking

### Phase 4: Training (2 weeks)

**Week 7-8: Fine-tuning**
- [ ] Record demonstrations
- [ ] Fine-tune on app-specific tasks
- [ ] Evaluate and iterate

## Quick Start

### 1. Install Dependencies

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull Qwen model
ollama pull qwen2.5-vl:7b

# Start Ollama
ollama serve
```

### 2. Add to Desktop Cargo.toml

```toml
[dependencies]
# Existing dependencies...
reqwest = { version = "0.12", features = ["json", "multipart"] }
serde = { version = "1", features = ["derive"] }
base64 = "0.22"
uuid = { version = "1", features = ["v4"] }
```

### 3. Create Agent Module

See detailed implementation in:
- `qwen-agent-implementation.md` - Core agent code
- `qwen-vision-engine.md` - Vision analysis
- `qwen-planner-executor.md` - Planning & execution
- `qwen-frontend-integration.md` - React UI

### 4. Tauri Commands

```rust
#[tauri::command]
pub async fn start_agent_task(
    agent: State<'_, ComputerAgent>,
    goal: String,
) -> Result<String, String> {
    let task = AgentTask {
        task_id: uuid::Uuid::new_v4().to_string(),
        goal,
        context: None,
        max_duration_secs: 600,
    };
    
    agent.start_task(task).await
        .map(|_| task.task_id.clone())
        .map_err(|e| e.to_string())
}
```

## Use Case Examples

### 1. Photoshop Automation

```
Goal: "Remove background from photo.jpg"

Plan:
1. Open Photoshop
2. Open photo.jpg
3. Select Subject (AI feature)
4. Invert selection
5. Delete background
6. Save as PNG

Actions:
- open_app("Adobe Photoshop 2024")
- hotkey(["ctrl", "o"])
- type("photo.jpg")
- hotkey(["return"])
- click(0.15, 0.08) // Select menu
- click(0.18, 0.25) // Subject
- hotkey(["shift", "ctrl", "i"]) // Invert
- key("delete")
- hotkey(["shift", "ctrl", "s"]) // Save As
- type("photo.png")
- click(0.7, 0.9) // Save button
```

### 2. File Organization

```
Goal: "Organize Downloads folder by file type"

Plan:
1. Open Downloads
2. Create folders: Images, Documents, Archives
3. Move files by extension
4. Empty trash

Actions:
- open_app("Finder") // or File Explorer
- hotkey(["shift", "command", "g"])
- type("~/Downloads")
- Create folders via right-click menu
- Select files by type
- Move to appropriate folders
```

### 3. Blender 3D Modeling

```
Goal: "Create a simple cube and render it"

Plan:
1. Open Blender
2. Delete default cube (if exists)
3. Add new cube
4. Set up camera
5. Render image

Actions:
- open_app("Blender")
- Wait for load
- hotkey(["a"]) // Select all
- key("delete")
- hotkey(["shift", "a"]) // Add menu
- click(0.5, 0.5) // Mesh > Cube
- hotkey(["ctrl", "alt", "numpad0"]) // Camera to view
- hotkey(["f12"]) // Render
```

## Hardware Requirements

| Setup | GPU | RAM | Performance |
|-------|-----|-----|-------------|
| **Minimum** | GTX 3060 (12GB) | 16GB | Qwen2.5-VL-3B |
| **Recommended** | RTX 4070 (12GB) | 32GB | Qwen2.5-VL-7B |
| **Best** | RTX 4090 (24GB) | 64GB | Qwen2.5-VL-32B |

## Alternatives to Local Models

If you don't have a powerful GPU:

| Service | Model | Cost | Speed |
|---------|-------|------|-------|
| **Groq** | Llama 3.2 Vision | $0.50/M tokens | Very fast |
| **Together AI** | Qwen2.5-VL | $0.60/M tokens | Fast |
| **Fireworks** | Various | $0.40/M tokens | Fast |

## Fine-tuning for Specific Apps

### Data Collection Script

```python
# record_demo.py
import json
import time
import base64
from datetime import datetime

class DemoRecorder:
    def __init__(self, task_name):
        self.task_name = task_name
        self.steps = []
        self.start_time = time.time()
    
    def record_step(self, screenshot_bytes, action, result):
        self.steps.append({
            'timestamp': time.time() - self.start_time,
            'screenshot': base64.b64encode(screenshot_bytes).decode(),
            'action': action,
            'result': result,
        })
    
    def save(self):
        with open(f'demos/{self.task_name}.json', 'w') as f:
            json.dump({
                'task': self.task_name,
                'steps': self.steps
            }, f)

# Usage
recorder = DemoRecorder('photoshop_remove_background')
# ... perform task manually ...
recorder.record_step(screenshot, {'type': 'click', 'x': 0.5, 'y': 0.3}, 'success')
recorder.save()
```

### Fine-tuning Qwen

```python
from transformers import Qwen2_5_VLForConditionalGeneration, Trainer

# Load base model
model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
    "Qwen/Qwen2.5-VL-7B-Instruct"
)

# Load your demonstration data
# Format: (screenshot, task_description, action_sequence)

# Fine-tune
# ... training loop ...

# Save fine-tuned model
model.save_pretrained("./qwen-photoshop-agent")
```

## Safety Checklist

- [ ] Every sensitive action requires approval by default
- [ ] Block system directories (/System, C:\\Windows)
- [ ] Never auto-type passwords
- [ ] Log all actions for audit
- [ ] User can stop agent anytime
- [ ] Network calls require explicit permission
- [ ] File deletion requires confirmation
- [ ] Screenshot data stays local

## Open Source Resources

| Project | Description | Link |
|---------|-------------|------|
| **OmniParser** | Microsoft screen parser | github.com/microsoft/OmniParser |
| **ShowUI** | 2B VLM for GUI agents | github.com/showlab/ShowUI |
| **UI-TARS** | ByteDance GUI agent | github.com/bytedance/UI-TARS-desktop |
| **CogAgent** | Zhipu GUI agent | github.com/THUDM/CogAgent |
| **OSWorld** | Benchmark for agents | github.com/xlang-ai/OSWorld |
| **Agent-S** | SOTA GUI agent | github.com/simular-ai/Agent-S |
| **Open Interpreter** | General computer control | github.com/OpenInterpreter/open-interpreter |

## Next Steps

1. **Start with Phase 1**: Get basic vision working
2. **Test with simple tasks**: "Open calculator and press 1+1"
3. **Gradually increase complexity**: File management → Web browsing → Creative apps
4. **Collect training data**: Record yourself doing tasks
5. **Fine-tune for your apps**: Photoshop, Blender, etc.
6. **Add safety features**: Approval system, blocked actions

## Documentation Files Created

1. `qwen-agent-integration.md` - High-level architecture
2. `qwen-agent-implementation.md` - Rust implementation details
3. `qwen-vision-engine.md` - Screen analysis with Qwen
4. `qwen-planner-executor.md` - Task planning & action execution
5. `qwen-frontend-integration.md` - React UI components
6. `QWEN_AGENT_SUMMARY.md` - This summary

## Support & Community

- Qwen models: https://github.com/QwenLM/Qwen2.5-VL
- OmniParser: https://github.com/microsoft/OmniParser
- OSWorld benchmark: https://osworld-public.github.io/

---

**This architecture enables your AI Operator to become a fully autonomous computer user, capable of handling complex creative, productivity, and system tasks with safety guardrails and user oversight.**
