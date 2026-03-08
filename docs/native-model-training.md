# Training Your Native PC-Skilled Model

## Overview

Build a specialized vision-language model that excels at computer automation tasks. This will be your **free, local-first** option that users get by default.

## Model Base Options

| Base Model | Size | Strengths | License |
|------------|------|-----------|---------|
| **Qwen2.5-VL** | 3B/7B/32B | Strong vision, good at UI | Apache 2.0 |
| **Llama 3.2 Vision** | 11B/90B | Excellent reasoning | Llama 3.1 |
| **Pixtral** | 12B | Good at documents, UI | Apache 2.0 |
| **ShowUI** | 2B | Lightweight, UI-focused | MIT |
| **UI-TARS** | 7B | Desktop automation | Open |

## Recommended: Fine-tune Qwen2.5-VL-7B

Best balance of:
- Strong vision capabilities
- Good at following instructions
- Fast enough for real-time use
- Apache 2.0 license (commercial use OK)

## Training Pipeline

### Phase 1: Data Collection

#### 1.1 Record Human Demonstrations

```python
# tools/recorder.py
import json
import base64
import time
import pyautogui
from datetime import datetime
from pynput import mouse, keyboard
import threading

class TaskRecorder:
    def __init__(self, task_name: str, description: str):
        self.task_name = task_name
        self.description = description
        self.steps = []
        self.start_time = time.time()
        self.recording = False
        
        # Mouse tracking
        self.mouse_listener = mouse.Listener(
            on_click=self.on_mouse_click,
            on_scroll=self.on_scroll
        )
        
        # Keyboard tracking
        self.keyboard_listener = keyboard.Listener(
            on_press=self.on_key_press
        )
        
    def start(self):
        """Start recording"""
        self.recording = True
        self.mouse_listener.start()
        self.keyboard_listener.start()
        print(f"Recording started: {self.task_name}")
        print("Press Ctrl+C to stop")
        
        try:
            while self.recording:
                time.sleep(0.1)
        except KeyboardInterrupt:
            self.stop()
    
    def stop(self):
        """Stop recording and save"""
        self.recording = False
        self.mouse_listener.stop()
        self.keyboard_listener.stop()
        
        # Save to file
        data = {
            "task_name": self.task_name,
            "description": self.description,
            "recorded_at": datetime.now().isoformat(),
            "duration": time.time() - self.start_time,
            "steps": self.steps
        }
        
        filename = f"training_data/{self.task_name}_{int(time.time())}.json"
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"Saved to {filename}")
        print(f"Recorded {len(self.steps)} steps")
    
    def capture_screenshot(self) -> str:
        """Capture and encode screenshot"""
        screenshot = pyautogui.screenshot()
        import io
        buffer = io.BytesIO()
        screenshot.save(buffer, format='PNG')
        return base64.b64encode(buffer.getvalue()).decode()
    
    def on_mouse_click(self, x, y, button, pressed):
        if pressed and self.recording:
            step = {
                "timestamp": time.time() - self.start_time,
                "action": "click",
                "params": {
                    "x": x / pyautogui.size().width,  # Normalized
                    "y": y / pyautogui.size().height,
                    "button": str(button)
                },
                "screenshot": self.capture_screenshot()
            }
            self.steps.append(step)
            print(f"Click at ({x}, {y})")
    
    def on_scroll(self, x, y, dx, dy):
        if self.recording:
            step = {
                "timestamp": time.time() - self.start_time,
                "action": "scroll",
                "params": {
                    "dx": dx,
                    "dy": dy,
                    "x": x / pyautogui.size().width,
                    "y": y / pyautogui.size().height
                },
                "screenshot": self.capture_screenshot()
            }
            self.steps.append(step)
    
    def on_key_press(self, key):
        if self.recording:
            try:
                key_str = key.char
            except AttributeError:
                key_str = str(key)
            
            step = {
                "timestamp": time.time() - self.start_time,
                "action": "keypress",
                "params": {"key": key_str},
                "screenshot": self.capture_screenshot()
            }
            self.steps.append(step)

# Usage
if __name__ == "__main__":
    recorder = TaskRecorder(
        task_name="photoshop_remove_background",
        description="Open Photoshop, load an image, and remove the background"
    )
    recorder.start()
```

