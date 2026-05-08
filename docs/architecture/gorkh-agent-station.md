# GORKH Agent Station — v0.4 Architecture

GORKH Agent Station is the first persistent local Solana agent runtime inside
the GORKH desktop app. v0.4 still ships exactly **one active agent** — `GORKH Agent`
— and renders a roadmap of locked / blocked templates for everything else.

## What is in v0.4

- One persistent local agent: **GORKH Agent**.
- In-app conversational chat at **Agent → GORKH Agent → Chat**.
- Deterministic chat planning by default.
- Redacted context builder for safe Wallet, Markets, Shield, Transaction Studio, Builder, Memory, and Agent Station summaries.
- Inline chat tool cards for Wallet, Markets, Shield, Cloak, Zerion, Builder, Context, and policy blocks.
- Durable chat-card action references that resolve Cloak, Zerion, Shield, and Context payloads from local handoff history after reload.
- Manual and `background_while_app_open` runtime modes.
- Kill switch that blocks proposals, ticks, and approvals.
- Policy engine that gates every tool call.
- Tool router with safe read/draft tools only.
- Real Wallet and Markets summaries from existing local workstation state.
- Transaction Studio, Shield, Cloak, Zerion, and Context handoffs that prefill destination modules.
- Passive last-module context summaries for Shield, Transaction Studio, and Builder, stored only after user-triggered module actions.
- Approval queue for proposals that require explicit human approval.
- Local-only audit log of every state transition.
- Local memory v0.1 (non-sensitive observations) backed by `localStorage`.
- Coming-Soon and Blocked roadmap templates rendered as locked cards.

## What is NOT in v0.4

- No autonomous main-wallet signing (templates marked **Blocked**).
- No autonomous Cloak private sends.
- No autonomous Zerion execution.
- No copy-trading, momentum, yield, DAO voting, LP, or auto-repay execution.
- No Telegram, WhatsApp, or Discord control bots.
- No cloud / always-on background daemon.
- No private key, seed phrase, wallet JSON, Cloak note secret, viewing key,
  Zerion API key, or agent token in `localStorage`.
- No arbitrary shell / terminal execution. No new wildcard Tauri commands.
- No LLM tool execution. LLM planning remains disabled by default and may only use redacted context if enabled in a later phase.
- No chat runtime after the desktop app is fully quit.

## v0.4 chat flow

```
User message
  -> storage/redaction guard
  -> redacted context builder
  -> deterministic intent classifier
  -> optional LLM planning scaffold (disabled by default)
  -> Agent Station tool router
  -> evaluateAgentToolRequest()
  -> tool result / proposal / handoff
  -> natural-language reply + inline tool cards
  -> local audit event + chat thread persistence
```

Chat lives under `apps/desktop/src/features/solana-workstation/agent/station/chat/`.
It is not the old secondary Assistant workspace and it is not a cloud bot
control surface.

The default tab order inside **Agent → GORKH Agent** is:

1. Chat
2. Tools
3. Handoffs
4. Policy
5. Memory
6. Audit
7. Templates

Actionable chat cards store `relatedHandoffEntryId` and resolve payloads from
`gorkh.solana.agentStation.handoffs.v1` before navigating or copying. If the
local handoff entry is unavailable, the card does not reconstruct payloads from
chat text and does not execute anything.

## v0.2 tool enrichment

The deterministic intent classifier routes user requests to safe tools. v0.4
uses the same safe runtime from chat:

| Intent | Tool | Output |
|---|---|---|
| "check my wallet", "portfolio", "balance" | `wallet.read_portfolio` / `wallet.read_snapshot` | Wallet Summary card from stored wallet profile, latest read-only snapshot, and portfolio summary where present. |
| "analyze token", "mint", "risk" | `markets.fetch_context` | Markets Summary card from local watchlist and stored analyses. No Birdeye/API fetch is started. |
| "explain tx", "signature", "transaction" | `shield.decode_transaction` | Transaction Studio review handoff with prefilled input. User clicks Decode/Simulate in Transaction Studio. |
| "private send", "cloak", "deposit privately" | `cloak.prepare_private_send` / `cloak.prepare_deposit` | Cloak draft handoff to Wallet -> Private / Cloak. No signer bridge call. |
| "dca", "zerion", "SOL to USDC" | `zerion.create_proposal` | Zerion proposal handoff to Agent -> Zerion Executor. No CLI swap execution. |
| "bundle", "summary", "export context" | `context.create_bundle` | Sanitized local context bundle with redaction labels. |

