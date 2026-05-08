# GORKH Apple Beta Dry-Run Guide

> Version: 0.0.51
> Last updated: 2026-05-08 (v0.0.51 release metadata sync)

## 1. Purpose

A beta dry-run verifies the full Apple/macOS signing, notarization, and updater pipeline **without** publishing a stable release. It produces signed macOS artifacts that can be manually tested, while keeping the stable channel untouched.

## 2. Preconditions

Before triggering a dry-run, verify:

- [ ] `pnpm -w test` passes fully (585/585)
- [ ] `pnpm -w typecheck` passes
- [ ] `pnpm -w build` passes
- [ ] `cargo fmt --check` passes (from `apps/desktop/src-tauri`)
- [ ] `cargo clippy --all-targets --all-features -- -D warnings` passes
- [ ] `pnpm check:desktop:security` passes
- [ ] `pnpm check:release:readiness` passes
- [ ] `VERSION` file is correct and matches checked-in metadata
- [ ] Apple signing secrets are configured in GitHub Actions:
  - `MACOS_CERT_P12_BASE64`
  - `MACOS_CERT_PASSWORD`
  - `MACOS_KEYCHAIN_PASSWORD`
  - Notarization credentials (API key mode or Apple ID mode)
- [ ] GitHub Actions variables are set:
  - `VITE_API_HTTP_BASE` (https://)
  - `VITE_API_WS_URL` (wss://)
  - `APP_BASE_URL` (https://)

## 3. How to trigger the beta dry-run

Use **workflow dispatch** on the Desktop Release workflow:

1. Go to **Actions** → **Desktop Release** → **Run workflow**
2. Select **Branch:** `main`
3. Select **Channel:** `beta`
4. Click **Run workflow**

The workflow does **not** require a tag for `workflow_dispatch` with `channel: beta`.

## 4. What the workflow does (beta channel)

1. **Prepare** (ubuntu-latest):
   - Validates checked-in `VERSION` sync
   - Resolves release context as `prerelease=true`, `updater_enabled=false`
   - Validates Apple signing secrets
   - Generates a packaged-desktop validation report template

2. **Build macOS** (two runners in parallel):
   - `macos-15-intel` → `x86_64` artifact
   - `macos-14` → `aarch64` artifact
   - Imports Developer ID certificate into temporary keychain
   - Builds `.app` bundle + `.dmg` with `tauri build --bundles app,dmg`
   - Verifies app signature with `codesign --verify --deep --strict`
   - Asserts no `.sig` updater signatures are produced

3. **Build Windows** (windows-latest):
   - Skipped for beta (workflow explicitly allows Windows beta builds, but they are unsigned)

4. **Publish Release** (only on tag push):
   - **Not triggered** by workflow_dispatch
   - This is the safety guard: beta dry-runs do not auto-publish GitHub releases

## 5. Artifacts to verify

After the workflow completes, download artifacts from GitHub Actions:

| Artifact | Expected |
|----------|----------|
| `desktop-release-macos-x86_64` | DMG file using the workflow-normalized legacy continuity name: `ai-operator-desktop_{VERSION}_macos_x86_64.dmg` |
| `desktop-release-macos-aarch64` | DMG file using the workflow-normalized legacy continuity name: `ai-operator-desktop_{VERSION}_macos_aarch64.dmg` |
| `packaged-desktop-validation-beta` | JSON template for manual sign-off |

The product name inside the signed app is **GORKH**. The `ai-operator-desktop` artifact filename prefix is currently retained by the release workflow for updater and asset-resolution continuity; do not treat it as active product branding.

### Manual verification steps

1. Download both DMG artifacts on a Mac.
2. Mount each DMG and drag the `.app` to Applications.
3. Verify the app launches without Gatekeeper block:
   ```bash
   spctl -a -vv /Applications/GORKH.app
   ```
4. Verify code signature:
   ```bash
   codesign --verify --deep --strict --verbose=2 /Applications/GORKH.app
   ```
5. Verify the app icon appears correctly in Dock/Finder.
6. Verify transparent overlay renders.
7. Run through the Workstation QA checklist (`docs/qa/workstation-qa-checklist.md`).
8. Verify sign-in flow opens system browser and returns via loopback.
9. Verify the app does **not** auto-update (beta channel has updater disabled).

## 6. What NOT to do

- **Do not** create a stable tag (`vX.Y.Z`) during a beta dry-run.
- **Do not** publish a stable updater manifest.
- **Do not** change the bundle identifier (`com.ai-operator.desktop`) without a migration plan.
- **Do not** enable the updater for beta artifacts.
- **Do not** treat a beta dry-run artifact as a stable release.

## 7. Post-run manual QA checklist

Use `docs/qa/workstation-qa-checklist.md` and verify on a real macOS device:

- [ ] App launches without crash
- [ ] App icon correct in Dock/Finder
- [ ] Transparent overlay works
- [ ] Sign-in → browser → loopback works
- [ ] Device token persists across restarts
- [ ] No Gatekeeper quarantine block
- [ ] `codesign --verify --deep --strict` passes
- [ ] No updater auto-prompt (beta should not update)

## 8. Rollback / cleanup

- Beta artifacts are **not** published to GitHub Releases (no tag push).
- Artifacts expire with GitHub Actions retention (typically 90 days).
- To fully clean up, delete the workflow run from GitHub Actions UI if desired.
- No secrets were rotated or exposed during the dry-run.

## 9. When to proceed to stable

A stable release should only be created after:

1. Beta dry-run artifacts pass all manual QA checks.
2. The packaged-desktop-validation report is completed and signed off.
3. All preconditions above are met.
4. The `VERSION` file is finalized.
5. Explicit approval is given by the release owner.
6. A stable tag `vX.Y.Z` is pushed, which auto-triggers the release workflow.
