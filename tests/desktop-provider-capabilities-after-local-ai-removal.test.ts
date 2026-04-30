import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('provider enum and lists do not contain removed local AI provider', () => {
  const llmConfigSource = readFileSync('apps/desktop/src/lib/llmConfig.ts', 'utf8');
  const libSource = readFileSync('apps/desktop/src-tauri/src/lib.rs', 'utf8');

  assert.doesNotMatch(
    llmConfigSource,
    /native_qwen_ollama/,
    'llmConfig.ts must not reference the removed native_qwen_ollama provider'
  );

  assert.doesNotMatch(
    libSource,
    /local_ai_/,
    'lib.rs must not register local_ai_* Tauri commands'
  );

  assert.doesNotMatch(
    libSource,
    /localhost:11434|127\.0\.0\.1:11434/,
    'lib.rs must not hardcode the Ollama default port'
  );
});

test('launch-facing provider list contains only cloud and hosted providers', () => {
  const llmConfigSource = readFileSync('apps/desktop/src/lib/llmConfig.ts', 'utf8');

  assert.match(
    llmConfigSource,
    /const LAUNCH_PROVIDER_ORDER:[\s\S]{0,60}\[\s*'openai',\s*'claude',\s*\]/,
    'launch provider order should only contain vision-capable cloud providers'
  );

  assert.doesNotMatch(
    llmConfigSource,
    /const LAUNCH_PROVIDER_ORDER:[^\]]*gorkh_free/,
    'gorkh_free should not be in the launch provider order because it is a hosted fallback, not a primary desktop-control provider'
  );
});

