# Native Validation Checklist — macOS Pre-Stable

**Branch:** `feature/byo-key-fix`  
**Status:** All automated validation complete. Pending real macOS hardware validation.

---

## Automated Validation (Linux Codespace) — ALL PASS ✅

| # | Check | Command | Result |
|---|-------|---------|--------|
| 1 | TypeScript typecheck (desktop) | `pnpm --filter @ai-operator/desktop typecheck` | ✅ Pass |
| 2 | TypeScript typecheck (shared) | `pnpm --filter @ai-operator/shared typecheck` | ✅ Pass |
| 3 | Vite build (desktop) | `pnpm --filter @ai-operator/desktop build` | ✅ Pass |
| 4 | Cargo check | `cargo check` | ✅ Pass |
| 5 | Cargo clippy (zero warnings) | `cargo clippy --all-targets -- -D warnings` | ✅ Pass |
| 6 | Rust unit tests | `cargo test --lib` | ✅ 33 pass / 0 fail |
| 7 | Computer-use diagnostics | `cargo test computer_use` | ✅ 7 pass / 0 fail |
| 8 | Desktop/shared JS tests | `node --test` (subset) | ✅ 155 pass / 0 fail |
| 9 | Full test suite | `pnpm -w test` | 291 pass / 7 fail / 1 skip (pre-existing) |
| 10 | No new test failures | Diff against baseline | ✅ Zero regressions |

---

## Real macOS Hardware Validation — REQUIRED BEFORE MERGE

| # | Check | How | Status |
|---|-------|-----|--------|
| 1 | Screen capture permission | Trigger screenshot in app | ⏳ Pending |
| 2 | Mouse click injection | Trigger computer-use click action | ⏳ Pending |
| 3 | Keyboard input injection | Trigger computer-use type action | ⏳ Pending |
| 4 | Packaged `.app` build | `pnpm --filter @ai-operator/desktop tauri:build` | ⏳ Pending |
| 5 | Packaged app launches | Open `.app` from Finder | ⏳ Pending |
| 6 | Sign-in flow works | Complete JWT auth + device registration | ⏳ Pending |
| 7 | Hosted Free AI fallback | Run with no BYO key configured | ⏳ Pending |
| 8 | BYO key provider | Configure OpenAI key, run task | ⏳ Pending |
| 9 | Overlay appears on trigger | Use hotkey or menu to open overlay | ⏳ Pending |
| 10 | Updater check | `checkForUpdate` Tauri command | ⏳ Pending |

---

## Notes

- **No macOS signing certs** available in this environment — signed `.app`/`.dmg` cannot be built here
- **Screen Recording / Accessibility** permissions cannot be granted or tested in Linux Codespace
- **Coordinate clamping** is validated via unit tests; real input injection must be verified on macOS
- All automated checks show **zero regressions** from the local AI removal

---

*Last updated: 2026-04-28*
