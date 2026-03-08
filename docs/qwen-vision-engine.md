# Vision Engine Implementation

## Screen Analysis with Qwen2.5-VL

```rust
// agent/vision.rs
use serde::{Deserialize, Serialize};
use reqwest::Client;

pub struct VisionEngine {
    client: Client,
    endpoint: String,
    model: String,
    use_omniparser: bool,
    omniparser: Option<omniparser::OmniParser>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenState {
    pub description: String,
    pub active_application: String,
    pub window_title: String,
    pub ui_elements: Vec<UIElement>,
    pub text_content: Vec<TextRegion>,
    pub suggested_actions: Vec<SuggestedAction>,
    pub confidence: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UIElement {
    pub id: String,
    pub element_type: ElementType,
    pub label: Option<String>,
    pub bounds: Bounds,
    pub confidence: f64,
    pub attributes: Vec<(String, String)>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ElementType {
    Button,
    TextField,
    Checkbox,
    RadioButton,
    Dropdown,
    Menu,
    MenuItem,
    Icon,
    Link,
    Image,
    Scrollbar,
    Window,
    Dialog,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bounds {
    pub x: f64,      // normalized 0-1
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextRegion {
    pub text: String,
    pub bounds: Bounds,
    pub confidence: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuggestedAction {
    pub action_type: String,
    pub target_element: Option<String>,
    pub description: String,
    pub confidence: f64,
}

impl VisionEngine {
    pub fn new(endpoint: &str, model: &str) -> Self {
        Self {
            client: Client::new(),
            endpoint: endpoint.to_string(),
            model: model.to_string(),
            use_omniparser: true,
            omniparser: None,
        }
    }

    pub fn with_omniparser(mut self, omniparser: omniparser::OmniParser) -> Self {
        self.omniparser = Some(omniparser);
        self
    }

    /// Main entry point: analyze a screenshot
    pub async fn analyze_screen(
        &self,
        screenshot: &[u8],
        task_context: &str,
    ) -> Result<ScreenState, VisionError> {
        // Step 1: Use OmniParser to detect UI elements (if enabled)
        let ui_elements = if let Some(ref parser) = self.omniparser {
            parser.parse_screenshot(screenshot).await?
        } else {
            vec![]
        };

        // Step 2: Use Qwen2.5-VL for high-level understanding
        let qwen_analysis = self.analyze_with_qwen(screenshot, task_context, &ui_elements).await?;

        // Step 3: Merge results
        let state = self.merge_analysis(qwen_analysis, ui_elements);

        Ok(state)
    }

    async fn analyze_with_qwen(
        &self,
        screenshot: &[u8],
        task_context: &str,
        ui_elements: &[UIElement],
    ) -> Result<QwenAnalysis, VisionError> {
        let base64_image = base64::encode(screenshot);

        // Build prompt with UI element context
        let ui_context = if ui_elements.is_empty() {
            "No pre-detected UI elements.".to_string()
        } else {
            format!(
                "Pre-detected UI elements ({}):\n{}",
                ui_elements.len(),
                ui_elements
                    .iter()
                    .map(|e| format!(
                        "- [{}] {} at ({:.2}, {:.2}) size {:.2}x{:.2}",
                        e.id,
                        e.label.as_deref().unwrap_or("unnamed"),
                        e.bounds.x,
                        e.bounds.y,
                        e.bounds.width,
                        e.bounds.height
                    ))
                    .collect::<Vec<_>>()
                    .join("\n")
            )
        };

        let prompt = format!(
            r#"You are a computer-use agent analyzing a screenshot. 

Task context: {}

{}

Analyze the screenshot and provide:
1. Detailed description of what's visible
2. Current active application and window
3. All interactive elements (buttons, text fields, menus, icons)
4. Any error messages or notifications
5. The most logical next action to progress toward the goal

Respond in valid JSON format:
{{
  "description": "detailed screen description",
  "active_application": "app name",
  "window_title": "window title",
  "ui_elements": [
    {{
      "id": "element_1",
      "type": "button|text_field|menu|icon|checkbox|link",
      "label": "button text or description",
      "bounds": {{"x": 0.5, "y": 0.3, "width": 0.1, "height": 0.05}},
      "is_interactive": true
    }}
  ],
  "text_content": ["visible text on screen"],
  "suggested_action": {{
    "type": "click|type|hotkey|scroll|wait",
    "target": "element_id or description",
    "parameters": {{}},
    "reasoning": "why this action makes sense"
  }},
  "confidence": 0.95
}}"#,
            task_context, ui_context
        );

        // Call Ollama API
        let request = serde_json::json!({
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": prompt,
                    "images": [base64_image]
                }
            ],
            "stream": false,
            "format": "json"
        });

        let response = self
            .client
            .post(format!("{}/api/chat", self.endpoint))
            .json(&request)
            .send()
            .await
            .map_err(|e| VisionError::Llm(e.to_string()))?;

        let result: OllamaResponse = response
            .json()
            .await
            .map_err(|e| VisionError::Llm(format!("Failed to parse response: {}", e)))?;

        // Parse JSON from response
        let analysis: QwenAnalysis = serde_json::from_str(&result.message.content)
            .map_err(|e| VisionError::Parse(format!("Failed to parse analysis: {}\nContent: {}", e, result.message.content)))?;

        Ok(analysis)
    }

    fn merge_analysis(&self, qwen: QwenAnalysis, omniparser: Vec<UIElement>) -> ScreenState {
        // Merge Qwen's understanding with OmniParser's precise element detection
        let mut elements = omniparser;

        // Add elements from Qwen that OmniParser missed
        for qwen_elem in qwen.ui_elements {
            if !elements.iter().any(|e| {
                // Check for overlap
                let dx = (e.bounds.x - qwen_elem.bounds.x).abs();
                let dy = (e.bounds.y - qwen_elem.bounds.y).abs();
                dx < 0.05 && dy < 0.05
            }) {
                elements.push(qwen_elem);
            }
        }

        ScreenState {
            description: qwen.description,
            active_application: qwen.active_application,
            window_title: qwen.window_title,
            ui_elements: elements,
            text_content: qwen.text_content.into_iter()
                .map(|t| TextRegion {
                    text: t,
                    bounds: Bounds::default(),
                    confidence: 1.0,
                })
                .collect(),
            suggested_actions: vec![SuggestedAction {
                action_type: qwen.suggested_action.type_,
                target_element: Some(qwen.suggested_action.target),
                description: qwen.suggested_action.reasoning,
                confidence: qwen.confidence,
            }],
            confidence: qwen.confidence,
        }
    }

    /// Find an element by description
    pub fn find_element(&self, state: &ScreenState, description: &str) -> Option<&UIElement> {
        state.ui_elements.iter()
            .find(|e| {
                if let Some(ref label) = e.label {
                    label.to_lowercase().contains(&description.to_lowercase())
                } else {
                    false
                }
            })
    }

    /// Get clickable elements
    pub fn get_clickable_elements(&self, state: &ScreenState) -> Vec<&UIElement> {
        state.ui_elements.iter()
            .filter(|e| matches!(e.element_type, 
                ElementType::Button | 
                ElementType::Link | 
                ElementType::MenuItem | 
                ElementType::Icon
            ))
            .collect()
    }
}

#[derive(Debug, Deserialize)]
struct OllamaResponse {
    message: Message,
}

#[derive(Debug, Deserialize)]
struct Message {
    content: String,
}

#[derive(Debug, Deserialize)]
struct QwenAnalysis {
    description: String,
    active_application: String,
    window_title: String,
    ui_elements: Vec<UIElement>,
    text_content: Vec<String>,
    suggested_action: SuggestedActionRaw,
    confidence: f64,
}

#[derive(Debug, Deserialize)]
struct SuggestedActionRaw {
    #[serde(rename = "type")]
    type_: String,
    target: String,
    parameters: serde_json::Value,
    reasoning: String,
}

#[derive(Debug, thiserror::Error)]
pub enum VisionError {
    #[error("LLM error: {0}")]
    Llm(String),
    #[error("Parse error: {0}")]
    Parse(String),
    #[error("OmniParser error: {0}")]
    OmniParser(String),
}
```

