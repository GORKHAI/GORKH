# GORKH Workstation QA Checklist

> Version: 0.0.48  
> Last updated: 2026-05-06 (Phase 21 pre-stable cleanup)

## How to use this checklist

Perform each step manually in the GORKH desktop app. Mark `[x]` only when verified. If a step fails, file a bug with the module name and step number.

---

## Fresh Launch / Primary Surface

- [ ] Launch the desktop app from a clean start.
- [ ] Verify the app opens directly into the GORKH Workstation shell, not the assistant/chat screen.
- [ ] Verify the Workstation shell shows left sidebar navigation, top command/search bar, main workspace, right inspector/safety panel, and bottom status bar.
- [ ] Verify the sidebar includes Wallet, Markets, Agent, Builder, Shield, and Context.
- [ ] Verify the assistant is reachable only through a secondary control labeled "Open Assistant".
- [ ] From Assistant, click "Back to Workstation" and verify the Workstation shell returns.
- [ ] Verify the fresh Workstation header does not show a generic old assistant-first "Stop All" control.
- [ ] If Assistant is opened, verify desktop-control features remain secondary and approval-gated.
- [ ] Verify no screen-recording or accessibility prompt appears before opening Assistant or Settings, unless the OS prompts for an unrelated external reason.

---

## Wallet Module

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

---

## Builder Module

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

## Global Safety Regression Checks

- [ ] No `sendTransaction` call exists in active workstation code (only in denied-method constants/tests).
- [ ] No `sendRawTransaction` call exists in active workstation code.
- [ ] No `requestAirdrop` call exists in active workstation code.
- [ ] No `signTransaction` call exists in active workstation code.
- [ ] No `signAllTransactions` call exists in active workstation code.
- [ ] `signMessage` appears only in wallet ownership proof and web wallet-connect contexts.
- [ ] No Birdeye API key is persisted to `localStorage`.
- [ ] No Drift protocol appears in allowed integrations (only in denied constants/tests).
- [ ] No HumanRail references exist in workstation code.
- [ ] No White Protocol references exist in workstation code.
- [ ] All package names in workspace are `@gorkh/*`.
