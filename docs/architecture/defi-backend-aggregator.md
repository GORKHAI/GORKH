# DeFi Backend Aggregator

The DeFi backend aggregator is a read-only data layer in the existing `@gorkh/api` app. It exists to keep public API/indexer/RPC configuration on Render/server env while the desktop app receives only normalized, safe summaries.

## Routes

- `GET /api/defi/health`
- `GET /api/defi/positions?wallet=<pubkey>&scope=<scope>`
- `GET /api/defi/lending?wallet=<pubkey>`
- `GET /api/defi/lp?wallet=<pubkey>`
- `GET /api/defi/yields`
- `GET /api/defi/lsts`
- `GET /api/defi/jupiter/quote?inputMint=<mint>&outputMint=<mint>&amount=<raw>&slippageBps=<bps>`

All routes validate input, use bounded timeouts, return loaded/partial/unavailable/error envelopes, and avoid leaking env secrets or full private URLs.

## Env

Supported optional env:

- `DEFI_FEATURES_ENABLED`
- `DEFI_CACHE_TTL_MS`
- `DEFI_REQUEST_TIMEOUT_MS`
- `SOLANA_RPC_MAINNET_URL`
- `SOLANA_RPC_DEVNET_URL`
- `HELIUS_API_KEY`
- `SHYFT_API_KEY`
- `BIRDEYE_API_KEY`
- `JUPITER_API_BASE`
- `KAMINO_API_BASE`
- `MARGINFI_API_BASE`
- `ORCA_API_BASE`
- `RAYDIUM_API_BASE`
- `METEORA_API_BASE`

Render env may contain public API/indexer/RPC keys. It must never contain wallet private keys, seed phrases, wallet JSON, Cloak viewing keys, Zerion tokens, or signing material.

## Adapter State

Adapters return:

- `loaded`
- `empty`
- `unavailable`
- `error`
- `stale`

Unavailable is a valid state. It means a safe read-only source is not configured or the adapter does not yet have a verified non-execution endpoint contract.

## Current Real Data

- Jupiter quote-only: backend calls quote endpoint only and returns a normalized quote summary.
- LSTs: backend can load public token overview fields from Birdeye when configured.
- Kamino/MarginFi: unavailable until safe read-only user position endpoints are configured.
- Orca/Raydium/Meteora: unavailable until safe wallet-indexed LP position sources are configured.

No adapter builds or returns executable transactions.

## Forbidden Payloads

Backend responses must not include:

- executable swap transactions
- serialized transactions
- unsigned or signed transactions
- order creation payloads
- lending action payloads
- LP action payloads
- staking action payloads
- private keys, seed phrases, wallet JSON, API keys, auth headers, Cloak notes, viewing keys, or Zerion credentials

Jupiter quote normalization discards upstream route details and returns route labels only.

## Future Execution Policy

Any future execution must use:

Draft / proposal -> policy check -> Shield or Transaction Studio review -> explicit user approval -> secure signer gateway / Rust keychain -> audit log.

The aggregator is not an execution backend.
