# Cloak Mainnet Smoke Plan

Use this only when explicitly instructed to run a real mainnet Cloak deposit. The desktop build uses the official `@cloak.dev/sdk` TypeScript SDK through the Tauri signer bridge.

## Scope

- Test Cloak SOL deposit only.
- Do not test private send, withdraw, swap, note export, or viewing-key export.
- Do not use production wallets.
- Do not run autonomous Agent or Markets execution.

## Test Wallet

1. Create a fresh local GORKH wallet.
2. Record only the public address in the QA notes.
3. Fund it with a tiny mainnet SOL amount that covers:
   - Cloak minimum deposit: `10_000_000` lamports.
   - Fixed fee estimate: `5_000_000` lamports.
   - Variable fee estimate: `floor(amount * 3 / 1000)`.
   - Normal Solana transaction fees and a small buffer.
4. Never paste production private keys, seed phrases, wallet JSON, raw notes, or viewing keys into issue trackers, chat, screenshots, logs, or Assistant prompts.

## Deposit Test

1. Open Wallet -> Cloak Private.
2. Confirm the selected wallet is unlocked.
3. Enter the tiny test amount in lamports.
4. Confirm the mainnet warning is visible.
5. Prepare the deposit.
6. Confirm the approval digest is shown.
7. Check the local approval checkbox.
8. Click `Approve & Deposit`.
9. Verify progress shows viewing-key registration signing if required, proof generation, transaction signing, and submission.
10. Verify the SDK returns a deposit signature.
11. Verify safe note metadata is saved and raw note material is not displayed.

## Security Checks

- No macOS console or browser console output contains private keys, keypair bytes, wallet JSON, raw notes, viewing keys, or proof material.
- `localStorage` contains wallet metadata only.
- Context export contains no raw notes, viewing keys, private keys, seed phrases, or wallet JSON.
- Assistant can describe status but cannot execute the deposit.
- Agent can draft only and cannot execute.
- The signing session is short-lived and cannot be reused after transaction signing.

## Stop Conditions

Stop immediately if:

- The app requests keypair export to the webview.
- The approval digest does not match the prepared deposit.
- The app attempts private send, withdraw, swap, or market trading.
- Any secret appears in logs, storage, Context, Assistant, or API payloads.
