import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dashboard = readFileSync(
  new URL('../apps/desktop/src/features/solana-workstation/wallet/hub/components/WalletHubDashboard.tsx', import.meta.url),
  'utf8'
);
const workbench = readFileSync(
  new URL('../apps/desktop/src/features/solana-workstation/wallet/components/WalletWorkbench.tsx', import.meta.url),
  'utf8'
);
const statusBar = readFileSync(
  new URL('../apps/desktop/src/features/solana-workstation/layout/WorkstationStatusBar.tsx', import.meta.url),
  'utf8'
);
const shared = readFileSync(
  new URL('../packages/shared/src/solana-wallet.ts', import.meta.url),
  'utf8'
);
const workstation = readFileSync(
  new URL('../apps/desktop/src/features/solana-workstation/SolanaWorkstation.tsx', import.meta.url),
  'utf8'
);
const shellCss = readFileSync(
  new URL('../apps/desktop/src/features/solana-workstation/layout/workstation-shell.css', import.meta.url),
  'utf8'
);

test('Wallet Hub is inside Wallet module with fixed desktop layout', () => {
  assert.match(workbench, /id: 'hub'/);
  assert.match(workbench, /useState<WalletTab>\('hub'\)/);
  assert.match(workbench, /WalletHubDashboard/);
  assert.match(workbench, /gridTemplateRows: activeTab === 'hub'/);
  assert.match(workbench, /gorkh-premium-workbench/);
  assert.match(workbench, /overflow:\s*'hidden'/);
  assert.match(workstation, /activeModule === 'wallet'[\s\S]*gorkh-workstation-module-frame/);
  assert.match(workstation, /activeModule === 'wallet'[\s\S]*gorkh-workstation-module-body/);
  assert.match(shellCss, /\.gorkh-workstation-module-frame\s*\{[\s\S]*overflow:\s*hidden/);
  assert.match(shellCss, /\.gorkh-workstation-module-body\s*\{[\s\S]*min-height:\s*0/);
  assert.match(dashboard, /data-testid="wallet-hub-dashboard"/);
  assert.match(dashboard, /height: 100%/);
  assert.match(dashboard, /min-height:0/);
  assert.match(dashboard, /overflow:hidden/);
  assert.match(dashboard, /grid-template-columns:272px minmax\(360px,1fr\) 308px/);
  assert.doesNotMatch(dashboard, /hero|marketing|page-level/i);
  assert.match(statusBar, /WALLET_HUB_ACTIVE_PROFILE_STORAGE_KEY/);
});

test('Wallet Hub UI exposes required states and no signing controls for watch-only wallets', () => {
  assert.match(dashboard, /No wallets yet/);
  assert.match(dashboard, /Add Watch-Only/);
  assert.match(dashboard, /Watch-only wallet added\. It has no signing capability/);
  assert.match(dashboard, /Active wallet switched.*No signing or execution was triggered/);
  assert.match(dashboard, /Refresh Portfolio/);
  assert.match(dashboard, /price unavailable/);
  assert.match(dashboard, /No SPL token balances loaded/);
  assert.match(dashboard, /Remove Watch-Only/);
  assert.doesNotMatch(dashboard, /signTransaction|signAllTransactions|sendTransaction|sendRawTransaction|requestAirdrop/);
  assert.match(dashboard, /profiles\.map/);
  assert.match(dashboard, /walletCount/);
});

test('Wallet Hub locked roadmap is visible and disabled', () => {
  assert.match(shared, /Hardware Wallets: Ledger\/Trezor/);
  assert.match(shared, /Multisig: Squads v4/);
  assert.match(shared, /NFT Gallery/);
  assert.match(shared, /DeFi Positions/);
  assert.match(shared, /Stake Accounts/);
  assert.match(shared, /PnL Tracking/);
  assert.match(shared, /Advanced Portfolio History/);
  assert.match(dashboard, /aria-disabled="true"/);
  assert.match(dashboard, /whub-roadmap-row/);
  assert.doesNotMatch(shared, /Drift integration is planned|Drift Positions/i);
});
