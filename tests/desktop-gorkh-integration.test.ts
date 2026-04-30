/**
 * STEP 5 integration tests: GORKH grounding wired into main assistant path.
 *
 * These tests verify that the gorkhContext/gorkhKnowledge grounding layer
 * (STEP 1), the app tools (STEP 2), and the context-aware opening goal
 * (STEP 3) are all connected end-to-end through both the advanced agent
 * and the legacy AI assist engine — and that the Rust system prompt and
 * agent provider prompts carry GORKH identity and inject the app state block.
 *
 * Tests are source-read checks (no Tauri IPC at test time) consistent with
 * the rest of the desktop test suite.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// ---------------------------------------------------------------------------
// Source files read once
// ---------------------------------------------------------------------------

const appSource = readFileSync('apps/desktop/src/App.tsx', 'utf8');
const engineSource = readFileSync('apps/desktop/src/lib/assistantEngine.ts', 'utf8');
const advancedAgentSource = readFileSync('apps/desktop/src/lib/advancedAgent.ts', 'utf8');
const aiAssistSource = readFileSync('apps/desktop/src/lib/aiAssist.ts', 'utf8');
const llmModSource = readFileSync('apps/desktop/src-tauri/src/llm/mod.rs', 'utf8');
const libRsSource = readFileSync('apps/desktop/src-tauri/src/lib.rs', 'utf8');

// ---------------------------------------------------------------------------
// TypeScript: App.tsx → engine options
// ---------------------------------------------------------------------------

test('App.tsx builds gorkhContext from app state and passes it to createAssistantEngine', () => {
  assert.match(
    appSource,
    /buildGorkhContextBlock/,
    'App.tsx must call buildGorkhContextBlock to assemble GORKH app state'
  );
  assert.match(
    appSource,
    /appContext\s*:/,
    'App.tsx must pass appContext when constructing the assistant engine'
  );
  assert.match(
    appSource,
    /createAssistantEngine/,
    'App.tsx must use the unified engine factory (not construct engines directly)'
  );
});

test('App.tsx sources its gorkhContext imports from gorkhContext module', () => {
  assert.match(
    appSource,
    /from ['"]\.\/lib\/gorkhContext/,
    'App.tsx must import grounding helpers from gorkhContext'
  );
  // The context block must reference the key snapshot fields
  assert.match(appSource, /authState/, 'gorkhContext snapshot must include authState');
  assert.match(appSource, /providerConfigured/, 'gorkhContext snapshot must include providerConfigured');
  assert.match(appSource, /workspaceConfigured/, 'gorkhContext snapshot must include workspaceConfigured');
});

// ---------------------------------------------------------------------------
// TypeScript: assistantEngine.ts — appContext in options + both adapters
// ---------------------------------------------------------------------------

test('AssistantEngineOptions declares appContext for grounding', () => {
  assert.match(
    engineSource,
    /appContext\?\s*:\s*string/,
    'AssistantEngineOptions must expose appContext as an optional string'
  );
});

test('LegacyAiAssistEngineAdapter threads appContext → gorkhContext', () => {
  assert.match(
    engineSource,
    /gorkhContext\s*:\s*options\.appContext/,
    'Legacy adapter must forward appContext as gorkhContext to AiAssistController'
  );
});

test('AdvancedAssistantEngineAdapter threads appContext → startAgentTask', () => {
  assert.match(
    engineSource,
    /appContext\s*:\s*this\.options\.appContext/,
    'Advanced adapter must pass appContext through to startAgentTask'
  );
});

// ---------------------------------------------------------------------------
// TypeScript: advancedAgent.ts — IPC wiring
// ---------------------------------------------------------------------------

test('StartAgentTaskOptions declares appContext for grounding', () => {
  assert.match(
    advancedAgentSource,
    /appContext\?\s*:\s*string/,
    'StartAgentTaskOptions must declare appContext'
  );
});

test('startAgentTask passes appContext in the IPC invocation', () => {
  assert.match(
    advancedAgentSource,
    /appContext\s*:\s*options\?\.appContext/,
    'startAgentTask must forward appContext in the invoke call'
  );
});

// ---------------------------------------------------------------------------
// TypeScript: aiAssist.ts — legacy engine proposal grounding
// ---------------------------------------------------------------------------

test('AiAssistOptions declares gorkhContext for grounding', () => {
  assert.match(
    aiAssistSource,
    /gorkhContext\?\s*:\s*string/,
    'AiAssistOptions must declare gorkhContext'
  );
});

test('aiAssist.ts passes gorkhContext as appContext in every proposal', () => {
  assert.match(
    aiAssistSource,
    /appContext\s*:\s*this\.options\.gorkhContext/,
    'aiAssist must forward gorkhContext as appContext in each llm_propose_next_action call'
  );
});

// ---------------------------------------------------------------------------
// Rust: llm/mod.rs — GORKH identity + [GORKH APP STATE] injection
// ---------------------------------------------------------------------------

test('Rust build_system_prompt opens with GORKH identity, not generic assistant', () => {
  assert.match(
    llmModSource,
    /You are GORKH/,
    'build_system_prompt must open with "You are GORKH" to give the LLM a branded identity'
  );
  assert.doesNotMatch(
    llmModSource,
    /You are an AI assistant helping/,
    'build_system_prompt must not use the old generic assistant identity'
  );
});

test('Rust build_system_prompt mentions system tools including empty_trash', () => {
  assert.match(
    llmModSource,
    /system\.empty_trash/,
    'build_system_prompt must mention system.empty_trash so the model knows it can propose trash emptying'
  );
  assert.match(
    llmModSource,
    /destructive.*approval|explicit approval/i,
    'build_system_prompt must warn that empty_trash is destructive and requires approval'
  );
});

test('Rust build_conversation_system_prompt mentions operator capabilities', () => {
  assert.match(
    llmModSource,
    /desktop AI operator/,
    'build_conversation_system_prompt must identify GORKH as a desktop operator, not just a chatbot'
  );
  assert.match(
    llmModSource,
    /Never claim that GORKH cannot interact with the computer/,
    'build_conversation_system_prompt must forbid the model from denying computer interaction'
  );
  assert.match(
    llmModSource,
    /confirm_task/,
    'build_conversation_system_prompt must mention confirm_task for actionable requests'
  );
});

test('Rust build_system_prompt accepts app_context parameter and injects it into the prompt', () => {
  assert.match(
    llmModSource,
    /app_context\s*:\s*Option<&str>/,
    'build_system_prompt must accept an optional app_context string slice'
  );
  // The Rust injects whatever app_context string it receives (the TS side adds [GORKH APP STATE]).
  // Verify the injection site: the app_context_section is built then formatted into the prompt.
  assert.match(
    llmModSource,
    /app_context_section/,
    'build_system_prompt must use app_context_section in the format output'
  );
  assert.match(
    llmModSource,
    /Some\(ctx\).*format!/s,
    'build_system_prompt must format the ctx string when app_context is Some and non-empty'
  );
});

// ---------------------------------------------------------------------------
// Rust: lib.rs — start_agent_task and llm_propose_next_action accept app_context
// ---------------------------------------------------------------------------

test('Rust start_agent_task accepts app_context and prepends it to the goal', () => {
  assert.match(
    libRsSource,
    /app_context\s*:\s*Option<String>/,
    'start_agent_task must accept app_context'
  );
  assert.match(
    libRsSource,
    /grounded_goal/,
    'start_agent_task must build a grounded_goal that prepends the app context'
  );
});

test('Rust llm_propose_next_action accepts app_context in ProposalRequest', () => {
  assert.match(
    libRsSource,
    /struct ProposalRequest/,
    'ProposalRequest must exist'
  );
  // The ProposalRequest struct region contains app_context
  const proposalRequestRegion = libRsSource.slice(
    libRsSource.indexOf('struct ProposalRequest'),
    libRsSource.indexOf('struct ProposalRequest') + 1200
  );
  assert.match(
    proposalRequestRegion,
    /app_context/,
    'ProposalRequest must include app_context field for grounding'
  );
});