#### 1.2 Create Task Templates

```python
# tools/task_templates.py
TASK_TEMPLATES = [
    {
        "category": "file_management",
        "tasks": [
            "Organize Downloads folder by file type",
            "Clean up Desktop by moving files to Documents",
            "Rename files in a folder with sequential numbers",
            "Find and delete duplicate files",
            "Create a backup of important folders",
        ]
    },
    {
        "category": "creative",
        "tasks": [
            "Open Photoshop and create a new 1920x1080 document",
            "Remove background from an image in Photoshop",
            "Open Blender and create a simple cube",
            "Export a Blender model as OBJ",
            "Open GIMP and apply a filter to an image",
        ]
    },
    {
        "category": "web_browsing",
        "tasks": [
            "Open Chrome and search for 'best restaurants near me'",
            "Open Gmail and compose a new email",
            "Download a file from a website",
            "Fill out a contact form on a website",
            "Open YouTube and search for a tutorial",
        ]
    },
    {
        "category": "system",
        "tasks": [
            "Open System Preferences and change wallpaper",
            "Install an application from the App Store",
            "Empty the Trash",
            "Check available disk space",
            "Connect to a WiFi network",
        ]
    },
    {
        "category": "office",
        "tasks": [
            "Create a new Excel spreadsheet with formulas",
            "Open Word and create a formatted document",
            "Convert a PDF to Word",
            "Create a PowerPoint presentation",
            "Print a document",
        ]
    }
]
```

#### 1.3 Generate Synthetic Data

```python
# tools/synthetic_data.py
import random
from typing import List, Dict

class SyntheticDataGenerator:
    """Generate variations of tasks for training"""
    
    def __init__(self):
        self.file_types = ['PDF', 'image', 'video', 'document', 'archive']
        self.apps = ['Photoshop', 'Blender', 'Chrome', 'Word', 'Excel']
        self.actions = ['open', 'create', 'edit', 'delete', 'move', 'copy']
    
    def generate_task_variations(self, base_task: str, num_variations: int = 5) -> List[str]:
        """Generate variations of a task description"""
        variations = []
        
        templates = [
            "Can you {action} {object}?",
            "Please {action} {object}",
            "I need to {action} {object}",
            "Help me {action} {object}",
            "{action} {object} for me",
        ]
        
        for _ in range(num_variations):
            template = random.choice(templates)
            variation = template.format(
                action=random.choice(self.actions),
                object=self._randomize_object(base_task)
            )
            variations.append(variation)
        
        return variations
    
    def _randomize_object(self, base_task: str) -> str:
        """Randomize task objects"""
        # Replace generic terms with specific ones
        task = base_task.lower()
        
        if 'file' in task:
            task = task.replace('file', random.choice(['PDF', 'image', 'document']))
        if 'folder' in task:
            task = task.replace('folder', random.choice(['Downloads', 'Desktop', 'Documents']))
        if 'app' in task or 'application' in task:
            task = task.replace('app', random.choice(self.apps))
        
        return task
    
    def generate_action_sequences(self) -> List[Dict]:
        """Generate valid action sequences for common tasks"""
        sequences = [
            {
                "task": "Open Photoshop and create new document",
                "sequence": [
                    {"action": "open_app", "target": "Adobe Photoshop 2024"},
                    {"action": "wait", "duration": 3.0},
                    {"action": "hotkey", "keys": ["ctrl", "n"]},
                    {"action": "type", "text": "1920"},
                    {"action": "hotkey", "keys": ["tab"]},
                    {"action": "type", "text": "1080"},
                    {"action": "click", "target": "Create button"},
                ]
            },
            # More sequences...
        ]
        return sequences

# Generate training pairs
generator = SyntheticDataGenerator()
for category in TASK_TEMPLATES:
    for task in category["tasks"]:
        variations = generator.generate_task_variations(task, 10)
        # Save for training
```

### Phase 2: Data Formatting

Convert recordings to training format:

