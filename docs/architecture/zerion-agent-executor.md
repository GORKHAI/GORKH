# Zerion Agent Executor

GORKH integrates Zerion as an Agent execution adapter, not as a Wallet or Cloak feature. Cloak remains in Wallet -> Private/Cloak and keeps its own Tauri signer bridge and secure note storage.

## Scope

Zerion Executor v0.1 controls a local `zerion` or `gorkh-zerion` CLI binary from Agent -> Zerion Executor. It detects the CLI, checks API-key status, lists agent wallets, creates a strict policy, creates an agent token, builds a policy-bound proposal, and can execute one tiny SOL -> USDC Solana swap after explicit approval.

GORKH does not vendor the Zerion CLI. The hackathon submission should include a public fork of `github.com/zeriontech/zerion-ai` or a companion fork repo for CLI changes.

## Security Boundary

- Use a fresh Zerion agent wallet with tiny funds. Do not use your main GORKH wallet.
- GORKH local wallet private keys are never passed to Zerion.
- Cloak notes, viewing keys, UTXOs, and signer sessions are never passed to Zerion.
- Zerion API keys are stored only in OS keychain when entered through GORKH.
- Zerion agent token secrets are treated as spending credentials and are not stored in localStorage.
- The native runner uses `std::process::Command` with an args array, never a shell string.
- The Rust allowlist builds exact command categories and blocks arbitrary commands.

## Policy

The first executable policy is Solana only:

- Chain: `solana`
- Pair: `SOL -> USDC`
- Default max spend: `0.001 SOL`
- Expiry: `24h`
- Max executions: `1`
- Bridge: disabled
- Send: disabled
- Raw signing: disabled

Execution requires proposal source `agent_zerion_panel`, matching policy digest, matching approval, and a real-onchain warning acknowledgement.

## Commands

Read-only commands are limited to CLI detection, wallet list, agent policy/token lists, portfolio, positions, and swap token discovery.

Setup commands are limited to:

```bash
zerion agent create-policy --name gorkh-solana-tiny-swap --chains solana --expires 24h --deny-transfers --json
zerion agent create-token --name gorkh-agent-token --wallet gorkh-agent-demo --policy gorkh-solana-tiny-swap --json
```

The only execution command in this phase is:

```bash
zerion swap solana 0.001 SOL USDC --wallet gorkh-agent-demo --json
```

Zerion docs show that swap syntax may vary by CLI version. GORKH displays the exact command preview before execution; operators should inspect `zerion swap --help` on the demo machine before a mainnet smoke.

