import assert from 'node:assert/strict';
import test from 'node:test';
import {
  summarizeAnchorIdlJson,
  detectAccountDataEncoding,
  decodeAccountData,
  redactedRpcUrl,
  isLikelySensitiveRpcUrl,
  makeEndpointProfile,
  assertSafeEndpointForLocalStorage,
  sortBenchmarkResults,
  capLogEvents,
  createProgramLogEvent,
  createSubscriptionProfile,
  buildReadOnlySubscriptionPayload,
  isReadOnlySubscriptionMethod,
  createIdleComputeEstimate,
  mapSimulationToComputeEstimate,
  assertSafeBuilderToolboxSnapshot,
} from '../apps/desktop/src/features/solana-workstation/builder/toolbox/index.ts';

const validIdl = JSON.stringify({
  version: '0.1.0',
  name: 'vault_router',
  instructions: [
    {
      name: 'initializeVault',
      accounts: [{ name: 'payer', isMut: true, isSigner: true }],
      args: [{ name: 'bump', type: 'u8' }],
    },
  ],
  accounts: [
    {
      name: 'VaultConfig',
      type: { kind: 'struct', fields: [{ name: 'bump', type: 'u8' }, { name: 'count', type: 'u32' }] },
    },
  ],
  errors: [{ code: 6000, name: 'Unauthorized', msg: 'Unauthorized' }],
  events: [{ name: 'VaultInitialized', fields: [{ name: 'vault', type: 'publicKey' }] }],
  types: [{ name: 'Route', type: { kind: 'struct', fields: [] } }],
  metadata: { address: '11111111111111111111111111111111' },
});

test('Builder Toolbox parses valid IDL and rejects invalid IDL', () => {
  const summary = summarizeAnchorIdlJson(validIdl);
  assert.ok(summary);
  assert.equal(summary.name, 'vault_router');
  assert.equal(summary.instructionCount, 1);
  assert.equal(summary.accountCount, 1);
  assert.equal(summary.errors[0].name, 'Unauthorized');
  assert.equal(summarizeAnchorIdlJson('{bad json'), null);
});

test('Builder Toolbox detects and decodes account data locally with honest unsupported states', () => {
  const summary = summarizeAnchorIdlJson(validIdl);
  assert.ok(summary);
  const bytes = Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 7, 0, 0, 0]);
  const base64 = btoa(String.fromCharCode(...bytes));
  assert.equal(detectAccountDataEncoding(base64), 'base64');
  assert.equal(detectAccountDataEncoding('0x01020304'), 'hex');
  assert.equal(detectAccountDataEncoding('zzzzzz'), 'base58');
  const decoded = decodeAccountData({ rawInput: base64, encoding: 'base64', accountTypeName: 'VaultConfig', localOnly: true }, summary);
  assert.equal(decoded.status, 'decoded');
  assert.equal(decoded.byteLength, bytes.length);
  assert.equal(decoded.fields[0].value, '9');
  assert.equal(decoded.fields[1].value, '7');
  const unsupported = decodeAccountData({ rawInput: base64, encoding: 'base64', accountTypeName: 'Missing', localOnly: true }, summary);
  assert.equal(unsupported.status, 'unsupported');
  const invalid = decodeAccountData({ rawInput: 'not valid !!!', encoding: 'unknown', localOnly: true }, summary);
  assert.equal(invalid.status, 'invalid');
});

test('Builder Toolbox redacts RPC endpoints and refuses secret endpoint serialization', () => {
  assert.equal(redactedRpcUrl('https://mainnet.helius-rpc.com/?api-key=abc123'), 'https://mainnet.helius-rpc.com/?%E2%80%A2%E2%80%A2%E2%80%A2%E2%80%A2%E2%80%A2%E2%80%A2');
  assert.equal(isLikelySensitiveRpcUrl('https://mainnet.helius-rpc.com/?api-key=abc123'), true);
  assert.equal(isLikelySensitiveRpcUrl('https://api.devnet.solana.com'), false);
  const endpoint = makeEndpointProfile('Devnet', 'https://api.devnet.solana.com', 'devnet', true);
  assert.doesNotThrow(() => assertSafeEndpointForLocalStorage(endpoint));
  const sensitive = makeEndpointProfile('Private', 'https://example.com/rpc/public', 'custom');
  assert.throws(() => assertSafeEndpointForLocalStorage({ ...sensitive, url: 'https://example.com/?token=secret' }), /Sensitive RPC URLs/);
});

test('Builder Toolbox benchmark sorting, websocket lifecycle helpers, and compute mapping stay read-only', () => {
  const sorted = sortBenchmarkResults([
    { endpointId: 'b', label: 'Slow', redactedUrl: 'https://b/', status: 'healthy', latencyMs: 200 },
    { endpointId: 'a', label: 'Fast', redactedUrl: 'https://a/', status: 'healthy', latencyMs: 50 },
    { endpointId: 'c', label: 'Down', redactedUrl: 'https://c/', status: 'failed' },
  ]);
  assert.equal(sorted[0].label, 'Fast');
  assert.equal(capLogEvents(Array.from({ length: 130 }, (_, index) => createProgramLogEvent([String(index)]))).length, 120);
  const slot = createSubscriptionProfile('slot');
  const payload = buildReadOnlySubscriptionPayload(slot);
  assert.equal(payload.method, 'slotSubscribe');
  assert.equal(isReadOnlySubscriptionMethod(payload.method), true);
  const idle = createIdleComputeEstimate();
  assert.equal(idle.status, 'idle');
  const estimate = mapSimulationToComputeEstimate({
    network: 'devnet',
    success: true,
    logs: ['Program log'],
    unitsConsumed: 1234,
    simulatedAt: 1,
    warning: 'Simulation uses current RPC state.',
  });
  assert.equal(estimate.computeUnitsConsumed, 1234);
  assert.match(estimate.warnings.join('\n'), /No signing, broadcast, deployment/);
});

test('Builder Toolbox context redaction rejects secret-like material', () => {
  assert.doesNotThrow(() => assertSafeBuilderToolboxSnapshot({
    selectedCluster: 'devnet',
    selectedEndpointRedactedUrl: 'https://example.com/?••••••',
    activeSubscriptionsCount: 0,
    updatedAt: 1,
    redactionsApplied: ['rpc_url_redacted'],
    localOnly: true,
  }));
  assert.throws(() => assertSafeBuilderToolboxSnapshot({ apiKey: 'abc123' }), /sensitive/);
  assert.throws(() => assertSafeBuilderToolboxSnapshot({ url: 'https://example.com/?token=abc123' }), /sensitive/);
});
