# GORKH Agent Station — v0.4 Smoke Plan

This is the manual smoke checklist for the desktop GORKH Agent Station.

## Pre-flight

- Open the desktop app on macOS. Workstation defaults to the dashboard.
- Navigate to **Agent → GORKH Agent**. The Station should open on **Chat**.

## Chat

- [ ] Confirm the first/default inner tab is **Chat**.
- [ ] Confirm the safety banner says GORKH Agent can draft and hand off actions, but cannot sign or execute transactions from chat.
- [ ] Confirm the status badge shows deterministic planning, LLM disabled, and redacted context.
- [ ] Confirm quick prompts include: Check my wallet, Summarize my portfolio, Prepare Cloak private send, Prepare Zerion DCA proposal, Explain last Shield result, Summarize Builder context, Create context bundle.
- [ ] Send `What can you do safely?` and verify the reply explains safe read/draft/handoff capabilities and blocked signing/execution.
- [ ] Send `Check my wallet.` and verify a **Wallet Summary** tool card appears. No RPC refresh starts from chat.
- [ ] Send `Prepare a Cloak private send for 0.02 SOL.` and verify a **Cloak Draft Handoff** card appears.
- [ ] Click **Open Wallet → Cloak Private** and verify Wallet opens with prefill only. No Cloak proof, signer bridge, approval, or transaction starts automatically.
- [ ] Reload the app, reopen the same chat thread, click the old Cloak handoff card, and verify it still resolves from local handoff history as prefill only.
- [ ] Return to Agent and send `Prepare Zerion DCA SOL to USDC.` Verify a **Zerion Proposal Handoff** card appears.
- [ ] Click **Open Agent → Zerion Executor** and verify proposal prefill only. No Zerion CLI execution starts automatically.
- [ ] Reload the app, reopen the same chat thread, click the old Zerion handoff card, and verify it still resolves from local handoff history as proposal prefill only.
- [ ] Send `Create context bundle.` and verify the reply says secrets are excluded and the context card is local/redacted.
- [ ] Engage the kill switch and confirm the composer blocks normal action requests while still allowing status/help/safety questions.

## Runtime

- [ ] Status pill reads **Idle** initially.
- [ ] **Start Agent** transitions status to **Running** and adds an
      `agent_started` audit event.
- [ ] **Pause** flips status to **Paused**; no ticks fire.
- [ ] **Resume** returns to **Running**.
- [ ] **Kill Switch**:
  - [ ] flips status to **Kill Switch Engaged**;
  - [ ] disables Start/Resume buttons;
  - [ ] flips any pending approvals to `blocked`;
  - [ ] adds an `agent_killed` audit event.
- [ ] Switching to **Background (app open)** mode flips
      `runtime.backgroundAllowed = true`. After Start, ticks update
      `lastTickAt` ~once per `tickIntervalSeconds`.
- [ ] Closing the app stops ticks (verified by reopening: `lastTickAt`
      does not advance while the app is closed).

## Tools / advanced manual run

- [ ] **Ask GORKH Agent…** input rejects empty intent with an error message.
- [ ] Submitting `check my wallet` creates a `portfolio_analysis` task
      that auto-completes (no approval required) and shows a **Wallet Summary** card.
- [ ] If no snapshot exists, the Wallet Summary says to open **Wallet -> Snapshot** and refresh manually.
- [ ] Submitting `analyze my portfolio` shows SOL/token counts from the latest stored read-only snapshot when available.
- [ ] Submitting `review this token` shows a **Markets Summary** card from the local watchlist and stored analyses. It must not auto-fetch Birdeye.
- [ ] Submitting `explain this transaction <signature>` shows a **Shield Review Handoff** and **Open Shield**. Shield must not auto-simulate.
- [ ] Submitting `prepare a Cloak private send` creates a
      `cloak_private_payment_draft` task with status
      `waiting_for_approval`, a `cloak_draft` proposal, and a pending
      approval card. The proposal carries `executionBlocked=true`.
