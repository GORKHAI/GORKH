# Zerion Track Submission Notes

The Zerion track requires a fork of Zerion CLI, an autonomous onchain agent, at least one scoped policy, a real onchain transaction, Zerion API swaps, and public code.

GORKH provides the desktop control layer:

1. Open Agent -> Zerion Executor.
2. Detect `zerion` or `gorkh-zerion`.
3. Use a fresh tiny-funded Zerion agent wallet.
4. Create the Solana tiny-swap policy.
5. Create a Zerion agent token for that wallet and policy.
6. Create a SOL -> USDC proposal.
7. Review the exact command preview.
8. Approve the real onchain transaction warning.
9. Execute through Zerion CLI and capture the result/audit event.

The CLI fork should live in a public fork of `github.com/zeriontech/zerion-ai` or a companion public repo. Do not vendor the entire CLI into GORKH unless the submission rules later require it.

Manual setup:

```bash
npm install -g zerion-cli
zerion init -y --browser
zerion wallet create --name gorkh-agent-demo
zerion wallet fund --wallet gorkh-agent-demo
zerion agent create-policy --name gorkh-solana-tiny-swap --chains solana --expires 24h --deny-transfers
zerion agent create-token --name gorkh-agent-token --wallet gorkh-agent-demo --policy gorkh-solana-tiny-swap
```

Do not use a production wallet. Do not use large funds. Do not enable bridge or send for this phase.

