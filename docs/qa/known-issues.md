# GORKH Known Issues

> Last updated: 2026-05-05 (Phase 20 RC prep)

## 1. API Session Test — Fixed in Phase 19

**File:** `tests/api-desktop-session.test.mjs:29`
**Symptom:** `desktop session helper revokes only the addressed device token and leaves sibling devices untouched` failed with `{ ok: false, error: 'UNAUTHORIZED' }`.
**Root cause:** Test fixture used hardcoded `deviceTokenExpiresAt: new Date('2026-04-17T00:00:00.000Z')`. As of May 2026, the token was expired, so `authenticateDesktopDeviceSession` correctly rejected it.
**Fix:** Added `now: () => new Date('2026-03-17T00:00:00.000Z')` to the `revokeDesktopSession` call so the test controls time and the expiry is in the future.
**Status:** Resolved.

## 2. Rust Formatting Diffs — Resolved in Phase 20

**Files:** `apps/desktop/src-tauri/src/**/*.rs` (16 files affected)
**Symptom:** `cargo fmt --check` reported widespread formatting differences.
**Fix:** Ran `cargo fmt` from `apps/desktop/src-tauri`. All 16 Rust files were reformatted.
**Verification:** `cargo fmt --check` now passes cleanly.
**Clippy verification:** `cargo clippy --all-targets --all-features -- -D warnings` passes after formatting.

## 3. Bundle Identifier Legacy Name

**File:** `apps/desktop/src-tauri/tauri.conf.json`
**Value:** `"identifier": "com.ai-operator.desktop"`
**Note:** The identifier retains the legacy `ai-operator` name. Changing it would break existing installed apps and updater channels. This is acceptable for the current release cycle but should be evaluated for a future re-branding migration.

## 4. Cargo.toml Package Name Legacy

**File:** `apps/desktop/src-tauri/Cargo.toml`
**Value:** `name = "ai-operator-desktop"`
**Note:** Same as above — legacy name in the Rust crate. Does not affect user-facing branding.
