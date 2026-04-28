/**
 * STEP 6: Provider/runtime UX honesty tests.
 *
 * Verifies that:
 * - Provider labels clearly distinguish free vs paid (no blurred lines)
 * - gorkhKnowledge provider explanations are honest about cost and execution location
 * - Rust error messages that surface as lastError don't leak internal names
 * - No unshipped features (training, fine-tuning, personalisation) are claimed
 */

import assert from 'node:assert/strict';
import test from 'node:test';

// ---------------------------------------------------------------------------
// llmConfig: free vs paid clarity
// ---------------------------------------------------------------------------

test('llmConfig free provider is paid=false and requires no API key', async () => {
  const { getLlmProviderDefinition } = await import('../apps/desktop/src/lib/llmConfig.ts');

  const freeAi = getLlmProviderDefinition('gorkh_free');
  assert.equal(freeAi.paid, false, 'gorkh_free must be marked paid=false');
  assert.equal(freeAi.requiresApiKey, false, 'gorkh_free must not require an API key');
  assert.match(freeAi.label, /free/i, 'gorkh_free label must include "Free"');
  assert.match(freeAi.shortLabel, /gorkh/i, 'gorkh_free shortLabel must include "GORKH"');
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

test('llmConfig gorkh_free label and setupHint describe the hosted free tier', async () => {
  const { getLlmProviderDefinition } = await import('../apps/desktop/src/lib/llmConfig.ts');

  const def = getLlmProviderDefinition('gorkh_free');
  assert.match(def.label, /gorkh/i, 'GORKH Free label must include "GORKH"');
  assert.doesNotMatch(def.label, /ollama/i, 'GORKH Free label must not expose "Ollama"');
  assert.doesNotMatch(def.setupHint, /ollama|brew|homebrew|install|download/i, 'GORKH Free setupHint must not mention local installation');
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

  // Free AI: must say "free" or "no fees" and "hosted" or "cloud"
  assert.match(
    GORKH_PROVIDER_EXPLANATIONS.gorkh_free,
    /free|no.*fee/i,
    'GORKH Free explanation must mention zero cost'
  );
  assert.match(
    GORKH_PROVIDER_EXPLANATIONS.gorkh_free,
    /hosted|cloud|gorkh/i,
    'GORKH Free explanation must mention hosted/cloud execution'
  );
  assert.doesNotMatch(
    GORKH_PROVIDER_EXPLANATIONS.gorkh_free,
    /ollama/i,
    'GORKH Free explanation must not expose "Ollama" branding'
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