The agent never fetches RPC, Birdeye, Cloak, or Zerion data automatically in v0.2. It reads existing local state and creates proposal/handoff records only.

Chat replies are natural-language summaries around those same deterministic
results. Examples:

- Wallet: local selected profile, SOL balance, token account count, and no RPC refresh from chat.
- Markets: local watchlist summary and no Birdeye/API fetch from chat.
- Transaction Studio: handoff only; decode/simulation happens after the user opens Transaction Studio.
- Cloak: draft handoff only; execution stays in Wallet → Cloak Private.
- Zerion: proposal handoff only; execution stays in Zerion Executor.
- Context: redacted context bundle excluding private keys, seed phrases, Cloak notes, viewing keys, API keys, Zerion tokens, and raw signing payloads.

## Last Module Context Store

`gorkh.solana.contextBridge.lastModuleContext.v1` stores redacted deterministic summaries from modules after the user performs an action:

- Shield writes input kind, truncated input preview, input hash, network, summary, risk count, highest risk, and whether RPC/simulation results already exist.
- Transaction Studio writes input kind, decoded summary, risk summary, simulation summary, balance diff summary, explanation summary, and redaction labels.
- Builder writes project kind, package manager, workspace label only, IDL/instruction/error counts, toolchain status, warnings, recommendations, and sanitized markdown.

The store deliberately excludes full workspace paths, raw private files, `.env`, wallet files, private keys, seed phrases, Cloak notes/viewing keys, Zerion API keys, and agent tokens. Agent Station reads this store passively for context bundles and Builder Review intents; it does not start Shield RPC/simulation, Builder inspection, tool version checks, or diagnostic commands.

## Background runtime scope

> GORKH Agent can run in the background while the desktop app is open. It does
> not run after the app is fully quit.

Background ticks are heartbeats only. v0.2 ticks never sign, never call the
network, never modify the approval queue.

## Module ownership

| Concern | Owner |
|---|---|
| Cloak deposits and private sends | Wallet → Cloak Private |
| Zerion swap execution | Agent → Zerion Executor |
| GORKH Agent Station | Agent → GORKH Agent |

The Station can _draft_ a Cloak send or a Zerion proposal, but execution
remains in the Wallet/Cloak and Zerion Executor approval flows. The Station
cannot bypass either path.

Cross-module navigation is prefill-only:

- **Open Wallet -> Cloak Private** moves the user to Wallet and preloads safe amount/recipient fields when available.
- **Open Agent -> Zerion Executor** moves the user to Zerion Executor and preloads safe amount/wallet/policy fields when available.
- **Open Transaction Studio** moves the user to Transaction Studio and preloads the candidate input for manual decode/simulation review.

The destination module still requires the user to click its own review, prepare, approve, or execute controls.

## Architecture

```
GORKH Agent Station
├── Profile         (id, name="GORKH Agent", version, status, enabled, localOnly)
├── Runtime         (start/pause/resume/kill/tick, manual run)
├── Memory          (local audit, observations, goals, preferences — non-sensitive)
├── Tool Layer      (wallet/markets/shield/cloak/zerion/context/builder safe tools)
├── Policy Engine   (allowedTools, blockedTools, approval gates, spend caps, kill switch)
├── Approval Queue  (proposed actions, policy result, risk level, user approval)
└── Audit Log       (reason, tool calls, policy decision, approval state, result)
```

Implementation lives at:

