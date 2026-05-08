# Builder Developer Toolbox Smoke Plan

Use this plan for v0.1 desktop QA.

## Setup

1. Open GORKH.
2. Open Builder.
3. Select the Developer Toolbox tab.
4. Confirm the Workstation sidebar, topbar, inspector, Assistant affordance, and status bar remain visible.
5. Confirm the page itself does not scroll like a website; only toolbox panes/logs/JSON areas may scroll internally.

## IDL Browser

1. Open IDL Browser.
2. Confirm the empty state says no IDL is loaded.
3. Paste a valid Anchor IDL JSON.
4. Click Load IDL Locally.
5. Verify program name, version/address when present, instructions, accounts, types, events, and errors render.
6. Paste invalid JSON and verify the invalid state appears.
7. Confirm no IDL is sent to Assistant, backend, LLM, or Context automatically.

## Account Decoder

1. Open Account Decoder.
2. Confirm no account data state appears.
3. Paste base64 account data and choose/select an IDL account type when available.
4. Verify byte length, discriminator preview, decoded primitive fields, or unsupported-type message.
5. Paste hex data and confirm detection.
6. Paste base58 data and confirm detection.
7. Confirm unsupported layouts are labeled honestly and not fake-decoded.

## Program Logs

1. Open Program Logs.
2. Enter a valid program ID.
3. Start the subscription.
4. Verify status moves from disconnected/connecting to streaming when websocket is available.
5. Pause and resume display.
6. Clear logs.
7. Stop subscription.
8. Confirm no CLI or shell command runs.

## RPC & Nodes

1. Open RPC & Nodes.
2. Add a public/local endpoint with label and cluster.
3. Verify the redacted URL is shown.
4. Try an endpoint URL with `api-key=` or `token=` and verify localStorage storage is rejected.
5. Select a default endpoint.
6. Run benchmark and verify latency, slot, block height, success, and error states.

## Network Monitor

1. Open Network Monitor.
2. Refresh health.
3. Verify selected cluster, endpoint, websocket status, current slot, block height, epoch, and epoch progress.
4. Add a slot subscription and verify it appears as read-only metadata.
5. Confirm TPS/leader schedule is not faked if unavailable.

## Compute Estimator

1. Open Compute Estimator.
2. Confirm it is empty until a base64 transaction is pasted.
3. Paste a base64 serialized transaction.
4. Click Estimate Compute.
5. Verify compute units/logs/error/replacement blockhash when RPC returns them.
6. Confirm there is no sign, send, broadcast, deploy, or upgrade control.

## Locked Actions

Confirm these are disabled:

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

## Security Checks

- No private keys, seed phrases, wallet JSON, API keys, auth headers, Cloak notes, viewing keys, Zerion credentials, full private RPC URLs, or signing material appear in localStorage or Context.
- `gorkh.solana.builderToolbox.lastContext.v1` contains only redacted summaries.
- No `sendTransaction`, `sendRawTransaction`, `requestAirdrop`, signing method, Jito, Squads execution, hardware signing, Drift, swaps, staking, bridging, DeFi execution, or autonomous execution path is present.
