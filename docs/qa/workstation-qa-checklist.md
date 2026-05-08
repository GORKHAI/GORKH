# GORKH Workstation QA Checklist

> Version: 0.0.49  
> Last updated: 2026-05-08 (v0.0.49+ RC visual hardening)

## How to use this checklist

Perform each step manually in the GORKH desktop app. Mark `[x]` only when verified. If a step fails, file a bug with the module name and step number.

---

## Fresh Launch / Primary Surface

- [ ] Launch the desktop app from a clean start.
- [ ] Verify the app opens directly into the GORKH Workstation shell, not the assistant/chat screen.
- [ ] Verify no macOS Screen Recording, audio recording, Accessibility, or Automation prompt appears on launch.
- [ ] Verify the Workstation shell shows left sidebar navigation, top command/search bar, main workspace, right inspector/safety panel, and bottom status bar.
- [ ] Verify the sidebar includes Wallet, Markets, Agent, Builder, Shield, Transaction Studio, and Context.
- [ ] Verify the app does not page-scroll as a website; only internal tables, logs, previews, inspector content, and chat history may scroll.
- [ ] Verify the assistant is reachable only as a secondary utility from compact chrome/sidebar controls.
- [ ] From Assistant, click any Workstation module in the sidebar and verify the Workstation shell returns.
- [ ] Verify the fresh Workstation header does not show a generic old assistant-first "Stop All" control.
- [ ] If Assistant is opened, verify desktop-control features remain secondary and approval-gated.
- [ ] Verify opening Assistant does not request Screen Recording.
- [ ] Verify Assistant copy says screen context is optional and disabled until explicitly enabled.
- [ ] Verify Desktop Vision shows explanatory copy before any Screen Recording request.
- [ ] Verify the visual style matches the GORKH dark Apple-level branding: graphite background, compact density, subtle borders/glow, no generic SaaS hero or large CTA header.
- [ ] Confirm `v0.0.48` is not moved, deleted, or reused; the next release tag must be `v0.0.49` or later after final validation.

## Desktop UI QA

- [ ] App launches Workstation-first.
- [ ] No macOS Screen Recording prompt appears on launch.
- [ ] No page-level scroll exists in the app shell.
- [ ] Sidebar, topbar, inspector, and bottom status remain visible while moving between modules.
- [ ] Assistant cannot trap the user; sidebar module navigation exits Assistant.
- [ ] Assistant does not request screen recording unless the user explicitly enables Desktop Vision.
- [ ] Each module fits the fixed desktop shell.
- [ ] Internal lists/logs may scroll inside panels only.
- [ ] Visual style matches GORKH dark Apple-level branding.
- [ ] No old assistant-first surface dominates startup.
- [ ] Premium Workstation Unification is visible across Wallet, Markets, Shield, Builder, Agent, Context, Transaction Studio, and Assistant.
- [ ] Older Markets, Shield, Agent, Context, Wallet, Builder, and Private surfaces use dark graphite panels, compact controls, thin borders, and native workstation density.
- [ ] The main workspace is fixed-shell bounded; long tables, logs, JSON, message lists, and previews scroll internally only.
- [ ] Topbar/status distinguish `Global Safety: Read-only shell` from module-local data source labels.
- [ ] No signing, broadcast, swap, lending, LP, staking, deploy, upgrade, Jito, Squads, hardware signing, Drift, or autonomous execution controls were added by the visual pass.

---

## Wallet Module

### Wallet Hub + Portfolio
- [ ] Open Wallet > Hub and verify the fixed desktop workbench fits without page-level scrolling.
- [ ] Add, label, tag, select, and remove a watch-only wallet.
- [ ] Verify watch-only wallets have no signing, send, swap, stake, bridge, or execution controls.
- [ ] Refresh Portfolio and verify SOL balances plus SPL token rows appear when read-only RPC returns them.
- [ ] Verify USD values are labeled estimates and missing prices show a graceful unavailable state.
- [ ] Verify recent portfolio snapshots and `gorkh.solana.walletHub.lastContext.v1` contain only safe metadata.
- [ ] Verify locked roadmap items are disabled: hardware wallets, Squads v4, NFT gallery, DeFi positions, stake accounts, PnL, advanced history.
- [ ] Verify no Drift integration appears.
- [ ] Capture manual screenshots for zero wallets, one wallet, 10+ wallets, watch-only selected, locked local vault selected, portfolio loading/error/price-unavailable, and locked roadmap states.

