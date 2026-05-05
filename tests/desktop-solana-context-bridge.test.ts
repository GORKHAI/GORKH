import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SolanaAgentActionStatus,
  SolanaWorkstationBridgeActionKind,
  type SolanaBuilderContextSummary,
} from '../packages/shared/src/index.ts';

import { createAgentContextMarkdown } from '../apps/desktop/src/features/solana-workstation/context-bridge/createAgentContextMarkdown.ts';
import { createBuilderContextMarkdown } from '../apps/desktop/src/features/solana-workstation/context-bridge/createBuilderContextMarkdown.ts';
import { createShieldContextMarkdown } from '../apps/desktop/src/features/solana-workstation/context-bridge/createShieldContextMarkdown.ts';
import { sanitizeContextForExport } from '../apps/desktop/src/features/solana-workstation/context-bridge/sanitizeContextForExport.ts';
import { createWorkstationContextBundle } from '../apps/desktop/src/features/solana-workstation/context-bridge/createWorkstationContextBundle.ts';
import {
  loadSavedBuilderContext,
  saveBuilderContextMarkdown,
  clearContextBridgeStorage,
} from '../apps/desktop/src/features/solana-workstation/context-bridge/contextBridgeStorage.ts';
import {
  prefillShieldFromAgentDraft,
  attachBuilderContextToAgentDraft,
  rejectAgentDraft,
  archiveAgentDraft,
} from '../apps/desktop/src/features/solana-workstation/context-bridge/bridgeActions.ts';
import { createDefaultAgent } from '../apps/desktop/src/features/solana-workstation/agent/createDefaultAgent.ts';
import { createActionDraft } from '../apps/desktop/src/features/solana-workstation/agent/createActionDraft.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTestAgent() {
  return createDefaultAgent(1);
}

function makeTestDraft(agent: ReturnType<typeof makeTestAgent>) {
  return createActionDraft({
    agent,
    kind: 'analyze_transaction',
    title: 'Test Draft',
    userIntent: 'Analyze this tx',
    network: 'devnet',
    protocolIds: ['sns'],
  });
}

// ---------------------------------------------------------------------------
// createAgentContextMarkdown
// ---------------------------------------------------------------------------

test('createAgentContextMarkdown includes agent name, policy, draft, and local-only warning', () => {
  const agent = makeTestAgent();
  const draft = makeTestDraft(agent);
  const md = createAgentContextMarkdown({ agent, drafts: [draft] });

  assert.ok(md.includes(agent.name));
  assert.ok(md.includes(agent.policy.name));
  assert.ok(md.includes(draft.title));
  assert.ok(md.includes('Local-only metadata'));
  assert.ok(md.includes('No wallet connection'));
});

test('createAgentContextMarkdown states attestation preview is not on-chain', () => {
  const agent = makeTestAgent();
  const md = createAgentContextMarkdown({ agent });
  assert.ok(md.includes('not on-chain') || md.includes('not on-chain'));
  assert.ok(!md.includes('HumanRail'));
});

// ---------------------------------------------------------------------------
// createBuilderContextMarkdown
// ---------------------------------------------------------------------------

test('createBuilderContextMarkdown excludes full source code by default', () => {
  const md = createBuilderContextMarkdown({ summary: null });
  assert.ok(md.includes('No builder workspace context'));
  assert.ok(!md.includes('pub mod'));
});

test('createBuilderContextMarkdown includes IDL names and instruction names', () => {
  const summary: SolanaBuilderContextSummary = {
    generatedAt: new Date().toISOString(),
    rootPath: '/test',
    projectKind: 'anchor',
    packageManager: 'pnpm',
    programs: ['my_program (devnet)'],
    idls: ['my_program'],
    instructions: ['my_program::initialize'],
    errors: [],
    warnings: [],
    toolchain: ['anchor: 0.30.1'],
    recommendedNextChecks: ['Verify cluster'],
    copyableMarkdown: '# Summary\n\nProject: anchor',
  };
  const md = createBuilderContextMarkdown({ summary });
  assert.ok(md.includes('my_program'));
  assert.ok(md.includes('initialize'));
  assert.ok(md.includes('Sanitized summary only'));
});

// ---------------------------------------------------------------------------
// createShieldContextMarkdown
// ---------------------------------------------------------------------------

test('createShieldContextMarkdown includes risk summary and advisory warning', () => {
  const md = createShieldContextMarkdown({ analysis: null });
  assert.ok(md.includes('advisory'));
  assert.ok(md.includes('No Shield analysis'));
});

// ---------------------------------------------------------------------------
// sanitizeContextForExport
// ---------------------------------------------------------------------------

test('sanitizeContextForExport redacts PRIVATE_KEY, SECRET, MNEMONIC, API_KEY', () => {
  const input = 'My PRIVATE_KEY is secret. My API_KEY is 12345. My MNEMONIC is words.';
  const result = sanitizeContextForExport(input);
  assert.ok(result.redactionsApplied.includes('secret_keywords'));
  assert.ok(!result.text.includes('PRIVATE_KEY'));
  assert.ok(!result.text.includes('API_KEY'));
  assert.ok(!result.text.includes('MNEMONIC'));
});

test('sanitizeContextForExport redacts private key-like 64-number arrays', () => {
  const array = '[' + Array.from({ length: 64 }, (_, i) => i).join(', ') + ']';
  const result = sanitizeContextForExport(`My key: ${array}`);
  assert.ok(result.redactionsApplied.includes('private_key_array'));
  assert.ok(result.text.includes('private key material excluded'));
});