```python
# tools/format_data.py
import json
from typing import List, Dict
import os

def format_for_qwen(recording_file: str) -> Dict:
    """Convert recording to Qwen2.5-VL training format"""
    
    with open(recording_file, 'r') as f:
        data = json.load(f)
    
    conversations = []
    
    # System message
    conversations.append({
        "role": "system",
        "content": "You are a computer-use agent. Analyze screenshots and determine the next action to complete tasks."
    })
    
    # Initial task
    conversations.append({
        "role": "user",
        "content": [
            {"type": "text", "text": f"Task: {data['description']}"},
            {"type": "image", "image": data['steps'][0]['screenshot']}
        ]
    })
    
    # Each step becomes a conversation turn
    for i, step in enumerate(data['steps']):
        # Assistant's action
        action_desc = describe_action(step['action'], step['params'])
        conversations.append({
            "role": "assistant",
            "content": action_desc
        })
        
        # User's next screenshot (if not last step)
        if i < len(data['steps']) - 1:
            conversations.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": "Next screenshot:"},
                    {"type": "image", "image": data['steps'][i+1]['screenshot']}
                ]
            })
    
    return {
        "id": data['task_name'],
        "conversations": conversations
    }

def describe_action(action: str, params: Dict) -> str:
    """Convert action to natural language"""
    if action == "click":
        return f'click(x={params["x"]:.3f}, y={params["y"]:.3f})'
    elif action == "type":
        return f'type(text="{params.get("text", "")}")'
    elif action == "hotkey":
        return f'hotkey(keys={params["keys"]})'
    elif action == "scroll":
        return f'scroll(dx={params["dx"]}, dy={params["dy"]}])'
    else:
        return f'{action}({params})'

def create_training_dataset(recordings_dir: str, output_file: str):
    """Convert all recordings to training dataset"""
    dataset = []
    
    for filename in os.listdir(recordings_dir):
        if filename.endswith('.json'):
            filepath = os.path.join(recordings_dir, filename)
            formatted = format_for_qwen(filepath)
            dataset.append(formatted)
    
    # Save in ShareGPT format
    with open(output_file, 'w') as f:
        json.dump(dataset, f, indent=2)
    
    print(f"Created dataset with {len(dataset)} examples")

# Usage
create_training_dataset(
    recordings_dir="training_data/",
    output_file="datasets/training_data.json"
)
```

### Phase 3: Fine-tuning

```python
# training/finetune.py
import torch
from transformers import (
    Qwen2_5_VLForConditionalGeneration,
    AutoProcessor,
    TrainingArguments,
    Trainer
)
from peft import LoraConfig, get_peft_model
from datasets import load_dataset

# Configuration
MODEL_ID = "Qwen/Qwen2.5-VL-7B-Instruct"
OUTPUT_DIR = "./native-agent-model-v1"

# Load model and processor
model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.bfloat16,
    device_map="auto"
)

processor = AutoProcessor.from_pretrained(MODEL_ID)

# Apply LoRA for efficient fine-tuning
lora_config = LoraConfig(
    r=64,  # Rank
    lora_alpha=16,
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)

model = get_peft_model(model, lora_config)

# Load training data
dataset = load_dataset("json", data_files="datasets/training_data.json")

# Preprocessing function
def preprocess_function(examples):
    """Format conversations for training"""
    texts = []
    images = []
    
    for conversation in examples["conversations"]:
        text = processor.apply_chat_template(conversation, tokenize=False)
        texts.append(text)
        
        # Extract images
        imgs = []
        for msg in conversation:
            if isinstance(msg["content"], list):
                for item in msg["content"]:
                    if item["type"] == "image":
                        imgs.append(item["image"])
        images.append(imgs)
    
    # Process
    batch = processor(
        text=texts,
        images=images,
        return_tensors="pt",
        padding=True
    )
    
    return batch

# Apply preprocessing
tokenized_dataset = dataset.map(
    preprocess_function,
    batched=True,
    remove_columns=dataset["train"].column_names
)

# Training arguments
training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    num_train_epochs=3,
    per_device_train_batch_size=1,
    gradient_accumulation_steps=8,
    learning_rate=2e-4,
    warmup_ratio=0.03,
    lr_scheduler_type="cosine",
    logging_steps=10,
    save_strategy="epoch",
    bf16=True,
    remove_unused_columns=False,
)

# Trainer
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_dataset["train"],
)

# Train
trainer.train()

# Save model
trainer.save_model(OUTPUT_DIR)
processor.save_pretrained(OUTPUT_DIR)

print(f"Model saved to {OUTPUT_DIR}")
```

