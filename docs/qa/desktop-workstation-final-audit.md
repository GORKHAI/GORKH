# GORKH Desktop Workstation Final Audit

## Executive Summary

Verdict: **READY_WITH_MINOR_CLEANUP**

The audited source is Workstation-first. `apps/desktop/src/App.tsx` defaults the authenticated desktop view to `workstation`, renders `SolanaWorkstation` by default, and exposes the old assistant through a secondary `Open Assistant` / `Back to Workstation` control. A newly built desktop artifact from this source should present GORKH as a Solana Workstation first, not as the old assistant-first product.

No BLOCKER issues were found in source. Validation passed across desktop, shared, workspace, release readiness, and Rust checks. Stable tagging should still wait for cleanup and manual validation of a newly signed macOS artifact, because existing installed releases are not changed by source edits.

Post-cleanup update, 2026-05-06: the stale assistant-first copy, generic primary-shell `Stop All` visibility, and release-doc version metadata called out below were addressed in the pre-stable cleanup pass. See `docs/qa/pre-stable-cleanup-report.md`. Manual signed macOS artifact validation remains required before stable tagging.

## Audit Scope

Inspected:

- `apps/desktop/src/App.tsx`
- `apps/desktop/src/features/solana-workstation/SolanaWorkstation.tsx`
- `apps/desktop/src/features/solana-workstation/layout/*`
- `apps/desktop/src/features/solana-workstation/wallet/*`
- `apps/desktop/src/features/solana-workstation/markets/*`
- `apps/desktop/src/features/solana-workstation/shield/*`
- `apps/desktop/src/features/solana-workstation/builder/*`
- `apps/desktop/src/features/solana-workstation/agent/*`
- `apps/desktop/src/features/solana-workstation/context-bridge/*`
- Shared Solana modules under `packages/shared/src/solana-*.ts`
- Desktop and workspace tests under `tests/`
- `package.json`, package identities, and release scripts
- `docs/release/apple-macos-readiness.md`
- `docs/release/apple-beta-dry-run.md`
- `docs/qa/workstation-qa-checklist.md`
- `docs/qa/known-issues.md`
- `scripts/check-release-readiness.mjs`
- `.github/workflows/*`

Initial worktree status before writing this report already contained unrelated pending changes in `apps/desktop/src/App.tsx`, `docs/qa/workstation-qa-checklist.md`, and `tests/desktop-workstation-primary-view.test.mjs`. This audit did not modify those files.

## Startup / Default View Audit

- Does app start Workstation-first? **Yes.**
- Is Assistant secondary? **Yes.**
- Can stale persisted state override the default? **No persisted primary-view state was found.**
- Is the old "Solana Workstation" hidden button removed/replaced? **Yes.** The control is now `Open Assistant` from Workstation and `Back to Workstation` from Assistant.
- What exact code controls this?
  - `apps/desktop/src/App.tsx:216` defines `type DesktopPrimaryView = 'workstation' | 'assistant';`.
  - `apps/desktop/src/App.tsx:327` initializes `const [primaryView, setPrimaryView] = useState<DesktopPrimaryView>('workstation');`.
  - `apps/desktop/src/App.tsx:2944` brands the shell subtitle as `Workstation-first Solana desktop`.
  - `apps/desktop/src/App.tsx:2980-2995` toggles between views and labels the button `Open Assistant` or `Back to Workstation`.
  - `apps/desktop/src/App.tsx:3000-3003` renders `<SolanaWorkstation />` when `primaryView === 'workstation'`.
  - `apps/desktop/src/App.tsx:3006` gates the old assistant UI behind `primaryView === 'assistant'`.

Persisted settings found in `App.tsx` are for device identity, legacy device token migration, and LLM settings. They do not store or restore `primaryView`.

## User-Facing Product Identity Audit

The primary desktop source presents as GORKH Workstation:

- `WorkstationSidebar` displays GORKH Workstation branding.
- `WorkstationTopBar` shows a command/search bar and `Devnet` / `Read-Only` badges.
- `WorkstationStatusBar` shows module, network, execution disabled, read-only RPC, and no-signing status.
- Core modules are Wallet, Markets, Agent, Builder, Shield, and Context.

Acceptable legacy/internal references:

- Root package name remains `ai-operator`.
- Tauri bundle identifier remains `com.ai-operator.desktop`.
- Cargo crate remains `ai-operator-desktop`.
- Some Docker/build remnants and historical docs still contain old names.
- These are consistent with documented updater/bundle continuity and historical migration context.

