# Pretag Release Fix Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the remaining release-truth blockers before cutting the next macOS-focused desktop beta tag.

**Architecture:** Keep the current desktop-first architecture and release pipeline intact. Fix only the launch-critical truth gaps: version enforcement, launch-facing branding, multi-display input mapping, honest beta download messaging, and small desktop persistence/polish issues. Avoid risky backend contract or updater-prefix rewrites right before beta.

**Tech Stack:** GitHub Actions, Node.js, pnpm, Turbo, Fastify, Next.js App Router, React, Tauri 2, Rust, Node test runner

---

## Phase Order

1. **Phase A:** Version truth + branding truth
2. **Phase B:** Multi-display control correctness
3. **Phase C:** Download page trust messaging + file-mode truth boundaries
4. **Phase D:** Workspace persistence + leftover launch-truth polish

## Status

- Phase A: completed and verified
- Phase B: in progress
- Phase C: pending
- Phase D: pending

## Deferred Risk Boundary

- Keep the existing `ai-operator-desktop_*` asset filename prefix for this pre-tag pass unless a later phase proves a coordinated rename is low-risk.
- Reason: the API GitHub release resolver, release verification scripts, and existing tests already depend on that prefix.
- Treat that as technical naming debt, not a blocker for the next internal macOS beta.

### Task 1: Phase A - Version truth + branding truth

**Files:**
- Modify: `.github/workflows/desktop-release.yml`
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/index.html`
- Modify: `apps/api/src/lib/root-route.ts`
- Modify: `apps/api/test/root-route.test.mjs`
- Modify: `tests/desktop-branding-gorkh.test.mjs`
- Modify: `tests/workflow-desktop-release-command.test.mjs`
- Create or modify: `tests/workflow-desktop-release-version-truth.test.mjs`

**Step 1: Write the failing tests**

- Add a workflow test that requires `desktop-release.yml` to:
  - run `node scripts/version-check.mjs`
  - derive the release version from `VERSION` for manual runs
  - fail when a pushed tag disagrees with the checked-in `VERSION`
  - use `GORKH Desktop` for the GitHub release name
- Add or update a desktop branding/version test that requires:
  - `apps/desktop/index.html` title to use `GORKH`
  - `apps/desktop/src/App.tsx` to stop hardcoding `appVersion: '0.0.6'`
- Update the API root-route test to require `GORKH API`

**Step 2: Run the focused tests to verify they fail**

Run:

```bash
node --test tests/desktop-branding-gorkh.test.mjs tests/workflow-desktop-release-command.test.mjs apps/api/test/root-route.test.mjs
```

Expected:
- branding test fails on `AI Operator Desktop`
- workflow test fails because version sync/tag enforcement is missing
- root-route test fails because it still returns `AI Operator API`

**Step 3: Write the minimal implementation**

- Make `VERSION` the release workflow source of truth for manual runs.
- Add a version-sync gate to `desktop-release.yml` with `node scripts/version-check.mjs`.
- Add a tag-vs-`VERSION` check for tag-triggered release runs.
- Replace launch-facing release names from `AI Operator Desktop` to `GORKH Desktop`.
- Remove the hardcoded desktop runtime `appVersion` literal and read the checked-in version from source.
- Update `apps/desktop/index.html` title to `GORKH Desktop`.
- Update the API root route name to `GORKH API`.

**Step 4: Run focused tests to verify they pass**

Run:

```bash
node --test tests/desktop-branding-gorkh.test.mjs tests/workflow-desktop-release-command.test.mjs tests/workflow-desktop-release-version-truth.test.mjs apps/api/test/root-route.test.mjs
```

Expected:
- all pass

**Step 5: Run full verification gates**

Run:

```bash
pnpm check:desktop:security
pnpm -w typecheck
pnpm -w build
pnpm -w test
pnpm smoke:final
env CARGO_TARGET_DIR=/tmp/gm7-target cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml --quiet
```

Expected:
- all pass

### Task 2: Phase B - Multi-display control correctness

**Files:**
- Modify: `apps/desktop/src-tauri/src/lib.rs`
- Create or modify: `tests/desktop-multi-display-control.test.mjs`
- Possibly modify: `tests/desktop-tauri-commands.test.mjs`

**Step 1: Write the failing tests**

- Add focused tests that require pointer coordinate mapping to include display origin/offset, not only width and height.
- Lock the selected-display behavior for click and double-click coordinate resolution.

**Step 2: Run the focused tests to verify they fail**

Run:

```bash
node --test tests/desktop-multi-display-control.test.mjs
```

Expected:
- failing assertions around missing display origin handling

**Step 3: Write the minimal implementation**

- Introduce a small helper in Rust that resolves absolute pointer coordinates from:
  - selected display origin
  - selected display dimensions
  - normalized x/y
- Use it for click and double-click.
- Keep scroll and keyboard behavior unchanged.

**Step 4: Run focused tests to verify they pass**

Run:

```bash
node --test tests/desktop-multi-display-control.test.mjs
```

Expected:
- pass

**Step 5: Run full verification gates**

Run the full gate list from Task 1 Step 5.

### Task 3: Phase C - Download page trust messaging + file-mode truth boundaries

**Files:**
- Modify: `apps/web/app/download/page.tsx`
- Create or modify: `tests/web-download-desktop-first.test.mjs`
- Possibly create: `tests/web-download-trust-messaging.test.mjs`

**Step 1: Write the failing tests**

- Add tests requiring download messaging to:
  - avoid generic signed-claim language for beta Windows artifacts
  - distinguish macOS beta trust from Windows beta trust
  - state that file mode is acceptable for direct downloads without implying public-stable updater truth

**Step 2: Run the focused tests to verify they fail**

Run:

```bash
node --test tests/web-download-desktop-first.test.mjs tests/web-download-trust-messaging.test.mjs
```

Expected:
- failing assertions on current trust copy

**Step 3: Write the minimal implementation**

- Update copy and badges on `/download`.
- Keep existing fetch/data flow unchanged.
- Do not change backend contracts.

**Step 4: Run focused tests to verify they pass**

Run:

```bash
node --test tests/web-download-desktop-first.test.mjs tests/web-download-trust-messaging.test.mjs
```

Expected:
- pass

**Step 5: Run full verification gates**

Run the full gate list from Task 1 Step 5.

### Task 4: Phase D - Workspace persistence + leftover launch-truth polish

**Files:**
- Modify: `apps/desktop/src-tauri/src/workspace.rs`
- Modify: `apps/desktop/src/lib/workspace.ts`
- Possibly modify: `apps/desktop/src-tauri/src/lib.rs`
- Create or modify: `tests/desktop-workspace-persistence.test.mjs`
- Possibly modify: `tests/desktop-branding-gorkh.test.mjs`

**Step 1: Write the failing tests**

- Add tests requiring workspace configuration to survive restart-level persistence boundaries.
- Add any low-risk branding-polish assertions for launch-facing paths if changed.

**Step 2: Run the focused tests to verify they fail**

Run:

```bash
node --test tests/desktop-workspace-persistence.test.mjs
```

Expected:
- failing assertions because workspace state is currently memory-only

**Step 3: Write the minimal implementation**

- Persist workspace root to a safe local app data file or equivalent Tauri-managed storage path.
- Preserve existing workspace path validation and sandbox rules.
- Keep low-risk legacy identifier cleanup limited to launch-facing truth and backwards-safe migrations.

**Step 4: Run focused tests to verify they pass**

Run:

```bash
node --test tests/desktop-workspace-persistence.test.mjs
```

Expected:
- pass

**Step 5: Run full verification gates**

Run the full gate list from Task 1 Step 5.