### Local Wallet Vault
- [ ] Create a local wallet and verify only wallet id, label, public address, source, network, and lock/security metadata appear in browser storage.
- [ ] Verify the generated private key never appears in UI, logs, Context export, or Assistant chat.
- [ ] Import a test Solana CLI wallet JSON array and verify the paste field clears after success or failure.
- [ ] Import a test base58 secret and verify the public address is derived locally by the desktop app.
- [ ] Forget a local wallet and verify the wallet metadata is removed and the keychain entry is deleted.
- [ ] Confirm GORKH warns that it cannot recover local wallets.

### Cloak Private
- [ ] Open Wallet > Private / Cloak.
- [ ] Verify Cloak Program ID is `zh1eLd6rSphLejbFfJEneUwzHRfMKxgzrgkfwA6qRkW`.
- [ ] Verify default relay is `https://api.cloak.ag`.
- [ ] Verify supported assets are SOL, USDC, and USDT.
- [ ] Verify invalid recipients and zero/negative/non-integer base-unit amounts are blocked.
- [ ] Verify submit is disabled until a secure signer path is implemented.
- [ ] Verify no fake success appears for deposit/send/withdraw.

### Address-Only Profiles
- [ ] Create a new wallet profile with only a label (no private key).
- [ ] Create a new wallet profile with a valid Solana public address.
- [ ] Verify the profile list shows the label and truncated address.
- [ ] Verify no seed phrase, private key, or keypair JSON is requested or displayed.

### Browser Handoff
- [ ] Open the wallet handoff UI.
- [ ] Verify the payload does NOT contain:
  - `privateKey`
  - `seedPhrase`
  - `keypair`
  - `secretKey`
- [ ] Verify the payload contains only:
  - `publicAddress`
  - `label`
  - `network`

### Ownership Proof
- [ ] Trigger ownership proof for a connected browser wallet.
- [ ] Verify the proof request uses `signMessage` only (not `signTransaction`).
- [ ] Verify the message template does NOT ask to sign a transaction.
- [ ] Verify the desktop app verifies the signature locally with Ed25519.
- [ ] Verify the verified status updates to `verified`.

### Read-Only Snapshot
- [ ] Select a wallet profile and refresh the snapshot.
- [ ] Verify SOL balance is displayed.
- [ ] Verify token account list is displayed.
- [ ] Verify no send/transfer/execute buttons exist.

### Portfolio
- [ ] Open the Portfolio tab.
- [ ] Verify SOL balance is shown.
- [ ] Verify token holdings are grouped by mint.
- [ ] Verify no price data is presented as trading advice.
- [ ] Verify a warning that portfolio data is read-only is visible.

### Markets Bridge
- [ ] Add a wallet token to Markets watchlist.
- [ ] Verify the watchlist item appears in Markets with the correct address.

### Safety Checks
- [ ] Confirm there is NO "Send" button anywhere in the Wallet module.
- [ ] Confirm there is NO "Sign Transaction" button.
- [ ] Confirm there is NO "Execute" or "Submit" button.
- [ ] Confirm `signMessage` appears ONLY in the ownership-proof flow.

---

## Markets Module

### Watchlist
- [ ] Add a token mint address to the watchlist.
- [ ] Add a wallet address to the watchlist.
- [ ] Verify items appear with label, address, kind, and status.
- [ ] Remove an item and verify it is archived (not deleted from state).

### RPC Analysis
- [ ] Select a watchlist item and click "Analyze".
- [ ] Verify account snapshot loads (lamports, owner, executable).
- [ ] Verify token mint snapshot loads (supply, decimals, authorities) if applicable.
- [ ] Verify risk signals are generated (heuristics, not safety guarantees).

### Sample Market Data
- [ ] Go to the Market Data tab and click "Generate Sample Context".
- [ ] Verify a yellow "Sample Data" badge appears on the price card.
- [ ] Verify the warning "Not real market data. Do not use for trading." is visible.

### Birdeye Manual Fetch
- [ ] Enter a Birdeye API key (use a test key).
- [ ] Select "Price + Overview" mode.
- [ ] Click "Fetch Birdeye Market Data".
- [ ] Verify price context appears with real-looking data.
- [ ] Verify the overview summary appears.
- [ ] Click "Clear" and verify all fetched data disappears.
- [ ] Verify the API key input is cleared.
- [ ] Restart the app and verify the API key is NOT persisted.

