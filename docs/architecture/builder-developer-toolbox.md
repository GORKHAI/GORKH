# Builder Developer Toolbox + RPC & Node Manager v0.1

Builder Developer Toolbox v0.1 lives inside the existing Builder module. It is a read-only diagnostic layer for Solana developers and power users.

## Scope

The toolbox supports:

- Anchor IDL browser from pasted local JSON.
- Local account data decoder for base64, hex, and base58 data.
- Program log viewer through read-only websocket subscriptions.
- RPC endpoint manager with redacted endpoint display.
- RPC latency benchmark using allowlisted read-only calls.
- Slot, block height, and epoch health monitor.
- Read-only websocket subscription manager for account, program logs, and slot updates.
- Compute unit estimator through explicit-click read-only simulation.
- Redacted local context snapshot at `gorkh.solana.builderToolbox.lastContext.v1`.

IDL and account decoding are local. Raw IDL, raw account data, and raw transaction payloads are not sent to backend services, Assistant, LLMs, or Context automatically.

## RPC Boundary

v0.1 uses allowlisted read-only diagnostics such as `getHealth`, `getVersion`, `getSlot`, `getBlockHeight`, `getEpochInfo`, `getBalance`, `getAccountInfo`, `getTransaction`, `getSignatureStatuses`, and explicit-click `simulateTransaction` for compute estimation.

There is no arbitrary RPC passthrough. The arbitrary RPC playground is locked.

Forbidden in v0.1:

- `sendTransaction`
- `sendRawTransaction`
- mainnet mutation methods
- program deployment or upgrade
- authority changes
- offline signing
- arbitrary shell or Solana CLI execution

## RPC Endpoint Secrets

RPC URLs can contain API keys or bearer-like tokens. Builder Toolbox redacts endpoint URLs in UI and context snapshots. Public/local URLs may be stored in frontend metadata. Obvious secret-bearing URLs with API key or token query parameters are rejected from localStorage in v0.1 until keychain-backed endpoint references are implemented.

Context snapshots include endpoint label and redacted host/path only. They exclude full private RPC URLs, API keys, auth headers, private keys, seed phrases, wallet JSON, signing material, Cloak notes, viewing keys, and Zerion credentials.

## Websocket Subscriptions

Supported websocket subscriptions are read-only:

- `accountSubscribe`
- `logsSubscribe`
- `slotSubscribe`

The UI supports start/stop/pause/clear patterns and caps local buffers to avoid memory growth. Subscriptions are cleaned up on unmount.

## Compute Estimator

Compute estimation accepts a pasted base64 serialized transaction and runs read-only simulation only after an explicit click. It shows compute units, logs, replacement blockhash, and errors when available.

It does not sign, broadcast, deploy, upgrade, or execute.

## Dev Faucet Decision

The dev faucet is locked in v0.1. `requestAirdrop` remains outside the diagnostic allowlist and needs stricter devnet/testnet/localnet-only policy gates, rate limits, and UI separation before implementation.

## Locked Advanced Actions

The following actions are visibly locked:

- Program Deployment
- Program Upgrade
- Close Program
- Set Upgrade Authority
- Transfer Upgrade Authority
- Revoke Upgrade Authority
- Arbitrary RPC Playground
- Offline Signing
- Hardware Wallet Developer Signing
- Local Validator Process Manager
- Dev Faucet

Each future execution-capable feature must follow proposal creation, policy check, simulation or Shield review where applicable, explicit user approval, secure signer gateway, and audit log.
