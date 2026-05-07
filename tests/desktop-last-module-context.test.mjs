import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  createLastBuilderContextSnapshot,
  createLastShieldContextSnapshot,
} from '../apps/desktop/src/features/solana-workstation/context-bridge/createLastModuleContextSnapshots.ts';
import {
  loadLastModuleContext,
  saveLastBuilderContext,
  saveLastShieldContext,
  LAST_MODULE_CONTEXT_STORAGE_KEY,
} from '../apps/desktop/src/features/solana-workstation/context-bridge/lastModuleContextStorage.ts';

function installStorage() {
  const map = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => map.get(key) ?? null,
      setItem: (key, value) => map.set(key, value),
      removeItem: (key) => map.delete(key),
    },
  };
  return map;
}

test('creates redacted Shield last-context snapshot without raw full input', () => {
  const raw = `${'1'.repeat(120)}private-tail`;
  const snapshot = createLastShieldContextSnapshot({
    analysis: {
      input: raw,
      inputKind: 'signature',
      network: 'mainnet-beta',
      riskFindings: [{ level: 'high', title: 'High risk finding' }],
      summary: 'Manual Shield analysis complete.',
      safetyStatus: 'rpc_read_only',
    },
    decodedAvailable: false,
    accountLookup: null,
    signatureLookup: null,
    simulationPreview: null,
    altResolutions: null,
  });
  assert.equal(snapshot.source, 'shield');
  assert.equal(snapshot.highestRiskLevel, 'high');
  assert.notEqual(snapshot.inputPreview, raw);
  assert.match(snapshot.inputHash, /^fnv1a-/);
  assert.ok(snapshot.redactionsApplied.includes('shield.inputHash.only'));
});

test('creates Builder snapshot with label-only root path and redacted markdown', () => {
  const snapshot = createLastBuilderContextSnapshot({
    generatedAt: new Date().toISOString(),
    rootPath: '/Users/alice/secrets/my-anchor-program',
    projectKind: 'anchor',
    packageManager: 'pnpm',
    programs: ['demo (devnet)'],
    idls: ['demo'],
    instructions: ['demo::initialize'],
    errors: ['demo::Unauthorized (6000)'],
    warnings: ['No tests directory detected.'],
    toolchain: ['anchor: 0.30.1'],
    recommendedNextChecks: ['Verify Anchor.toml cluster.'],
    copyableMarkdown: '# Context\n/Users/alice/secrets/my-anchor-program\nNo secrets included.',
  });
  assert.equal(snapshot.rootPathLabel, 'my-anchor-program');
  assert.doesNotMatch(snapshot.markdown, /\/Users\/alice\/secrets/);
  assert.match(snapshot.markdown, /\[workspace path redacted\]/);
  assert.ok(snapshot.redactionsApplied.includes('builder.rootPath.labelOnly'));
});

test('last module context storage persists Shield and Builder snapshots and rejects secrets', () => {
  const storage = installStorage();
  saveLastShieldContext({
    source: 'shield',
    inputKind: 'address',
    inputPreview: '11111111111111111111111111111111',
    inputHash: 'fnv1a-12345678',
    network: 'devnet',
    summary: 'Address lookup run manually.',
    decodedAvailable: false,
    riskFindingCount: 0,
    simulationAvailable: false,
    accountLookupAvailable: true,
    signatureLookupAvailable: false,
    lookupTableResolutionCount: 0,
    warnings: [],
    redactionsApplied: ['shield.inputHash.only'],
    updatedAt: Date.now(),
    localOnly: true,
  });
  saveLastBuilderContext({
    source: 'builder',
    projectKind: 'anchor',
    rootPathLabel: 'program',
    idlCount: 1,
    instructionCount: 1,
    idlErrorCount: 0,
    logFindingCount: 0,
    toolchainAvailable: [],
    warnings: [],
    recommendedNextChecks: [],
    markdown: '# Builder',
    redactionsApplied: ['builder.secretFiles.excluded'],
    updatedAt: Date.now(),
    localOnly: true,
  });
  const state = loadLastModuleContext();
  assert.equal(state.shield?.source, 'shield');
  assert.equal(state.builder?.projectKind, 'anchor');
  assert.ok(storage.has(LAST_MODULE_CONTEXT_STORAGE_KEY));

  assert.throws(
    () =>
      saveLastBuilderContext({
        source: 'builder',
        projectKind: 'anchor',
        idlCount: 0,
        instructionCount: 0,
        idlErrorCount: 0,
        logFindingCount: 0,
        toolchainAvailable: [],
        warnings: [],
        recommendedNextChecks: [],
        markdown: '"privateKey": "secret"',
        redactionsApplied: [],
        updatedAt: Date.now(),
        localOnly: true,
      }),
    /sensitive material/
  );
});

test('Agent Station reads stored module context but does not trigger Shield RPC or Builder commands', () => {
  const runtime = readFileSync(
    'apps/desktop/src/features/solana-workstation/agent/station/agentRuntime.ts',
    'utf8'
  );
  const stationSources = [
    'apps/desktop/src/features/solana-workstation/agent/station/agentContextTools.ts',
    'apps/desktop/src/features/solana-workstation/agent/station/agentRuntime.ts',
  ].map((file) => readFileSync(file, 'utf8')).join('\n');
  assert.match(runtime, /lastModuleContext/);
  assert.doesNotMatch(stationSources, /getTransactionReadOnly|simulateTransactionPreview|runBuilderVersionChecks|inspectConfiguredWorkspace/);
});