Problematic or cleanup-worthy user-facing references:

- Historical audit finding before cleanup: the secondary Assistant view contained old assistant-first copy such as "The home screen now stays focused on the assistant" in `apps/desktop/src/App.tsx`.
- Settings and secondary Assistant panels still describe screen preview, remote control, clicks, typing, and app control. These are no longer primary, but they are still visible after opening Assistant or Settings.
- Historical audit finding before cleanup: `docs/release/apple-macos-readiness.md` and `docs/release/apple-beta-dry-run.md` showed an older version while package/version checks showed desktop/API `0.0.48`.
- The release workflow still names DMG artifacts with the legacy `ai-operator-desktop_{VERSION}_...` prefix for updater and asset-resolution continuity.

## Workstation Module Audit

### Wallet

- Present features: address-only profiles, Connect tab, browser wallet handoff, optional ownership proof, Portfolio, Snapshot, Receive, Send, Routes, Markets Access, Context, and Safety tabs.
- Safety boundaries: Wallet banner states no private transfer, signing, swap, or trading execution. Profile creation stores label/public address only. Browser handoff rejects private fields. Ownership proof is sign-message based and locally verified.
- Issues found: "Send" and "Receive" tabs create planner/draft artifacts; this is acceptable but should be manually checked so users do not mistake drafts for executable sends.
- Stable readiness verdict: **Ready with manual QA.**

### Markets

- Present features: local watchlist, network/custom RPC selection, manual token/wallet/account analysis, Market Data, Providers, Context, Safety, sample/offline market context, and Birdeye manual fetch.
- Safety boundaries: footer states read-only watchlists, Birdeye manual fetch, no swaps, no trading, no execution. Birdeye API key is held in React state in `BirdeyeFetchPanel` and cleared locally; no persistence of the raw key was found.
- Issues found: none blocking.
- Stable readiness verdict: **Ready with manual QA.**

### Shield

- Present features: offline input classification, address/signature/base64 transaction handling, offline decode, risk findings, read-only account lookup, read-only transaction lookup, simulation preview, and lookup table resolution.
- Safety boundaries: banner states RPC read-only mode and no signing/execution. RPC calls use read-only helpers and the release readiness script found no forbidden blockchain method calls outside guards/tests.
- Issues found: none blocking.
- Stable readiness verdict: **Ready with manual QA.**

### Builder

- Present features: local workspace selection, workspace inspector, Anchor.toml parsing, IDL viewer, file tree, safe file preview, log analyzer, diagnostics, command drafts, and sanitized context export.
- Safety boundaries: banner states no builds, tests, deployments, or file modifications in v0.2. File preview uses an allowlist and redaction. Diagnostic execution is exact-allowlist only and redacts output.
- Issues found: diagnostic command runner can execute exact allowlisted version/config commands through existing workspace tooling; this is intentionally scoped but should remain part of manual QA.
- Stable readiness verdict: **Ready with manual QA.**

### Agent

- Present features: local agent profiles, policy editor, protocol permissions, action drafts, attestation preview, audit timeline, export, and safety tab.
- Safety boundaries: Agent safety panel says local preview only. Drafts can be sent to Shield for inspection or attached to Builder context, but not executed. Drift is rejected by validation and excluded from protocol lists.
- Issues found: copy says "before any future on-chain execution"; acceptable as roadmap wording, but avoid expanding it before explicit safety architecture exists.
- Stable readiness verdict: **Ready with minor copy discipline.**

### Context

- Present features: consolidated context bundle from Agent, Builder, Shield, and optional private context; context preview; manual Assistant export guidance.
- Safety boundaries: shared context types state no execution/no signing. Safety notes say context exports are local and copyable only, secret/wallet/env/private key material is excluded, and Assistant integration is manual. Sanitizer redacts private key arrays, secret keywords, credentialed RPC URLs, wallet paths, env refs, and long base64 blobs.
- Issues found: Context currently receives empty props from the top-level Workstation and opportunistically loads agent state from localStorage if present. This is not a blocker, but future integration should make cross-module state flow explicit.
- Stable readiness verdict: **Ready with integration cleanup later.**

## Old Assistant / Screen-Control Surface Audit

Old assistant, screen preview, remote control, approvals, run panel, provider settings, overlay mode, and tool approval code still exist in `apps/desktop/src/App.tsx` and related desktop components. They are imported and retained to keep the secondary Assistant surface functional.

Access model:

