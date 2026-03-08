# Qwen2.5-VL Computer-Use Agent Integration Guide

## Overview

This guide describes how to upgrade the AI Operator desktop app with a fully autonomous computer-use agent powered by Qwen2.5-VL that can use creative software, manage files, browse the web, and act as a complete computer user.

## Key Technologies

### Vision-Language Models

| Model | Size | Speed | Best For |
|-------|------|-------|----------|
| Qwen2.5-VL-7B | 7B | Fast | General purpose |
| Qwen2.5-VL-32B | 32B | Medium | Complex tasks |
| ShowUI-2B | 2B | Very Fast | Lightweight deployment |
| UI-TARS-7B | 7B | Fast | Desktop automation |

### Screen Parsing Tools

| Tool | Purpose | Source |
|------|---------|--------|
| OmniParser-V2 | UI element detection | Microsoft |
| Native Accessibility | OS UI tree access | Built-in |

## Architecture

```
Desktop App
  |- UI Layer (React)
  |- Agent Core (Rust + VLM)
  |- Vision Engine (Qwen/OmniParser)
  |- Task Planner (Hierarchical)
  |- Action Executor (Native)
  |- Safety Guard (Approval gates)
  |- Memory (RAG for context)
```

## Phase 1: Core Vision Engine

### 1.1 Local LLM Server Setup

Option A: Using Ollama
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull Qwen2.5-VL model
ollama pull qwen2.5-vl:7b

# Run server
ollama serve
```

Option B: Using llama.cpp for maximum performance
```bash
# Build llama.cpp with GPU support
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp

# For CUDA
make GGML_CUDA=1

# For Metal (macOS)
make GGML_METAL=1

# Run server with Qwen model
./server -m qwen2.5-vl-7b.gguf --port 8080
```

### 1.2 Rust LLM Client

Add dependencies to Cargo.toml:
```toml
[dependencies]
reqwest = { version = "0.12", features = ["json", "multipart"] }
serde = { version = "1", features = ["derive"] }
base64 = "0.22"
```

### 1.3 Screen Analysis with Qwen

The vision engine captures screenshots and sends them to the local LLM for analysis:

1. Capture screen
2. Encode to base64
3. Send to Qwen with structured prompt
4. Parse JSON response for UI elements and suggested actions

## Phase 2: Action System

### Supported Actions

| Action | Description | Example |
|--------|-------------|---------|
| click(x, y) | Click at coordinates | click(0.5, 0.3) |
| type(text) | Type text | type("Hello world") |
| hotkey(keys) | Keyboard shortcut | hotkey(["ctrl", "s"]) |
| scroll(dx, dy) | Scroll | scroll(0, -100) |
| wait(seconds) | Wait | wait(2.0) |
| open_app(name) | Launch application | open_app("photoshop") |
| find_image(path) | Locate image on screen | find_image("button.png") |

## Phase 3: Task Planning

### Hierarchical Planning

```
User Goal: "Edit this photo to remove the background"

Plan:
1. Open Photoshop
   1.1. Click Photoshop icon
   1.2. Wait for load
2. Open the image
   2.1. Press Ctrl+O
   2.2. Navigate to file
   2.3. Select and open
3. Remove background
   3.1. Select subject
   3.2. Invert selection
   3.3. Delete background
4. Save result
   4.1. Export as PNG
```

## Phase 4: Safety & Approval

### Approval Levels

| Level | Description | Use Case |
|-------|-------------|----------|
| Strict | Every action requires approval | New/untrusted tasks |
| Balanced | Sensitive actions only | File deletion, network calls |
| Autonomous | Full autonomy with logging | Repetitive, safe tasks |

### Sensitive Actions

- File deletion/modification
- Network requests
- Password entry
- Money transactions
- System settings changes

## Integration with Existing AI Operator

### WebSocket Protocol Extension

New message types for agent control:

```typescript
// server -> device
interface AgentTaskMessage {
  type: 'agent.task';
  taskId: string;
  goal: string;
  autonomy: 'strict' | 'balanced' | 'full';
}

