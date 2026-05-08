# DeFi Command Center Smoke Plan

## Scope

This smoke plan validates DeFi Command Center v0.1 as a read-only Wallet/Portfolio feature. It must not execute swaps, lending actions, LP changes, staking, Jito, Squads, Drift, or autonomous actions.

## Manual Smoke

1. Open GORKH desktop.
2. Open Wallet.
3. Confirm the Wallet tab list includes `DeFi`.
4. Open Wallet -> Hub.
5. Confirm Portfolio Dashboard shows a DeFi summary row.
6. Confirm copy says DeFi value is displayed separately to avoid double-counting wallet token balances.
7. Open Wallet -> DeFi.
8. Change wallet scope between all wallets, active wallet, watch-only wallets, and local vault wallets.
9. Confirm the summary strip updates wallet scope and keeps DeFi value separate.
10. Open Overview.
11. Confirm the UI says real DeFi data is loaded from the GORKH read-only backend where configured, or shows a backend unavailable fallback.
12. Confirm unavailable protocol adapters clearly say no funds are touched.
13. Open Positions.
14. Confirm empty/no-position state does not infer positions from token balances.
15. Open LP.
16. Confirm `IL unavailable — entry price/history is not available in v0.1.` appears when no entry data exists.
17. Open Lending.
18. Confirm Kamino/MarginFi are monitor-only/unavailable if adapters are not connected.
19. Open Yield.
20. Confirm APY unavailable states do not rank fake values.
21. Open LSTs.
22. Confirm JitoSOL, mSOL, bSOL, and bbSOL appear as read-only comparisons.
23. If `BIRDEYE_API_KEY` is configured on the backend, confirm any loaded APY/TVL fields are marked as public read-only data.
24. Open Swap Quote.
25. Enter SOL -> USDC and an amount.
26. Click `Get Quote Only`.
27. Confirm the quote result, unavailable state, or network error is displayed as quote-only from the backend.
28. Confirm `Swap execution locked` is disabled.
29. Open Locked Actions.
30. Confirm execute swap, limit orders, lending, LP, staking, and auto optimize actions are disabled.
31. Confirm no signing, broadcasting, send, raw send, or wallet execution controls appear.
32. Confirm no Drift integration appears.

## Backend Smoke

1. Start the API with normal local env.
2. Request `GET /api/defi/health`.
3. Confirm the response includes configured/unavailable adapters and redacted source URLs only.
4. Request `GET /api/defi/positions?wallet=<valid_pubkey>`.
5. Confirm invalid wallet input returns a validation error.
6. Request `GET /api/defi/lsts`.
7. Confirm missing `BIRDEYE_API_KEY` returns unavailable states, not a crash.
8. Request `GET /api/defi/jupiter/quote?inputMint=SOL&outputMint=USDC&amount=1000000&slippageBps=50`.
9. Confirm the response has `executionLocked: true`.
10. Confirm the response does not include `swapTransaction`, `transaction`, `serializedTransaction`, `instructions`, or signing fields.

## Storage / Redaction Checks

Inspect localStorage after use:

- `gorkh.solana.defiCommandCenter.lastContext.v1`

The snapshot may include summaries, timestamps, wallet scope, and redaction metadata.

It must not include:

- private keys
- seed phrases
- wallet JSON
- raw signing material
- serialized executable swap transactions
- raw backend protocol responses
- full private RPC URLs
- API keys
- auth headers
- Cloak notes
- viewing keys
- Zerion credentials
- tokens

## Required Safety Result

DeFi Command Center v0.1 is safe only if it remains read-only plus quote-only:

- no swap execution
- no limit order placement/cancel
- no lending actions
- no LP actions
- no staking/unstaking
- no Jito
- no Squads execution
- no hardware signing
- no Drift
- no autonomous execution