### Safety Checks
- [ ] Confirm there is NO "Swap" button.
- [ ] Confirm there is NO "Trade" or "Route" button.
- [ ] Confirm there is NO "Buy" or "Sell" button.
- [ ] Confirm there is NO automatic polling or WebSocket subscription.
- [ ] Confirm the footer reads "No swaps. No trading. No execution."

---

## Shield Module

### Offline Decode
- [ ] Paste a base64 transaction into the decode field.
- [ ] Verify the decoded instruction list appears without network calls.

### Read-Only RPC Lookup
- [ ] Enter an account address and look it up.
- [ ] Verify account info (lamports, owner, data length) appears.
- [ ] Verify no modification buttons exist.

### Simulation Preview
- [ ] Enter a transaction to simulate.
- [ ] Verify the simulation preview shows expected state changes.
- [ ] Verify a warning that this is a preview, not a guarantee, is shown.

### Safety Checks
- [ ] Confirm there is NO "Sign" button.
- [ ] Confirm there is NO "Submit" button.
- [ ] Confirm there is NO "Execute" button.

## Transaction Studio Module

### Decode / Simulate / Explain
- [ ] Open Transaction Studio from the sidebar.
- [ ] Verify the workbench uses fixed source, decode, risk inspector, and bottom review panels with internal scroll only.
- [ ] Paste a Solana transaction signature and verify it is detected as a signature.
- [ ] Click Fetch Transaction and verify only read-only RPC metadata is shown.
- [ ] Paste a base64 serialized transaction and click Decode.
- [ ] Verify instruction timeline, program badges, account list, signer count, writable count, and unknown program warnings appear.
- [ ] Click Simulate and verify the disclaimer says simulation uses current RPC state and is not a guarantee.
- [ ] Verify signature verification disabled for preview is shown when simulation uses `sigVerify: false`.
- [ ] Verify Balance Diffs honestly says no data is available when metadata lacks diffs.
- [ ] Verify Explanation is deterministic plain English, not an LLM execution.

### Handoffs / Locked Features
- [ ] Verify Agent can prepare a review-only Transaction Studio handoff.
- [ ] Verify Cloak draft handoff says summary only when no raw transaction is available.
- [ ] Verify Zerion proposal handoff says summary only when no raw transaction is available.
- [ ] Verify Coming Soon shows Visual Transaction Builder, Batch Transaction Builder, Priority Fee Advisor, and Replay Against Current State.
- [ ] Verify Locked Advanced shows Jito Bundle Composer and Raw Transaction Broadcast as disabled.
- [ ] Capture manual screenshots for empty state, signature detected, decoded transaction, base58 detection-only, simulation loading/success/failure, balance no-data/post-state snapshot, and locked roadmap states.

### Safety Checks
- [ ] Confirm there is NO "Sign" button.
- [ ] Confirm there is NO "Send" button.
- [ ] Confirm there is NO "Broadcast" button.
- [ ] Confirm there is NO Jito submit action.
- [ ] Confirm there is NO wallet execution path.

---

## Builder Module

### Developer Toolbox + RPC & Nodes
- [ ] Open Builder > Developer Toolbox and verify the fixed three-panel developer console fits without page-level scrolling.
- [ ] Paste a valid Anchor IDL and verify IDL Browser renders instructions, accounts, types, events, and errors locally.
- [ ] Paste invalid IDL and verify the invalid state is honest.
- [ ] Paste account data in base64, hex, and base58 and verify Account Decoder shows decoded or unsupported states without fake output.
- [ ] Start, pause, resume, clear, and stop Program Logs using a read-only websocket subscription.
- [ ] Add a public/local RPC endpoint, verify URL redaction, and confirm URLs with `api-key=` or `token=` are not stored in localStorage.
- [ ] Run endpoint benchmark and Network Monitor; verify only read-only RPC methods are used.
- [ ] Run Compute Estimator by explicit click only and confirm no signing or broadcasting controls appear.
- [ ] Confirm locked actions remain disabled: deploy, upgrade, close program, authority changes, arbitrary RPC, offline signing, hardware developer signing, local validator manager, and dev faucet.
- [ ] Confirm `gorkh.solana.builderToolbox.lastContext.v1` contains redacted summaries only.

### Workspace Inspector
- [ ] Select an Anchor/Solana workspace directory.
- [ ] Verify the file tree loads.
- [ ] Verify `Cargo.toml`, `Anchor.toml`, and `package.json` are detected.

