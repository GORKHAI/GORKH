//! Model compatibility detection for local AI
//!
//! Provides logic to match and find compatible models within the same family,
//! handling variations like qwen2.5:1.5b vs qwen2.5:7b, and vision vs non-vision models.

/// Compatible model families for Free AI
/// Maps expected model names to compatible family prefixes
pub const QWEN25_FAMILY_PREFIXES: &[&str] = &["qwen2.5", "qwen2_5", "qwen-2.5"];
pub const QWEN25_VL_FAMILY_PREFIXES: &[&str] = &["qwen2.5-vl", "qwen2_5_vl", "qwen-2.5-vl"];

/// Result of finding a compatible model
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct CompatibleModelResult {
    /// The actual model name found in Ollama
    pub found_model: String,
    /// Whether this was an exact match
    pub is_exact_match: bool,
    /// The compatibility tier (exact, same_family, incompatible)
    pub compatibility: ModelCompatibility,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ModelCompatibility {
    Exact,
    SameFamily,
    Incompatible,
}

/// Extract the base model family from a model name
/// e.g., "qwen2.5:7b" -> "qwen2.5", "qwen2.5-vl:3b" -> "qwen2.5-vl"
pub fn extract_model_family(model_name: &str) -> String {
    model_name
        .trim()
        .split(':')
        .next()
        .unwrap_or(model_name)
        .to_ascii_lowercase()
}

/// Check if a model name belongs to the Qwen2.5 family
pub fn is_qwen25_family(model_name: &str) -> bool {
    let family = extract_model_family(model_name);
    QWEN25_FAMILY_PREFIXES
        .iter()
        .any(|prefix| family.starts_with(*prefix))
}

/// Check if a model name belongs to the Qwen2.5-VL (vision) family
pub fn is_qwen25_vl_family(model_name: &str) -> bool {
    let family = extract_model_family(model_name);
    QWEN25_VL_FAMILY_PREFIXES
        .iter()
        .any(|prefix| family.starts_with(*prefix))
}

/// Check if a model is compatible with the target model
/// Returns compatibility level: Exact, SameFamily, or Incompatible
pub fn check_model_compatibility(installed_model: &str, target_model: &str) -> ModelCompatibility {
    let installed = installed_model.trim();
    let target = target_model.trim();

    // Exact match
    if installed == target {
        return ModelCompatibility::Exact;
    }

    // Check if both are in the same family group
    let target_is_vl = is_qwen25_vl_family(target);
    let installed_is_vl = is_qwen25_vl_family(installed);
    let target_is_qwen25 = is_qwen25_family(target);
    let installed_is_qwen25 = is_qwen25_family(installed);

    // Vision models are compatible with other vision models
    if target_is_vl && installed_is_vl {
        return ModelCompatibility::SameFamily;
    }

    // Regular Qwen2.5 models are compatible with each other
    // (but not with vision models unless specifically requested)
    if target_is_qwen25 && installed_is_qwen25 && !target_is_vl && !installed_is_vl {
        return ModelCompatibility::SameFamily;
    }

    ModelCompatibility::Incompatible
}

/// Find the best compatible model from a list of installed models
/// Preference order: exact match, same family, None
pub fn find_compatible_model(
    installed_models: &[String],
    target_model: &str,
) -> Option<CompatibleModelResult> {
    // First pass: look for exact match
    for model in installed_models {
        if model.trim() == target_model.trim() {
            return Some(CompatibleModelResult {
                found_model: model.clone(),
                is_exact_match: true,
                compatibility: ModelCompatibility::Exact,
            });
        }
    }

    // Second pass: look for same-family match
    for model in installed_models {
        if check_model_compatibility(model, target_model) == ModelCompatibility::SameFamily {
            return Some(CompatibleModelResult {
                found_model: model.clone(),
                is_exact_match: false,
                compatibility: ModelCompatibility::SameFamily,
            });
        }
    }

    None
}

/// Check if any compatible model exists for the target
#[allow(dead_code)]
pub fn has_compatible_model(installed_models: &[String], target_model: &str) -> bool {
    find_compatible_model(installed_models, target_model).is_some()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_model_family_handles_variants() {
        assert_eq!(extract_model_family("qwen2.5:7b"), "qwen2.5");
        assert_eq!(extract_model_family("qwen2.5-vl:3b"), "qwen2.5-vl");
        assert_eq!(extract_model_family("llama3:latest"), "llama3");
        assert_eq!(extract_model_family("qwen2.5"), "qwen2.5");
        assert_eq!(extract_model_family("  qwen2.5:14b  "), "qwen2.5");
    }

    #[test]
    fn qwen25_family_detection_matches_expected_models() {
        // Should match
        assert!(is_qwen25_family("qwen2.5:1.5b"));
        assert!(is_qwen25_family("qwen2.5:7b"));
        assert!(is_qwen25_family("qwen2.5:latest"));
        assert!(is_qwen25_family("qwen2_5:7b"));
        assert!(is_qwen25_family("qwen-2.5:7b"));

        // Should not match
        assert!(!is_qwen25_family("qwen2:7b"));
        assert!(!is_qwen25_family("llama3:8b"));
        assert!(!is_qwen25_family("mistral:7b"));
    }

    #[test]
    fn qwen25_vl_family_detection_matches_vision_models() {
        // Should match
        assert!(is_qwen25_vl_family("qwen2.5-vl:3b"));
        assert!(is_qwen25_vl_family("qwen2.5-vl:7b"));
        assert!(is_qwen25_vl_family("qwen2_5_vl:3b"));
        assert!(is_qwen25_vl_family("qwen-2.5-vl:3b"));

        // Should not match - regular qwen models
        assert!(!is_qwen25_vl_family("qwen2.5:7b"));
        assert!(!is_qwen25_vl_family("qwen2.5:1.5b"));
    }

    #[test]
    fn check_model_compatibility_exact_match() {
        assert_eq!(
            check_model_compatibility("qwen2.5:7b", "qwen2.5:7b"),
            ModelCompatibility::Exact
        );
        assert_eq!(
            check_model_compatibility("qwen2.5-vl:3b", "qwen2.5-vl:3b"),
            ModelCompatibility::Exact
        );
    }

    #[test]
    fn check_model_compatibility_same_family_regular_qwen() {
        // Different sizes of same model family should be compatible
        assert_eq!(
            check_model_compatibility("qwen2.5:7b", "qwen2.5:3b"),
            ModelCompatibility::SameFamily
        );
        assert_eq!(
            check_model_compatibility("qwen2.5:1.5b", "qwen2.5:7b"),
            ModelCompatibility::SameFamily
        );
        assert_eq!(
            check_model_compatibility("qwen2.5:latest", "qwen2.5:3b"),
            ModelCompatibility::SameFamily
        );
    }

    #[test]
    fn check_model_compatibility_vision_models_compatible() {
        // Vision models should be compatible with each other
        assert_eq!(
            check_model_compatibility("qwen2.5-vl:7b", "qwen2.5-vl:3b"),
            ModelCompatibility::SameFamily
        );
        assert_eq!(
            check_model_compatibility("qwen2.5-vl:latest", "qwen2.5-vl:3b"),
            ModelCompatibility::SameFamily
        );
    }

    #[test]
    fn check_model_compatibility_vision_not_compatible_with_regular() {
        // Vision models should NOT be compatible with regular models (and vice versa)
        assert_eq!(
            check_model_compatibility("qwen2.5-vl:3b", "qwen2.5:3b"),
            ModelCompatibility::Incompatible
        );
        assert_eq!(
            check_model_compatibility("qwen2.5:3b", "qwen2.5-vl:3b"),
            ModelCompatibility::Incompatible
        );
    }

    #[test]
    fn check_model_compatibility_different_families_incompatible() {
        // Completely different model families
        assert_eq!(
            check_model_compatibility("llama3:8b", "qwen2.5:7b"),
            ModelCompatibility::Incompatible
        );
        assert_eq!(
            check_model_compatibility("mistral:7b", "qwen2.5:3b"),
            ModelCompatibility::Incompatible
        );
    }

    #[test]
    fn find_compatible_model_prefers_exact_match() {
        let installed = vec![
            "qwen2.5:7b".to_string(),
            "qwen2.5:3b".to_string(),
            "llama3:8b".to_string(),
        ];

        let result = find_compatible_model(&installed, "qwen2.5:3b");
        assert!(result.is_some());
        let found = result.unwrap();
        assert_eq!(found.found_model, "qwen2.5:3b");
        assert!(found.is_exact_match);
        assert_eq!(found.compatibility, ModelCompatibility::Exact);
    }

    #[test]
    fn find_compatible_model_falls_back_to_family_match() {
        let installed = vec![
            "qwen2.5:7b".to_string(),
            "llama3:8b".to_string(),
        ];

        // Looking for 3b, only have 7b - should fall back to family match
        let result = find_compatible_model(&installed, "qwen2.5:3b");
        assert!(result.is_some());
        let found = result.unwrap();
        assert_eq!(found.found_model, "qwen2.5:7b");
        assert!(!found.is_exact_match);
        assert_eq!(found.compatibility, ModelCompatibility::SameFamily);
    }

    #[test]
    fn find_compatible_model_returns_none_for_no_match() {
        let installed = vec![
            "llama3:8b".to_string(),
            "mistral:7b".to_string(),
        ];

        let result = find_compatible_model(&installed, "qwen2.5:3b");
        assert!(result.is_none());
    }

    #[test]
    fn find_compatible_model_handles_vision_models() {
        let installed = vec![
            "qwen2.5-vl:7b".to_string(),
            "qwen2.5:3b".to_string(),
        ];

        // Should find vision match for vision target (vision-to-vision)
        let result = find_compatible_model(&installed, "qwen2.5-vl:3b");
        assert!(result.is_some(), "vision models should match other vision models");
        assert_eq!(result.unwrap().found_model, "qwen2.5-vl:7b");

        // Should find regular match for regular target (regular-to-regular)
        let result = find_compatible_model(&installed, "qwen2.5:7b");
        assert!(result.is_some(), "regular models should match other regular models");
        assert_eq!(result.unwrap().found_model, "qwen2.5:3b");
        
        // Regular should not match to vision-only installed
        let installed_vision_only = vec!["qwen2.5-vl:3b".to_string()];
        let result = find_compatible_model(&installed_vision_only, "qwen2.5:7b");
        assert!(result.is_none(), "regular model should not match vision-only installed");
        
        // Vision should not match to regular-only installed
        let installed_regular_only = vec!["qwen2.5:7b".to_string()];
        let result = find_compatible_model(&installed_regular_only, "qwen2.5-vl:3b");
        assert!(result.is_none(), "vision model should not match regular-only installed");
    }

    #[test]
    fn find_compatible_model_prefers_first_exact_match() {
        // If somehow there are duplicates, first exact match wins
        let installed = vec![
            "qwen2.5:3b".to_string(),
            "qwen2.5:3b".to_string(), // duplicate
        ];

        let result = find_compatible_model(&installed, "qwen2.5:3b");
        assert!(result.is_some());
        assert_eq!(result.unwrap().found_model, "qwen2.5:3b");
    }
}
