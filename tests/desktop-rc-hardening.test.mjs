import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workstation = readFileSync('apps/desktop/src/features/solana-workstation/SolanaWorkstation.tsx', 'utf8');
const shell = readFileSync('apps/desktop/src/features/solana-workstation/layout/WorkstationShell.tsx', 'utf8');
const css = readFileSync('apps/desktop/src/features/solana-workstation/layout/workstation-shell.css', 'utf8');
const walletHubStorage = readFileSync('apps/desktop/src/features/solana-workstation/wallet/hub/walletHubStorage.ts', 'utf8');
const transactionStudioStorage = readFileSync('apps/desktop/src/features/solana-workstation/transaction-studio/transactionStudioStorage.ts', 'utf8');
const walletHubUi = readFileSync('apps/desktop/src/features/solana-workstation/wallet/hub/components/WalletHubDashboard.tsx', 'utf8');
const transactionStudioUi = readFileSync('apps/desktop/src/features/solana-workstation/transaction-studio/components/TransactionStudioWorkbench.tsx', 'utf8');
const native = readFileSync('apps/desktop/src-tauri/src/lib.rs', 'utf8');

test('release candidate shell keeps primary modules and Assistant in bounded workstation layout', () => {
  for (const module of ['wallet', 'markets', 'shield', 'builder', 'agent', 'context', 'transaction-studio']) {
    assert.match(workstation, new RegExp(`activeModule === '${module}'`), `${module} should render from Workstation`);
  }
  assert.match(workstation, /assistantActive[\s\S]*gorkh-assistant-workspace/);
  assert.match(shell, /WorkstationSidebar/);
  assert.match(shell, /WorkstationTopBar/);
  assert.match(shell, /WorkstationStatusBar/);
  assert.match(shell, /WorkstationInspector/);
  assert.match(css, /html,\s*body,\s*#root\s*\{[\s\S]*overflow:\s*hidden/);
  assert.match(css, /\.gorkh-workstation-module-frame\s*\{[\s\S]*height:\s*100%/);
  assert.match(css, /\.gorkh-workstation-module-body\s*\{[\s\S]*overflow:\s*hidden/);
});

test('release candidate context snapshot stores reject raw payloads and secrets', () => {
  assert.match(walletHubStorage, /gorkh\.solana\.walletHub\.lastContext\.v1|WALLET_HUB_CONTEXT_STORAGE_KEY/);
  assert.match(transactionStudioStorage, /gorkh\.solana\.transactionStudio\.lastContext\.v1/);
  for (const source of [walletHubStorage, transactionStudioStorage]) {
    assert.match(source, /privateKey/i);
    assert.match(source, /seed/i);
    assert.match(source, /secret/i);
    assert.match(source, /api/i);
  }
  assert.match(transactionStudioStorage, /raw(?:Transaction|Tx|Payload)/);
  assert.match(walletHubStorage, /assertSafeWalletHubSerialized/);
});

test('release candidate surfaces do not expose signing or broadcast controls', () => {
  for (const source of [walletHubUi, transactionStudioUi]) {
    assert.doesNotMatch(source, /<button[^>]*>\s*(Sign|Broadcast|Send Raw|Submit Bundle|Swap|Stake|Bridge)\s*</i);
    assert.doesNotMatch(source, /\bsendTransaction\s*\(|\bsendRawTransaction\s*\(|\brequestAirdrop\s*\(/);
    assert.doesNotMatch(source, /\bsignTransaction\s*\(|\bsignAllTransactions\s*\(/);
  }
  assert.doesNotMatch(walletHubUi, /\bsignMessage\s*\(/);
  assert.doesNotMatch(transactionStudioUi, /\bsignMessage\s*\(/);
});

test('startup screen recording permission polling remains disabled', () => {
  assert.match(native, /permissions_get_status\(\)[\s\S]*screen_recording:\s*PermissionState::Unknown/);
  assert.doesNotMatch(native, /fn permissions_get_status\(\)[\s\S]{0,160}detect_screen_recording_status\(\)/);
});
