# GORKH Current Desktop App Report

## 1. Executive Summary

GORKH is currently a Solana-first desktop workstation built around local control, transaction safety, wallet intelligence, developer diagnostics, market context, and agent-assisted planning. The desktop app is structured as a fixed Workstation shell with primary modules for Wallet, Markets, Agent, Builder, Shield, Transaction Studio, and Context, plus Assistant as a secondary workspace.

The strongest current surfaces are the Workstation shell, Transaction Studio v0.1, Wallet Hub + Portfolio Dashboard v0.1, and Builder Developer Toolbox v0.1. These newer modules use compact panel grids and clearly label read-only, simulation-only, or locked capabilities. Older Wallet, Markets, Shield, Agent, and Context screens remain functional but visually less consistent because they still use lighter inline styling, larger page-style spacing, and page-level scrolling in places.

## 2. Current Product Positioning

The current app positions GORKH as an Apple/macOS-first Solana Workstation rather than an AI-operator-first SaaS product. The core identity is:

- Local-first Solana wallet and portfolio control.
- Transaction review and safety before signing or execution.
- Developer tooling for Anchor, RPC, logs, account data, and simulation diagnostics.
- Market and wallet context for informed review.
- Agent planning and handoffs with explicit approval boundaries.
- Assistant as a secondary workspace, not the main product surface.

The app repeatedly communicates that private keys, seed phrases, wallet JSON, signing material, and execution are outside normal frontend workflows.

## 3. Current Desktop Shell

The Workstation shell is implemented in `apps/desktop/src/features/solana-workstation/layout`. It uses a fixed full-viewport layout with:

- Left sidebar navigation.
- Top bar with module title, command input, safety chips, settings, and Assistant toggle.
- Central workspace.
- Right inspector panel on wide screens.
- Bottom status bar.

The shell CSS sets `html`, `body`, and `#root` to `overflow: hidden`, and the shell itself uses `height: 100vh`, `width: 100vw`, and `overflow: hidden`. Module frames use `gorkh-workstation-module-frame` and `gorkh-workstation-module-body` with `min-height: 0` and hidden overflow so newer modules can fit inside a fixed desktop workspace.

Navigation currently includes Wallet, Markets, Agent, Builder, Shield, Transaction Studio, and Context. Assistant is exposed separately from the main module list through the sidebar and topbar.

The topbar command input says: `Search modules or paste address / signature / transaction...`. It classifies pasted Solana input and routes review inputs to Transaction Studio when available, falling back to Shield.

Status chips include `Devnet`, `Read-Only`, `No signing`, and `Execution disabled`. The status bar also shows module name, network, execution-disabled state, active Wallet Hub label when available, RPC read-only status, and safety.

## 4. Module Inventory

| Module | Current status | User-facing purpose | Implemented features | Locked/future features | Safety boundary | Design notes | Confidence |
|---|---:|---|---|---|---|---|---|
| Wallet | Implemented, mixed maturity | Manage wallet metadata, local vault state, watch-only profiles, balances, Cloak area | Hub, local wallet vault metadata, browser handoff, ownership proof foundation, read-only snapshots, portfolio panels, Cloak panel | hardware wallets, multisig, NFT gallery, DeFi positions, staking, PnL | secrets stay keychain/Rust-side; frontend stores metadata only | Hub is polished/dark; older tabs are lighter and page-like | High |
| Markets | Implemented foundation | Read-only watchlists and token/wallet intelligence | watchlist, account/token/wallet snapshots, provider settings, context, safety | trading, swaps, execution | read-only market/RPC lookup; no swaps/trading | useful but visually older and lighter | High |
| Shield | Implemented legacy safety tool | Offline decode and read-only RPC inspection | classify address/signature/base64 tx, decode, risk findings, account/transaction lookup, simulation preview, lookup table resolution | full Transaction Studio workflow now lives separately | no signing/execution; read-only RPC/simulation only | functional but more page-style than desktop-workbench | High |
| Builder | Implemented with new toolbox | Inspect local Solana/Anchor workspaces and run diagnostics | workspace inspection, file tree, IDL viewer, logs, diagnostics, command drafts, context, Developer Toolbox | deployments, upgrades, authority actions, arbitrary RPC, local validator manager | read-only diagnostics; command drafts only | Toolbox is compact/dark; older Builder tabs are lighter | High |
| Agent | Implemented, evolving | Local policy-bound planning, chat, handoffs, audit | Agent Station v0.4, chat, deterministic tools, handoffs to Shield/Cloak/Zerion, policy, memory, audit, templates | autonomous wallet execution, autonomous trading, DAO voting | Agent can observe, summarize, draft, and hand off; cannot directly use main wallet | powerful but visually mixed; some legacy light cards | High |
| Context | Implemented | Build sanitized context bundles for manual assistant review | Agent/Builder/Shield/Private/Zerion context bundle preview and export copy | automatic LLM send, persistent sensitive memory | no auto-send, no execution, redacted summaries | useful but older light styling | High |
| Transaction Studio | Implemented v0.1 | Decode, simulate, explain, and risk-review Solana transactions | input classification, offline decode, explicit simulation, logs, balance diffs, risk inspector, explanation, context snapshot | visual builder, batch builder, priority fee advisor, current-state replay mode, Jito composer, raw broadcast | no signing, no broadcast, no Jito, no raw send | one of the most cohesive dark desktop modules | High |
| Assistant | Secondary workspace | Chat/planning surface outside core Workstation modules | activated through shell; context export remains manual | automatic context send, autonomous actions | does not become primary execution surface | shell treatment is clear, content depends on supplied assistantContent | Medium |

