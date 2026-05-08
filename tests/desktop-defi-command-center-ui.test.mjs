import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const component = readFileSync(
  'apps/desktop/src/features/solana-workstation/wallet/defi/components/DeFiCommandCenter.tsx',
  'utf8'
);
const wallet = readFileSync(
  'apps/desktop/src/features/solana-workstation/wallet/components/WalletWorkbench.tsx',
  'utf8'
);
const hub = readFileSync(
  'apps/desktop/src/features/solana-workstation/wallet/hub/components/WalletHubDashboard.tsx',
  'utf8'
);
const shared = readFileSync('packages/shared/src/solana-defi-command-center.ts', 'utf8');
const backendClient = readFileSync(
  'apps/desktop/src/features/solana-workstation/wallet/defi/defiBackendClient.ts',
  'utf8'
);

test('DeFi Command Center is integrated inside Wallet and fixed-shell compatible', () => {
  assert.match(wallet, /id: 'defi'/);
  assert.match(wallet, /label: 'DeFi'/);
  assert.match(wallet, /DeFiCommandCenter/);
  assert.match(component, /data-testid="defi-command-center"/);
  assert.match(component, /height:100%/);
  assert.match(component, /min-height:0/);
  assert.match(component, /overflow:hidden/);
  assert.match(component, /grid-template-columns:176px minmax\(0,1fr\) 292px/);
  assert.doesNotMatch(component, /hero|marketing|page-level/i);
});

test('Wallet Portfolio shows DeFi value separately to avoid double-counting', () => {
  assert.match(hub, /DeFi Command Center/);
  assert.match(hub, /displayed separately to avoid double-counting wallet token balances/);
  assert.match(hub, /defi unavailable/);
});

test('DeFi UI exposes required read-only tabs and states', () => {
  for (const label of ['Overview', 'Positions', 'LP', 'Lending', 'Yield', 'LSTs', 'Swap Quote', 'Locked Actions']) {
    assert.match(component, new RegExp(label));
  }
  assert.match(component, /No DeFi positions detected/);
  assert.match(component, /IL unavailable/);
  assert.match(component, /Protocol adapter not connected in v0\.1/);
  assert.match(component, /APY unavailable/);
  assert.match(component, /Quote empty/);
  assert.match(component, /Quote Loading/);
  assert.match(component, /Swap execution locked/);
  assert.match(component, /aria-disabled="true"/);
  assert.match(component, /GORKH read-only DeFi backend/);
  assert.match(component, /Backend was not called/);
});

test('DeFi desktop client uses backend aggregator and rejects executable payload fields', () => {
  assert.match(backendClient, /\/api\/defi\/health/);
  assert.match(backendClient, /\/api\/defi\/positions/);
  assert.match(backendClient, /assertNoExecutablePayload/);
  for (const forbidden of [
    'swapTransaction',
    'serializedTransaction',
    'unsignedTransaction',
    'signedTransaction',
    'transactionPayload',
    'privateKey',
    'secretKey',
    'seedPhrase',
    'walletJson',
  ]) {
    assert.match(backendClient, new RegExp(forbidden));
  }
  assert.doesNotMatch(backendClient, /sendTransaction|sendRawTransaction|signTransaction|signAllTransactions|requestAirdrop/);
});

test('DeFi locked actions are visible and disabled', () => {
  for (const action of [
    'Execute Swap',
    'Place Limit Order',
    'Cancel Limit Order',
    'Deposit to Lending',
    'Borrow',
    'Repay',
    'Withdraw',
    'Add Liquidity',
    'Remove Liquidity',
    'Stake / Unstake LST',
    'Auto Yield Optimize',
  ]) {
    assert.match(shared, new RegExp(action.replace('/', '\\/')));
  }
  assert.match(component, /Disabled in v0\.1/);
  assert.doesNotMatch(component, /sendTransaction|sendRawTransaction|signTransaction|signAllTransactions|requestAirdrop/);
  assert.doesNotMatch(component, /Drift/);
});