// device -> server
interface AgentProgressMessage {
  type: 'agent.progress';
  taskId: string;
  step: number;
  totalSteps: number;
  currentAction: string;
  screenshot?: string; // base64
}
```

### Dashboard UI Updates

- Agent task queue
- Live screen view during automation
- Step-by-step progress visualization
- Approval request notifications

## Hardware Requirements

| Model | VRAM Required | CPU RAM | Recommended GPU |
|-------|--------------|---------|-----------------|
| Qwen2.5-VL-3B | 6GB | 8GB | RTX 3060 |
| Qwen2.5-VL-7B | 14GB | 16GB | RTX 4070 |
| Qwen2.5-VL-32B | 64GB | 64GB | RTX 4090/A100 |
| ShowUI-2B | 4GB | 8GB | RTX 3060 |

## Use Cases & Training

### 1. Photoshop Automation

Training data needed:
- Screenshots of Photoshop interface
- Step sequences for common tasks
- Tool locations and keyboard shortcuts

Example task:
```
"Remove red-eye from all faces in this photo"
-> 1. Open image
-> 2. Select red-eye tool
-> 3. Click on each eye
-> 4. Save result
```

### 2. Blender 3D Modeling

Training data:
- Blender UI navigation
- Common modeling operations
- Keyboard shortcuts

Example task:
```
"Create a simple chair model"
-> 1. Open Blender
-> 2. Add cube
-> 3. Extrude for legs
-> 4. Scale for seat
-> 5. Export as OBJ
```

### 3. File Management

Training data:
- File explorer navigation
- Common organization patterns

Example task:
```
"Organize Downloads folder by file type"
-> 1. Open Downloads
-> 2. Create folders: Images, Documents, Archives
-> 3. Sort files by extension
-> 4. Move to appropriate folders
```

## Implementation Roadmap

### Week 1-2: Foundation
- Set up local LLM server
- Build vision engine
- Basic screenshot analysis

### Week 3-4: Action System
- Mouse/keyboard control
- UI element detection with OmniParser
- Action execution pipeline

### Week 5-6: Planning
- Task decomposition
- Hierarchical planning
- Error recovery

### Week 7-8: Safety
- Approval system
- Action logging
- Sensitive action detection

### Week 9-10: Integration
- WebSocket protocol
- Dashboard UI
- Task management

### Week 11-12: Training & Fine-tuning
- Collect task demonstrations
- Fine-tune model on specific apps
- Evaluate and iterate

## Recommended Fine-tuning Approach

### Data Collection

1. Record human demonstrations:
```python
# Pseudocode for data collection
recorder = TaskRecorder()
recorder.start("Photoshop: Remove background")

# Human performs task
# - Open Photoshop
# - Load image
# - Use select subject
# - Delete background
# - Save

recorder.stop()
# Generates training data with (screenshot, action) pairs
```

2. Generate synthetic data:
- Use existing apps' automation APIs
- Create variations of common tasks
- Add noise and variations

### Fine-tuning Qwen2.5-VL

```python
from transformers import Qwen2_5_VLForConditionalGeneration

# Load base model
model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
    "Qwen/Qwen2.5-VL-7B-Instruct"
)

# Fine-tune on GUI task data
# Format: (screenshot, task_description, action_sequence)

# Save fine-tuned model
model.save_pretrained("./qwen-gui-agent-v1")
```

## Alternatives to Self-Hosted Qwen

| Option | Pros | Cons |
|--------|------|------|
| Ollama local | Easy setup, free | Requires GPU |
| Together AI | Fast, scalable | Paid, data leaves device |
| Fireworks AI | Good pricing | Paid, network dependency |
| Groq | Very fast inference | Limited model selection |

## Security Considerations

1. **Local Processing**: Keep screenshots and actions local
2. **Approval Gates**: Never allow autonomous sensitive actions
3. **Audit Logging**: Log all agent actions for review
4. **Sandboxing**: Run agent in restricted environment when possible

## Conclusion

This architecture enables a fully autonomous computer-use agent that can:
- See and understand the screen
- Plan and execute complex tasks
- Learn from demonstrations
- Operate safely with user approval

The combination of Qwen2.5-VL for vision, OmniParser for UI detection, and a robust safety layer creates a powerful automation system while maintaining user control.
