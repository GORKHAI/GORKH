# Desktop Release Recovery Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore the desktop release pipeline across Windows and macOS, then verify that published GitHub Release assets still satisfy the API download and updater contract.

**Architecture:** Fix the release lane from the inside out. First lock down desktop packaging prerequisites in source-controlled tests, then repair missing bundle assets, then re-baseline the current macOS Rust build, and finally verify the GitHub Release and API consumer path that depend on the normalized artifact names.

**Tech Stack:** pnpm workspace, Tauri v2, Rust, GitHub Actions, Fastify, Node test runner

---

### Task 1: Make desktop packaging prerequisites fail fast

**Files:**
- Modify: `tests/desktop-rust-release-prereqs.test.mjs`
- Test: `tests/desktop-rust-release-prereqs.test.mjs`

**Step 1: Write the failing test**

Extend the existing prereq test to require the Windows icon asset and the matching Tauri config reference.

Example assertion block:

```js
const icoPath = path.join(repoRoot, 'apps/desktop/src-tauri/icons/icon.ico');

assert.ok(fs.existsSync(icoPath), 'desktop release should include src-tauri/icons/icon.ico');
assert.ok(
  Array.isArray(tauriConfig.bundle?.icon) &&
    tauriConfig.bundle.icon.includes('icons/icon.ico'),
  'desktop release config should reference icons/icon.ico explicitly',
);
```

If the macOS bundle requires `icon.icns` in practice, add the same assertion for `apps/desktop/src-tauri/icons/icon.icns`.

**Step 2: Run test to verify it fails**

Run:

```bash
node --test tests/desktop-rust-release-prereqs.test.mjs
```

Expected:

- FAIL because `icon.ico` is not tracked yet

**Step 3: Keep the test scoped**

- Do not add workflow assertions here.
- Keep this file focused on Tauri source prerequisites only.

**Step 4: Commit**

```bash
git add tests/desktop-rust-release-prereqs.test.mjs
git commit -m "test: require desktop bundle icon assets"
```

### Task 2: Fix missing desktop bundle assets and config references

**Files:**
- Modify: `apps/desktop/src-tauri/tauri.conf.json`
- Create: `apps/desktop/src-tauri/icons/icon.ico`
- Create if needed: `apps/desktop/src-tauri/icons/icon.icns`
- Test: `tests/desktop-rust-release-prereqs.test.mjs`

**Step 1: Add the missing bundle assets**

- Generate or export `icon.ico` from the tracked source icon.
- If Tauri's macOS bundler expects it in practice, also generate `icon.icns`.
- Commit the generated assets so Actions runners do not depend on local tooling side effects.

**Step 2: Update Tauri bundle config**

Change `bundle.icon` in `apps/desktop/src-tauri/tauri.conf.json` from a single PNG entry to an explicit multi-format list.

Target shape:

```json
"icon": [
  "icons/icon.png",
  "icons/icon.ico",
  "icons/icon.icns"
]
```

If macOS proves not to need `icon.icns`, keep only the formats that the current Tauri build actually consumes.

**Step 3: Re-run the focused prereq test**

Run:

```bash
node --test tests/desktop-rust-release-prereqs.test.mjs
```

Expected:

- PASS

**Step 4: Check the desktop workflow contract tests still pass**

Run:

```bash
node --test \
  tests/workflow-desktop-release-command.test.mjs \
  tests/workflow-desktop-shared-build.test.mjs \
  tests/workflow-macos-runner-labels.test.mjs
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add apps/desktop/src-tauri/tauri.conf.json apps/desktop/src-tauri/icons/icon.ico apps/desktop/src-tauri/icons/icon.icns tests/desktop-rust-release-prereqs.test.mjs
git commit -m "fix: restore desktop bundle icon assets"
```

If `icon.icns` is not added, remove it from the `git add` command.

### Task 3: Re-baseline the current macOS Rust build before changing more code

**Files:**
- Inspect/modify if failing: `apps/desktop/src-tauri/Cargo.toml`
- Inspect/modify if failing: `apps/desktop/src-tauri/src/lib.rs`
- Inspect/modify if failing: `apps/desktop/src-tauri/src/agent/mod.rs`
- Inspect/modify if failing: `apps/desktop/src-tauri/src/llm/openai.rs`
- Inspect/modify if failing: `apps/desktop/src-tauri/src/agent/providers/openai.rs`
- Inspect/modify if failing: `apps/desktop/src-tauri/src/agent/providers/local_compat.rs`
- Test: `tests/desktop-rust-release-prereqs.test.mjs`
- Test: `tests/desktop-rust-format-strings.test.mjs`