## 5. Wallet Module

Wallet is the broadest module. `WalletWorkbench` defines tabs for Hub, Overview, Local Wallet, Private / Cloak, Balances, Snapshot, Send, Receive, History / Audit, Security, Browser, Markets, and Context. The default tab is Hub.

### Wallet Hub

Wallet Hub is implemented in `wallet/hub`. It presents:

- Wallet profile list.
- Active wallet selection.
- Watch-only wallet add form.
- Label and tag editing.
- Watch-only removal.
- Filter selector for all wallets, active wallet, watch-only, and local vault.
- Refresh Portfolio button.
- Active wallet inspector.
- Recent safe portfolio snapshots.
- Context snapshot panel.
- Locked roadmap panel.

Visible copy includes:

| Area | Copy / behavior |
|---|---|
| Title | `GORKH Wallet Hub` |
| Subtitle | `Multi-wallet metadata, watch-only control, and read-only portfolio dashboard.` |
| Empty state | `No wallets yet. Add a watch-only wallet or create a local vault wallet.` |
| Watch-only success | `Watch-only wallet added. It has no signing capability.` |
| Switch message | `Active wallet switched to ... No signing or execution was triggered.` |
| Portfolio note | `values are estimates` |
| Price fallback | `Price unavailable — balances are shown without complete USD estimates.` |
| Token empty state | `No SPL token balances loaded. Refresh a wallet to fetch read-only token accounts.` |
| Context copy | `Stored at gorkh.solana.walletHub.lastContext.v1...` |

Wallet Hub stores metadata under:

- `gorkh.solana.walletHub.profiles.v1`
- `gorkh.solana.walletHub.activeProfile.v1`
- `gorkh.solana.walletHub.portfolioHistory.v1`
- `gorkh.solana.walletHub.lastContext.v1`

The Hub redaction guard rejects secret-like serialized content such as private keys, seed phrases, wallet JSON, Cloak notes, viewing keys, Zerion tokens, API keys, raw signing payloads, and signature payloads.

### Portfolio Dashboard

The portfolio dashboard is part of Wallet Hub and shows:

- Consolidated total estimated USD value where available.
- Wallet count.
- Last refreshed timestamp.
- Per-wallet SOL balance.
- SPL token rows when read-only snapshots include token account previews.
- Price unavailable states.
- Recent portfolio snapshots.

USD values are explicitly labeled estimates. There is no PnL or cost-basis accounting in v0.1.

### Local Vault Status

Local wallet metadata is stored separately under `gorkh.solana.wallet.localVaultMetadata.v1` and selected local wallet metadata under `gorkh.solana.wallet.selectedLocalWallet.v1`. The report did not inspect Rust keychain internals in depth, but the frontend copy and storage model indicate local vault secrets are not stored in localStorage.

### Watch-Only Wallets

Watch-only wallets are public-address profiles with no signing controls. The UI allows add, label edit, tag edit, active selection, refresh, and removal for watch-only profiles.

### Cloak Private Wallet Area

Cloak remains under Wallet as `Private / Cloak`. It supports pending Agent handoffs and user review. Visible copy in the Wallet safety banner says private keys stay in OS keychain and that Agent/Assistant can draft but cannot sign or execute. The pending Cloak handoff banner says execution remains manual.

### Locked Wallet Roadmap

Wallet Hub locked roadmap items include:

