# Cloak Integration

GORKH starts Cloak as the first real protocol integration inside the Wallet module.

## SDK Configuration

- TypeScript package: `@cloak.dev/sdk`.
- Program ID: `zh1eLd6rSphLejbFfJEneUwzHRfMKxgzrgkfwA6qRkW`.
- Default relay URL: `https://api.cloak.ag`.
- Circuits base URL: `https://cloak-circuits.s3.us-east-1.amazonaws.com/circuits/0.1.0`.
- Merkle tree height: `32`.
- Proof format: 256-byte Groth16 proof with 264-byte public inputs.
- Supported assets in this phase: deposit SOL only; USDC/USDT remain listed for future private send routes.

## Execution Decision

The official current Cloak path is the TypeScript SDK from `@cloak.dev/sdk`. Do not use the unavailable Rust GitHub SDK path from the previous investigation.

GORKH uses the SDK's wallet-adapter transaction path instead of `keypairBytes`:

1. Wallet UI prepares a Cloak SOL deposit draft in Rust.
2. The user approves the exact draft digest in Wallet.
3. Rust opens a short-lived Cloak signing session for that draft.
4. The TypeScript SDK runs `transact` with `createZeroUtxo`, `createUtxo`, `NATIVE_SOL_MINT`, and wallet-adapter callbacks.
5. `signTransaction` and `signMessage` callbacks invoke Tauri commands.
6. Rust loads the wallet key from keychain, validates the active session, signs only the approved transaction/message, and returns signed bytes.
7. The SDK submits the approved deposit transaction.
8. The resulting serialized output UTXO note is immediately saved back to Rust secure storage.

Raw Solana keypair bytes are never exported to the webview for Cloak execution.

## Implemented Now

- Cloak TypeScript SDK deposit path through `transact`.
- Tauri signer bridge commands: `wallet_cloak_begin_signing_session`, `wallet_cloak_sign_transaction`, `wallet_cloak_sign_message`, and `wallet_cloak_end_signing_session`.
- Secure note save command: `wallet_cloak_note_save_secure`.
- Cloak config constants and SDK status check.
- Private-send prepared action validation, but no private send execution.
- Asset, recipient, amount, locked-wallet, and approval guards.
- Rust-backed deposit prepare command.
- Native approval digest validation.
- One-time-use approval marker once transaction signing occurs.
- Expiring prepared draft stored in keychain.
- Secure note metadata list/status/delete commands.
- UI progress for UTXO creation, viewing-key registration signing, proof generation, transaction signing, submission, confirmation, and failure.

## Deposit Approval Model

`wallet_cloak_deposit_prepare` validates:

- selected wallet exists in keychain
- network is `mainnet`
- asset is `SOL`
- amount is an integer lamport string
- amount is at least `10_000_000` lamports
- fixed fee is `5_000_000` lamports
- variable fee is `floor(amount * 3 / 1000)`
- relay is `https://api.cloak.ag`
- program ID is `zh1eLd6rSphLejbFfJEneUwzHRfMKxgzrgkfwA6qRkW`

The command returns only public draft metadata and a SHA-256 approval digest. It stores the prepared draft in OS keychain under `cloak-deposit-draft:v1:<draftId>`.

`wallet_cloak_begin_signing_session` requires:

- `approvalConfirmed: true`
- `initiatedBy: "wallet_ui"`
- matching draft id, wallet id, amount, asset, network, and digest
- unexpired draft
- unused approval marker
- wallet secret present in Rust keychain

The session is short-lived and scoped to:

- operation kind: `cloak_deposit`
- transaction purpose: `cloak_deposit`
- message purpose: `cloak_viewing_key_registration`
- selected wallet id and approval digest
- limited signing counters

`signMessage` is allowed only for wallet ownership proof and Cloak viewing-key registration. Arbitrary `signMessage` remains disallowed.

## Transaction Validation

Rust performs minimal transaction inspection before signing:

- serialized transaction must be legacy or v0
- selected wallet public key must be one of the required signers
- transaction must reference the Cloak mainnet program id in static account keys
- signing purpose, wallet id, digest, and session id must match the approved session

This does not yet deeply decode every instruction account or amount. The short session, exact approval digest, signer requirement, and program-id requirement are the current safety boundary.

## Secure Note Storage

Cloak notes are treated as sensitive.

- Raw note account: `cloak-note:v1:<walletId>:<noteId>`
- Metadata account: `cloak-note-meta:v1:<walletId>`
- Metadata may include note id, asset, amount, signature, leaf index, created time, and status.
- Raw notes, serialized UTXOs, UTXO private keys, viewing keys, note secrets, and proof material are never stored in `localStorage`.
- The UI lists metadata only and does not implement export in this phase.

## Zerion Separation

Zerion Agent Executor is separate from Cloak. Zerion lives under Agent as a CLI execution adapter for a dedicated tiny-funded Zerion agent wallet. It must not import Cloak modules, consume Cloak notes, access Cloak signer sessions, or receive Cloak viewing keys/UTXOs. Cloak remains Wallet -> Private/Cloak.

## Not Implemented Yet

- Private send from funded notes.
- Withdraw.
- Swap/private Orca route.
- Viewing-key export.
- Deep Rust instruction/amount validation for every Cloak transaction variant.

## Mainnet Smoke Conditions

- Use a fresh test wallet, never a production wallet.
- Use a tiny mainnet amount that still covers Cloak minimum deposit, normal transaction fees, and buffer.
- Confirm Cloak relay availability at `https://api.cloak.ag`.
- Confirm local approval is shown and the digest matches the draft.
- Verify no keypair bytes appear in logs, browser storage, Context export, or Assistant prompts.