- [ ] Click **Open Wallet -> Cloak Private**. Wallet opens on Private / Cloak with safe fields prefilled where available. No proof, signer bridge, or transaction starts automatically.
- [ ] Submitting `prepare a tiny Zerion DCA` creates a `zerion_dca_proposal`
      task; `requiresApproval=true`, `executionBlocked=true`, and a Zerion handoff card appears.
- [ ] Click **Open Agent -> Zerion Executor**. Zerion Executor opens with safe amount/wallet/policy fields prefilled where available. No CLI swap executes automatically.
- [ ] Submitting `summarize my current workstation context` creates a **Context Bundle** result with redactions listed.
- [ ] After manually analyzing in Shield, return to Agent and submit `summarize my current workstation context`. Verify the bundle includes **Last Shield Context** without rerunning RPC or simulation.
- [ ] After manually inspecting a Builder workspace, return to Agent and submit `review my builder workspace`. Verify the bundle includes **Last Builder Context** without running tool checks, diagnostics, builds, tests, or deploys.
- [ ] Submitting an action intent while the kill switch is on is blocked and creates no executable task.

## Approval queue

- [ ] Pending approvals appear in the Approvals tab.
- [ ] **Reject** transitions an approval to `rejected` and emits an
      `approval_rejected` audit event.
- [ ] Local **Approve** is a UI helper only; it does NOT execute the
      Cloak send or the Zerion swap. Execution must happen in the
      respective module.

## Cloak preservation

- [ ] Cloak Private deposit and send still live under **Wallet → Cloak**.
- [ ] Station-created Cloak draft does not surface a `wallet_cloak_*` Tauri
      command.

## Zerion preservation

- [ ] Zerion Executor is still reachable via the **Zerion Executor** tab.
- [ ] Existing Zerion approval flow still functions (proposal + manual
      approval text).
- [ ] Station-created Zerion proposal does NOT auto-call
      `zerion_cli_swap_execute`.

## Templates

- [ ] **Active** section shows exactly **GORKH Agent**.
- [ ] **Coming Soon** section shows: Copy Trader, Momentum Bot, Yield
      Optimizer, DAO Auto-Voting Agent, LP Manager, Health Factor
      Auto-Repay Agent, Autonomous Cloak Private Send.
- [ ] **Blocked** section shows: Main-Wallet Autonomous Execution with
      copy “Disabled. Main wallet actions require explicit policy and
      approval. No god-mode wallet access.”

## Audit / memory

- [ ] Audit timeline grows on each transition (start/pause/resume/kill,
      task creation, tool call, proposal creation, approval required,
      approval rejected, policy block).
- [ ] Memory rejects content with `private key`, `seed phrase`,
      `mnemonic`, `viewing key`, or API key-like strings.
- [ ] `localStorage` key `gorkh.solana.agentStation.v1` exists and does
      NOT contain `"privateKey":`, `"mnemonic":`, `"cloakNoteSecret":`,
      `"viewingKey":`, `"apiKey":`, or `"agentToken":` keys.

## Security / isolation

- [ ] No new Tauri commands appear in
      `apps/desktop/src-tauri/permissions/desktop-ipc.toml`.
- [ ] Handoff storage does not contain `privateKey`, `seedPhrase`,
      `walletJson`, `cloakNoteSecret`, `viewingKey`, `apiKey`, or `agentToken`.
- [ ] Last module context storage key `gorkh.solana.contextBridge.lastModuleContext.v1`
      contains only redacted Shield/Builder summaries and no full private paths or secret keys.
- [ ] `pnpm check:desktop:security` passes.
- [ ] `pnpm check:release:readiness` passes.
- [ ] No Telegram, WhatsApp, or Discord copy anywhere in the panel.

## Required v0.4 happy path

1. Open **Agent → GORKH Agent**.
2. Confirm **Chat** opens first.
3. Send `What can you do safely?`.
4. Send `Check my wallet.`
5. Send `Prepare a Cloak private send for 0.02 SOL.`
6. Click **Open Wallet → Cloak Private**; verify prefill only.
7. Return Agent; send `Prepare Zerion DCA SOL to USDC.`
8. Click **Open Agent → Zerion Executor**; verify proposal only.
9. Send `Create context bundle.`
10. Confirm no signing or execution happens from chat.