- Hardware Wallets: Ledger/Trezor.
- Multisig: Squads v4.
- NFT Gallery.
- DeFi Positions.
- Stake Accounts.
- PnL Tracking.
- Advanced Portfolio History.

These are rendered disabled with locked styling.

## 6. Transaction Studio

Transaction Studio is a top-level module registered as `transaction-studio`. Its navigation description is: `Decode, simulate, and explain Solana transactions before approval.`

The workbench title is `GORKH Transaction Studio` and the subtitle is `Decode, simulate, and explain Solana transactions before approval.`

Current capabilities:

- Paste Solana transaction signature.
- Paste serialized base64 transaction.
- Detect base58 raw transaction input without pretending to decode it.
- Paste Solana address.
- Decode supported serialized transactions offline.
- Fetch transaction metadata by signature through read-only RPC.
- Fetch account data by address through read-only RPC.
- Explicit-click simulation for base64 serialized transactions.
- Show logs, compute units, error state, replacement blockhash, simulation warnings, and post-state snapshot labeling.
- Show best-effort balance diffs from transaction metadata or simulation output.
- Generate deterministic risk report.
- Generate deterministic plain-English explanation.
- Write redacted last context snapshot.

The main layout is a fixed grid:

- Toolbar row.
- Left Sources/Input panel.
- Center instruction timeline, decoded transaction panel, and accounts panel.
- Right risk panel.
- Bottom row for simulation, balance diffs, logs, explanation, and context/safety/coming soon.

Important visible state copy includes:

| State | Copy / behavior |
|---|---|
| Signature | `Signature detected. Fetch Transaction uses read-only RPC only.` |
| Address | `Address detected. Lookup Account uses read-only RPC only.` |
| Base58 | `Base58 raw transaction detected. Decode is detection-only in v0.1.` |
| Decode success | `Transaction decoded offline.` |
| Invalid | `Invalid or unsupported input. Paste a signature, address, or base64 transaction.` |
| Simulation | `Simulating via read-only RPC with sigVerify false...` |
| Broadcast intent | `Broadcast is locked in Transaction Studio v0.1. Decode and simulation review are available.` |
| Disclaimer | `Current-State Simulation uses current RPC state and does not guarantee future execution.` |

Context storage:

- `gorkh.solana.transactionStudio.workspace.v1`
- `gorkh.solana.transactionStudio.lastContext.v1`
- Also mirrored into `gorkh.solana.contextBridge.lastModuleContext.v1` through the Context Bridge last-module context.

Locked/future features:

- Visual Transaction Builder.
- Batch Transaction Builder.
- Priority Fee Advisor.
- Replay Against Current State.
- Jito Bundle Composer.
- Raw Transaction Broadcast.

Safety boundary:

- No signing.
- No transaction broadcast.
- No raw broadcast.
- No Jito bundle submission.
- No autonomous execution.
- No private key, seed phrase, or wallet JSON access.

## 7. Builder Developer Toolbox

Builder now includes a `Developer Toolbox` tab inside the existing Builder module. Existing Builder inspection behavior remains alongside the new toolbox.

The new toolbox is implemented under `builder/toolbox` and rendered by `DeveloperToolboxPanel`. It uses a compact three-column developer console layout:

- Left internal tab rail.
- Center diagnostic workbench.
- Right RPC & Node status inspector.

Toolbox tabs:

- Overview.
- IDL Browser.
- Account Decoder.
- Program Logs.
- RPC & Nodes.
- Network Monitor.
- Compute Estimator.
- Locked Actions.

### IDL Browser

The IDL Browser allows local paste/load of Anchor IDL JSON. It shows program name, instruction count, account count, type/event/error counts, instruction rows, and account rows. Invalid IDL shows `Invalid Anchor IDL JSON. No data was sent anywhere.`

IDL copy says raw IDL is parsed locally and not sent to Assistant, Context, or backend services automatically.

### Account Decoder

The Account Decoder accepts base64, hex, or base58 account data. It shows:

- Status.
- Raw byte length.
- Discriminator hex.
- Decoded fields where supported.
- Warnings for unsupported/invalid layouts.

It does not fake unsupported decoding.

### Program Logs

The Program Logs panel lets the user enter a program ID and start/stop a websocket log subscription. It supports pause/resume display and clear logs. The buffer copy says `No log events yet. Buffer is capped to prevent memory growth.`

### RPC & Nodes

The RPC & Nodes area includes:

- Endpoint label.
- Endpoint URL.
- Cluster selection.
- Add Endpoint.
- Configured endpoints.
- Default endpoint selection.
- Latency benchmark.

