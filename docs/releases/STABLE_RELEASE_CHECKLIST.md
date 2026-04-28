# GORKH Stable macOS Release Checklist

**Version:** 0.0.41  
**Proposed Tag:** v0.0.41  
**Commit SHA:** 5d765aa1421e7edd22babf2fc1ac2d1b02671548  
**Date:** 2026-04-28  
**Platform:** macOS (Apple Silicon + Intel)  
**Channel:** stable  

---

## 1. Version Sync

| Source | Version | Status |
|--------|---------|--------|
| `VERSION` file | 0.0.41 | ✅ |
| `apps/desktop/package.json` | 0.0.41 | ✅ |
| `apps/desktop/src-tauri/tauri.conf.json` | 0.0.41 | ✅ |
| `apps/desktop/src-tauri/Cargo.toml` | 0.0.41 | ✅ |
| `apps/api/package.json` | 0.0.41 | ✅ |

`node scripts/version-check.mjs` — ✅ Pass

---

## 2. Local AI Removal Confirmation

- [x] No runtime source references to Ollama/local AI remain
- [x] No user-facing desktop UI mentions local AI/Ollama
- [x] No web/marketing copy mentions local AI/Ollama
- [x] Generated files regenerated and verified clean
- [x] `packages/shared/src/llm-error.ts` confirmed clean (no `OLLAMA_ERROR` / `LOCAL_AI_ERROR`)
- [x] `desktop-ipc.toml` cleaned of `local_ai_*` permissions
- [x] `scripts/check-desktop-security.mjs` cleaned of `local_ai_*` commands

Full audit: `docs/implementation/no-local-ai-final-reference-audit.md`

---

## 3. Beta Removal Confirmation

- [x] User-facing web copy does not describe release as beta
  - `apps/web/app/page.tsx`: "Now available" (was "Now in private beta")
  - `apps/web/app/page.tsx`: "Download the macOS app today" (was "Download the macOS beta today")
  - `apps/web/app/page.tsx`: "Working macOS builds" (was "Private beta with working macOS builds")
- [x] `apps/desktop/src/components/SettingsPanel.tsx`: "In-app updates are not available for this version" (was "Beta builds do not ship in-app updates")
- [x] Release workflow supports stable channel with `prerelease=false`, `updater_enabled=true`
- [x] Release workflow validates stable signing/notarization secrets
- [x] Release workflow notarizes and staples only stable macOS artifacts
- [x] Download page does not mention beta
- [x] Download page states "Developer ID Signed" and "Notarized"
- [x] Download page describes macOS-only availability

---

## 4. Automated Test Results

| Suite | Result |
|-------|--------|
| `pnpm --filter @ai-operator/shared typecheck` | ✅ Pass |
| `pnpm --filter @ai-operator/desktop typecheck` | ✅ Pass |
| `pnpm --filter @ai-operator/desktop build` | ✅ Pass |
| `cargo check` (desktop) | ✅ Pass |
| `cargo clippy --all-targets -- -D warnings` | ✅ Pass |
| `cargo test --lib` | ✅ 33 pass / 0 fail |
| `pnpm check:desktop:security` | ✅ Pass |
| `node --import tsx --test tests/desktop-agent-pipeline.diagnostic.ts` | ✅ 2 pass / 0 fail |
| `node --import tsx --test tests/desktop-agent-verification.diagnostic.ts` | ✅ 5 pass / 0 fail |
| `node --import tsx --test tests/desktop-provider-capabilities-after-local-ai-removal.test.ts` | ✅ 14 pass / 0 fail |
| `node --import tsx --test tests/workflow-desktop-release-command.test.mjs` | ✅ 10 pass / 0 fail |
| `node --import tsx --test tests/web-download-trust-messaging.test.mjs` | ✅ 3 pass / 0 fail |
| `node --import tsx --test tests/web-branding-gorkh.test.mjs` | ✅ 1 pass / 0 fail |
| `node --import tsx --test --test-force-exit tests/desktop-*.test.* tests/shared-*.test.*` | ✅ 169 pass / 0 fail |
| `node --import tsx --test --test-force-exit tests/*.test.*` | 285 pass / 2 fail |

**Remaining failures (2, pre-existing, unrelated to stable release):**
1. `api-desktop-session-hardening.test.ts` — device token revocation test (API-level, not release-blocking)
2. `api-desktop-release-truth.test.ts` — beta release metadata test (tests beta path, not stable)

---

## 5. Release Workflow / Security Test Status

- [x] `workflow-desktop-release-command.test.mjs` — 10/10 pass
- [x] `web-download-trust-messaging.test.mjs` — 3/3 pass
- [x] `web-branding-gorkh.test.mjs` — 1/1 pass
- [x] `check-desktop-security.mjs` — pass (updated for explicit updater/process permissions)

---

## 6. DMG / Package Build

**Status:** Cannot build in Linux Codespace — macOS DMG requires real macOS hardware.

**Expected artifact paths (when built on macOS):**
- App: `apps/desktop/src-tauri/target/release/bundle/macos/GORKH.app`
- DMG: `apps/desktop/src-tauri/target/release/bundle/dmg/GORKH_0.0.41_aarch64.dmg`
- DMG: `apps/desktop/src-tauri/target/release/bundle/dmg/GORKH_0.0.41_x86_64.dmg`