### Phase 4: Conversion to GGUF (for llama.cpp)

```bash
# Install llama.cpp conversion tools
pip install llama-cpp-python

# Convert fine-tuned model to GGUF
python convert-hf-to-gguf.py \
    --input-dir ./native-agent-model-v1 \
    --output-dir ./native-agent-model-gguf \
    --outtype q4_k_m  # 4-bit quantization

# Or use llama.cpp's convert script
python llama.cpp/convert_hf_to_gguf.py \
    native-agent-model-v1 \
    --outfile native-agent-v1-q4_k_m.gguf \
    --outtype q4_k_m
```

## Model Capabilities

Your native model should be trained to:

1. **Vision Understanding**
   - Identify UI elements (buttons, menus, text fields)
   - Read text on screen (OCR)
   - Understand application context
   - Detect error states

2. **Action Prediction**
   - Generate precise coordinates for clicks
   - Choose appropriate action types
   - Plan multi-step sequences
   - Handle errors gracefully

3. **Task Planning**
   - Break down high-level goals
   - Adapt to unexpected UI states
   - Learn from previous actions
   - Adjust when things go wrong

## Training Data Requirements

| Task Category | # Examples | Quality |
|---------------|-----------|---------|
| File Management | 500+ | Human demonstrations |
| Creative Apps | 1000+ | Mix of human + synthetic |
| Web Browsing | 800+ | Human demonstrations |
| System Tasks | 300+ | Synthetic variations |
| Office Work | 600+ | Mix |
| **Total** | **3200+** | |

## Evaluation

```python
# evaluation/evaluate.py
import json
from typing import List, Dict

class ModelEvaluator:
    def __init__(self, model_path: str):
        self.model = load_model(model_path)
    
    def evaluate_task(self, task: Dict) -> Dict:
        """Evaluate model on a single task"""
        
        success = True
        steps_taken = 0
        max_steps = 20
        
        while steps_taken < max_steps:
            # Get screenshot
            screenshot = capture_screenshot()
            
            # Ask model for action
            predicted_action = self.model.predict(screenshot, task['goal'])
            
            # Execute action
            result = execute_action(predicted_action)
            
            if not result.success:
                success = False
                break
            
            # Check if task complete
            if self.is_task_complete(task['goal']):
                break
            
            steps_taken += 1
        
        return {
            "task": task['goal'],
            "success": success,
            "steps_taken": steps_taken,
            "efficiency": task['optimal_steps'] / max(steps_taken, 1)
        }
    
    def run_benchmark(self, benchmark_file: str) -> Dict:
        """Run full benchmark"""
        with open(benchmark_file, 'r') as f:
            tasks = json.load(f)
        
        results = []
        for task in tasks:
            result = self.evaluate_task(task)
            results.append(result)
        
        # Calculate metrics
        total = len(results)
        successful = sum(1 for r in results if r['success'])
        avg_efficiency = sum(r['efficiency'] for r in results) / total
        
        return {
            "total_tasks": total,
            "success_rate": successful / total,
            "avg_efficiency": avg_efficiency,
            "results": results
        }
```

## Deployment

```rust
// Desktop app integration
pub async fn load_native_model(model_path: &str) -> Result<NativeProvider, LlmError> {
    // Start llama.cpp server with your model
    let provider = NativeProvider::new(model_path).await?;
    Ok(provider)
}
```

## Iterative Improvement

1. **Release v0.1** - Basic task completion (file management)
2. **Collect feedback** - See where model fails
3. **Record more data** - Focus on weak areas
4. **Fine-tune v0.2** - Retrain with new data
5. **Expand capabilities** - Add more app support

## Cost Comparison

| Approach | Cost | Quality | Latency |
|----------|------|---------|---------|
| **Native Model** (yours) | $0 (after training) | Good | Fast (local) |
| Claude 3.5 Sonnet | ~$0.01-0.05/task | Excellent | Medium |
| GPT-4o | ~$0.01-0.05/task | Excellent | Medium |
| Gemini 1.5 Pro | ~$0.005-0.02/task | Good | Fast |

Your native model becomes profitable when users use it instead of paid APIs!