Sensitive RPC URLs with API keys or tokens are rejected for localStorage in v0.1. The UI preview uses redacted URLs.

Storage:

- `gorkh.solana.builderToolbox.rpcEndpoints.v1`
- `gorkh.solana.builderToolbox.lastContext.v1`

### Network Monitor

The Network Monitor shows:

- Cluster.
- Slot.
- Block height.
- Epoch progress.
- Websocket state.
- Read-only subscriptions for slot, account, and program logs.

It uses read-only RPC calls such as health, slot, block height, and epoch info.

### Compute Estimator

The Compute Estimator accepts a base64 serialized transaction and runs explicit-click read-only simulation. UI copy says: `Explicit-click read-only simulation only. No signing, deployment, or broadcast.`

### Locked Deploy/Upgrade/Authority Actions

Locked actions are:

- Program Deployment.
- Program Upgrade.
- Close Program.
- Set Upgrade Authority.
- Transfer Upgrade Authority.
- Revoke Upgrade Authority.
- Arbitrary RPC Playground.
- Offline Signing.
- Hardware Wallet Developer Signing.
- Local Validator Process Manager.
- Dev Faucet.

Locked copy says these are disabled in v0.1 and require proposal creation, policy checks, explicit approval, secure signer gateway, and audit log before future execution.

## 8. Agent Module

Agent contains both legacy agent management surfaces and the newer Agent Station.

Top-level Agent tabs:

- GORKH Agent.
- Zerion Executor.
- Legacy Agents.
- Policy.
- Draft Action.
- Attestation Preview.
- Audit.
- Export.
- Safety.

Agent Station currently identifies itself as `GORKH Agent Station — v0.4`. Its tabs are:

- Chat.
- Tools.
- Handoffs.
- Policy.
- Memory.
- Audit.
- Templates.

The Agent module can:

- Run chat and deterministic tool-router checks.
- Summarize Wallet, Markets, Shield, and Context state.
- Prepare handoffs to Shield, Wallet/Cloak, and Zerion Executor.
- Maintain local audit, memory, proposal, policy, and approval metadata.
- Show active, coming soon, and blocked templates.

The handoff copy is explicit: `GORKH Agent only prepares drafts and proposals. All execution happens in the destination module after explicit user approval.`

Policy UI exposes safety booleans including:

- `requireApprovalForTransactions`
- `requireApprovalForCloak`
- `requireApprovalForZerion`
- `allowMainWalletAutonomousExecution`
- `allowAutonomousCloakSend`
- `allowAutonomousTrading`
- `allowAutonomousDaoVoting`

The safety panel states:

- No wallet connection is available in the legacy control center.
- No private keys, keypairs, or seed phrases are stored or requested.
- No transaction construction, signing, or execution occurs in the agent control center.
- No protocol APIs are called by that control center.
- Drift is excluded from protocol lists.
- Assistant integration is manual.

### Zerion Executor Placement

Zerion Executor is inside Agent, not Wallet. It includes CLI detection, API key keychain status, wallet selection, policy editing, proposal creation, execution approval, execution result, and audit timeline.

Important caveat: unlike Transaction Studio and Wallet Hub, Zerion Executor is not purely read-only. It appears designed for explicit, policy-gated tiny Zerion agent-wallet operations through the Zerion CLI. The UI warns users to use a fresh Zerion agent wallet with tiny funds and not the main GORKH wallet. This is separate from Agent autonomous execution and should stay clearly isolated.

## 9. Context Module

Context Bridge builds sanitized context bundles for manual Assistant review. It reads Agent, Builder, Shield, Private, and Zerion safe summaries where available.

Visible copy:

- `GORKH Context Bridge`
- `Copy sanitized context from Agent, Builder, and Shield into a single bundle for manual assistant review. No auto-send. No execution.`

Storage and context keys include:

- `gorkh.solana.contextBridge.builder.v1`
- `gorkh.solana.contextBridge.bundle.v1`
- `gorkh.solana.contextBridge.lastModuleContext.v1`

The last-module context guard rejects secret-like patterns including private keys, seed phrases, wallet JSON, Cloak note secrets, viewing keys, API keys, agent tokens, PEM private keys, and token-like prefixes.

Context snapshots currently cover Shield, Transaction Studio, and Builder last-module summaries. Wallet Hub and Builder Toolbox also maintain their own redacted local context snapshot keys.

## 10. Markets and Shield

### Markets

Markets is a read-only watchlist and market context module. Tabs include:

- Watchlist.
- Market Data.
- Providers.
- Context.
- Safety.

