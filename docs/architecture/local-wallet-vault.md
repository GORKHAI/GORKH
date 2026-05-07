# Local Wallet Vault

GORKH local wallets are non-custodial Solana wallets stored on the user device.

## Storage Model

- Rust/Tauri owns wallet creation and import.
- Secret key material is stored only in the OS keychain through the existing `keyring` helper.
- Keychain service: `gorkh`.
- Keychain account format: `wallet:v1:<walletId>`.
- Browser storage may contain metadata only: wallet id, label, public address, source, network, and security status.
- Private keys, seed phrases, wallet JSON, note secrets, viewing keys, and signatures must never be sent to the GORKH API.

## Create / Import

- Create wallet uses Rust `ed25519-dalek` key generation and returns public address only.
- Import accepts Solana CLI JSON byte arrays or base58 secret keys.
- Import normalizes to a 64-byte Solana keypair, validates the public half, stores it in keychain, and returns public address only.
- The pasted import secret is cleared immediately by the UI after import completes or fails.

## Signing Policy

Signing is not exposed to Agent, Assistant, Markets, or Context.
Every signature must have an explicit local approval request and must execute from a signer path that does not export raw keypair bytes to the webview.

Zerion Agent Executor is intentionally separate from this vault. The hackathon phase uses a fresh tiny-funded Zerion agent wallet managed by Zerion CLI, not the GORKH local wallet. GORKH does not pass local wallet private keys, seed material, or Cloak note data to Zerion.

The first signer-bound command surface is Cloak deposit:

- `wallet_cloak_deposit_prepare` creates a safe draft and approval digest.
- `wallet_cloak_begin_signing_session` reloads the wallet secret Rust-side and verifies the draft before enabling SDK signing callbacks.
- `wallet_cloak_sign_transaction` signs only an approved Cloak deposit transaction for the active session.
- `wallet_cloak_sign_message` signs only Cloak viewing-key registration messages for the active session.
- `wallet_cloak_end_signing_session` closes the short-lived approval session after SDK execution.
- The command is restricted to `initiatedBy: "wallet_ui"`.
- Agent, Assistant, and Markets cannot call the approval path.
- The webview receives signed transaction/message bytes, never raw wallet keypair bytes.
- `signMessage` is allowed only for wallet ownership proof and Cloak viewing-key registration.

## Cloak Note Storage

Cloak note material is more sensitive than public wallet metadata.

- Raw note account format: `cloak-note:v1:<walletId>:<noteId>`.
- Metadata account format: `cloak-note-meta:v1:<walletId>`.
- Prepared deposit draft account format: `cloak-deposit-draft:v1:<draftId>`.
- One-time approval marker account format: `cloak-deposit-used:v1:<draftId>`.
- The Cloak TypeScript SDK output UTXO is serialized and stored through `wallet_cloak_note_save_secure`.
- Raw notes and viewing keys must never be exported to Context, Assistant, backend APIs, browser storage, or logs.

## Not Implemented Yet

- Recovery key export.
- Cloak private send / withdraw / swap execution.
- Market execution.
- General Agent execution with GORKH local wallet keys.
- Secret-backed Context export.