**Step 1: Run the fast Rust guardrail tests first**

Run:

```bash
node --test \
  tests/desktop-rust-release-prereqs.test.mjs \
  tests/desktop-rust-format-strings.test.mjs
```

Expected:

- PASS before invoking a full desktop build

**Step 2: Run the current desktop compile check on macOS**

Run on a macOS host or macOS Actions runner:

```bash
pnpm --filter @ai-operator/shared build
pnpm --filter @ai-operator/desktop tauri:check
```

Expected:

- PASS if commits `a00b881` and `ef5604f` already removed the `E0599` regressions
- otherwise FAIL with exact Rust compiler lines that identify the remaining source file and API mismatch

**Step 3: Only if `tauri:check` still fails, add the smallest regression test that matches the exact error**

Examples:

- if a broken format string reappears, extend `tests/desktop-rust-format-strings.test.mjs`
- if a broken API usage reappears in `lib.rs`, extend `tests/desktop-rust-release-prereqs.test.mjs`

Do not patch multiple suspected failures at once.

**Step 4: Implement the minimal Rust or Cargo fix**

- touch only the file named by the compiler error
- avoid warning cleanup that is unrelated to the hard failure
- do not add `package.metadata` unless the current build proves it is required to proceed

**Step 5: Re-run the same macOS checks**

Run:

```bash
pnpm --filter @ai-operator/shared build
pnpm --filter @ai-operator/desktop tauri:check
pnpm --filter @ai-operator/desktop tauri:build --bundles dmg
```

Expected:

- PASS
- a `.dmg` appears under `apps/desktop/src-tauri/target/release/bundle/dmg`

**Step 6: Commit**

```bash
git add apps/desktop/src-tauri/Cargo.toml apps/desktop/src-tauri/src/lib.rs apps/desktop/src-tauri/src/agent/mod.rs apps/desktop/src-tauri/src/llm/openai.rs apps/desktop/src-tauri/src/agent/providers/openai.rs apps/desktop/src-tauri/src/agent/providers/local_compat.rs tests/desktop-rust-release-prereqs.test.mjs tests/desktop-rust-format-strings.test.mjs
git commit -m "fix: stabilize desktop macos release build"
```

Only include the files that were actually modified.

### Task 4: Verify Windows packaging against the same source tree

**Files:**
- Modify if needed: `apps/desktop/src-tauri/tauri.conf.json`
- Modify if needed: `tests/desktop-rust-release-prereqs.test.mjs`
- Modify if needed: `.github/workflows/desktop-release.yml`
- Test: `tests/workflow-desktop-release-command.test.mjs`
- Test: `tests/workflow-desktop-shared-build.test.mjs`

**Step 1: Run the Windows desktop bundle command**

Run on Windows or `windows-latest`:

```bash
pnpm --filter @ai-operator/shared build
pnpm --filter @ai-operator/desktop tauri:build --bundles msi
```

Expected:

- PASS
- no `icons/icon.ico not found` error
- an `.msi` appears under `apps/desktop/src-tauri/target/release/bundle/msi`

**Step 2: If the build still prints `package.metadata does not exist`, classify it before changing code**

- If the MSI is produced, treat the line as informational and leave the source alone.
- If the build still fails and the failure is truly tied to missing metadata, identify the exact Tauri or bundler field that is required, add only that field, and back it with a focused test or workflow assertion.

**Step 3: Re-run the workflow contract tests**

Run:

```bash
node --test \
  tests/workflow-desktop-release-command.test.mjs \
  tests/workflow-desktop-shared-build.test.mjs \
  tests/workflow-macos-runner-labels.test.mjs
```

Expected:

- PASS

**Step 4: Commit**

```bash
git add apps/desktop/src-tauri/tauri.conf.json .github/workflows/desktop-release.yml tests/desktop-rust-release-prereqs.test.mjs tests/workflow-desktop-release-command.test.mjs tests/workflow-desktop-shared-build.test.mjs tests/workflow-macos-runner-labels.test.mjs
git commit -m "fix: validate desktop windows release packaging"
```