Markets can add a public address to a watchlist, fetch account/token/wallet snapshots through read-only RPC, analyze items, and build market context. It also includes provider settings and Birdeye/manual market data shell behavior.

Footer copy says: `Markets v0.3 — Read-only watchlists, Birdeye manual fetch, market data adapter shell, and sample context. No swaps. No trading. No execution.`

Design note: Markets is still mostly light inline styling inside the dark shell, with page-level `overflow: auto`.

### Shield

Shield is the legacy transaction safety module. It supports:

- Solana input classification.
- Offline decode for base64 serialized transactions.
- Address/account read-only lookup.
- Signature transaction read-only lookup.
- Simulation preview.
- Address lookup table resolution.
- Risk findings.
- Last Shield context snapshot.

Visible title: `GORKH Shield — Offline Decode + RPC Read-Only`.

Safety banner: `RPC read-only mode. GORKH can fetch public chain data and simulate pasted transactions, but cannot sign or execute anything.`

Design note: Shield is functional and safety-oriented, but now feels less polished than Transaction Studio.

## 11. Assistant Workspace

Assistant is a secondary workspace toggled from the sidebar/topbar rather than a primary module. The topbar title changes to `Assistant — Secondary Workspace` when active.

The inspector describes Assistant as a secondary workspace for chat, planning, and approved desktop tasks. It also says Desktop Vision is optional and disabled until explicitly enabled, and Workstation modules do not require screen context.

Assistant-related Context copy makes it clear that context export is manual and no auto-send occurs.

## 12. Current Content / Copy Inventory

| Module | Key visible copy |
|---|---|
| Shell | `Operational Dashboard`, `Fixed-shell overview for Wallet, Markets, Shield, Transaction Studio, Builder, Agent, and Context.`, `No private keys`, `No signing`, `No execution`, `No trading` |
| Topbar | `Search modules or paste address / signature / transaction...`, `Read-Only`, `No signing`, `Execution disabled` |
| Wallet | `GORKH Wallet`, `Local non-custodial wallet foundation...`, `Private keys stay in the OS keychain...`, `No autonomous signing, no market execution, no secret export.` |
| Wallet Hub | `GORKH Wallet Hub`, `Multi-wallet metadata, watch-only control, and read-only portfolio dashboard.`, `Watch-only wallet added. It has no signing capability.` |
| Portfolio | `values are estimates`, `Price unavailable — balances are shown without complete USD estimates.`, `No safe portfolio snapshots stored yet.` |
| Cloak | `Agent, Assistant, and Markets cannot execute it.` plus approval-gated handoff messaging |
| Markets | `Markets v0.3`, `No swaps. No trading. No execution.` |
| Shield | `GORKH Shield — Offline Decode + RPC Read-Only`, `RPC read-only mode... cannot sign or execute anything.` |
| Transaction Studio | `GORKH Transaction Studio`, `Decode, simulate, and explain Solana transactions before approval.`, `Broadcast is locked...`, `Base58 raw transaction detected. Decode is detection-only in v0.1.` |
| Builder | `GORKH Builder — Workspace Inspector`, `Read-only inspector... No builds, tests, deployments, or file modifications occur in v0.2.` |
| Builder Toolbox | `Builder Developer Toolbox`, `read-only / diagnostic v0.1`, `No deployment, upgrade, authority change, arbitrary RPC... exists in v0.1.` |
| Agent | `GORKH Agent Station — Persistent Mainnet-Safe Solana Agent`, `It can analyze, plan, draft... never holds private keys...` |
| Agent Station | `GORKH Agent Station — v0.4`, `Chat is the primary interface. Manual Run remains available...` |
| Zerion | `Use a fresh Zerion agent wallet with tiny funds. Do not use your main GORKH wallet.` |
| Context | `GORKH Context Bridge`, `No auto-send. No execution.` |
| Assistant | `Secondary workspace for chat, planning, and approved desktop tasks.` |

## 13. Current Visual Design Language

The shell visual language is black/graphite/glass with subtle gradients, thin borders, compact badges, and workstation-style panels. CSS variables define near-black backgrounds, translucent panels, muted text, blue/teal/violet accents, and small-radius cards.

Newer modules use:

- Dense desktop grids.
- Internal scroll panes.
- Thin borders.
- 6-8px radii.
- Monospace panes for logs, raw data, account addresses, and transaction data.
- Compact status chips.
- Muted warnings and disabled locked rows.

Older modules use:

