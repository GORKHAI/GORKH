import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ALLOWED_SOLANA_RPC_METHODS,
  DENIED_SOLANA_RPC_METHODS,
  DEFAULT_SOLANA_RPC_ENDPOINTS,
  assertAllowedSolanaRpcMethod,
  isAllowedSolanaRpcMethod,
  isDeniedSolanaRpcMethod,
  SolanaRpcEndpointConfigSchema,
  SolanaShieldRpcAnalysisSchema,
} from '../dist/index.js';

test('ALLOWED_SOLANA_RPC_METHODS includes only read-only methods', () => {
  assert.ok(ALLOWED_SOLANA_RPC_METHODS.includes('getAccountInfo'));
  assert.ok(ALLOWED_SOLANA_RPC_METHODS.includes('getBalance'));
  assert.ok(ALLOWED_SOLANA_RPC_METHODS.includes('getTransaction'));
  assert.ok(ALLOWED_SOLANA_RPC_METHODS.includes('getLatestBlockhash'));
  assert.ok(ALLOWED_SOLANA_RPC_METHODS.includes('getTokenAccountsByOwner'));
  assert.ok(ALLOWED_SOLANA_RPC_METHODS.includes('getMultipleAccounts'));
  assert.ok(ALLOWED_SOLANA_RPC_METHODS.includes('simulateTransaction'));
});

test('ALLOWED_SOLANA_RPC_METHODS excludes send and airdrop methods', () => {
  assert.ok(!ALLOWED_SOLANA_RPC_METHODS.includes('sendTransaction'));
  assert.ok(!ALLOWED_SOLANA_RPC_METHODS.includes('sendRawTransaction'));
  assert.ok(!ALLOWED_SOLANA_RPC_METHODS.includes('requestAirdrop'));
});

test('DENIED_SOLANA_RPC_METHODS includes sendTransaction, sendRawTransaction, requestAirdrop', () => {
  assert.ok(DENIED_SOLANA_RPC_METHODS.includes('sendTransaction'));
  assert.ok(DENIED_SOLANA_RPC_METHODS.includes('sendRawTransaction'));
  assert.ok(DENIED_SOLANA_RPC_METHODS.includes('requestAirdrop'));
});

test('assertAllowedSolanaRpcMethod accepts allowed methods', () => {
  assert.doesNotThrow(() => assertAllowedSolanaRpcMethod('getAccountInfo'));
  assert.doesNotThrow(() => assertAllowedSolanaRpcMethod('simulateTransaction'));
});

test('assertAllowedSolanaRpcMethod throws for denied methods', () => {
  assert.throws(() => assertAllowedSolanaRpcMethod('sendTransaction'), /denied/);
  assert.throws(() => assertAllowedSolanaRpcMethod('sendRawTransaction'), /denied/);
  assert.throws(() => assertAllowedSolanaRpcMethod('requestAirdrop'), /denied/);
});

test('assertAllowedSolanaRpcMethod throws for unknown methods', () => {
  assert.throws(() => assertAllowedSolanaRpcMethod('arbitraryRpcMethod'), /not in the allowed list/);
});

test('isAllowedSolanaRpcMethod matches allowed list', () => {
  assert.equal(isAllowedSolanaRpcMethod('getAccountInfo'), true);
  assert.equal(isAllowedSolanaRpcMethod('sendTransaction'), false);
  assert.equal(isAllowedSolanaRpcMethod('unknownMethod'), false);
});

test('isDeniedSolanaRpcMethod matches denied list', () => {
  assert.equal(isDeniedSolanaRpcMethod('sendTransaction'), true);
  assert.equal(isDeniedSolanaRpcMethod('sendRawTransaction'), true);
  assert.equal(isDeniedSolanaRpcMethod('requestAirdrop'), true);
  assert.equal(isDeniedSolanaRpcMethod('getAccountInfo'), false);
});

test('DEFAULT_SOLANA_RPC_ENDPOINTS has valid URLs', () => {
  assert.ok(DEFAULT_SOLANA_RPC_ENDPOINTS.devnet.url.startsWith('https://'));
  assert.ok(DEFAULT_SOLANA_RPC_ENDPOINTS['mainnet-beta'].url.startsWith('https://'));
  assert.ok(DEFAULT_SOLANA_RPC_ENDPOINTS.localnet.url.startsWith('http://127.0.0.1'));
});

test('SolanaRpcEndpointConfigSchema accepts valid endpoints', () => {
  const valid = SolanaRpcEndpointConfigSchema.safeParse({
    network: 'devnet',
    url: 'https://api.devnet.solana.com',
    label: 'Devnet',
    isCustom: false,
  });
  assert.ok(valid.success, 'should accept valid endpoint config');
});

test('SolanaRpcEndpointConfigSchema rejects invalid URLs', () => {
  const invalid = SolanaRpcEndpointConfigSchema.safeParse({
    network: 'devnet',
    url: 'not-a-url',
    label: 'Bad',
    isCustom: false,
  });
  assert.ok(!invalid.success, 'should reject invalid URL');
});

test('SolanaShieldRpcAnalysisSchema accepts account lookup and simulation preview', () => {
  const sample = {
    input: 'test',
    inputKind: 'address',
    network: 'devnet',
    accountLookup: {
      address: '11111111111111111111111111111111',
      network: 'devnet',
      exists: true,
      lamports: 1000000,
      fetchedAt: Date.now(),
    },
    simulationPreview: {
      network: 'devnet',
      success: true,
      logs: ['log1'],
      simulatedAt: Date.now(),
      warning: 'Test warning',
    },
    riskFindings: [],
    summary: 'Test summary',
    safetyStatus: 'rpc_read_only',
  };
  const result = SolanaShieldRpcAnalysisSchema.safeParse(sample);
  assert.ok(result.success, 'should accept valid RPC analysis');
});
