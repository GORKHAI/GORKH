# GORKH Apple/macOS Release Readiness

> Version: 0.0.51
> Last updated: 2026-05-08 (v0.0.51 release metadata sync)

## 1. Current Apple/macOS Target Status

- **Primary platform:** Apple macOS (Intel + Apple Silicon)
- **Secondary platform:** Windows builds are produced for beta only; stable channel intentionally skips Windows.
- **Minimum macOS version:** Determined by Tauri 2 defaults (typically macOS 10.13+)
- **Architectures:**
  - `x86_64` — built on `macos-15-intel` runner
  - `aarch64` — built on `macos-14` runner

## 2. Tauri Config Summary

**File:** `apps/desktop/src-tauri/tauri.conf.json`

| Property | Value |
|----------|-------|
| `$schema` | Tauri 2 config schema |
| `productName` | GORKH |
| `version` | 0.0.51 (synced with `VERSION`, desktop package metadata, and Tauri config) |
| `identifier` | `com.ai-operator.desktop` (legacy; see Known Issues) |
| `macOSPrivateApi` | `true` (required for overlay window, tray, transparency) |
| `transparent` | `true` (glass window support) |
| `titleBarStyle` | `Overlay` with hidden title |
| `trafficLightPosition` | `{ x: 18, y: 20 }` |
| `csp` | Hardened content security policy configured |
| `devCsp` | Relaxed CSP for local development |

## 3. Bundle Identifier

- `com.ai-operator.desktop`
- **Note:** Legacy identifier retained for updater/app continuity. Re-branding migration TBD.

## 4. App Name / Product Name

- User-facing: **GORKH**
- Cargo crate: `ai-operator-desktop` (legacy)
- Rust lib: `ai_operator_desktop_lib`

## 5. Icon Configuration

**Directory:** `apps/desktop/src-tauri/icons/`

| File | Purpose |
|------|---------|
| `icon.icns` | macOS app bundle icon |
| `icon.ico` | Windows app icon |
| `icon.png` | Linux / generic |
| `128x128.png`, `128x128@2x.png` | HiDPI variants |
| `Square*.png` | Windows tile variants |
| `StoreLogo.png` | Microsoft Store |

- macOS `.icns` file is present (221 KB).
- Icons are branded GORKH assets.

## 6. Updater Status

**Config location:** `tauri.conf.json` → `plugins.updater`

| Channel | Active | Dialog | Endpoints | Signature |
|---------|--------|--------|-----------|-----------|
| Beta | `false` | `false` | None | None |
| Stable | `true` | `false` | `{{VITE_API_HTTP_BASE}}/updates/desktop/{{target}}/{{arch}}/{{current_version}}.json` | `TAURI_PRIVATE_KEY` + `VITE_DESKTOP_UPDATER_PUBLIC_KEY` |

- Updater pubkey is injected via `VITE_DESKTOP_UPDATER_PUBLIC_KEY` env var at build time.
- Stable releases generate `.sig` signatures via `tauri signer sign`.
- Beta releases explicitly assert that no `.sig` files are uploaded.

## 7. Signing / Notarization Expected Inputs

Secrets are configured in GitHub Actions and are **never committed to source**.

### Required for both Beta and Stable macOS

| Secret | Purpose |
|--------|---------|
| `MACOS_CERT_P12_BASE64` | Developer ID Application certificate (base64) |
| `MACOS_CERT_PASSWORD` | Certificate encryption password |
| `MACOS_KEYCHAIN_PASSWORD` | Temporary keychain password |

### Required for Stable only

| Secret | Purpose |
|--------|---------|
| `TAURI_PRIVATE_KEY` | Updater signing private key |
| `TAURI_KEY_PASSWORD` | Updater key password |

### Notarization (one of two modes)

**API Key mode (preferred):**
- `APPLE_API_KEY_ID`
- `APPLE_API_ISSUER_ID`
- `APPLE_API_KEY_P8_BASE64`

**Apple ID mode (fallback):**
- `APPLE_ID`
- `APPLE_TEAM_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`

### Variables (not secrets)

| Variable | Purpose |
|----------|---------|
| `VITE_API_HTTP_BASE` | API base URL (must be `https://`) |
| `VITE_API_WS_URL` | WebSocket URL (must be `wss://`) |
| `VITE_DESKTOP_UPDATER_PUBLIC_KEY` | Updater Ed25519 public key |
| `APP_BASE_URL` | Web portal URL for sign-in redirect allowlist |

## 8. Build Commands

```bash
# Dev
pnpm --filter @gorkh/desktop tauri:dev

# TypeScript check
pnpm --filter @gorkh/desktop typecheck

# Full desktop check (Rust + TS + debug build)
pnpm --filter @gorkh/desktop tauri:check

# Release build (macOS app + DMG)
pnpm --filter @gorkh/desktop tauri:build --bundles app,dmg

# Shared dependency (must build first)
pnpm --filter @gorkh/shared build
```

## 9. Validation Command List

```bash
# 1. TypeScript typecheck all packages
pnpm -w typecheck

# 2. Build all packages
pnpm -w build

# 3. Run all tests
pnpm -w test

# 4. Desktop security config validation
pnpm check:desktop:security

# 5. Desktop CSP validation
pnpm check:desktop:csp

# 6. Rust formatting check
cd apps/desktop/src-tauri && cargo fmt --check

# 7. Rust linting
cargo clippy --all-targets --all-features -- -D warnings

# 8. Version sync check
pnpm version:check

# 9. Release readiness script (if added)
pnpm check:release:readiness
```

## 10. Manual QA Checklist

See `docs/qa/workstation-qa-checklist.md` for the full module-by-module checklist.

High-level release QA:

- [ ] App launches without crash on macOS.
- [ ] App icon appears correctly in Dock and Finder.
- [ ] Transparent overlay mode renders correctly.
- [ ] Traffic lights are positioned at `{18, 20}`.
- [ ] Sign-in flow redirects to system browser and returns via loopback.
- [ ] Device token persists across restarts.
- [ ] Updater check works (stable channel only).
- [ ] DMG mounts and app drags to Applications without error.
- [ ] `codesign --verify --deep --strict` passes on the `.app` bundle.
- [ ] Notarization stapler succeeds (stable channel only).
- [ ] No `com.apple.quarantine` gatekeeper block on first launch.

## 11. Stable Tag Policy

> **CRITICAL:** A stable tag must **NOT** be created until explicitly approved by the release owner.

- Tags are created manually or by the release workflow on push.
- Only tags matching `vX.Y.Z` trigger a stable release.
- Beta tags use `vX.Y.Z-beta.N`.
- The `VERSION` file must match the tag exactly.
- Stable releases require all signing/notarization secrets to be present.
- The packaged-desktop-validation report must be completed before promotion.

## 12. Known Blockers / Open Items

| # | Item | Status | Owner |
|---|------|--------|-------|
| 1 | Rust formatting (`cargo fmt`) | Resolved — 16 files reformatted, `cargo fmt --check` passes | Engineering |
| 2 | Bundle identifier re-branding (`com.ai-operator.desktop` → `com.gorkh.desktop`) | Open — affects updater continuity | Product |
| 3 | Cargo crate name re-branding (`ai-operator-desktop` → `gorkh-desktop`) | Open — affects internal references | Engineering |
| 4 | Windows stable lane | Deferred — macOS-only stable for now | Product |
| 5 | Notarization secret rotation schedule | Open — document in runbook | DevOps |