## OmniParser Integration

```rust
// agent/omniparser.rs
use serde::{Deserialize, Serialize};

pub struct OmniParser {
    endpoint: String,
    client: reqwest::Client,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedElement {
    pub element_id: String,
    pub element_type: String,
    pub bbox: [f64; 4], // [x1, y1, x2, y2] normalized
    pub confidence: f64,
    pub text: Option<String>,
    pub content: String, // Description of the element
}

impl OmniParser {
    pub fn new(endpoint: &str) -> Self {
        Self {
            endpoint: endpoint.to_string(),
            client: reqwest::Client::new(),
        }
    }

    pub async fn parse_screenshot(
        &self,
        screenshot: &[u8],
    ) -> Result<Vec<super::UIElement>, OmniParserError> {
        let base64_image = base64::encode(screenshot);

        let request = serde_json::json!({
            "image": base64_image,
            "box_threshold": 0.05,
            "iou_threshold": 0.1,
            "use_paddleocr": true,
        });

        let response = self
            .client
            .post(format!("{}/parse", self.endpoint))
            .json(&request)
            .send()
            .await
            .map_err(|e| OmniParserError::Request(e.to_string()))?;

        let result: ParseResponse = response
            .json()
            .await
            .map_err(|e| OmniParserError::Parse(e.to_string()))?;

        // Convert to UIElement format
        let elements = result.parsed_content_list
            .into_iter()
            .enumerate()
            .map(|(idx, elem)| super::UIElement {
                id: format!("elem_{}", idx),
                element_type: map_element_type(&elem.element_type),
                label: elem.text.clone().or_else(|| {
                    if !elem.content.is_empty() {
                        Some(elem.content.clone())
                    } else {
                        None
                    }
                }),
                bounds: super::Bounds {
                    x: elem.bbox[0],
                    y: elem.bbox[1],
                    width: elem.bbox[2] - elem.bbox[0],
                    height: elem.bbox[3] - elem.bbox[1],
                },
                confidence: elem.confidence,
                attributes: vec![],
            })
            .collect();

        Ok(elements)
    }
}

#[derive(Debug, Deserialize)]
struct ParseResponse {
    parsed_content_list: Vec<ParsedElement>,
    dino_labeled_img: String, // Base64 image with boxes drawn
}

fn map_element_type(omni_type: &str) -> super::ElementType {
    match omni_type.to_lowercase().as_str() {
        "button" => super::ElementType::Button,
        "text" | "textfield" => super::ElementType::TextField,
        "checkbox" => super::ElementType::Checkbox,
        "radio" => super::ElementType::RadioButton,
        "dropdown" | "select" => super::ElementType::Dropdown,
        "menu" => super::ElementType::Menu,
        "icon" => super::ElementType::Icon,
        "link" => super::ElementType::Link,
        "image" => super::ElementType::Image,
        "scrollbar" => super::ElementType::Scrollbar,
        _ => super::ElementType::Unknown,
    }
}

#[derive(Debug, thiserror::Error)]
pub enum OmniParserError {
    #[error("Request error: {0}")]
    Request(String),
    #[error("Parse error: {0}")]
    Parse(String),
}
```