- Primary startup path renders Workstation.
- User accesses Assistant only by clicking `Open Assistant`.
- Assistant view can return via `Back to Workstation`.
- Screen preview/control prompts are not presented as the default Workstation surface.

Residual conflict:

- Historical audit finding before cleanup: the global header showed a generic `Stop All` control while Workstation was primary.
- Historical audit finding before cleanup: Assistant copy said the home screen was assistant-focused, which was stale after the Workstation-first change.
- Settings can still expose screen preview and remote control controls. This is secondary/legacy, not first-launch primary behavior.

Recommended cleanup:

- Rename stale assistant-first copy inside the Assistant view.
- Keep old desktop-control settings inside Assistant/Settings utilities for stable polish.
- Confirm on a real signed macOS artifact that no screen-recording/accessibility prompt appears before opening Assistant or Settings.

## Blockchain Safety Audit

| Capability / Protocol | Classification | Evidence |
|---|---|---|
| private key import | SAFE_CONTEXT_ONLY | Wallet/Builder/Context safety copy and redaction mention private keys; no active import UI found. |
| seed phrase | SAFE_CONTEXT_ONLY | Wallet safety and guards reject/redact seed phrase-like content; no seed entry UI found. |
| wallet JSON | SAFE_CONTEXT_ONLY | Wallet copy says no wallet JSON; Builder safe preview denies keypair JSON. |
| keypair generation | SAFE_CONTEXT_ONLY | Keypair references are in denial/redaction/test contexts; no key generation path found. |
| signTransaction | ONLY_DENIED_CONSTANTS_OR_TESTS | Release readiness passed; QA/tests assert absence/denial. |
| signAllTransactions | ONLY_DENIED_CONSTANTS_OR_TESTS | Release readiness passed; QA/tests assert absence/denial. |
| signMessage | SAFE_CONTEXT_ONLY | Release readiness says signMessage is only used in ownership-proof contexts. |
| sendTransaction | ONLY_DENIED_CONSTANTS_OR_TESTS | `rpcGuards.test.mjs` rejects it; release readiness found no active calls. |
| sendRawTransaction | ONLY_DENIED_CONSTANTS_OR_TESTS | `rpcGuards.test.mjs` rejects it; release readiness found no active calls. |
| requestAirdrop | ONLY_DENIED_CONSTANTS_OR_TESTS | `rpcGuards.test.mjs` rejects it; release readiness found no active calls. |
| swap/trade/order execution | SAFE_CONTEXT_ONLY | UI repeatedly states no swaps/trading/execution; no execution controls found. |
| Birdeye API key persistence | NOT_FOUND | Birdeye key is React state only in `BirdeyeFetchPanel`; market provider metadata says keys are not stored. |
| Drift | ONLY_DENIED_CONSTANTS_OR_TESTS | Explicitly excluded/rejected in guards, tests, and Agent copy; not an allowed integration. |
| HumanRail | ONLY_DENIED_CONSTANTS_OR_TESTS | Present only as exclusion/denial or historical cleanup context; release readiness passed no integration references. |
| White Protocol | ONLY_DENIED_CONSTANTS_OR_TESTS | Present only as exclusion/denial or historical cleanup context; release readiness passed no integration references. |

## Release Readiness Audit

- Package identity status: **Pass.** Active packages are `@gorkh/api`, `@gorkh/desktop`, `@gorkh/web`, `@gorkh/ios`, and `@gorkh/shared`. Root package remains legacy `ai-operator`.
- Test status: **Pass.** `pnpm -w test` passed 108/108.
- Build status: **Pass.** `pnpm --filter @gorkh/desktop build` and `pnpm -w build` passed. Vite emitted a non-fatal large chunk warning for the desktop bundle.
- Desktop security check status: **Pass.** `pnpm check:desktop:security` passed.
- Release readiness script status: **Pass.** `pnpm check:release:readiness` passed 17/17.
- Rust fmt/clippy status: **Pass.** `cargo fmt --check` passed with no output. `cargo clippy --all-targets --all-features -- -D warnings` passed; Cargo emitted a future-incompatibility warning for dependency `screenshots v0.8.10`.
- Apple/macOS readiness status: **Mostly ready in source/docs, but manual artifact validation remains required.** Readiness docs define macOS as the primary platform and stable skips Windows. Post-cleanup docs use current release metadata.
- Stable tag readiness: **Do not tag immediately from source validation alone.** Source gates pass, but stable should wait for cleanup plus signed macOS artifact validation.

## Problems Found