test('default new user provider is gorkh_free and does not require an API key', () => {
  const llmConfigSource = readFileSync('apps/desktop/src/lib/llmConfig.ts', 'utf8');

  assert.match(
    llmConfigSource,
    /export\s+const\s+DEFAULT_NEW_USER_PROVIDER:\s*LlmProvider\s*=\s*['"]gorkh_free['"]/,
    'DEFAULT_NEW_USER_PROVIDER must be gorkh_free'
  );

  assert.match(
    llmConfigSource,
    /gorkh_free:[\s\S]{0,400}requiresApiKey:\s*false/,
    'gorkh_free must not require a BYO API key'
  );

  assert.doesNotMatch(
    llmConfigSource,
    /providerRequiresApiKey\s*\(\s*['"]gorkh_free['"]\s*\)/,
    'llmConfig.ts must not have any special-cased API key logic for gorkh_free outside the provider definition'
  );
});

test('GORKH Free is correctly described as a hosted tier with no local setup', () => {
  const llmConfigSource = readFileSync('apps/desktop/src/lib/llmConfig.ts', 'utf8');

  assert.match(
    llmConfigSource,
    /gorkh_free:[\s\S]{0,800}setupHint:[\s\S]{0,200}5 tasks per day/,
    'gorkh_free provider definition should mention the 5 tasks/day limit'
  );

  assert.doesNotMatch(
    llmConfigSource,
    /gorkh_free:\s*\{[\s\S]{0,400}local/,
    'gorkh_free provider definition should not describe itself as local'
  );

  assert.doesNotMatch(
    llmConfigSource,
    /gorkh_free:[\s\S]{0,800}Ollama/,
    'gorkh_free provider definition should not mention Ollama'
  );
});

test('custom OpenAI-compatible provider does not default to a local model name', () => {
  const llmConfigSource = readFileSync('apps/desktop/src/lib/llmConfig.ts', 'utf8');

  assert.doesNotMatch(
    llmConfigSource,
    /qwen2\.5/,
    'llmConfig.ts should not reference the removed qwen2.5 local model'
  );
});

test('vision-capable providers are OpenAI, Claude, and hosted fallback', () => {
  const aiAssistSource = readFileSync('apps/desktop/src/lib/aiAssist.ts', 'utf8');
  const freeAiFallbackSource = readFileSync('apps/desktop/src/lib/freeAiFallback.ts', 'utf8');

  assert.match(
    freeAiFallbackSource,
    /supportsVisionOverride:\s*true/,
    'hosted free AI fallback should declare vision support'
  );

  assert.doesNotMatch(
    aiAssistSource,
    /native_qwen_ollama/,
    'aiAssist.ts should not route to the removed native_qwen_ollama provider'
  );
});

test('web marketing copy does not mention local AI or Ollama', () => {
  const pageSource = readFileSync('apps/web/app/page.tsx', 'utf8');

  assert.doesNotMatch(
    pageSource,
    /Ollama/,
    'web marketing page should not mention Ollama'
  );

  assert.doesNotMatch(
    pageSource,
    /local AI/,
    'web marketing page should not use the phrase "local AI"'
  );

  assert.doesNotMatch(
    pageSource,
    /Local Agent/,
    'web marketing page should not use "Local Agent" as a product tier name'
  );
});

test('README and AGENTS guidance do not present local AI as a current feature', () => {
  const readmeSource = readFileSync('README.md', 'utf8');
  const agentsSource = readFileSync('AGENTS.md', 'utf8');

  assert.doesNotMatch(
    readmeSource,
    /managed local AI runtime/,
    'README should not describe a managed local AI runtime'
  );

  assert.doesNotMatch(
    readmeSource,
    /local Free AI runtime/,
    'README should not describe a local Free AI runtime'
  );

  assert.doesNotMatch(
    agentsSource,
    /Ollama\s*\+\s*Qwen/,
    'AGENTS.md tech stack should not list Ollama + Qwen'
  );
});

test('shared error codes do not expose Ollama-specific legacy errors without documentation', () => {
  const llmErrorSource = readFileSync('packages/shared/src/llm-error.ts', 'utf8');

  assert.doesNotMatch(
    llmErrorSource,
    /OLLAMA_ERROR/,
    'shared llm-error.ts should not contain an OLLAMA_ERROR enum'
  );

  assert.doesNotMatch(
    llmErrorSource,
    /LOCAL_AI_ERROR/,
    'shared llm-error.ts should not contain a LOCAL_AI_ERROR code now that local AI is removed'
  );
});

test('desktop IPC permissions do not include removed local_ai commands', () => {
  const tomlSource = readFileSync('apps/desktop/src-tauri/permissions/desktop-ipc.toml', 'utf8');

  assert.doesNotMatch(
    tomlSource,
    /local_ai_/,
    'desktop-ipc.toml must not contain local_ai_* permission entries'
  );
});

test('desktop UI components do not mention removed local AI providers', () => {
  const agentDialogSource = readFileSync(
    'apps/desktop/src/components/agent/AgentTaskDialog.tsx',
    'utf8'
  );
  const providerSelectorSource = readFileSync(
    'apps/desktop/src/components/agent/AgentProviderSelector.tsx',
    'utf8'
  );
  const gorkhKnowledgeSource = readFileSync('apps/desktop/src/lib/gorkhKnowledge.ts', 'utf8');

  assert.doesNotMatch(
    agentDialogSource,
    /Qwen/,
    'AgentTaskDialog.tsx must not mention the removed Qwen local model'
  );

  assert.doesNotMatch(
    providerSelectorSource,
    /Local OpenAI-compatible/,
    'AgentProviderSelector.tsx must not use "Local OpenAI-compatible" as a user-facing name'
  );

  assert.doesNotMatch(
    gorkhKnowledgeSource,
    /local model/,
    'gorkhKnowledge.ts must not describe openai_compat as a "local model"'
  );
});

test('Rust source does not mention removed local AI providers in error messages', () => {
  const openaiCompatSource = readFileSync(
    'apps/desktop/src-tauri/src/llm/openai_compat.rs',
    'utf8'
  );

  assert.doesNotMatch(
    openaiCompatSource,
    /Qwen/,
    'openai_compat.rs must not mention Qwen in error messages'
  );

  assert.doesNotMatch(
    openaiCompatSource,
    /local LLM server/,
    'openai_compat.rs must not refer to a "local LLM server"'
  );
});

test('task readiness does not reference removed local engine concept', () => {
  const taskReadinessSource = readFileSync('apps/desktop/src/lib/taskReadiness.ts', 'utf8');

  assert.doesNotMatch(
    taskReadinessSource,
    /Install the local engine/,
    'taskReadiness.ts must not tell users to install a local engine'
  );

  assert.doesNotMatch(
    taskReadinessSource,
    /local-engine/,
    'taskReadiness.ts must not use the local-engine setup item id'
  );
});

test('web dashboard does not describe usage as local desktop usage', () => {
  const dashboardSource = readFileSync('apps/web/app/dashboard/page.tsx', 'utf8');

  assert.doesNotMatch(
    dashboardSource,
    /Free local desktop usage/,
    'dashboard page must not use the phrase "Free local desktop usage"'
  );
});

test('openai-compat setup hint uses self-hosted terminology', () => {
  const llmConfigSource = readFileSync('apps/desktop/src/lib/llmConfig.ts', 'utf8');

  assert.doesNotMatch(
    llmConfigSource,
    /Run a local OpenAI-compatible server/,
    'llmConfig.ts openai_compat setupHint must not say "Run a local OpenAI-compatible server"'
  );
});
