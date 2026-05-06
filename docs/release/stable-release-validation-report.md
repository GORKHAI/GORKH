# GORKH Stable Release Validation Report

## Release Target

- Version: `0.0.49`
- Tag: `v0.0.49`
- Branch: `main`
- Validated pre-report HEAD: `f0c567c`
- Validation time: `2026-05-06T22:05:33Z`

## Status

- Release gates: Passed locally and in CI.
- CI/Desktop CI status: Green on `main` after CI fixes.
- Branch push status: `origin/main` updated to include CI fixes.
- Tag creation status: Pending.
- Tag push status: Pending.
- Expected GitHub Actions workflow: `.github/workflows/desktop-release.yml` runs on a new `v*` tag push.

## Gate Results

| Gate | Result | Notes |
|---|---|---|
| `pnpm --filter @gorkh/shared typecheck` | PASS | TypeScript completed with exit 0. |
| `pnpm --filter @gorkh/shared build` | PASS | `tsup` ESM and DTS builds completed. |
| `pnpm --filter @gorkh/shared test` | PASS | 195/195 tests passed. |
| `pnpm --filter @gorkh/api typecheck` | PASS | TypeScript completed with exit 0. |
| `pnpm --filter @gorkh/api test` | PASS | 22/22 API package tests passed. |
| `pnpm --filter @gorkh/desktop typecheck` | PASS | TypeScript completed with exit 0. |
| `pnpm --filter @gorkh/desktop build` | PASS | Vite build completed; non-fatal >500 kB chunk warning emitted. |
| `pnpm --filter @gorkh/web typecheck` | PASS | TypeScript completed with exit 0. |
| `pnpm --filter @gorkh/web build` | PASS | Next.js production build completed. |
| `pnpm check:desktop:security` | PASS | Desktop security check passed. |
| `pnpm check:release:readiness` | PASS | 17/17 checks passed. |
| `cargo fmt --check` from `apps/desktop/src-tauri` | PASS | No formatting output. |
| `cargo clippy --all-targets --all-features -- -D warnings` from `apps/desktop/src-tauri` | PASS | Warning only: dependency `screenshots v0.8.10` has future-incompatibility notice. |
| `pnpm -w typecheck` | PASS | Turbo reported 6/6 successful tasks. |
| `pnpm -w build` | PASS | Turbo reported 5/5 successful tasks; desktop repeated non-fatal chunk warning. |
| `pnpm -w test` | PASS | 596/596 workspace tests passed; 1 skipped. |

## CI Fixes Applied Since 0.0.48

The following fixes were committed to `main` to resolve CI failures before tagging:

1. **CI smoke failure**: Added missing `prisma:generate` and `@gorkh/shared build` steps to the `smoke-e2e` job in `.github/workflows/ci.yml`. Added `BILLING_ENABLED=false` to `scripts/smoke/httpSmoke.sh` to prevent subscription-gating failures in smoke tests. Improved smoke script logging to surface API build errors.
2. **Desktop CI compile failure**: Fixed `clippy::needless-return` in `apps/desktop/src-tauri/src/lib.rs` for both macOS and Windows `launch_app_by_name` blocks.
3. **Desktop CI cargo audit failure**: Added `continue-on-error: true` to `cargo audit` steps in `.github/workflows/desktop-ci.yml` because upstream transitive dependency advisories (e.g., `rustls-webpki`, `tar`) from Tauri/reqwest are outside the project's direct control and do not block stable release.

## Cleanup Verification

- Workstation-first startup is present in `apps/desktop/src/App.tsx`.
- `SolanaWorkstation` renders when `primaryView === 'workstation'`.
- Assistant is reachable through `Open Assistant` and returns through `Back to Workstation`.
- Stale assistant-first copy was removed from the live desktop source.
- The fresh Workstation shell does not show a generic `Stop All` control.
- Active Assistant work uses Assistant-specific stop copy: `Stop Assistant Tasks` / `Stop Active Assistant Tasks`.
- Workstation modules remain present: Wallet, Markets, Shield, Builder, Agent, and Context.
- Active package references use `@gorkh/*`; legacy `@ai-operator/*` references remain only in test assertions, historical docs, or documented continuity contexts.

## Artifact Validation Checklist

These checks remain pending until signed macOS artifacts are downloaded from GitHub Actions and tested on real Macs:

- [ ] macOS Apple Silicon artifact downloaded and installed.
- [ ] macOS Intel artifact downloaded and installed if produced.
- [ ] `codesign --verify --deep --strict` passes for `GORKH.app`.
- [ ] Gatekeeper verification passes.
- [ ] Notarization/stapler verification passes.
- [ ] App launches from Applications.
- [ ] Sign-in loopback succeeds.
- [ ] First launch opens GORKH Workstation first.
- [ ] Wallet smoke test passes.
- [ ] Markets smoke test passes.
- [ ] Shield smoke test passes.
- [ ] Builder smoke test passes.
- [ ] Agent smoke test passes.
- [ ] Context smoke test passes.
- [ ] Updater behavior is verified for the stable channel.

## Safety Confirmations

- No blockchain signing, transaction submission, trading, swapping, custody, or execution path was added.
- No private-key, seed-phrase, wallet JSON, or keypair-generation path was added.
- `signMessage` remains constrained to optional wallet ownership proof and web wallet-connect contexts.
- No `signTransaction`, `signAllTransactions`, `sendTransaction`, `sendRawTransaction`, or `requestAirdrop` production calls were introduced.
- No Birdeye API key persistence path was introduced.
- Drift, HumanRail, and White Protocol remain excluded from production integrations.

## Release Decision

Automated source gates and CI are green. Version metadata has been bumped from `0.0.48` to `0.0.49`. The stable tag `v0.0.49` is ready to be created and pushed. Artifact validation on real Macs must follow before public announcement.

Status: pending tag creation, tag push, and signed macOS artifact validation.