| Severity | Area | Problem | Evidence | Recommended Fix |
|---|---|---|---|---|
| MEDIUM | Release | New signed macOS artifact has not been validated in this audit. | Source/build checks passed locally, but no release workflow was run and no DMG/app notarization was validated. | Run beta/stable-gated macOS artifact validation on real Mac before stable tag. |
| MEDIUM | Product copy | Historical audit finding before cleanup: secondary Assistant view contained stale assistant-first copy. | `apps/desktop/src/App.tsx` contained "The home screen now stays focused on the assistant." | Resolved in pre-stable cleanup; keep Assistant copy secondary to Workstation. |
| LOW | Primary shell polish | Historical audit finding before cleanup: generic `Stop All` was visible in the Workstation header. | `apps/desktop/src/App.tsx` rendered the control in the primary header. | Resolved in pre-stable cleanup; use Assistant-specific stop copy only when relevant. |
| LOW | Release docs | Historical audit finding before cleanup: release docs were stale for version metadata and did not explain legacy artifact naming. | Release docs showed older version metadata and legacy artifact examples without continuity context. | Resolved in pre-stable cleanup; keep workflow artifact continuity documented. |
| LOW | Rust dependency | Cargo warns dependency `screenshots v0.8.10` contains code rejected by a future Rust version. | `cargo clippy` completed successfully but emitted future-incompatibility warning. | Track dependency upgrade after stable if not blocking current compiler. |
| INFO | Legacy identifiers | Root package, Tauri bundle ID, and Cargo crate retain `ai-operator` legacy names. | Root `package.json` name, `tauri.conf.json` identifier, `Cargo.toml` name; known issues document this. | Keep for updater continuity this cycle; plan migration separately. |

No BLOCKER issues found.

## Cleanup Recommendations Before Stable

- Keep Assistant copy secondary to Workstation.
- Keep release docs aligned with `VERSION` before tagging.
- Verify the newly built signed macOS artifact manually on real Apple Silicon and Intel paths if both artifacts are produced.
- Confirm the first launch after install opens Workstation before any Assistant/screen-control prompt.
- Complete `docs/qa/workstation-qa-checklist.md` against the packaged app.
- Verify codesign, notarization, stapling, Gatekeeper launch, app icon, sign-in loopback, and updater behavior.
- Leave HumanRail, White Protocol, and Drift excluded from production-facing integration copy.

## Stable Tag Recommendation

**Proceed only after listed cleanup.**

The source is ready enough for release-candidate artifact validation: Workstation is the default, the Assistant is secondary, package names are GORKH-scoped, safety gates passed, and no active forbidden blockchain execution methods were found. Do not push the stable tag until the stale release/docs copy is cleaned up and a newly signed macOS artifact is manually validated. Source readiness does not update existing installed releases; installed users need a new signed artifact.

## Commands Run

| Command | Result |
|---|---|
| `git status --short` | Completed. Pre-existing pending changes observed in `apps/desktop/src/App.tsx`, `docs/qa/workstation-qa-checklist.md`, and `tests/desktop-workstation-primary-view.test.mjs`. |
| `pnpm --filter @gorkh/desktop typecheck` | PASS, exit 0. |
| `pnpm --filter @gorkh/desktop build` | PASS, exit 0. Vite warning: desktop chunk `dist/assets/index-DzZebr7p.js` is larger than 500 kB after minification. |
| `pnpm --filter @gorkh/shared typecheck` | PASS, exit 0. |
| `pnpm --filter @gorkh/shared test` | PASS, exit 0. 11 tests passed. |
| `pnpm check:desktop:security` | PASS, exit 0. Desktop security check passed. |
| `pnpm check:release:readiness` | PASS, exit 0. 17 passed, 0 failed. |
| `pnpm -w typecheck` | PASS, exit 0. Turbo reported 6 successful tasks. |
| `pnpm -w test` | PASS, exit 0. 108 tests passed. |
| `pnpm -w build` | PASS, exit 0. Turbo reported 5 successful tasks. Desktop build repeated the non-fatal >500 kB chunk warning. |
| `cargo fmt --check` from `apps/desktop/src-tauri` | PASS, exit 0. No output. |
| `cargo clippy --all-targets --all-features -- -D warnings` from `apps/desktop/src-tauri` | PASS, exit 0. Finished in 5m 00s. Warning only: dependency `screenshots v0.8.10` contains code rejected by a future Rust version. |

## Files Changed

- `docs/qa/desktop-workstation-final-audit.md`
