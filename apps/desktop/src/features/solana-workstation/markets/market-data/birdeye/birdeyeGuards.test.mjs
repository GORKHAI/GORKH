import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateBirdeyeApiKeyInput,
  sanitizeBirdeyeApiKeyForDisplay,
  assertBirdeyeFetchIsReadOnly,
  validateBirdeyeMintAddress,
  getBirdeyePriceUrl,
  getBirdeyeTokenOverviewUrl,
  BirdeyeGuardError,
} from './birdeyeGuards.js';

describe('birdeyeGuards', () => {
  describe('validateBirdeyeApiKeyInput', () => {
    it('accepts a normal API key string', () => {
      assert.strictEqual(validateBirdeyeApiKeyInput('  abc123  '), 'abc123');
    });

    it('rejects empty string', () => {
      assert.throws(() => validateBirdeyeApiKeyInput(''), BirdeyeGuardError);
      assert.throws(() => validateBirdeyeApiKeyInput('   '), BirdeyeGuardError);
    });

    it('rejects line breaks', () => {
      assert.throws(() => validateBirdeyeApiKeyInput('abc\ndef'), BirdeyeGuardError);
      assert.throws(() => validateBirdeyeApiKeyInput('abc\rdef'), BirdeyeGuardError);
    });

    it('rejects oversized keys', () => {
      const huge = 'a'.repeat(513);
      assert.throws(() => validateBirdeyeApiKeyInput(huge), BirdeyeGuardError);
    });

    it('rejects dangerous script-like content', () => {
      assert.throws(() => validateBirdeyeApiKeyInput('eval("bad")'), BirdeyeGuardError);
      assert.throws(() => validateBirdeyeApiKeyInput('function(){}'), BirdeyeGuardError);
      assert.throws(() => validateBirdeyeApiKeyInput('const x = () => 1'), BirdeyeGuardError);
      assert.throws(() => validateBirdeyeApiKeyInput('import("bad")'), BirdeyeGuardError);
      assert.throws(() => validateBirdeyeApiKeyInput('require("fs")'), BirdeyeGuardError);
      assert.throws(() => validateBirdeyeApiKeyInput('fetch(http://evil)'), BirdeyeGuardError);
      assert.throws(() => validateBirdeyeApiKeyInput('exec("rm")'), BirdeyeGuardError);
    });
  });

  describe('sanitizeBirdeyeApiKeyForDisplay', () => {
    it('masks short keys as ****', () => {
      assert.strictEqual(sanitizeBirdeyeApiKeyForDisplay('abc'), '****');
      assert.strictEqual(sanitizeBirdeyeApiKeyForDisplay('abcdefgh'), '****');
    });

    it('masks long keys showing last 4 chars', () => {
      assert.strictEqual(sanitizeBirdeyeApiKeyForDisplay('mysecretkey1234'), '****1234');
    });
  });

  describe('assertBirdeyeFetchIsReadOnly', () => {
    it('does not throw', () => {
      assert.doesNotThrow(() => assertBirdeyeFetchIsReadOnly());
    });
  });

  describe('validateBirdeyeMintAddress', () => {
    it('returns null for valid base58 addresses', () => {
      assert.strictEqual(validateBirdeyeMintAddress('So11111111111111111111111111111111111111112'), null);
      assert.strictEqual(validateBirdeyeMintAddress('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), null);
    });

    it('returns error for empty string', () => {
      assert.ok(validateBirdeyeMintAddress(''));
    });

    it('returns error for too short address', () => {
      assert.ok(validateBirdeyeMintAddress('abc'));
    });

    it('returns error for invalid base58 chars', () => {
      assert.ok(validateBirdeyeMintAddress('0x1234567890abcdef'));
      assert.ok(validateBirdeyeMintAddress('hello world'));
      assert.ok(validateBirdeyeMintAddress('So111111111111111111111111111111111111111O')); // letter O
      assert.ok(validateBirdeyeMintAddress('So111111111111111111111111111111111111111l')); // letter l
      assert.ok(validateBirdeyeMintAddress('So1111111111111111111111111111111111111110')); // digit 0
    });
  });

  describe('getBirdeyePriceUrl', () => {
    it('returns a URL with encoded address', () => {
      const url = getBirdeyePriceUrl('So11111111111111111111111111111111111111112');
      assert.ok(url.includes('/defi/price?address='));
      assert.ok(url.includes('So11111111111111111111111111111111111111112'));
    });
  });

  describe('getBirdeyeTokenOverviewUrl', () => {
    it('returns a URL with encoded address', () => {
      const url = getBirdeyeTokenOverviewUrl('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      assert.ok(url.includes('/defi/token_overview?address='));
      assert.ok(url.includes('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'));
    });
  });
});
