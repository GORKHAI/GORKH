import assert from 'node:assert/strict';
import test from 'node:test';
import { classifySolanaInput } from './classifySolanaInput.js';
import { SolanaShieldInputKind } from '@gorkh/shared';

test('classifySolanaInput returns unknown for random text', () => {
  assert.equal(classifySolanaInput('hello world'), SolanaShieldInputKind.UNKNOWN);
  assert.equal(classifySolanaInput(''), SolanaShieldInputKind.UNKNOWN);
  assert.equal(classifySolanaInput('   '), SolanaShieldInputKind.UNKNOWN);
  assert.equal(classifySolanaInput('not-base58!!!'), SolanaShieldInputKind.UNKNOWN);
});

test('classifySolanaInput identifies a valid-looking public key', () => {
  // System Program ID (base58)
  assert.equal(
    classifySolanaInput('11111111111111111111111111111111'),
    SolanaShieldInputKind.ADDRESS
  );
  // Token program
  assert.equal(
    classifySolanaInput('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    SolanaShieldInputKind.ADDRESS
  );
});

test('classifySolanaInput identifies a signature-like string', () => {
  // A fake 88-char base58 string (signature length)
  const fakeSig = '1'.repeat(88);
  assert.equal(classifySolanaInput(fakeSig), SolanaShieldInputKind.SIGNATURE);
});

test('classifySolanaInput identifies serialized transaction base64', () => {
  // Build a minimal valid legacy transaction as base64
  const bytes = [];
  // 1 signature
  bytes.push(1); // short-u16: 1
  // 64 zero bytes for signature
  for (let i = 0; i < 64; i++) bytes.push(0);
  // Message header
  bytes.push(1, 0, 0);
  // 2 account keys
  bytes.push(2); // short-u16: 2
  // 2 * 32 zero bytes for pubkeys
  for (let i = 0; i < 64; i++) bytes.push(0);
  // recent blockhash (32 zeros)
  for (let i = 0; i < 32; i++) bytes.push(0);
  // 1 instruction
  bytes.push(1); // short-u16: 1
  // instruction: program_id_index=0, 1 account, 4 bytes data
  bytes.push(0); // program_id_index
  bytes.push(1); // 1 account index
  bytes.push(0); // account index 0
  bytes.push(4); // 4 bytes data
  bytes.push(1, 2, 3, 4); // data

  const base64 = btoa(String.fromCharCode(...bytes));
  assert.equal(
    classifySolanaInput(base64),
    SolanaShieldInputKind.SERIALIZED_TRANSACTION_BASE64
  );
});

test('classifySolanaInput returns unknown for invalid base64 that is too short', () => {
  const shortBase64 = btoa('short');
  assert.equal(classifySolanaInput(shortBase64), SolanaShieldInputKind.UNKNOWN);
});
