import { describe, it } from 'node:test';
import assert from 'node:assert';
import { assertSafeMarketsLabel, isValidSolanaAddress } from './marketsGuards.js';

describe('marketsGuards', () => {
  describe('isValidSolanaAddress', () => {
    it('accepts valid base58 addresses', () => {
      assert.strictEqual(isValidSolanaAddress('So11111111111111111111111111111111111111112'), true);
      assert.strictEqual(isValidSolanaAddress('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), true);
    });

    it('rejects empty string', () => {
      assert.strictEqual(isValidSolanaAddress(''), false);
    });

    it('rejects addresses with invalid chars', () => {
      assert.strictEqual(isValidSolanaAddress('0x1234567890abcdef'), false);
      assert.strictEqual(isValidSolanaAddress('hello world'), false);
    });

    it('rejects too short addresses', () => {
      assert.strictEqual(isValidSolanaAddress('abc'), false);
    });
  });

  describe('assertSafeMarketsLabel', () => {
    it('allows safe labels', () => {
      assert.doesNotThrow(() => assertSafeMarketsLabel('My Token'));
      assert.doesNotThrow(() => assertSafeMarketsLabel('Wallet A'));
    });

    it('throws for swap-related labels', () => {
      assert.throws(() => assertSafeMarketsLabel('swap bot'), /denied feature/);
    });

    it('throws for drift-related labels', () => {
      assert.throws(() => assertSafeMarketsLabel('Drift perps'), /denied feature/);
    });

    it('throws case-insensitively', () => {
      assert.throws(() => assertSafeMarketsLabel('AUTO_BUY'), /denied feature/);
    });
  });
});
