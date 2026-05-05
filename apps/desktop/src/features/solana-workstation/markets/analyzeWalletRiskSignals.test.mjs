import { describe, it } from 'node:test';
import assert from 'node:assert';
import { analyzeWalletRiskSignals } from './analyzeWalletRiskSignals.js';
import { SolanaMarketsRiskSignalKind, WorkstationRiskLevel } from '@gorkh/shared';

describe('analyzeWalletRiskSignals', () => {
  it('returns account_not_found when snapshot does not exist', () => {
    const signals = analyzeWalletRiskSignals({ exists: false }, false, false);
    assert.strictEqual(signals.length, 1);
    assert.strictEqual(signals[0].kind, SolanaMarketsRiskSignalKind.ACCOUNT_NOT_FOUND);
    assert.strictEqual(signals[0].level, WorkstationRiskLevel.MEDIUM);
  });

  it('flags custom_rpc_privacy_warning when custom endpoint', () => {
    const signals = analyzeWalletRiskSignals({ exists: true }, true, false);
    const signal = signals.find(
      (s) => s.kind === SolanaMarketsRiskSignalKind.CUSTOM_RPC_PRIVACY_WARNING
    );
    assert.ok(signal);
  });

  it('flags mainnet_operational_caution on mainnet', () => {
    const signals = analyzeWalletRiskSignals({ exists: true }, false, true);
    const signal = signals.find(
      (s) => s.kind === SolanaMarketsRiskSignalKind.MAINNET_OPERATIONAL_CAUTION
    );
    assert.ok(signal);
  });

  it('flags many_token_accounts when count > 100', () => {
    const signals = analyzeWalletRiskSignals({ exists: true, tokenAccountCount: 150 }, false, false);
    const signal = signals.find((s) => s.id === 'many_token_accounts');
    assert.ok(signal);
    assert.strictEqual(signal.level, WorkstationRiskLevel.LOW);
  });

  it('does not flag many_token_accounts when count <= 100', () => {
    const signals = analyzeWalletRiskSignals({ exists: true, tokenAccountCount: 100 }, false, false);
    const signal = signals.find((s) => s.id === 'many_token_accounts');
    assert.strictEqual(signal, undefined);
  });

  it('returns no signals for healthy wallet on public devnet', () => {
    const signals = analyzeWalletRiskSignals(
      { exists: true, tokenAccountCount: 5 },
      false,
      false
    );
    assert.strictEqual(signals.length, 0);
  });
});