## Setting up OmniParser Server

```bash
# Clone OmniParser
git clone https://github.com/microsoft/OmniParser.git
cd OmniParser

# Install dependencies
pip install -r requirements.txt

# Download model weights
# (Follow instructions in their README)

# Start the server
python app.py --port 7861
```

## Using Native OS Accessibility (Alternative)

For macOS:
```rust
use cocoa::base::id;
use cocoa::foundation::NSString;
use accessibility::{AXUIElement, AXAttribute};

pub struct MacOSAccessibility;

impl MacOSAccessibility {
    pub fn get_focused_element() -> Result<AXUIElement, AccessibilityError> {
        let system = AXUIElement::system_wide();
        let focused = system.attribute(&AXAttribute::focused_ui_element())?;
        Ok(focused)
    }

    pub fn get_element_tree() -> Result<Vec<AccessibleElement>, AccessibilityError> {
        // Traverse accessibility tree
        todo!()
    }
}
```

For Windows:
```rust
use windows::Win32::UI::Accessibility::*;

pub struct WindowsAccessibility;

impl WindowsAccessibility {
    pub fn get_element_tree() -> Result<Vec<AccessibleElement>, AccessibilityError> {
        // Use UI Automation API
        todo!()
    }
}
```

## Summary

The vision engine combines:
1. **OmniParser** - Precise UI element detection using YOLO + OCR
2. **Qwen2.5-VL** - High-level semantic understanding
3. **Native Accessibility** - Direct OS UI tree access (optional)

This multi-layer approach provides both precision (OmniParser) and intelligence (Qwen) for robust computer automation.
