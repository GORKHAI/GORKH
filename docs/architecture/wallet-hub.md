# GORKH Wallet Hub + Portfolio Dashboard v0.1

Wallet Hub v0.1 is the multi-wallet control center inside the existing Wallet module. It manages safe wallet metadata and read-only portfolio summaries only.

## Scope

- Local Vault metadata display
- Browser Handoff metadata display
- Watch-only wallet add, label, tag, switch, and remove
- Active wallet switcher
- Read-only SOL balance refresh
- Read-only SPL token account refresh where the existing RPC helper supports it
- Consolidated portfolio summary across selected wallets
- Safe local portfolio snapshot history
- Redacted context snapshot for Agent/Context

## Safety Boundary

Wallet Hub does not implement signing, trading, staking, swaps, bridging, raw transaction sending, Jito bundle submission, hardware wallet signing, Squads proposal creation/signing/execution, DeFi execution, Drift integration, or autonomous wallet execution.

Watch-only wallets never sign. Local vault secrets stay Rust/keychain-side. The frontend and `localStorage` may store only public wallet metadata, labels, tags, balance summaries, public token mint data, estimated USD values, timestamps, and redacted context summaries.

Forbidden data:

- private keys
- seed phrases
- wallet JSON
- raw signing material
- Cloak notes
- viewing keys
- Zerion credentials
- API keys or tokens

## Portfolio Values

Portfolio balances use public read-only RPC helpers. USD values are estimates. In v0.1, stablecoin estimates can be shown for known public stable mints, and all other missing prices degrade to:

`Price unavailable — balance shown without USD estimate.`

PnL and cost basis are not implemented.

## Context Snapshot

Wallet Hub writes a redacted local context snapshot at:

`gorkh.solana.walletHub.lastContext.v1`

It may include wallet counts, active wallet label/public address, estimated total value, top token symbols/mints, stale/error state, timestamp, and redaction metadata. It must not include secret material.

## Locked Roadmap

Locked in v0.1:

- Hardware Wallets: Ledger/Trezor
- Multisig: Squads v4
- NFT Gallery
- DeFi Positions
- Stake Accounts
- PnL Tracking
- Advanced Portfolio History

DeFi positions are planned as read-only protocol adapters behind explicit safety review. No Drift integration exists.