- Lighter inline colors such as `#0f172a`, `#f8fafc`, `#fff`, and pale warning banners.
- More vertical spacing.
- Page-level `overflow: auto`.
- Larger pill buttons.

The result is coherent at the shell level but not yet fully unified across every module.

## 14. Current User Workflows

### Monitor Wallets

1. Open Wallet.
2. Land on Hub.
3. Add watch-only address or use local/browser profiles.
4. Select an active wallet.
5. Review profile type, tags, and status.
6. See active wallet reflected in the status bar when storage is populated.

### Review Portfolio

1. Open Wallet Hub.
2. Choose all wallets, active wallet, watch-only, or local vault filter.
3. Click Refresh Portfolio.
4. Review SOL balance, SPL token rows, price unavailable states, and recent safe snapshots.
5. Context snapshot is written locally without secrets.

### Inspect Transaction

1. Paste address, signature, or transaction into topbar command input or Transaction Studio.
2. Decode offline where supported.
3. Fetch account/transaction metadata through read-only RPC if needed.
4. Review instruction timeline, account list, known/unknown program labels, and risk inspector.

### Decode/Simulate Transaction

1. Paste base64 serialized transaction into Transaction Studio.
2. Decode.
3. Click Simulate manually.
4. Review current-state simulation result, logs, balance diffs or post-state snapshots, explanation, and risk report.
5. Confirm no signing/broadcast controls are present.

### Inspect IDL/Account Data

1. Open Builder.
2. Select Developer Toolbox.
3. Open IDL Browser and paste Anchor IDL JSON.
4. Review instruction/account/type/event/error summary.
5. Open Account Decoder and paste account data.
6. Review byte length, discriminator, decoded fields, and unsupported layout warnings.

### Monitor Program Logs

1. Open Builder Developer Toolbox.
2. Choose Program Logs.
3. Enter program ID.
4. Start websocket subscription.
5. Pause/resume/clear buffered logs.
6. Stop subscription.

### Benchmark RPC Endpoints

1. Open RPC & Nodes.
2. Add a public/local endpoint.
3. Sensitive API-key URLs are rejected for unsafe localStorage.
4. Run Benchmark.
5. Review latency, slot, block height, and failure states.

### Create Agent Handoff/Context Bundle

1. Open Agent Station Chat or Tools.
2. Ask Agent to analyze, draft, or plan.
3. Review generated Wallet/Markets/Shield/Cloak/Zerion/Context handoff.
4. Open the destination module manually.
5. Use Context Bridge to copy sanitized context manually if desired.

## 15. Locked / Coming Soon Features

Current locked/future features include:

- Wallet: hardware wallets, Squads multisig, NFT gallery, DeFi positions, stake accounts, PnL tracking, advanced portfolio history.
- Transaction Studio: visual transaction builder, batch builder, priority fee advisor, replay against current state, Jito bundle composer, raw transaction broadcast.
- Builder Toolbox: program deployment, program upgrade, close program, upgrade authority management, arbitrary RPC playground, offline signing, hardware wallet developer signing, local validator process manager, dev faucet.
- Agent: autonomous wallet execution, autonomous Cloak send, autonomous trading, autonomous DAO voting, blocked templates.
- Markets: swaps, trading, execution.
- Context/Assistant: automatic context send and automatic execution.

These features are locked because they require signing, execution, privileged RPC, wallet control, protocol integrations, or stronger approval/audit policy.

## 16. Safety Boundaries

Current app-level safety boundaries visible in code and copy:

- Transaction Studio has no signing, broadcasting, raw send, or Jito submission.
- Wallet Hub stores public metadata, labels, tags, balances, and summaries only.
- Watch-only wallets do not expose signing controls.
- Local wallet secrets are represented in frontend as metadata only.
- Builder Toolbox is local/read-only/diagnostic.
- Builder Toolbox rejects obvious sensitive RPC URLs for localStorage.
- Shield uses read-only RPC and simulation preview only.
- Markets states no swaps, trading, or execution.
- Context export is manual and redacted.
- Agent can observe, summarize, draft, and hand off.
- Agent handoffs require destination module review.
- Assistant is secondary and does not automatically receive context.
- Zerion Executor is isolated under Agent and requires explicit policy/proposal/approval flow for its own CLI-based operations.

## 17. Design/UX Issues Found

1. Newer modules and older modules do not share the same visual system yet. Wallet Hub, Transaction Studio, and Builder Toolbox are dark and compact, while Wallet legacy tabs, Markets, Shield, Agent, and Context still contain light SaaS-style surfaces.

