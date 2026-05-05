import { describe, it } from 'node:test';
import assert from 'node:assert';
import { analyzeTokenRiskSignals } from './analyzeTokenRiskSignals.js';
import { SolanaMarketsRiskSignalKind, WorkstationRiskLevel } from '@gorkh/shared';

describe('analyzeTokenRiskSignals', () => {
  it('returns account_not_found when snapshot does not exist', () => {
    const signals = analyzeTokenRiskSignals({ exists: false }, false, false);
    assert.strictEqual(signals.length, 1);
    assert.strictEqual(signals[0].kind, SolanaMarketsRiskSignalKind.ACCOUNT_NOT_FOUND);
    assert.strictEqual(signals[0].level, WorkstationRiskLevel.MEDIUM);
  });

  it('flags mint_authority_present', () => {
    const signals = analyzeTokenRiskSignals(
      { exists: true, mintAuthorityPresent: true },
      false,
      false
    );
    const signal = signals.find((s) => s.kind === SolanaMarketsRiskSignalKind.MINT_AUTHORITY_PRESENT);
    assert.ok(signal);
    assert.strictEqual(signal.level, WorkstationRiskLevel.MEDIUM);
  });

  it('flags freeze_authority_present as high', () => {
    const signals = analyzeTokenRiskSignals(
      { exists: true, freezeAuthorityPresent: true },
      false,
      false
    );
    const signal = signals.find((s) => s.kind === SolanaMarketsRiskSignalKind.FREEZE_AUTHORITY_PRESENT);
    assert.ok(signal);
    assert.strictEqual(signal.level, WorkstationRiskLevel.HIGH);
  });

  it('flags uninitialized_mint as high', () => {
    const signals = analyzeTokenRiskSignals(
      { exists: true, isInitialized: false },
      false,
      false
    );
    const signal = signals.find((s) => s.kind === SolanaMarketsRiskSignalKind.UNINITIALIZED_MINT);
    assert.ok(signal);
    assert.strictEqual(signal.level, WorkstationRiskLevel.HIGH);
  });

  it('flags token_2022_requires_review', () => {
    const signals = analyzeTokenRiskSignals(
      { exists: true, tokenProgram: 'token_2022' },
      false,
      false
    );
    const signal = signals.find((s) => s.kind === SolanaMarketsRiskSignalKind.TOKEN_2022_REQUIRES_REVIEW);
    assert.ok(signal);
    assert.strictEqual(signal.level, WorkstationRiskLevel.LOW);
  });

  it('flags largest_accounts_unavailable when empty', () => {
    const signals = analyzeTokenRiskSignals(
      { exists: true, largestAccounts: [] },
      false,
      false
    );
    const signal = signals.find(
      (s) => s.kind === SolanaMarketsRiskSignalKind.LARGEST_ACCOUNTS_UNAVAILABLE
    );
    assert.ok(signal);
  });

  it('flags high_holder_concentration_possible when top >50%', () => {
    const signals = analyzeTokenRiskSignals(
      {
        exists: true,
        supplyRaw: '10000',
        largestAccounts: [{ address: 'abc', amountRaw: '6000' }],
      },
      false,
      false
    );
    const signal = signals.find(
      (s) => s.kind === SolanaMarketsRiskSignalKind.HIGH_HOLDER_CONCENTRATION_POSSIBLE
    );
    assert.ok(signal);
    assert.strictEqual(signal.level, WorkstationRiskLevel.HIGH);
  });

  it('does not flag concentration when top <=50%', () => {
    const signals = analyzeTokenRiskSignals(
      {
        exists: true,
        supplyRaw: '10000',
        largestAccounts: [{ address: 'abc', amountRaw: '5000' }],
      },
      false,
      false
    );
    const signal = signals.find(
      (s) => s.kind === SolanaMarketsRiskSignalKind.HIGH_HOLDER_CONCENTRATION_POSSIBLE
    );
    assert.strictEqual(signal, undefined);
  });

  it('flags custom_rpc_privacy_warning when custom endpoint', () => {
    const signals = analyzeTokenRiskSignals({ exists: true }, true, false);
    const signal = signals.find(
      (s) => s.kind === SolanaMarketsRiskSignalKind.CUSTOM_RPC_PRIVACY_WARNING
    );
    assert.ok(signal);
  });

  it('flags mainnet_operational_caution on mainnet', () => {
    const signals = analyzeTokenRiskSignals({ exists: true }, false, true);
    const signal = signals.find(
      (s) => s.kind === SolanaMarketsRiskSignalKind.MAINNET_OPERATIONAL_CAUTION
    );
    assert.ok(signal);
  });
});