### IDL Parser
- [ ] Open an `.idl.json` file.
- [ ] Verify instructions and accounts are listed.
- [ ] Verify type definitions are readable.

### Log Analyzer
- [ ] Paste Anchor build or test logs.
- [ ] Verify errors and warnings are extracted.

### Safe File Preview
- [ ] Preview a Rust or TypeScript file.
- [ ] Verify source code is displayed without execution.
- [ ] Verify large files are truncated gracefully.

### Diagnostic Commands
- [ ] Run an allowed diagnostic command (e.g., `anchor --version`).
- [ ] Verify the output is displayed.
- [ ] Attempt to run `anchor build` and verify it is blocked or marked as draft-only.

### Safety Checks
- [ ] Confirm `anchor build` cannot be executed by GORKH.
- [ ] Confirm `anchor test` cannot be executed by GORKH.
- [ ] Confirm `anchor deploy` cannot be executed by GORKH.
- [ ] Confirm no terminal command runs without user approval.

---

## Agent Module

### GORKH Agent Station (v0.4)
- [ ] Open Agent. Confirm the first tab is **GORKH Agent**.
- [ ] Confirm the header reads `GORKH Agent Station — v0.4` and the status pill shows `Idle` initially.
- [ ] Confirm the first/default Agent Station tab is **Chat**.
- [ ] Confirm the Chat safety banner says GORKH Agent can draft and hand off actions, but cannot sign or execute transactions from chat.
- [ ] Confirm Chat shows deterministic planning, LLM disabled, and redacted context status.
- [ ] Send `What can you do safely?` and verify the reply explains safe read/draft/handoff capabilities and blocked signing/execution.
- [ ] Send `Check my wallet.` and verify a **Wallet Summary** tool card appears with no RPC refresh from chat.
- [ ] Send `Prepare a Cloak private send for 0.02 SOL.` and verify a **Cloak Draft Handoff** tool card appears.
- [ ] Click **Open Wallet -> Cloak Private** and verify safe fields prefill only; no Cloak proof, signer bridge, approval, or transaction starts automatically.
- [ ] Reload the app and verify the old Cloak chat card still resolves from local handoff history as prefill only.
- [ ] Return Agent; send `Prepare Zerion DCA SOL to USDC.` and verify a **Zerion Proposal Handoff** tool card appears.
- [ ] Click **Open Agent -> Zerion Executor** and verify proposal prefill only; no Zerion CLI swap executes automatically.
- [ ] Reload the app and verify the old Zerion chat card still resolves from local handoff history as proposal prefill only.
- [ ] Send `Create context bundle.` and verify the reply says private keys, seed phrases, Cloak notes, viewing keys, API keys, Zerion tokens, and raw signing payloads are excluded.
- [ ] Verify `localStorage` key `gorkh.solana.agentStation.chat.v1` contains no `privateKey`, `seedPhrase`, `walletJson`, `cloakNoteSecret`, `viewingKey`, `apiKey`, `zerionToken`, `agentToken`, `signaturePayload`, `rawNote`, or `rawUtxo`.
- [ ] Confirm the background-runtime copy mentions: runs while desktop app is open, does not run after the app is fully quit.
- [ ] Click **Start Agent** → status flips to `Running` and `agent_started` audit event appears.
- [ ] Click **Pause** → ticks halt, status `Paused`.
- [ ] Click **Resume** → status `Running`.
- [ ] Click **Kill Switch** → status `Kill Switch Engaged`, Start/Resume disabled, pending approvals flip to `blocked`, `agent_killed` event appears.
- [ ] In `Manual` mode confirm `lastTickAt` does not advance.
- [ ] Switch to `Background (app open)` and confirm `lastTickAt` advances roughly every minute while the app is open.
- [ ] Submit `check my wallet` via the natural language input → portfolio_analysis task auto-completes (no approval required) and shows a **Wallet Summary** card.
- [ ] If no wallet snapshot exists, verify the card says to open **Wallet -> Snapshot** and refresh manually.
- [ ] Submit `review this token` → a **Markets Summary** card appears from local watchlist/analysis only. Verify no Birdeye/API fetch starts.
- [ ] Submit `explain this transaction <signature>` → a **Shield Review Handoff** appears. Click **Open Shield** and verify the input is prefilled; no simulation starts automatically.
- [ ] Submit `prepare a Cloak private send` → a **Cloak Draft Handoff** appears. Click **Open Wallet -> Cloak Private** and verify safe fields prefill; no Cloak proof, signer bridge, or transaction starts automatically.
- [ ] Submit `prepare a tiny Zerion DCA` → a **Zerion Proposal Handoff** appears. Click **Open Agent -> Zerion Executor** and verify safe fields prefill; no Zerion CLI swap executes automatically.
- [ ] Submit `summarize my current workstation context` → a **Context Bundle** card appears with redactions listed.
- [ ] Manually analyze an input in Shield, return to Agent, then submit `summarize my current workstation context` → verify the bundle includes **Last Shield Context** and does not rerun RPC/simulation.
- [ ] Manually inspect a workspace in Builder, return to Agent, then submit `review my builder workspace` → verify the bundle includes **Last Builder Context** and does not run tool checks, diagnostics, builds, tests, or deploys.
- [ ] Submit `cloak send privately` → cloak_draft proposal queued with `executionBlocked=true` and a pending approval card.
- [ ] Submit `DCA tiny SOL via Zerion` → zerion_proposal queued with `executionBlocked=true`.
- [ ] Confirm submitting an empty intent surfaces an error.
- [ ] Confirm submitting any intent with kill switch engaged surfaces an error.
- [ ] Verify Approvals tab shows pending entries; Reject transitions them to `rejected`.
- [ ] Verify Templates tab lists Active = GORKH Agent only; Coming Soon = Copy Trader, Momentum Bot, Yield Optimizer, DAO Auto-Voting Agent, LP Manager, Health Factor Auto-Repay Agent, Autonomous Cloak Private Send; Blocked = Main-Wallet Autonomous Execution.
- [ ] Verify the Blocked card copy includes “No god-mode wallet access”.
- [ ] Verify Audit timeline grows on every transition.
- [ ] Verify `localStorage` key `gorkh.solana.agentStation.v1` exists and contains no `privateKey`, `seedPhrase`, `mnemonic`, `cloakNoteSecret`, `viewingKey`, `apiKey`, or `agentToken` keys.