2. Some modules still use page-level scrolling. Markets, Shield, Agent, and Context are rendered in plain wrappers, not always `gorkh-workstation-module-frame` with bounded module bodies.

3. The topbar/status bar hard-code Devnet/read-only language while individual modules can select mainnet/custom/local endpoints. This may confuse users about what network is active globally versus locally.

4. Wallet has many tabs. Hub helps, but Overview, Local Wallet, Private/Cloak, Balances, Snapshot, Send, Receive, History, Security, Browser, Markets, and Context can feel dense.

5. Builder has both old workspace inspection tabs and the new Toolbox. The Toolbox is polished, but the surrounding Builder header and older tabs use lighter styles.

6. Zerion Executor has real execution semantics for Zerion CLI tiny swaps, while most new surfaces are read-only. It needs very clear isolation in demos and docs.

7. Locked/coming soon copy is safety-clear but often verbose. The app can feel policy-heavy before users understand the primary workflow.

8. Some buttons use text labels where icons would feel more native, especially topbar `S` and `AI`.

9. There is no evidence of automated screenshot coverage in the inspected files. Visual QA appears to rely on source-level tests and manual review.

10. The current report did not run the app, so runtime layout behavior should still be verified on real desktop sizes.

## 18. Recommended Polish Before Demo

High priority:

- Bring Markets, Shield, Agent, Context, and older Wallet/Builder tabs into the same dark fixed-panel language as Wallet Hub, Transaction Studio, and Builder Toolbox.
- Remove or bound page-level scrolling in modules that still use plain wrappers.
- Clarify global network/status versus per-module endpoint selection.
- Add manual screenshot QA coverage for Dashboard, Wallet Hub, Transaction Studio, Builder Toolbox, Agent Station, Context, Markets, and Shield.
- Make Zerion Executor visually and narratively distinct as an explicit, separate, policy-gated CLI executor, not a general Wallet or Agent execution path.

Medium priority:

- Reduce Wallet tab overload by grouping older tabs into fewer sections.
- Replace topbar `S`/`AI` text buttons with consistent icons and tooltips.
- Normalize warning, locked, error, and empty-state components across modules.
- Tighten copy so safety remains clear but less repetitive.
- Add a unified token/address/transaction monospace row component.

Future polish:

- Add automated screenshot smoke tests if the repo adopts browser tooling.
- Add a unified layout test for every module frame.
- Add real design tokens for all inline colors.
- Add keyboard navigation and command palette polish.
- Add theme documentation for the GORKH desktop visual system.

## 19. Recommended Future Features

Future ideas, not current implemented claims:

- Unified recent activity timeline across Wallet Hub, Transaction Studio, Builder Toolbox, and Agent handoffs.
- Safer module-to-module handoff tray.
- Read-only NFT and stake account views after wallet metadata foundations mature.
- Current-state replay mode with clear labeling in Transaction Studio.
- Visual transaction builder only after policy, simulation, signing, and approval gates are designed.
- Keychain-backed private RPC endpoint storage for Builder/RPC manager.
- More robust account decoder type coverage.
- Optional screenshot QA harness for fixed-shell desktop visual regression.

## 20. Screenshots / Manual Screenshot Checklist

Screenshots were not captured during this audit. I did not find an existing lightweight screenshot/browser workflow in the inspected source, and no new screenshot framework was installed.

Manual screenshot checklist:

- Workstation dashboard at desktop width.
- Sidebar/topbar/inspector/status bar with no active module.
- Wallet Hub with no wallets.
- Wallet Hub with one active watch-only wallet.
- Wallet Hub with 10+ wallet profiles.
- Wallet Hub portfolio loading/error/price unavailable states.
- Wallet Private / Cloak with no pending handoff.
- Wallet Private / Cloak with pending Agent handoff.
- Transaction Studio empty state.
- Transaction Studio decoded base64 transaction.
- Transaction Studio base58 detection-only state.
- Transaction Studio simulation loading/success/failure states.
- Transaction Studio locked roadmap.
- Builder Inspect empty state.
- Builder Developer Toolbox Overview.
- Builder IDL Browser valid/invalid IDL.
- Builder RPC & Nodes with public endpoint and rejected sensitive URL.
- Builder Network Monitor loaded/error state.
- Builder Compute Estimator result/error state.
- Agent Station Chat.
- Agent Handoffs with no handoffs and with pending handoff.
- Zerion Executor safety and proposal view.
- Markets watchlist empty and selected item.
- Shield empty and decoded/simulated input.
- Context Bridge bundle preview.
- Assistant secondary workspace.

## 21. Files Inspected

