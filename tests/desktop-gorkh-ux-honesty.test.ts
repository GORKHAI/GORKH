/**
 * STEP 6: Provider/runtime UX honesty tests.
 *
 * Verifies that:
 * - Provider labels clearly distinguish free vs paid (no blurred lines)
 * - User-visible strings never mention "Ollama" as a retail name
 * - gorkhKnowledge provider explanations are honest about cost and execution location
 * - Rust error messages that surface as lastError don't leak internal names
 * - No unshipped features (training, fine-tuning, personalisation) are claimed
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// ---------------------------------------------------------------------------
// Source files
// ---------------------------------------------------------------------------

const localAiRsSource = readFileSync('apps/desktop/src-tauri/src/local_ai.rs', 'utf8');

// ---------------------------------------------------------------------------
// llmConfig: free vs paid clarity
// ---------------------------------------------------------------------------

test('llmConfig free provider is paid=false and requires no API key', async () => {
  const { getLlmProviderDefinition } = await import('../apps/desktop/src/lib/llmConfig.ts');

  const freeAi = getLlmProviderDefinition('native_qwen_ollama');
  assert.equal(freeAi.paid, false, 'native_qwen_ollama must be marked paid=false');
  assert.equal(freeAi.requiresApiKey, false, 'native_qwen_ollama must not require an API key');
  assert.match(freeAi.label, /free ai/i, 'native_qwen_ollama label must include "Free AI"');
  assert.match(freeAi.shortLabel, /free ai/i, 'native_qwen_ollama shortLabel must include "Free AI"');
});

test('llmConfig paid providers are paid=true and require an API key', async () => {
  const { getLlmProviderDefinition } = await import('../apps/desktop/src/lib/llmConfig.ts');

  for (const provider of ['openai', 'claude', 'deepseek', 'minimax', 'kimi'] as const) {
    const def = getLlmProviderDefinition(provider);
    assert.equal(def.paid, true, `${provider} must be marked paid=true`);
    assert.equal(def.requiresApiKey, true, `${provider} must require an API key`);
    assert.ok(def.billingHint, `${provider} must have a billingHint warning`);
    assert.match(
      def.billingHint ?? '',
      /paid|billed|charges/i,
      `${provider} billingHint must clearly state charges apply`
    );
  }
});

test('llmConfig native_qwen_ollama label and setupHint do not mention Ollama to the user', async () => {
  const { getLlmProviderDefinition } = await import('../apps/desktop/src/lib/llmConfig.ts');

  const def = getLlmProviderDefinition('native_qwen_ollama');
  assert.doesNotMatch(def.label, /ollama/i, 'Free AI label must not expose "Ollama"');
  assert.doesNotMatch(def.shortLabel, /ollama/i, 'Free AI shortLabel must not expose "Ollama"');
  assert.doesNotMatch(def.setupHint, /ollama|brew|homebrew/i, 'Free AI setupHint must not mention Ollama or Homebrew');
});

test('llmConfig openai_compat is marked free and has no billingHint', async () => {
  const { getLlmProviderDefinition } = await import('../apps/desktop/src/lib/llmConfig.ts');

  const def = getLlmProviderDefinition('openai_compat');
  assert.equal(def.paid, false, 'openai_compat must be paid=false (user runs their own server)');
  assert.equal(def.requiresApiKey, false, 'openai_compat must not require an API key');
  assert.equal(def.billingHint, undefined, 'openai_compat must have no billingHint (not a paid API)');
});

// ---------------------------------------------------------------------------
// gorkhKnowledge: provider explanations honest about cost and location
// ---------------------------------------------------------------------------

test('gorkhKnowledge provider explanations are honest about cost and execution location', async () => {
  const { GORKH_PROVIDER_EXPLANATIONS } = await import('../apps/desktop/src/lib/gorkhKnowledge.ts');

  // Free AI: must say "free" or "no fees" and "local" or "on your Mac"
  assert.match(
    GORKH_PROVIDER_EXPLANATIONS.native_qwen_ollama,
    /free|no.*fee/i,
    'Free AI explanation must mention zero cost'
  );
  assert.match(
    GORKH_PROVIDER_EXPLANATIONS.native_qwen_ollama,
    /local|on your mac/i,
    'Free AI explanation must mention local execution'
  );
  assert.doesNotMatch(
    GORKH_PROVIDER_EXPLANATIONS.native_qwen_ollama,
    /ollama/i,
    'Free AI explanation must not expose "Ollama" branding'
  );

  // Paid providers: must say "charges" or "billed" and "cloud"
  for (const provider of ['openai', 'claude', 'deepseek', 'minimax', 'kimi']) {
    assert.match(
      GORKH_PROVIDER_EXPLANATIONS[provider],
      /charges|billed|API key/i,
      `${provider} explanation must mention charges`
    );
    assert.match(
      GORKH_PROVIDER_EXPLANATIONS[provider],
      /cloud/i,
      `${provider} explanation must mention cloud execution`
    );
  }
});

test('gorkhKnowledge does not claim unshipped training or personalisation features', async () => {
  const knowledge = await import('../apps/desktop/src/lib/gorkhKnowledge.ts');
  const allText = JSON.stringify(knowledge);

  assert.doesNotMatch(
    allText,
    /fine.tun|LoRA|lora.*train|personaliz.*your.*data|learn.*from.*your/i,
    'knowledge base must not promise model fine-tuning, LoRA, or personalisation as shipped features'
  );
});

// ---------------------------------------------------------------------------
// Rust local_ai.rs: user-visible error messages avoid Ollama branding
// ---------------------------------------------------------------------------

test('local_ai.rs user-facing error messages do not mention "Ollama" as a product name', () => {
  // Extract strings that appear in format!() macros (user-visible errors stored in lastError).
  // Internal binary filenames ("ollama", "ollama.exe") and function names are fine — only
  // prose error messages shown to users must avoid exposing the Ollama brand.
  const userFacingPattern =
    /format!\(\s*"[^"]*[Oo]llama binary[^"]*"/;
  assert.doesNotMatch(
    localAiRsSource,
    userFacingPattern,
    'local_ai.rs must not expose "Ollama binary" in user-facing error messages'
  );
});

test('local_ai.rs fallback error message uses retail-friendly language', () => {
  // The fallback error when the managed download fails and no system binary is found.
  assert.match(
    localAiRsSource,
    /local AI engine binary was also not found/,
    'fallback error must say "local AI engine binary" rather than exposing Ollama brand'
  );
});
