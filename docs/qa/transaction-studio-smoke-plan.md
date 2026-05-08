# Transaction Studio Smoke Plan

1. Open GORKH.
2. Open Transaction Studio from the Workstation sidebar.
3. Paste a Solana transaction signature.
4. Click Fetch Transaction and confirm the result is read-only metadata.
5. Review the instruction timeline area.
6. Paste a base64 serialized transaction.
7. Click Decode and confirm instructions, accounts, signers, writable accounts, and risk findings appear.
8. Paste invalid text and confirm the visible status says the input is invalid or unsupported.
9. Paste a base58-looking raw transaction and confirm it is detection-only in v0.1, with no fake decode.
10. Click Simulate if the selected RPC supports it.
11. Confirm the Simulation pane moves through not-run, loading, success, failure, or RPC-unavailable states honestly.
12. Check Simulation, Balance Diffs, Logs, Explanation, and Audit Context panes.
13. If no pre/post metadata is available, confirm Balance Diffs says no balance diff data is available.
14. If simulation account snapshots are returned, confirm they are labeled as post-state snapshots, not fake deltas.
15. Confirm System, SPL Token, Token-2022, Compute Budget, and Memo instructions show deterministic summaries when present.
16. Confirm simulation is labeled Current-State Simulation.
17. Confirm Replay Against Current State remains future-labeled and locked.
18. Confirm no sign, send, broadcast, wallet execution, Jito, or raw submission buttons exist.
19. Confirm Coming Soon features are disabled.
20. Confirm Locked Advanced Jito Bundle Composer and Raw Transaction Broadcast are visibly disabled.
21. Create an Agent transaction review handoff and open Transaction Studio.
22. Confirm Cloak and Zerion handoffs are review-only and do not call execute paths.
23. Confirm context snapshot storage excludes private keys, seed phrases, wallet JSON, Cloak notes, viewing keys, Zerion API keys/tokens, raw transaction payloads, and raw signing payloads.

Simulation is advisory and current-state only. Replay must remain future-labeled as current-state replay when implemented.

## Manual Screenshot QA

Automated screenshot tooling is not configured for this desktop shell in-repo. Capture these screens manually before a release candidate:

- Transaction Studio empty state.
- Detected signature state after paste.
- Decoded base64 transaction with instruction timeline and risk inspector.
- Base58 raw transaction detection-only state.
- Simulation loading, success, failed, and RPC-unavailable states.
- Balance Diffs empty state and post-state snapshot label.
- Coming Soon and Locked Advanced roadmap items.

Each screenshot must show the fixed Workstation sidebar, topbar, inspector, and status bar. Transaction Studio must not show signing, broadcast, raw send, Jito submission, bundle execution, wallet execution, or autonomous execution controls.

Release note: `v0.0.48` already exists and must not be moved, deleted, or reused. The next release tag must be `v0.0.49` or later after final validation.
