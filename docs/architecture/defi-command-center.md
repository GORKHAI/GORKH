# DeFi Command Center v0.1

DeFi Command Center v0.1 is a Wallet/Portfolio surface for read-only Solana DeFi intelligence and quote-only review. It is integrated inside the Wallet module rather than added as a top-level Workstation module.

## Scope

Implemented in v0.1:

- DeFi portfolio overview by wallet scope.
- Read-only protocol adapter framework.
- LP position tracker foundation.
- Lending monitor foundation.
- Yield comparison foundation.
- LST comparison foundation for JitoSOL, mSOL, bSOL, and bbSOL.
- Jupiter quote-only terminal.
- Locked DeFi action list.
- Redacted local DeFi context snapshot.
- Wallet Hub portfolio integration with separate DeFi value display.
- GORKH backend/API read-only DeFi aggregator integration for live public data where configured.

Not implemented in v0.1:

- Swap execution.
- Limit order placement or cancellation.
- Lending deposit, borrow, repay, or withdraw.
- Add or remove liquidity.
- Staking or unstaking.
- Bridging.
- Jito execution.
- Squads execution.
- Hardware wallet signing.
- Drift integration.
- Autonomous DeFi execution.

## Placement

The surface lives under:

- Wallet -> DeFi
- Wallet Hub -> Portfolio Dashboard DeFi summary row

DeFi value is displayed separately to avoid double-counting wallet token balances.

## Backend Aggregator

Desktop DeFi data now flows through the existing GORKH API:

GORKH Desktop -> GORKH API `/api/defi/*` -> public/read-only protocol APIs, indexers, and RPC endpoints configured through backend environment variables.

Backend env may contain public API/indexer/RPC keys such as `BIRDEYE_API_KEY`, `SOLANA_RPC_MAINNET_URL`, or protocol API base URLs. Backend env must never contain wallet private keys, seed phrases, wallet JSON, Cloak viewing keys, Zerion tokens, or signing material.

The backend is a data aggregator only. It validates input, applies timeouts/cache TTL, redacts env-derived URLs, normalizes responses into shared DeFi types, and never returns executable payloads.

Current API routes:

- `GET /api/defi/health`
- `GET /api/defi/positions?wallet=<pubkey>&scope=<scope>`
- `GET /api/defi/lending?wallet=<pubkey>`
- `GET /api/defi/lp?wallet=<pubkey>`
- `GET /api/defi/yields`
- `GET /api/defi/lsts`
- `GET /api/defi/jupiter/quote?inputMint=<mint>&outputMint=<mint>&amount=<raw>&slippageBps=<bps>`

## Protocol Adapters

The adapter framework returns typed read-only states:

- `connected`
- `unavailable`
- `error`
- `stale`
- `empty`
- `loaded`

Current protocol groups:

- Liquidity / LP: Raydium, Orca, Meteora.
- Lending: Kamino, MarginFi.
- LSTs: JitoSOL, mSOL, bSOL, bbSOL.

Live protocol data is not faked. If a safe public adapter is not connected, the UI shows an unavailable state such as: "Protocol adapter not connected in v0.1. No funds are touched."

Current real-data behavior:

- LST comparison can load public token overview fields from the backend Birdeye adapter when `BIRDEYE_API_KEY` is configured. Missing APY, TVL, or exchange-rate fields remain unavailable rather than inferred.
- Jupiter quote-only requests are routed through the backend and normalized into safe quote summaries.
- Kamino, MarginFi, Orca, Raydium, and Meteora remain unavailable unless a stable safe read-only wallet-indexed source is configured and validated. They do not use action helpers or transaction builders.

Exact current blockers:

- Kamino and MarginFi need stable read-only user position endpoints or indexer mappings that return supplied/borrowed/net value/health without transaction builders.
- Orca, Raydium, and Meteora need safe wallet-indexed LP position sources and pool metadata. Impermanent loss remains unavailable without entry price/time history.

## Jupiter Quote-Only Terminal

The Jupiter terminal calls the GORKH backend quote-only endpoint and stores only a quote summary:

- estimated output
- price impact when available
- route summary when available
- fee/threshold summary when available
- quote timestamp
- stale/expiry state
- execution locked warning

It does not call Jupiter swap, order creation, or transaction building endpoints. It does not build, store, sign, or broadcast executable swap transactions. The shared quote schema intentionally has no `swapTransaction`, `serializedTransaction`, `transaction`, `rawTransaction`, `signingPayload`, or `executePayload` field.

## Context Snapshot

The local snapshot key is:

`gorkh.solana.defiCommandCenter.lastContext.v1`

Allowed summary content:

- selected wallet scope
- detected protocol count
- separate DeFi estimated value
- top positions summary
- lending risk summary
- LP summary
- yield comparison summary
- LST comparison summary
- Jupiter quote summary
- stale/error state
- timestamp
- redaction metadata

Forbidden content:

- private keys
- seed phrases
- wallet JSON
- raw signing material
- serialized executable swap transactions
- full private RPC URLs
- API keys
- auth headers
- Cloak notes
- viewing keys
- Zerion credentials
- tokens

## Future Execution Policy

Any future DeFi execution must follow:

Draft / proposal -> policy check -> simulation or Transaction Studio review -> explicit user approval -> secure signer gateway / Rust keychain -> audit log.

GORKH Agent may observe, summarize, draft, and hand off. It may not directly sign, execute, trade, swap, stake, lend, borrow, or use the main wallet without explicit approval.