- `packages/shared/src/solana-agent-station.ts` — domain types, schemas, defaults, templates.
- `apps/desktop/src/features/solana-workstation/agent/station/`
  - `chat/` — v0.4 in-app conversational Agent Chat.
  - `agentStationStorage.ts` — localStorage persistence + redaction guard.
  - `agentRuntime.ts` — start/pause/resume/kill/tick + manual run.
  - `agentPolicyEngine.ts` — `evaluateAgentToolRequest()`.
  - `agentToolRegistry.ts` — `executeToolSafely()` for the safe tool set.
  - `agentWalletTools.ts` — real local Wallet summary reader.
  - `agentMarketsTools.ts` — real local Markets summary reader.
  - `agentShieldTools.ts` — Shield prefill handoff.
  - `agentCloakHandoff.ts` — Wallet -> Cloak Private draft handoff.
  - `agentZerionHandoff.ts` — Agent -> Zerion Executor proposal handoff.
  - `agentContextTools.ts` — sanitized Agent Station context bundle.
  - `agentHandoffStorage.ts` — local handoff history with forbidden-field guard.
  - `agentTaskPlanner.ts` — deterministic intent classifier and proposal builder.
  - `agentApprovalQueue.ts` — approval item lifecycle.
  - `agentAudit.ts` — typed audit event factories.
  - `agentMemory.ts` — sensitive-content rejection + memory entry factory.
  - `agentRoadmapTemplates.ts` — active / coming-soon / blocked partitions.
  - `createAgentContextSummary.ts` — sanitized context export.
  - `components/GorkhAgentStationPanel.tsx` — UI panel mounted as the **GORKH Agent** tab in `AgentWorkbench`.

## Chat storage and redaction

Chat metadata is stored in `localStorage` key
`gorkh.solana.agentStation.chat.v1`.

Stored:

- thread metadata;
- chat messages;
- tool card metadata;
- redacted context summaries;
- chat settings;
- run status.

Not stored:

- private keys, seed phrases, wallet JSON, keypairs;
- raw Cloak notes, note secrets, viewing keys, raw UTXOs;
- Zerion API keys, Zerion tokens, agent tokens;
- raw signing payloads or LLM provider API keys.

The chat storage guard rejects forbidden JSON keys and obvious secret-like
values such as `zk_…`, `sk_…`, `BEGIN PRIVATE KEY`, and 64-number keypair
arrays. Threads are capped at 20 and messages are capped at 200 per thread,
with message content capped at 8000 characters.

## LLM planning

v0.4 includes the LLM bridge scaffold but leaves it disabled:

- `plannerMode = deterministic`
- `allowLlmPlanning = false`
- `requireRedactedContext = true`

When a future phase enables LLM planning, the model may only receive the
redacted context bundle and may only suggest an intent/tool plan. The
deterministic tool router and `evaluateAgentToolRequest()` still make the
final decision. The LLM cannot call Tauri commands, execute tools, sign, or
receive secrets.

## Policy engine — `evaluateAgentToolRequest(policy, runtime, request)`

Returns `{ allowed, requiresApproval, blockedReasons, riskLevel, policyDigest }`.

Rules enforced:

- Kill switch blocks all tool requests (read/draft/execute) when engaged.
- Any tool on the global blocked list (`wallet.export_private_key`,
  `wallet.sign_without_approval`, `wallet.send_without_approval`,
  `cloak.execute_private_send_autonomous`, `cloak.execute_deposit_autonomous`,
  `cloak.export_note_secret`,
  `cloak.export_viewing_key`, `zerion.execute_without_approval`,
  `markets.execute_trade_autonomous`, `dao.vote_autonomous`,
  `yield.move_funds_autonomous`, `copytrade.execute_autonomous`,
  `terminal.exec_arbitrary`, `shell.exec_arbitrary`) is permanently blocked.
- Cloak draft tools (`cloak.prepare_*`) are allowed only as drafts, never as
  executions. Execution remains in Wallet → Cloak Private.
- `zerion.create_proposal` is allowed only as a proposal. Execution remains in
  Zerion Executor.
- `requireApprovalForCloak` / `requireApprovalForZerion` /
  `requireApprovalForTransactions` are permanently `true`.
