# GORKH Pre-Stable Cleanup Report

## Summary

Completed the minor cleanup items identified in `docs/qa/desktop-workstation-final-audit.md` for the Workstation-first desktop release candidate.

The desktop source remains Workstation-first. Assistant remains available as a secondary surface. No stable tag was created, no release workflow was run, and no blockchain signing/execution/trading capability was added.

## Cleanup Performed

- Replaced stale assistant-first copy in `apps/desktop/src/App.tsx`.
- Changed the primary header stop control so the fresh Workstation shell does not show a generic `Stop All` button.
- Kept the emergency stop path available for Assistant tasks and active assistant work using Assistant-specific copy.
- Updated release/QA docs to current `VERSION` metadata: `0.0.48`.
- Documented that release workflow artifact filenames still use the legacy `ai-operator-desktop_...` prefix for updater and asset-resolution continuity while the signed product remains GORKH.
- Added focused tests for Workstation-first startup, secondary Assistant access, stale-copy removal, stop-control copy, docs version alignment, legacy artifact naming explanation, forbidden blockchain calls, ownership-only `signMessage`, and memory-only Birdeye API key handling.
- Synced `apps/desktop/src-tauri/Cargo.lock` package metadata from `0.0.47` to `0.0.48` after `cargo clippy` regenerated it; dependency versions were not changed.

## Audit Findings Resolved

| Audit Finding | Status | Notes |
|---|---|---|
| Secondary Assistant view contained stale assistant-first copy | Resolved | Copy now states Assistant is secondary for chat, planning, and approved desktop tasks. |
| Generic `Stop All` was visible in the primary Workstation header | Resolved | Fresh Workstation header hides the stop control unless Assistant is open or active assistant work exists. |
| Stop copy was generic | Resolved | The control now uses `Stop Assistant Tasks` or `Stop Active Assistant Tasks`. |
| Release docs had stale `0.0.47` metadata | Resolved | Updated targeted release/QA docs to `0.0.48`. |
| Artifact examples looked like old branding | Resolved in docs | `apple-beta-dry-run.md` now explicitly calls the `ai-operator-desktop_...` prefix a legacy continuity filename, not product branding. |

## Remaining Release Gate

Manual signed macOS artifact validation is still required before a stable tag:

- Build signed macOS artifacts through the release workflow path.
- Validate both Apple Silicon and Intel artifacts if both are produced.
- Verify Gatekeeper launch, codesign, notarization, stapling, app icon, sign-in loopback, updater behavior, and the Workstation-first first-launch flow.
- Complete `docs/qa/workstation-qa-checklist.md` against the packaged app.

Existing installed releases remain unchanged until a new signed artifact is shipped.

## Stable Tag Recommendation

**Proceed to stable tag only after manual signed macOS artifact validation.**

Source cleanup and automated validation are green. The remaining risk is packaged-artifact validation, not source readiness.

## Commands Run

| Command | Result |
|---|---|
| `node --import tsx --test tests/desktop-workstation-primary-view.test.mjs tests/desktop-overlay-window-state.test.mjs` | PASS. 2 test files passed. |
| `pnpm --filter @gorkh/desktop typecheck` | PASS. |
| `pnpm --filter @gorkh/desktop build` | PASS. Vite emitted the known non-fatal warning that the desktop bundle chunk is larger than 500 kB. |
| `pnpm --filter @gorkh/shared typecheck` | PASS. |
| `pnpm --filter @gorkh/shared test` | PASS. 11/11 tests passed. |
| `pnpm check:desktop:security` | PASS. Desktop security check passed. |
| `pnpm check:release:readiness` | PASS. 17/17 checks passed. |
| `pnpm -w typecheck` | PASS. Turbo reported 6 successful tasks. |
| `pnpm -w test` | PASS. 108/108 tests passed. |
| `pnpm -w build` | PASS. Turbo reported 5 successful tasks. Desktop build repeated the non-fatal >500 kB chunk warning. |
| `cargo fmt --check` from `apps/desktop/src-tauri` | PASS. |
| `cargo clippy --all-targets --all-features -- -D warnings` from `apps/desktop/src-tauri` | PASS. Cargo warned that dependency `screenshots v0.8.10` contains code that will be rejected by a future Rust version. |

## Files Modified

- `apps/desktop/src/App.tsx`
- `apps/desktop/src/lib/gorkhKnowledge.ts`
- `apps/desktop/src-tauri/Cargo.lock`
- `docs/qa/desktop-workstation-final-audit.md`
- `docs/qa/known-issues.md`
- `docs/qa/pre-stable-cleanup-report.md`
- `docs/qa/workstation-qa-checklist.md`
- `docs/release/apple-beta-dry-run.md`
- `docs/release/apple-macos-readiness.md`
- `tests/desktop-overlay-window-state.test.mjs`
- `tests/desktop-workstation-primary-view.test.mjs`

## Safety Confirmation

- No stable tag was created.
- No release workflow was run.
- No Apple signing/notarization secrets were modified.
- No product feature was added.
- No blockchain signing, send, airdrop, swap, trade, order, auto-trading, sniper, MEV, or protocol execution capability was added.
- No private key, seed phrase, wallet JSON, custody, or Birdeye API key persistence path was added.
- No active `@ai-operator/*` package references were introduced.
- HumanRail and White Protocol were not reintroduced as production dependencies.
- Drift was not added as an integration.

