# Wallet Hub Smoke Plan

1. Open GORKH.
2. Open Wallet.
3. Confirm Wallet opens on the Hub tab.
4. Confirm the sidebar, topbar, inspector, and status bar remain visible.
5. Confirm there is no page-level scrolling in the Hub workbench.
6. Add a watch-only wallet by pasting a Solana public address.
7. Edit the watch-only label and tags.
8. Switch active wallets and confirm no signing or execution prompt appears.
9. Remove the watch-only wallet.
10. Create or view a local vault wallet and confirm only label, public address, lock state, and metadata appear in Hub.
11. Refresh Portfolio for a wallet.
12. Confirm SOL balance appears when RPC returns it.
13. Confirm SPL token balances appear when token accounts are returned.
14. Confirm missing prices show `Price unavailable — balance shown without USD estimate.`
15. Confirm consolidated portfolio totals are labeled estimates.
16. Confirm recent portfolio snapshots store only wallet IDs, public addresses, token summaries, estimated totals, and timestamps.
17. Confirm `gorkh.solana.walletHub.lastContext.v1` contains no private keys, seed phrases, wallet JSON, Cloak notes, viewing keys, Zerion credentials, API keys, tokens, or signing material.
18. Confirm locked roadmap sections are visibly disabled:
    - Hardware Wallets: Ledger/Trezor
    - Multisig: Squads v4
    - NFT Gallery
    - DeFi Positions
    - Stake Accounts
    - PnL Tracking
    - Advanced Portfolio History
19. Confirm no Drift integration appears.
20. Confirm no sign, send, broadcast, request airdrop, swap, stake, bridge, Jito, Squads execution, or hardware signing buttons exist.

Wallet Hub v0.1 is metadata plus read-only balance aggregation only. Watch-only wallets never sign. Local vault secrets stay Rust/keychain-side.

## Manual Screenshot QA

Automated screenshot tooling is not configured for this desktop shell in-repo. Capture these screens manually before a release candidate:

- Wallet > Hub with zero wallets.
- Wallet > Hub with one watch-only wallet selected.
- Wallet > Hub with 10+ wallet profiles in the left list.
- Wallet > Hub with a locked local vault wallet selected.
- Portfolio after refresh loading, loaded, error, and price-unavailable states.
- Locked roadmap section showing all disabled future items.

Each screenshot must show the fixed Workstation sidebar, topbar, inspector, and status bar. There must be no page-level browser scroll and no signing, swap, stake, bridge, Squads, Jito, hardware signing, or Drift controls.

Release note: `v0.0.48` already exists and must not be moved, deleted, or reused. The next release tag must be `v0.0.49` or later after final validation.
