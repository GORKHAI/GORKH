import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const rust = readFileSync('apps/desktop/src-tauri/src/lib.rs', 'utf8');
const cargo = readFileSync('apps/desktop/src-tauri/Cargo.toml', 'utf8');
const desktopPackage = readFileSync('apps/desktop/package.json', 'utf8');
const sharedWallet = readFileSync('packages/shared/src/solana-wallet.ts', 'utf8');
const vault = readFileSync('apps/desktop/src/features/solana-workstation/wallet/local-vault/localWalletVault.ts', 'utf8');
const vaultStorage = readFileSync('apps/desktop/src/features/solana-workstation/wallet/local-vault/localWalletVaultStorage.ts', 'utf8');
const vaultPanel = readFileSync('apps/desktop/src/features/solana-workstation/wallet/local-vault/components/LocalWalletVaultPanel.tsx', 'utf8');
const cloakConfig = readFileSync('apps/desktop/src/features/solana-workstation/wallet/cloak/cloakConfig.ts', 'utf8');
const cloakClient = readFileSync('apps/desktop/src/features/solana-workstation/wallet/cloak/cloakClient.ts', 'utf8');
const cloakGuards = readFileSync('apps/desktop/src/features/solana-workstation/wallet/cloak/cloakGuards.ts', 'utf8');
const cloakDeposit = readFileSync('apps/desktop/src/features/solana-workstation/wallet/cloak/cloakDeposit.ts', 'utf8');
const cloakPanel = readFileSync('apps/desktop/src/features/solana-workstation/wallet/cloak/components/CloakWalletPanel.tsx', 'utf8');
const walletWorkbench = readFileSync('apps/desktop/src/features/solana-workstation/wallet/components/WalletWorkbench.tsx', 'utf8');

test('wallet vault uses Rust keychain account naming and returns public metadata only', () => {
  assert.match(rust, /const KEYRING_SERVICE_NAME:\s*&str\s*=\s*"gorkh"/);
  assert.match(rust, /fn wallet_vault_account\(wallet_id: &str\) -> String/);
  assert.match(rust, /format!\("wallet:v1:\{\}", wallet_id\)/);
  assert.match(rust, /wallet_vault_create/);
  assert.match(rust, /wallet_vault_import/);
  assert.match(rust, /keyring_set_secret\(&account, &encoded_secret\)/);
  assert.doesNotMatch(rust, /private_key|seed_phrase|wallet_json/i);
});

test('local wallet metadata storage excludes secret material', () => {
  assert.match(vaultStorage, /localVaultMetadata/);
  assert.match(vaultStorage, /LocalWalletProfileSchema/);
  assert.doesNotMatch(vaultStorage, /secret|privateKey|seedPhrase|walletJson|keypairBytes/);
  assert.match(sharedWallet, /LocalWalletProfileSchema/);
  assert.match(sharedWallet, /keychainAccount: z\.string\(\)\.regex\(\^?\/\^wallet:v1:/);
});

test('wallet import clears pasted secret and never stores it in localStorage', () => {
  assert.match(vaultPanel, /setImportSecret\(''\)/);
  assert.match(vault, /wallet_vault_import/);
  assert.doesNotMatch(vaultPanel, /localStorage\.setItem\([^)]*secret/i);
  assert.doesNotMatch(vaultPanel, /console\.log\([^)]*secret/i);
});

test('Cloak SDK dependency and default config are present', () => {
  assert.match(desktopPackage, /"@cloak\.dev\/sdk"/);
  assert.match(desktopPackage, /"@solana\/web3\.js"/);
  assert.match(cloakClient, /cloakSdkPackage = '@cloak\.dev\/sdk'/);
  assert.match(cloakClient, /@vite-ignore/);
  assert.match(sharedWallet, /zh1eLd6rSphLejbFfJEneUwzHRfMKxgzrgkfwA6qRkW/);
  assert.match(sharedWallet, /https:\/\/api\.cloak\.ag/);
  assert.match(cloakConfig, /cloak-circuits\.s3\.us-east-1\.amazonaws\.com/);
});

test('Cloak guards restrict assets, amount, recipient, and approval', () => {
  assert.match(cloakConfig, /\['SOL', 'USDC', 'USDT'\]/);
  assert.match(cloakGuards, /BigInt\(amount\)/);
  assert.doesNotMatch(cloakGuards, /parseFloat/);
  assert.match(cloakGuards, /new PublicKey\(recipient\.trim\(\)\)/);
  assert.match(cloakGuards, /Explicit local approval is required/);
  assert.match(cloakGuards, /Selected local wallet is locked/);
});

test('Cloak deposit uses Rust commands and does not fake execution success', () => {
  assert.match(cloakClient, /tauri_signer_bridge/);
  assert.match(cloakClient, /private keys stay in Rust\/keychain storage/);
  assert.match(cloakDeposit, /wallet_cloak_deposit_prepare/);
  assert.match(cloakDeposit, /wallet_cloak_begin_signing_session/);
  assert.match(cloakDeposit, /wallet_cloak_sign_transaction/);
  assert.match(cloakDeposit, /wallet_cloak_sign_message/);
  assert.match(cloakDeposit, /wallet_cloak_note_save_secure/);
  assert.doesNotMatch(rust, /Cloak Rust SDK execution not available in this build/);
  assert.match(cloakPanel, /Approve & Deposit/);
  assert.doesNotMatch(cloakDeposit, /keypairBytes|Keypair\.fromSecretKey/);
});

test('Wallet UI exposes Local Wallet and Cloak inside Wallet module', () => {
  assert.match(walletWorkbench, /Local Wallet/);
  assert.match(walletWorkbench, /Private \/ Cloak/);
  assert.match(walletWorkbench, /Agent and Assistant can draft, but cannot sign or execute/);
  assert.match(walletWorkbench, /Market trade execution is disabled/);
});

test('Rust wallet vault dependencies are explicit', () => {
  assert.match(cargo, /ed25519-dalek/);
  assert.match(cargo, /rand_core/);
  assert.match(cargo, /bs58/);
});