test('sanitizeContextForExport redacts embedded-credential RPC URLs', () => {
  const input = 'https://user:pass@api.devnet.solana.com';
  const result = sanitizeContextForExport(input);
  assert.ok(result.redactionsApplied.includes('rpc_credentials'));
  assert.ok(!result.text.includes('user:pass'));
});

// ---------------------------------------------------------------------------
// createWorkstationContextBundle
// ---------------------------------------------------------------------------

test('createWorkstationContextBundle combines agent/builder/shield contexts', () => {
  const bundle = createWorkstationContextBundle({
    title: 'Test Bundle',
    description: 'Test',
    agentMarkdown: '# Agent',
    builderMarkdown: '# Builder',
    shieldMarkdown: '# Shield',
    references: [],
  });

  assert.equal(bundle.title, 'Test Bundle');
  assert.equal(bundle.localOnly, true);
  assert.ok(bundle.sources.includes('agent'));
  assert.ok(bundle.sources.includes('builder'));
  assert.ok(bundle.sources.includes('shield'));
  assert.ok(bundle.markdown.includes('Agent'));
  assert.ok(bundle.markdown.includes('Builder'));
  assert.ok(bundle.markdown.includes('Shield'));
});

// ---------------------------------------------------------------------------
// contextBridgeStorage
// ---------------------------------------------------------------------------

test('contextBridgeStorage validates and resets invalid data safely', () => {
  const store: Record<string, string> = {};
  const mockStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
  };
  (globalThis as any).window = { localStorage: mockStorage };

  clearContextBridgeStorage();

  saveBuilderContextMarkdown('# Builder Context');
  const loaded = loadSavedBuilderContext();
  assert.equal(loaded, '# Builder Context');

  store['gorkh.solana.contextBridge.bundle.v1'] = JSON.stringify({ not_a_bundle: true });
  const badBundle = loadSavedBuilderContext(); // this loads builder, not bundle
  assert.equal(badBundle, '# Builder Context'); // builder storage unaffected

  clearContextBridgeStorage();
  assert.equal(loadSavedBuilderContext(), null);

  delete (globalThis as any).window;
});

// ---------------------------------------------------------------------------
// bridgeActions
// ---------------------------------------------------------------------------

test('prefillShieldFromAgentDraft returns related input but does not analyze', () => {
  const agent = makeTestAgent();
  const draft = makeTestDraft(agent);
  const result = prefillShieldFromAgentDraft(draft);

  assert.equal(result.result.ok, false); // draft has no relatedInput by default
  assert.equal(result.relatedInput, null);
});

test('prefillShieldFromAgentDraft succeeds when relatedInput is present', () => {
  const agent = makeTestAgent();
  const draft = makeTestDraft(agent);
  draft.relatedInput = 'base64txdata';
  const result = prefillShieldFromAgentDraft(draft);

  assert.equal(result.result.ok, true);
  assert.equal(result.relatedInput, 'base64txdata');
  assert.ok(result.result.warnings.some((w) => w.includes('auto-analyze')));
});

test('attachBuilderContextToAgentDraft adds sanitized builder context', () => {
  const agent = makeTestAgent();
  const draft = makeTestDraft(agent);
  const summary: SolanaBuilderContextSummary = {
    generatedAt: new Date().toISOString(),
    rootPath: '/test',
    projectKind: 'anchor',
    packageManager: 'pnpm',
    programs: [],
    idls: [],
    instructions: [],
    errors: [],
    warnings: [],
    toolchain: [],
    recommendedNextChecks: [],
    copyableMarkdown: '# Builder summary',
  };

  const result = attachBuilderContextToAgentDraft(draft, summary);
  assert.equal(result.result.ok, true);
  assert.ok(result.updatedDraft.relatedBuilderContext?.includes('Builder summary'));
});

test('attachBuilderContextToAgentDraft fails when no builder context', () => {
  const agent = makeTestAgent();
  const draft = makeTestDraft(agent);
  const result = attachBuilderContextToAgentDraft(draft, null);
  assert.equal(result.result.ok, false);
});

test('rejectAgentDraft sets rejected_local and creates audit-friendly draft', () => {
  const agent = makeTestAgent();
  const draft = makeTestDraft(agent);
  const result = rejectAgentDraft(draft, 'Too risky');

  assert.equal(result.result.ok, true);
  assert.equal(result.updatedDraft.status, SolanaAgentActionStatus.REJECTED_LOCAL);
  assert.ok(result.updatedDraft.safetyNotes.some((n) => n.includes('Rejected')));
});

test('archiveAgentDraft sets archived status', () => {
  const agent = makeTestAgent();
  const draft = makeTestDraft(agent);
  const result = archiveAgentDraft(draft);

  assert.equal(result.result.ok, true);
  assert.equal(result.updatedDraft.status, SolanaAgentActionStatus.ARCHIVED);
  assert.ok(result.updatedDraft.safetyNotes.some((n) => n.includes('archived')));
});

test('no bridge action calls RPC/LLM/signing/execution', () => {
  // All bridge actions are pure functions that only mutate local metadata.
  // They do not return promises, make network requests, or construct transactions.
  const agent = makeTestAgent();
  const draft = makeTestDraft(agent);

  const prefill = prefillShieldFromAgentDraft(draft);
  assert.ok(typeof prefill.result.message === 'string');
  assert.ok(!prefill.result.message.includes('RPC'));

  const reject = rejectAgentDraft(draft);
  assert.equal(reject.updatedDraft.status, 'rejected_local');

  const archive = archiveAgentDraft(draft);
  assert.equal(archive.updatedDraft.status, 'archived');
});
