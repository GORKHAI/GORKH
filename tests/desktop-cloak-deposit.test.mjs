import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const rust = readFileSync('apps/desktop/src-tauri/src/lib.rs', 'utf8');
const permissions = readFileSync('apps/desktop/src-tauri/permissions/desktop-ipc.toml', 'utf8');
const sharedWallet = readFileSync('packages/shared/src/solana-wallet.ts', 'utf8');
const cloakDeposit = readFileSync('apps/desktop/src/features/solana-workstation/wallet/cloak/cloakDeposit.ts', 'utf8');
const cloakPanel = readFileSync('apps/desktop/src/features/solana-workstation/wallet/cloak/components/CloakWalletPanel.tsx', 'utf8');
const cloakGuards = readFileSync('apps/desktop/src/features/solana-workstation/wallet/cloak/cloakGuards.ts', 'utf8');
const desktopPackage = readFileSync('apps/desktop/package.json', 'utf8');
const markets = readFileSync('apps/desktop/src/features/solana-workstation/markets/MarketsWorkbench.tsx', 'utf8');
const agent = readFileSync('apps/desktop/src/features/solana-workstation/agent/components/AgentWorkbench.tsx', 'utf8');

test('Cloak deposit constants and guards are mainnet SOL only', () => {
  assert.match(sharedWallet, /CLOAK_MAINNET_PROGRAM_ID = 'zh1eLd6rSphLejbFfJEneUwzHRfMKxgzrgkfwA6qRkW'/);
  assert.match(sharedWallet, /CLOAK_DEFAULT_RELAY_URL = 'https:\/\/api\.cloak\.ag'/);
  assert.match(sharedWallet, /CLOAK_MIN_SOL_DEPOSIT_LAMPORTS = '10000000'/);
  assert.match(sharedWallet, /CLOAK_FIXED_FEE_LAMPORTS = '5000000'/);
  assert.match(rust, /asset != "SOL"/);
  assert.match(rust, /network != "mainnet"/);
  assert.match(rust, /Minimum Cloak SOL deposit/);
});

test('Cloak deposit fee math uses integer bigint paths only', () => {
  assert.match(cloakDeposit, /BigInt\(amountLamports\)/);
  assert.match(cloakDeposit, /\(amount \* 3n\) \/ 1_000n/);
  assert.match(rust, /amount\.saturating_mul\(CLOAK_VARIABLE_FEE_NUMERATOR\) \/ CLOAK_VARIABLE_FEE_DENOMINATOR/);
  assert.doesNotMatch(cloakDeposit, /parseFloat/);
  assert.doesNotMatch(cloakGuards, /parseFloat/);
});

test('Cloak approval digest is native, deterministic, expiring, and one-time-use', () => {
  assert.match(rust, /fn cloak_deposit_approval_digest/);
  assert.match(rust, /Sha256::new\(\)/);
  assert.match(rust, /\("operation", "cloak_deposit"\)/);
  assert.match(rust, /\("walletId", wallet_id\)/);
  assert.match(rust, /\("amountLamports", amount_lamports\)/);
  assert.match(rust, /now_ms\(\) > draft\.expires_at/);
  assert.match(rust, /cloak_deposit_used_account/);
  assert.match(rust, /approval has already been used/);
});

test('Cloak execute requires explicit Wallet UI approval and never exposes keypair bytes to the webview', () => {
  assert.match(rust, /approval_confirmed/);
  assert.match(rust, /initiated_by != "wallet_ui"/);
  assert.match(rust, /load_wallet_keypair/);
  assert.match(rust, /wallet_cloak_begin_signing_session/);
  assert.match(rust, /wallet_cloak_sign_transaction/);
  assert.match(rust, /wallet_cloak_sign_message/);
  assert.match(rust, /purpose != "cloak_viewing_key_registration"/);
  assert.match(rust, /purpose != "cloak_deposit"/);
  assert.doesNotMatch(cloakDeposit, /keypairBytes|privateKey|seedPhrase|walletJson|Keypair\.fromSecretKey/);
  assert.doesNotMatch(cloakPanel, /keypairBytes|privateKey|seedPhrase|walletJson/);
});

test('Cloak TypeScript SDK path is active and Rust GitHub SDK path is absent', () => {
  assert.match(desktopPackage, /"@cloak\.dev\/sdk"/);
  assert.match(cloakDeposit, /from '@cloak\.dev\/sdk'/);
  assert.match(cloakDeposit, /transact/);
  assert.match(cloakDeposit, /createZeroUtxo/);
  assert.match(cloakDeposit, /createUtxo/);
  assert.match(cloakDeposit, /NATIVE_SOL_MINT/);
  assert.doesNotMatch(rust, /cloak.*git|github.*cloak/i);
});

test('Cloak note storage uses secure native account naming and metadata only in UI', () => {
  assert.match(rust, /cloak-note:v1:\{\}:\{\}/);
  assert.match(rust, /cloak-note-meta:v1:\{\}/);
  assert.match(rust, /wallet_cloak_notes_list/);
  assert.match(cloakPanel, /Raw notes and viewing keys are never shown here/);
  assert.doesNotMatch(cloakPanel, /localStorage/);
});

test('Cloak deposit commands are explicitly allowlisted without wildcard permissions', () => {
  for (const command of [
    'wallet_cloak_deposit_prepare',
    'wallet_cloak_deposit_execute',
    'wallet_cloak_begin_signing_session',
    'wallet_cloak_end_signing_session',
    'wallet_cloak_sign_transaction',
    'wallet_cloak_sign_message',
    'wallet_cloak_note_save_secure',
    'wallet_cloak_notes_list',
    'wallet_cloak_note_status',
    'wallet_cloak_note_forget',
  ]) {
    assert.match(permissions, new RegExp(`"${command}"`));
  }
  assert.doesNotMatch(permissions, /wallet_cloak_\*/);
});

test('Cloak deposit UI is deposit-first and private send remains deferred', () => {
  assert.match(cloakPanel, /Deposit SOL/);
  assert.match(cloakPanel, /Cloak currently uses mainnet defaults\. Use tiny test amounts first\./);
  assert.match(cloakPanel, /Proof generation can take several minutes/);
  assert.match(cloakPanel, /I approve this exact Wallet UI deposit draft/);
  assert.match(cloakPanel, /Approve & Deposit/);
  assert.match(cloakPanel, /Progress/);
  assert.match(cloakPanel, /Private Send deferred until secure note spending is implemented/);
  assert.doesNotMatch(cloakPanel, /fake success/i);
});

test('Agent and Markets cannot execute Cloak deposits in this phase', () => {
  assert.doesNotMatch(markets, /wallet_cloak_deposit_execute|executeCloakDeposit/);
  assert.doesNotMatch(agent, /wallet_cloak_deposit_execute|executeCloakDeposit/);
});