- `allowMainWalletAutonomousExecution`, `allowAutonomousCloakSend`,
  `allowAutonomousTrading`, `allowAutonomousDaoVoting` are permanently `false`.

## Tool router

Allowed tools (v0.2):

| Tool | What it does | Approval? |
|---|---|---|
| `wallet.read_snapshot` | Read public wallet metadata snapshot | No |
| `wallet.read_portfolio` | Read portfolio summary if available | No |
| `markets.read_watchlist` | Read current watchlist | No |
| `markets.fetch_context` | Pull existing market context (no auto API key) | No |
| `shield.decode_transaction` | Route input to Shield for decode | Yes |
| `shield.simulate_transaction` | Request a simulation; user runs it | Yes |
| `cloak.prepare_deposit` | Link/prepare a Cloak deposit draft | Yes |
| `cloak.prepare_private_send` | Prepare a Cloak private-send draft | Yes |
| `zerion.create_proposal` | Build a typed Zerion swap proposal | Yes |
| `zerion.read_policy` | Read local Zerion policy | No |
| `context.create_bundle` | Create a sanitized context bundle | No |
| `builder.inspect_workspace` | Read sanitized Builder summary | No |
| `builder.analyze_logs` | Analyze sanitized Builder logs | No |

Every tool call is recorded with `inputSummary`, `outputSummary`, `status`,
`startedAt`, `completedAt`, and any `error`.

## Memory

Memory v0.1 is local, non-sensitive only, persisted in
`gorkh.solana.agentStation.v1`. Sensitive material (private keys, seed
phrases, mnemonics, viewing keys, note secrets, API key-like strings) is
rejected at the `createMemoryEntry()` boundary.

> SQLite + vector memory remains future work unless explicitly implemented.

## Storage redaction

`assertNoSensitiveAgentStationContent()` runs on every save and refuses to
persist any object containing forbidden property keys (`privateKey`,
`seedPhrase`, `mnemonic`, `walletJson`, `cloakNoteSecret`, `viewingKey`,
`apiKey`, `agentToken`, …) or strings matching API key patterns
(`zk_…`, `sk_…`).

## Roadmap templates (rendered as locked cards)

Coming Soon:

- Copy Trader — execution disabled.
- Momentum Bot — execution disabled.
- Yield Optimizer — funds movement disabled.
- DAO Auto-Voting Agent — manual approval required.
- LP Manager — LP add/remove disabled.
- Health Factor Auto-Repay Agent — autonomous repay disabled.
- Autonomous Cloak Private Send — disabled; private sends always require Wallet approval.

Blocked:

- Main-Wallet Autonomous Execution — _Disabled. Main wallet actions require
  explicit policy and approval. No god-mode wallet access._

## Context bridge

`createAgentStationContextSummary()` produces a sanitized markdown summary of
profile, policy, recent tasks/proposals/approvals/audit, non-sensitive memory,
and the roadmap templates. Sensitive memory entries are excluded; the
`redactionsApplied` array records the redaction labels.

## Tests

- `packages/shared/test/solana-agent-station.test.mjs` — schemas, factories,
  templates, intent classifier, blocked tool list.
- `tests/desktop-agent-station.test.mjs` — module structure, UI source guards.
- `tests/desktop-agent-station-policy.test.mjs` — `evaluateAgentToolRequest`.
- `tests/desktop-agent-station-runtime.test.mjs` — start/pause/resume/kill, manual run, tick heartbeat.
- `tests/desktop-agent-station-storage.test.mjs` — redaction, memory rejection, context export.
- `packages/shared/test/solana-agent-station-chat.test.mjs` — chat schemas and defaults.
- `tests/desktop-agent-chat*.test.mjs` — chat classifier, redaction/storage, handoffs, LLM-disabled behavior, and UI source guards.

## Known limits

- Background runtime is JS-side `setInterval` while the desktop app process is
  alive. There is **no OS-level launchd / systemd integration**.
- Memory persistence is `localStorage` only.
- LLM planning is intentionally disabled by default in v0.4; the existing
  secondary Assistant workspace remains separate.