Important files/directories inspected:

- `apps/desktop/src/features/solana-workstation/SolanaWorkstation.tsx`
- `apps/desktop/src/features/solana-workstation/layout/workstationNavigation.ts`
- `apps/desktop/src/features/solana-workstation/layout/WorkstationShell.tsx`
- `apps/desktop/src/features/solana-workstation/layout/WorkstationTopBar.tsx`
- `apps/desktop/src/features/solana-workstation/layout/WorkstationStatusBar.tsx`
- `apps/desktop/src/features/solana-workstation/layout/WorkstationDashboard.tsx`
- `apps/desktop/src/features/solana-workstation/layout/WorkstationInspector.tsx`
- `apps/desktop/src/features/solana-workstation/layout/workstation-shell.css`
- `apps/desktop/src/features/solana-workstation/wallet/components/WalletWorkbench.tsx`
- `apps/desktop/src/features/solana-workstation/wallet/hub/components/WalletHubDashboard.tsx`
- `apps/desktop/src/features/solana-workstation/wallet/hub/walletHubStorage.ts`
- `apps/desktop/src/features/solana-workstation/wallet/hub/walletHubContext.ts`
- `apps/desktop/src/features/solana-workstation/wallet/cloak/components/CloakWalletPanel.tsx`
- `apps/desktop/src/features/solana-workstation/markets/MarketsWorkbench.tsx`
- `apps/desktop/src/features/solana-workstation/shield/components/ShieldWorkbench.tsx`
- `apps/desktop/src/features/solana-workstation/transaction-studio/components/TransactionStudioWorkbench.tsx`
- `apps/desktop/src/features/solana-workstation/transaction-studio/transactionStudioStorage.ts`
- `apps/desktop/src/features/solana-workstation/transaction-studio/transactionStudioCopy.ts`
- `apps/desktop/src/features/solana-workstation/builder/components/BuilderWorkbench.tsx`
- `apps/desktop/src/features/solana-workstation/builder/toolbox/components/DeveloperToolboxPanel.tsx`
- `apps/desktop/src/features/solana-workstation/builder/toolbox/*`
- `apps/desktop/src/features/solana-workstation/agent/components/AgentWorkbench.tsx`
- `apps/desktop/src/features/solana-workstation/agent/station/components/GorkhAgentStationPanel.tsx`
- `apps/desktop/src/features/solana-workstation/agent/zerion/components/ZerionAgentExecutorPanel.tsx`
- `apps/desktop/src/features/solana-workstation/agent/zerion/components/ZerionSafetyPanel.tsx`
- `apps/desktop/src/features/solana-workstation/context-bridge/components/ContextBridgePanel.tsx`
- `apps/desktop/src/features/solana-workstation/context-bridge/lastModuleContextStorage.ts`
- `packages/shared/src/solana-wallet.ts`
- `packages/shared/src/solana-transaction-studio.ts`
- `packages/shared/src/solana-builder-toolbox.ts`
- `packages/shared/src/solana-workstation-context.ts`
- `tests/desktop-wallet-hub-ui.test.mjs`
- `tests/desktop-transaction-studio-ui.test.mjs`
- `tests/desktop-builder-toolbox-ui.test.mjs`

Repository state commands inspected:

- `git status --short`
- `git diff --stat`
- `git diff --name-only`

## 22. Final Assessment

The current desktop app is coherent at the product architecture level: it now reads as a Solana workstation with wallet intelligence, transaction safety, developer diagnostics, market context, agent planning, and manual context export. The strongest modules are Transaction Studio, Wallet Hub, and Builder Developer Toolbox because they fit the fixed shell, use compact dark panels, and clearly separate safe review from locked execution.

The Premium Workstation Unification pass added a shared dark graphite workstation frame for the rougher modules: Markets, Shield, Agent, Context, older Wallet tabs, older Builder tabs, and Private. The global shell now distinguishes shell safety from module data source state: global status communicates read-only shell/no signing/execution disabled, while modules own their local RPC/backend/network labels.

The weakest remaining area is that several older module internals still use inline legacy panel markup beneath the shared frame. The CSS unification makes them visually closer to the modern modules, but a later component-level pass should replace remaining inline styles with reusable workstation components and add screenshot-based visual regression if the repo adopts lightweight tooling.

Overall, GORKH currently has a credible desktop workstation foundation. It should be demoed around Wallet Hub, Transaction Studio, Builder Toolbox, and Agent handoffs, with Markets, Shield, legacy Wallet tabs, and Context presented as functional foundations that need visual polish.