### Local Agent Creation
- [ ] Create a new local agent with a name and policy.
- [ ] Verify the policy defaults to:
  - `manual_every_action`
  - `devnet` only
  - `requireHumanApproval: true`
  - `allowMainnet: false`

### Draft Creation
- [ ] Create a draft action.
- [ ] Verify the draft status is `draft` or `blocked`.
- [ ] Verify a blocked reason is added for unapproved protocols or mainnet.

### Context Export
- [ ] Export the agent context.
- [ ] Verify the markdown includes safety notes.
- [ ] Verify no private keys or seeds are included.

### Safety Checks
- [ ] Confirm there is NO "Execute Draft" button.
- [ ] Confirm there is NO "Auto-run" toggle.
- [ ] Confirm attestation previews are marked `preview_only` / `not_written`.

### Zerion Executor
- [ ] Open Agent -> Zerion Executor.
- [ ] Confirm the panel is inside Agent, not a top-level Workstation module.
- [ ] Confirm the UI warns: "Use a fresh Zerion agent wallet with tiny funds. Do not use your main GORKH wallet."
- [ ] Confirm API keys are hidden and stored only through OS keychain when entered.
- [ ] Confirm wallet setup points to manual Zerion CLI wallet creation/import.
- [ ] Confirm the policy is Solana only, SOL -> USDC only, max `0.001` SOL by default, bridge disabled, send disabled, and max executions `1`.
- [ ] Confirm the command preview is shown before execution.
- [ ] Confirm execution requires the explicit real-onchain-transaction checkbox.
- [ ] Confirm Assistant, Markets, Context, Wallet, and Cloak cannot invoke `zerion_cli_swap_execute`.
- [ ] Confirm no Zerion API key, agent token, private key, seed phrase, wallet backup, or Cloak note appears in localStorage or exported context.
- [ ] Do not execute a real Zerion swap unless the run owner explicitly approves the tiny-funded mainnet smoke.

---

## Context Module

### Bundle Export
- [ ] Open the Context module.
- [ ] Export a context bundle.
- [ ] Verify the bundle includes:
  - Agent context (if present)
  - Builder context (if present)
  - Shield context (if present)
- [ ] Verify the bundle includes safety notes and redaction markers.

