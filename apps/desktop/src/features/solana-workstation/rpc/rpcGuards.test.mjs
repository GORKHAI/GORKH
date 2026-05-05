import assert from 'node:assert/strict';
import test from 'node:test';
import {
  sanitizeRpcEndpointUrl,
  assertAllowedSolanaRpcMethod,
  isAllowedSolanaRpcMethod,
  isDeniedSolanaRpcMethod,
} from './rpcGuards.js';

test('sanitizeRpcEndpointUrl accepts https://api.devnet.solana.com', () => {
  const result = sanitizeRpcEndpointUrl('https://api.devnet.solana.com');
  assert.equal(result.ok, true);
  assert.equal(result.url, 'https://api.devnet.solana.com/');
});

test('sanitizeRpcEndpointUrl accepts http://127.0.0.1:8899', () => {
  const result = sanitizeRpcEndpointUrl('http://127.0.0.1:8899');
  assert.equal(result.ok, true);
});

test('sanitizeRpcEndpointUrl accepts http://localhost:8899', () => {
  const result = sanitizeRpcEndpointUrl('http://localhost:8899');
  assert.equal(result.ok, true);
});

test('sanitizeRpcEndpointUrl rejects file: scheme', () => {
  const result = sanitizeRpcEndpointUrl('file:///etc/passwd');
  assert.equal(result.ok, false);
});

test('sanitizeRpcEndpointUrl rejects data: scheme', () => {
  const result = sanitizeRpcEndpointUrl('data:text/html,<script>alert(1)</script>');
  assert.equal(result.ok, false);
});

test('sanitizeRpcEndpointUrl rejects javascript: scheme', () => {
  const result = sanitizeRpcEndpointUrl('javascript:alert(1)');
  assert.equal(result.ok, false);
});

test('sanitizeRpcEndpointUrl rejects chrome-extension: scheme', () => {
  const result = sanitizeRpcEndpointUrl('chrome-extension://abc123');
  assert.equal(result.ok, false);
});

test('sanitizeRpcEndpointUrl rejects URLs with embedded credentials', () => {
  const result = sanitizeRpcEndpointUrl('https://user:pass@api.devnet.solana.com');
  assert.equal(result.ok, false);
});

test('sanitizeRpcEndpointUrl rejects non-local http', () => {
  const result = sanitizeRpcEndpointUrl('http://api.devnet.solana.com');
  assert.equal(result.ok, false);
});

test('sanitizeRpcEndpointUrl rejects empty URL', () => {
  const result = sanitizeRpcEndpointUrl('');
  assert.equal(result.ok, false);
});

test('assertAllowedSolanaRpcMethod accepts allowed methods', () => {
  assert.doesNotThrow(() => assertAllowedSolanaRpcMethod('getAccountInfo'));
  assert.doesNotThrow(() => assertAllowedSolanaRpcMethod('simulateTransaction'));
});

test('assertAllowedSolanaRpcMethod rejects sendTransaction', () => {
  assert.throws(() => assertAllowedSolanaRpcMethod('sendTransaction'), /denied/);
});

test('assertAllowedSolanaRpcMethod rejects sendRawTransaction', () => {
  assert.throws(() => assertAllowedSolanaRpcMethod('sendRawTransaction'), /denied/);
});

test('assertAllowedSolanaRpcMethod rejects requestAirdrop', () => {
  assert.throws(() => assertAllowedSolanaRpcMethod('requestAirdrop'), /denied/);
});

test('isAllowedSolanaRpcMethod returns true for allowed methods', () => {
  assert.equal(isAllowedSolanaRpcMethod('getAccountInfo'), true);
  assert.equal(isAllowedSolanaRpcMethod('getLatestBlockhash'), true);
});

test('isDeniedSolanaRpcMethod returns true for denied methods', () => {
  assert.equal(isDeniedSolanaRpcMethod('sendTransaction'), true);
  assert.equal(isDeniedSolanaRpcMethod('sendRawTransaction'), true);
  assert.equal(isDeniedSolanaRpcMethod('requestAirdrop'), true);
});