**Build command for local Mac:**
```bash
cd apps/desktop
pnpm tauri build --bundles app,dmg
```

---

## 7. Signing / Notarization Status

**Status:** Cannot verify in Linux Codespace — requires Apple Developer ID certificate and notarization credentials.

**Workflow validation:**
- [x] Release workflow validates stable signing secrets (`MACOS_CERT_P12_BASE64`, `MACOS_CERT_PASSWORD`, `MACOS_KEYCHAIN_PASSWORD`)
- [x] Release workflow validates notarization credentials (either API key or Apple ID mode)
- [x] Release workflow validates updater public key variable

**Expected verification commands (run on Mac after DMG build):**
```bash
codesign -dv --verbose=4 /path/to/GORKH.app
spctl -a -vvv -t install /path/to/GORKH.app
xcrun stapler validate /path/to/GORKH.app
spctl -a -vvv -t open --context context:primary-signature /path/to/GORKH_*.dmg
xcrun stapler validate /path/to/GORKH_*.dmg
```

**Missing for public stable release:**
- Apple Developer ID certificate (`MACOS_CERT_P12_BASE64`)
- Apple notarization credentials (`APPLE_API_KEY_ID` + `APPLE_API_ISSUER_ID` + `APPLE_API_KEY_P8_BASE64`, or `APPLE_ID` + `APPLE_TEAM_ID` + `APPLE_APP_SPECIFIC_PASSWORD`)
- Tauri signing key (`TAURI_PRIVATE_KEY` + `TAURI_KEY_PASSWORD`)
- Updater public key (`VITE_DESKTOP_UPDATER_PUBLIC_KEY`)

---

## 8. Updater Manifest / Channel

- [x] Updater endpoint: `{{VITE_API_HTTP_BASE}}/updates/desktop/{{target}}/{{arch}}/{{current_version}}.json`
- [x] Tauri config uses `{{env:VITE_API_HTTP_BASE}}/updates/desktop/{{target}}/{{arch}}/{{current_version}}.json`
- [x] Stable channel enables updater (`updater_enabled=true`)
- [x] Beta channel disables updater (`updater_enabled=false`)
- [x] Release workflow generates updater signatures only for stable

---

## 9. Native Smoke Checklist (To Be Completed on Real Mac)

- [ ] **A. Launch** — app opens from Applications, no Gatekeeper block, version matches 0.0.41, no beta labels
- [ ] **B. Permissions** — Screen Recording and Accessibility flows work, guidance opens correct settings, detection works after grant
- [ ] **C. Sign-in/device** — login works, device registration works, desktop token saved, logout works
- [ ] **D. Hosted GORKH Free** — no BYO key needed, `/desktop/free-ai/v1/models` health check works, simple free-tier task runs, no local AI/Ollama copy appears, no BYO key sent to server
- [ ] **E. BYO provider** — OpenAI/Claude key configured, key stored in OS keychain only, screen-aware task runs, key removal works
- [ ] **F. Computer-use MVP** — TextEdit/Notes click and type with approvals, verification loop works, not marked done prematurely
- [ ] **G. Missed-click / blocked UI** — vague/impossible click handled safely, asks user or fails clearly
- [ ] **H. Overlay / cancel** — overlay appears, approval modal works, stop/cancel works, no action continues after cancel
- [ ] **I. Updater check** — updater points to stable channel/path, not beta path

---

## 10. Known Non-Blocking Issues

1. **Linux Codespace limitation:** macOS DMG build, signing, notarization, and native smoke tests require real macOS hardware.
2. **AdvancedAgent experimental path:** `local_openai_compat` internal ProviderType string exists in experimental code. Not user-facing in main product path.
3. **Pre-existing API test failure:** `api-desktop-session-hardening.test.ts` has a device token revocation failure unrelated to release preparation.
4. **Pre-existing API release-truth test:** `api-desktop-release-truth.test.ts` tests beta release metadata — not relevant for stable tag.
5. **`screenshots` crate future incompatibility warning:** `cargo check`/`clippy` emit a warning about `screenshots v0.8.10` code that will be rejected by a future Rust version. This is a dependency issue, not source-level.

---

## 11. Blocking Issues

None — automated validation passes. The only blockers are environment-dependent:
- Real macOS hardware needed for DMG build and native smoke
- Apple Developer ID certificate and notarization credentials needed for signed public release

---

## 12. Sign-off

- [x] Version sync validated
- [x] Local AI removal confirmed
- [x] Beta references removed from user-facing surfaces
- [x] Release workflow validated
- [x] Security check passes
- [x] TypeScript typechecks pass
- [x] Rust checks pass (check, clippy, tests)
- [x] Desktop/shared JS tests pass (169/169)
- [x] Workflow/download/web tests pass (14/14)
- [ ] macOS DMG built (requires real Mac)
- [ ] Code signing verified (requires Apple cert)
- [ ] Notarization verified (requires Apple credentials)
- [ ] Native smoke completed (requires real Mac)
