# GORKH Stable Release Validation Report

## Release Target

- Version: `0.0.48`
- Tag: `v0.0.48`
- Branch: `main`
- Validated pre-report HEAD: `deb56a03c53306297c2107212846ac37863f9439`
- Validation time: `2026-05-06T11:08:07Z`

## Status

- Release gates: Passed locally.
- Release-prep commit status: Committed as `934f3c0` and pushed to `origin/main`; follow-up CI runtime alignment is pending in the report update commit.
- Branch push status: `origin/main` updated to include the release-prep cleanup.
- Tag creation status: Not created by this pass because `v0.0.48` already exists locally and remotely.
- Tag push status: Not pushed by this pass because `v0.0.48` already exists on `origin`.
- Expected GitHub Actions workflow: `.github/workflows/desktop-release.yml` runs on a new `v*` tag push, but no new tag push occurred during this validation pass.

## Gate Results

| Gate | Result | Notes |
|---|---|---|
| `pnpm --filter @gorkh/shared typecheck` | PASS | TypeScript completed with exit 0. |
| `pnpm --filter @gorkh/shared build` | PASS | `tsup` ESM and DTS builds completed. |
| `pnpm --filter @gorkh/shared test` | PASS | 11/11 tests passed. |
| `pnpm --filter @gorkh/api typecheck` | PASS | TypeScript completed with exit 0. |
| `pnpm --filter @gorkh/api test` | PASS | 6/6 API package tests passed. |
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
| `pnpm -w test` | PASS | 108/108 workspace tests passed. |

## GitHub Actions Follow-Up

After `934f3c0` was pushed, GitHub Actions `CI` failed on the Node 20 runner while local gates on Node 24 passed. The failure was isolated to `tests/e2e-device-commands-redis.test.mjs`: five Redis WebSocket E2E subtests failed with `ReferenceError: WebSocket is not defined`.

The workflow Node runtime was aligned from Node 20 to Node 22 in:

- `.github/workflows/ci.yml`
- `.github/workflows/desktop-ci.yml`
- `.github/workflows/desktop-release.yml`

Affected local verification after the workflow alignment:

| Gate | Result | Notes |
|---|---|---|
| `node --import tsx --test tests/workflow-*.test.mjs tests/e2e-device-commands-redis.test.mjs` | PASS | 8/8 focused workflow and Redis E2E tests passed. |
| `pnpm check:release:readiness` | PASS | 17/17 checks passed. |
| `pnpm -w test` | PASS | 108/108 workspace tests passed. |

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

Automated source gates are green, but this validation pass did not create or push a stable tag because `v0.0.48` already exists locally and remotely. Source cleanup can be committed and pushed, but it will not be included in the already-existing `v0.0.48` tag unless the release owner explicitly chooses a new version/tag strategy.

Status: pending signed macOS artifact validation and release-owner decision on version/tag handling.
