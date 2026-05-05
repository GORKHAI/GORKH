import { describe, it } from 'node:test';
import assert from 'node:assert';
import { classifyMarketsAddress } from './classifyMarketsAddress.js';
import { SolanaMarketsItemKind } from '@gorkh/shared';

describe('classifyMarketsAddress', () => {
  it('returns unknown when no snapshot provided', () => {
    assert.strictEqual(classifyMarketsAddress('abc'), SolanaMarketsItemKind.UNKNOWN);
  });

  it('returns unknown when account does not exist', () => {
    assert.strictEqual(
      classifyMarketsAddress('abc', { exists: false }),
      SolanaMarketsItemKind.UNKNOWN
    );
  });

  it('returns program for executable accounts', () => {
    assert.strictEqual(
      classifyMarketsAddress('abc', { exists: true, executable: true }),
      SolanaMarketsItemKind.PROGRAM
    );
  });

  it('returns token_mint when hasMintFields is true', () => {
    assert.strictEqual(
      classifyMarketsAddress('abc', { exists: true, executable: false }, true),
      SolanaMarketsItemKind.TOKEN_MINT
    );
  });

  it('returns wallet for System Program owner with lamports', () => {
    assert.strictEqual(
      classifyMarketsAddress('abc', {
        exists: true,
        executable: false,
        owner: '11111111111111111111111111111111',
        lamports: 1000,
      }),
      SolanaMarketsItemKind.WALLET
    );
  });

  it('returns pool_or_account for Token Program owner', () => {
    assert.strictEqual(
      classifyMarketsAddress('abc', {
        exists: true,
        executable: false,
        owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      }),
      SolanaMarketsItemKind.POOL_OR_ACCOUNT
    );
  });

  it('returns pool_or_account for Token-2022 owner', () => {
    assert.strictEqual(
      classifyMarketsAddress('abc', {
        exists: true,
        executable: false,
        owner: 'TokenzQdBNbLqP5VEyqY7Yxk9yQv9mKqNfY9hL7tM6Q',
      }),
      SolanaMarketsItemKind.POOL_OR_ACCOUNT
    );
  });

  it('returns pool_or_account for ATA Program owner', () => {
    assert.strictEqual(
      classifyMarketsAddress('abc', {
        exists: true,
        executable: false,
        owner: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
      }),
      SolanaMarketsItemKind.POOL_OR_ACCOUNT
    );
  });

  it('returns pool_or_account for accounts with data', () => {
    assert.strictEqual(
      classifyMarketsAddress('abc', {
        exists: true,
        executable: false,
        dataLength: 165,
      }),
      SolanaMarketsItemKind.POOL_OR_ACCOUNT
    );
  });

  it('returns wallet for accounts with SOL but no data', () => {
    assert.strictEqual(
      classifyMarketsAddress('abc', {
        exists: true,
        executable: false,
        lamports: 5000,
        dataLength: 0,
      }),
      SolanaMarketsItemKind.WALLET
    );
  });

  it('returns unknown when nothing matches', () => {
    assert.strictEqual(
      classifyMarketsAddress('abc', {
        exists: true,
        executable: false,
        lamports: 0,
        dataLength: 0,
      }),
      SolanaMarketsItemKind.UNKNOWN
    );
  });
});
