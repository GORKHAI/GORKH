import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AnchorIdlSummarySchema,
  AccountDecodeInputSchema,
  AccountDecodeResultSchema,
  ProgramLogSubscriptionSchema,
  ProgramLogEventSchema,
  RpcEndpointProfileSchema,
  RpcBenchmarkResultSchema,
  NetworkHealthSnapshotSchema,
  WebsocketSubscriptionProfileSchema,
  ComputeEstimateInputSchema,
  ComputeEstimateResultSchema,
  DeveloperToolboxContextSnapshotSchema,
  BUILDER_TOOLBOX_ALLOWED_RPC_METHODS,
  BUILDER_TOOLBOX_FORBIDDEN_RPC_METHODS,
  BUILDER_TOOLBOX_LOCKED_ADVANCED_ACTIONS,
} from '../dist/index.js';

test('Builder Toolbox schemas validate safe v0.1 objects', () => {
  assert.equal(AnchorIdlSummarySchema.safeParse({
    name: 'vault_router',
    instructionCount: 1,
    accountCount: 1,
    typeCount: 0,
    eventCount: 0,
    errorCount: 0,
    instructions: [{ name: 'initializeVault', accounts: [{ name: 'payer', signer: true, writable: true }], args: [{ name: 'bump', type: 'u8' }] }],
    accounts: [{ name: 'VaultConfig', fields: [{ name: 'authority', type: 'publicKey' }] }],
    types: [],
    events: [],
    errors: [],
    warnings: [],
    localOnly: true,
  }).success, true);
  assert.equal(AccountDecodeInputSchema.safeParse({ rawInput: 'AQID', encoding: 'base64', localOnly: true }).success, true);
  assert.equal(AccountDecodeResultSchema.safeParse({ status: 'decoded', byteLength: 3, encoding: 'base64', fields: [], warnings: [], localOnly: true }).success, true);
  assert.equal(ProgramLogSubscriptionSchema.safeParse({ id: 'sub', programId: '111', status: 'idle' }).success, true);
  assert.equal(ProgramLogEventSchema.safeParse({ id: 'evt', timestamp: 1, logs: [] }).success, true);
  assert.equal(RpcEndpointProfileSchema.safeParse({
    id: 'rpc',
    label: 'Devnet',
    url: 'https://api.devnet.solana.com',
    redactedUrl: 'https://api.devnet.solana.com/',
    cluster: 'devnet',
    enabled: true,
    isDefault: true,
    createdAt: 1,
    updatedAt: 1,
  }).success, true);
  assert.equal(RpcBenchmarkResultSchema.safeParse({ endpointId: 'rpc', label: 'Devnet', redactedUrl: 'https://api.devnet.solana.com/', status: 'healthy', latencyMs: 42 }).success, true);
  assert.equal(NetworkHealthSnapshotSchema.safeParse({ selectedCluster: 'devnet', websocketStatus: 'idle', subscriptionEventCount: 0, status: 'idle', warnings: [] }).success, true);
  assert.equal(WebsocketSubscriptionProfileSchema.safeParse({ id: 'ws', kind: 'slot', status: 'idle', eventCount: 0, createdAt: 1 }).success, true);
  assert.equal(ComputeEstimateInputSchema.safeParse({ serializedTransactionBase64: 'AQID', source: 'pasted', localOnly: true }).success, true);
  assert.equal(ComputeEstimateResultSchema.safeParse({ status: 'idle', logs: [], warnings: [] }).success, true);
  assert.equal(DeveloperToolboxContextSnapshotSchema.safeParse({ selectedCluster: 'devnet', activeSubscriptionsCount: 0, updatedAt: 1, redactionsApplied: [], localOnly: true }).success, true);
});

test('Builder Toolbox allowlists remain read-only and locked actions include dangerous developer paths', () => {
  assert.ok(BUILDER_TOOLBOX_ALLOWED_RPC_METHODS.includes('getSlot'));
  assert.ok(BUILDER_TOOLBOX_ALLOWED_RPC_METHODS.includes('simulateTransaction'));
  assert.ok(BUILDER_TOOLBOX_FORBIDDEN_RPC_METHODS.includes('sendTransaction'));
  assert.ok(BUILDER_TOOLBOX_FORBIDDEN_RPC_METHODS.includes('sendRawTransaction'));
  assert.ok(BUILDER_TOOLBOX_FORBIDDEN_RPC_METHODS.includes('requestAirdrop'));
  assert.ok(BUILDER_TOOLBOX_LOCKED_ADVANCED_ACTIONS.includes('Program Deployment'));
  assert.ok(BUILDER_TOOLBOX_LOCKED_ADVANCED_ACTIONS.includes('Program Upgrade'));
  assert.ok(BUILDER_TOOLBOX_LOCKED_ADVANCED_ACTIONS.includes('Arbitrary RPC Playground'));
  assert.ok(BUILDER_TOOLBOX_LOCKED_ADVANCED_ACTIONS.includes('Offline Signing'));
  assert.ok(BUILDER_TOOLBOX_LOCKED_ADVANCED_ACTIONS.includes('Local Validator Process Manager'));
});