Only include the files that changed.

### Task 5: Lock the GitHub Release asset contract to the API consumer

**Files:**
- Create: `tests/release-desktop-assets.test.mjs`
- Inspect/modify: `apps/api/src/lib/releases/resolveDesktopAssets.ts`
- Inspect/modify: `scripts/release/verify-github-release.mjs`
- Inspect/modify: `.github/workflows/desktop-release.yml`

**Step 1: Write the failing contract test**

Add a node test that verifies the desktop asset naming contract is identical between the workflow and the API resolver.

Minimum assertions:

```js
assert.deepEqual(buildDesktopAssetNames('0.0.6'), {
  'windows-x86_64': 'ai-operator-desktop_0.0.6_windows_x86_64.msi',
  'macos-x86_64': 'ai-operator-desktop_0.0.6_macos_x86_64.dmg',
  'macos-aarch64': 'ai-operator-desktop_0.0.6_macos_aarch64.dmg',
});
```

Also assert that stable verification expects `.sig` files while beta verification rejects them.

**Step 2: Run test to verify it fails if there is any drift**

Run:

```bash
node --test tests/release-desktop-assets.test.mjs
```

Expected:

- PASS if no drift exists
- FAIL if workflow names, resolver names, or verifier expectations disagree

**Step 3: Repair any drift at the narrowest boundary**

- prefer fixing naming drift in the workflow normalization step or `resolveDesktopAssets.ts`
- keep the asset names aligned with the already documented convention in `docs/releasing.md`

**Step 4: Re-run the focused release tests**

Run:

```bash
node --test \
  tests/release-desktop-assets.test.mjs \
  tests/workflow-desktop-release-command.test.mjs \
  tests/workflow-desktop-shared-build.test.mjs \
  tests/workflow-macos-runner-labels.test.mjs
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add tests/release-desktop-assets.test.mjs apps/api/src/lib/releases/resolveDesktopAssets.ts scripts/release/verify-github-release.mjs .github/workflows/desktop-release.yml
git commit -m "test: lock desktop release asset contract"
```

Only include the files that changed.

### Task 6: Run end-to-end release verification before calling it fixed

**Files:**
- No new source file required unless verification reveals a real bug

**Step 1: Re-run platform packaging in the exact release order**

Run on the correct hosts:

```bash
pnpm --filter @ai-operator/shared build
pnpm --filter @ai-operator/desktop tauri:build --bundles msi
pnpm --filter @ai-operator/desktop tauri:build --bundles dmg
```

Expected:

- Windows MSI build succeeds
- macOS DMG build succeeds on both Intel and Apple Silicon runners

**Step 2: Run GitHub Release verification after the workflow publishes assets**

Run:

```bash
GITHUB_REPO_OWNER=<owner> \
GITHUB_REPO_NAME=<repo> \
RELEASE_TAG=<tag> \
CHANNEL=<stable-or-beta> \
pnpm release:verify:github
```

Expected:

- PASS
- stable sees all installers plus `.sig` files
- beta sees installers and no `.sig` files

**Step 3: Run API verification in GitHub-backed release mode**

Set:

```bash
DESKTOP_RELEASE_SOURCE=github
DESKTOP_RELEASE_TAG=<tag-or-latest>
GITHUB_REPO_OWNER=<owner>
GITHUB_REPO_NAME=<repo>
```

Then run:

```bash
API_BASE=<api-base> \
USER_EMAIL=<user-email> \
USER_PASSWORD=<password> \
ADMIN_API_KEY=<admin-key> \
pnpm release:verify:api
```

Expected:

- `/downloads/desktop` returns the GitHub-backed URLs
- `/updates/desktop/{platform}/{arch}/{version}.json` returns signed manifests for stable releases

**Step 4: If verification fails, return to the layer that failed**

- packaging failure: desktop source or Tauri config
- release asset failure: workflow normalization/signing
- API failure: release resolver or download/update endpoint logic

Do not bundle fixes across layers without a fresh failing command.

**Step 5: Commit**

```bash
git add .
git commit -m "chore: verify desktop release recovery"
```

Replace `git add .` with an explicit file list if unrelated workspace changes exist.