### Safety Checks
- [ ] Confirm there is NO "Send to LLM" auto-submit button.
- [ ] Confirm the user must manually copy/paste or save the context.

---

## DeFi Command Center

- [ ] Open Wallet -> DeFi.
- [ ] Confirm DeFi Command Center is inside Wallet, not a top-level Workstation module.
- [ ] Confirm wallet scope supports all wallets, active wallet, watch-only wallets, and local vault wallets.
- [ ] Confirm DeFi value is displayed separately to avoid double-counting wallet token balances.
- [ ] Confirm DeFi data loads from the GORKH read-only backend where configured, or falls back to honest backend unavailable/adapter unavailable states.
- [ ] Confirm `GET /api/defi/health` redacts env-derived URLs and does not expose API keys or full private RPC URLs.
- [ ] Confirm `GET /api/defi/jupiter/quote` returns a quote summary only and no executable transaction payload fields.
- [ ] Confirm Raydium, Orca, Meteora, Kamino, MarginFi, JitoSOL, mSOL, bSOL, and bbSOL adapters show honest unavailable states when no safe public adapter is connected.
- [ ] Confirm no positions, APY, TVL, lending health, or impermanent loss values are faked.
- [ ] Confirm Jupiter quote is quote-only and does not create, store, sign, or broadcast an executable transaction.
- [ ] Confirm Execute Swap, limit orders, lending actions, LP actions, Stake / Unstake LST, and Auto Yield Optimize are locked.
- [ ] Confirm no Drift integration appears.
- [ ] Confirm `gorkh.solana.defiCommandCenter.lastContext.v1` contains only summaries and redaction metadata.
- [ ] Confirm no executable swap transaction, private key, seed phrase, wallet JSON, API key, auth header, Cloak note, viewing key, Zerion credential, or token is stored or exported.

---

## Cloak Deposit QA

- [ ] Open Wallet -> Cloak Private.
- [ ] Confirm Cloak deposit is inside Wallet, not a top-level app surface.
- [ ] Confirm the UI says Cloak currently uses mainnet defaults and tiny test amounts should be used first.
- [ ] Confirm SOL deposit amount is entered as lamports.
- [ ] Confirm minimum deposit guard rejects values below `10_000_000` lamports.
- [ ] Confirm the fee preview uses integer math: fixed `5_000_000` plus `floor(amount * 3 / 1000)`.
- [ ] Confirm a selected unlocked local wallet is required.
- [ ] Confirm `Prepare Deposit` returns public draft metadata only.
- [ ] Confirm `Approve & Deposit` requires the approval checkbox.
- [ ] Confirm progress shows viewing-key registration signing when required, proof generation, transaction signing, submission, and confirmation/failure.
- [ ] Confirm the Tauri signer bridge is used and no raw keypair bytes are exposed to the webview.
- [ ] Confirm Agent, Assistant, and Markets cannot execute Cloak deposit.
- [ ] Confirm raw notes, viewing keys, private keys, keypair bytes, wallet JSON, and seed phrases are not shown in UI, logs, Context, Assistant, backend calls, or `localStorage`.
- [ ] Confirm Private Send remains deferred until secure note spending is implemented.
- [ ] Confirm secure note metadata is visible after success and raw serialized UTXO/note material is not shown.

---

## Global Safety Regression Checks

- [ ] No `sendTransaction` call exists outside explicitly approved future Wallet/Cloak execution code.
- [ ] No `sendRawTransaction` call exists outside explicitly approved future Wallet/Cloak execution code.
- [ ] No `requestAirdrop` call exists in active workstation code.
- [ ] No `signTransaction` call exists outside explicitly approved future Wallet/Cloak execution code.
- [ ] No `signAllTransactions` call exists outside explicitly approved future Wallet/Cloak execution code.
- [ ] `signMessage` appears only in wallet ownership proof, web wallet-connect contexts, and the scoped Cloak viewing-key registration signer bridge.
- [ ] Zerion CLI execution uses explicit Tauri commands and never a shell string or arbitrary terminal command.
- [ ] Zerion API keys and agent token secrets are not persisted to `localStorage`.
- [ ] No Birdeye API key is persisted to `localStorage`.
- [ ] No Drift protocol appears in allowed integrations (only in denied constants/tests).
- [ ] No HumanRail references exist in workstation code.
- [ ] No White Protocol references exist in workstation code.
- [ ] All package names in workspace are `@gorkh/*`.
