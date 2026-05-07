# Zerion Agent Smoke Plan

Do not run this smoke with a production wallet.

## Preconditions

- Node.js 20+.
- `zerion` or `gorkh-zerion` is installed.
- A Zerion API key beginning with `zk_` is configured in Zerion CLI or stored in GORKH OS keychain.
- A fresh Zerion agent wallet is created and funded with tiny SOL.
- GORKH Wallet -> Private/Cloak still loads independently.

## Dry Run

1. Open GORKH Desktop.
2. Open Agent -> Zerion Executor.
3. Detect CLI.
4. Confirm the UI warning: "Use a fresh Zerion agent wallet with tiny funds. Do not use your main GORKH wallet."
5. List Zerion wallets or enter `gorkh-agent-demo`.
6. Create the local/Zerion policy.
7. Create the agent token.
8. Create a `0.001` SOL -> USDC proposal.
9. Verify the exact command preview.
10. Confirm bridge/send remain disabled.
11. Stop before execution unless the run owner explicitly approves a real transaction.

## Real Tiny Swap

1. Inspect `zerion swap --help` on the demo machine and confirm syntax matches the displayed command.
2. Check the fresh Zerion wallet balance.
3. Check the approval box in GORKH.
4. Execute via Zerion CLI.
5. Record tx hash/signature, CLI JSON result, and GORKH audit event.
6. Confirm no API key, agent token, private key, seed phrase, or Cloak note appears in localStorage or exported context.

## Rollback

If execution fails, preserve the audit event and structured error. Do not retry with larger funds. Revoke the Zerion agent token from the CLI if the demo is complete.

