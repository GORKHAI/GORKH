# Retail Local AI Self-Setup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver a retail-grade Free AI setup flow on macOS and Windows so the desktop app can detect, install, start, and verify its local AI runtime itself without requiring users to run terminal commands.

**Architecture:** Build on the existing `local_ai.rs` manager instead of replacing it. Add a managed runtime manifest and installer backend for macOS and Windows first, then layer runtime start/model bootstrap on top, then replace the current overloaded setup UI with a guided onboarding flow and move provider/runtime internals into an `Advanced` section.

**Tech Stack:** Tauri 2, Rust, React, TypeScript, existing desktop IPC allowlist, Node test runner

---

### Task 1: Save The Approved Design Inputs In Tests

**Files:**
- Modify: `tests/desktop-local-ai-manager.test.mjs`
- Modify: `tests/desktop-task-readiness.test.ts`
- Modify: `tests/desktop-retail-ux.test.mjs`

**Step 1: Write the failing tests**

Add assertions that:

- the local AI manager exposes a managed runtime concept rather than only a detected external service
- the retail setup path distinguishes `required setup` from optional upgrades
- the default desktop onboarding copy does not require provider jargon on the primary setup path

**Step 2: Run tests to verify they fail**

Run:

```bash
node --test tests/desktop-local-ai-manager.test.mjs
node --test tests/desktop-retail-ux.test.mjs
node --import tsx --test tests/desktop-task-readiness.test.ts
```

Expected:

- failures proving the current desktop still exposes an incomplete retail setup path

**Step 3: Commit**

```bash
git add tests/desktop-local-ai-manager.test.mjs tests/desktop-retail-ux.test.mjs tests/desktop-task-readiness.test.ts
git commit -m "test: capture retail local AI setup requirements"
```

### Task 2: Add Managed Runtime Asset Manifest Support

**Files:**
- Create: `apps/desktop/src-tauri/src/local_ai_manifest.rs`
- Modify: `apps/desktop/src-tauri/src/local_ai.rs`
- Test: `tests/desktop-local-ai-manager.test.mjs`

**Step 1: Write the failing test**

Add assertions for a cross-platform runtime manifest contract that includes:

- runtime version
- target platform
- download URL
- checksum
- binary relative path

**Step 2: Run test to verify it fails**

Run:

```bash
node --test tests/desktop-local-ai-manager.test.mjs
```

Expected:

- FAIL because the manifest module and fields do not exist yet

**Step 3: Write minimal implementation**

Implement:

- a Rust manifest type for runtime assets
- platform target resolution for macOS and Windows
- a helper that selects the correct runtime artifact for the current machine

Do not add downloading yet. Only define and resolve the manifest.

**Step 4: Run tests**

Run:

```bash
node --test tests/desktop-local-ai-manager.test.mjs
env CARGO_TARGET_DIR=/tmp/gm7-target cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml --quiet
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add apps/desktop/src-tauri/src/local_ai_manifest.rs apps/desktop/src-tauri/src/local_ai.rs tests/desktop-local-ai-manager.test.mjs
git commit -m "feat: add managed local AI runtime manifest"
```

### Task 3: Implement Managed Runtime Download And Provisioning

**Files:**
- Modify: `apps/desktop/src-tauri/src/local_ai.rs`
- Modify: `apps/desktop/src-tauri/src/lib.rs`
- Modify: `apps/desktop/src-tauri/permissions/desktop-ipc.toml`
- Test: `tests/desktop-local-ai-install-runtime.test.mjs`
- Test: `tests/desktop-tauri-commands.test.mjs`

**Step 1: Write the failing tests**

Add coverage for:

- runtime install progress stages moving through `planned -> installing -> installed`
- macOS and Windows managed runtime artifact selection
- continued support for `adopt existing install` when a compatible runtime already exists

**Step 2: Run tests to verify failure**

Run:

```bash
node --test tests/desktop-local-ai-install-runtime.test.mjs
node --test tests/desktop-tauri-commands.test.mjs
```

Expected:

- FAIL because the current installer only adopts an existing Ollama binary

**Step 3: Write minimal implementation**

Extend `local_ai.rs` so `install_start` can:

- fetch runtime manifest metadata
- download the selected runtime archive
- verify checksum metadata
- unpack/copy the runtime into the managed runtime directory
- persist runtime version/source metadata

Keep existing-install adoption as a fallback path, not the primary path.

**Step 4: Run tests**

Run:

```bash
node --test tests/desktop-local-ai-install-runtime.test.mjs
node --test tests/desktop-tauri-commands.test.mjs
env CARGO_TARGET_DIR=/tmp/gm7-target cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml --quiet
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add apps/desktop/src-tauri/src/local_ai.rs apps/desktop/src-tauri/src/lib.rs apps/desktop/src-tauri/permissions/desktop-ipc.toml tests/desktop-local-ai-install-runtime.test.mjs tests/desktop-tauri-commands.test.mjs
git commit -m "feat: provision managed local AI runtime"
```

### Task 4: Add Runtime Start, Health Checks, And Model Bootstrap

**Files:**
- Modify: `apps/desktop/src-tauri/src/local_ai.rs`
- Modify: `apps/desktop/src/lib/localAi.ts`
- Test: `tests/desktop-local-ai-manager.test.mjs`
- Test: `tests/desktop-main-flow-provider-runtime.test.mjs`

**Step 1: Write the failing tests**

Add assertions that:

- managed runtime setup reaches `ready` only after health checks pass
- the default model is pulled automatically
- the reported selected model matches the chosen tier plan

**Step 2: Run tests to verify failure**

Run:

```bash
node --test tests/desktop-local-ai-manager.test.mjs
node --test tests/desktop-main-flow-provider-runtime.test.mjs
```

Expected:

- FAIL because the current installer does not own full runtime bootstrap

**Step 3: Write minimal implementation**

Add backend logic to:

- launch the managed runtime after provisioning
- poll the service endpoint until healthy
- pull the default tier model automatically
- persist progress and status transitions:
  - `installed`
  - `starting`
  - `ready`
  - `error`

**Step 4: Run tests**

Run:

```bash
node --test tests/desktop-local-ai-manager.test.mjs
node --test tests/desktop-main-flow-provider-runtime.test.mjs
env CARGO_TARGET_DIR=/tmp/gm7-target cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml --quiet
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add apps/desktop/src-tauri/src/local_ai.rs apps/desktop/src/lib/localAi.ts tests/desktop-local-ai-manager.test.mjs tests/desktop-main-flow-provider-runtime.test.mjs
git commit -m "feat: bootstrap managed local AI runtime and models"
```

### Task 5: Keep Existing-Install Adoption As An Advanced Path

**Files:**
- Modify: `apps/desktop/src-tauri/src/local_ai.rs`
- Modify: `apps/desktop/src/lib/localAi.ts`
- Test: `tests/desktop-local-provider-runtime.test.mjs`

**Step 1: Write the failing test**

Add a test that ensures:

- a compatible existing local runtime is detected cleanly
- the app can adopt it without forcing managed download
- incompatible installs fall back to `Use GORKH-managed install`

**Step 2: Run test to verify failure**

Run:

```bash
node --test tests/desktop-local-provider-runtime.test.mjs
```

Expected:

- FAIL because the current path does not clearly separate retail-managed vs advanced-existing flows

**Step 3: Write minimal implementation**

Add explicit runtime source states and adoption decisions to the local AI status payload so the UI can explain:

- `Managed by GORKH`
- `Using existing local runtime`
- `Existing runtime incompatible`

**Step 4: Run tests**

Run:

```bash
node --test tests/desktop-local-provider-runtime.test.mjs
env CARGO_TARGET_DIR=/tmp/gm7-target cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml --quiet
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add apps/desktop/src-tauri/src/local_ai.rs apps/desktop/src/lib/localAi.ts tests/desktop-local-provider-runtime.test.mjs
git commit -m "feat: support existing local AI runtime adoption"
```

### Task 6: Replace The Current Free AI Surface With Guided Retail Onboarding

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/components/FreeAiSetupCard.tsx`
- Create: `apps/desktop/src/components/DesktopOnboardingCard.tsx`
- Test: `tests/desktop-free-ai-onboarding.test.ts`
- Test: `tests/desktop-retail-ux.test.mjs`

**Step 1: Write the failing tests**

Add assertions that the default setup surface:

- uses one primary `Set Up Free AI` action
- renders plain-language steps
- keeps provider/model details off the primary flow
- treats `Vision Boost` as optional and secondary

**Step 2: Run tests to verify failure**

Run:

```bash
node --import tsx --test tests/desktop-free-ai-onboarding.test.ts
node --test tests/desktop-retail-ux.test.mjs
```

Expected:

- FAIL because the current desktop still exposes a dense settings-first setup path

**Step 3: Write minimal implementation**

Create a guided onboarding card that shows:

- `Checking this device`
- `Installing local engine`
- `Downloading AI model`
- `Enable Screen Access`
- `Choose Workspace`
- `Ready`

Keep chat visible but disabled until the required steps are complete.

**Step 4: Run tests**

Run:

```bash
node --import tsx --test tests/desktop-free-ai-onboarding.test.ts
node --test tests/desktop-retail-ux.test.mjs
pnpm --filter @ai-operator/desktop typecheck
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/App.tsx apps/desktop/src/components/FreeAiSetupCard.tsx apps/desktop/src/components/DesktopOnboardingCard.tsx tests/desktop-free-ai-onboarding.test.ts tests/desktop-retail-ux.test.mjs
git commit -m "feat: add guided retail free AI onboarding"
```

### Task 7: Move Runtime And Provider Internals Into Advanced Settings

**Files:**
- Modify: `apps/desktop/src/components/SettingsPanel.tsx`
- Modify: `apps/desktop/src/App.tsx`
- Test: `tests/desktop-task-surface.test.mjs`

**Step 1: Write the failing test**

Add assertions that:

- provider internals are no longer required on the default setup path
- advanced runtime/provider details remain available in settings
- retail setup still exposes repair/retry actions without exposing low-level runtime jargon

**Step 2: Run test to verify failure**

Run:

```bash
node --test tests/desktop-task-surface.test.mjs
```

Expected:

- FAIL because the current settings and setup surfaces are still intermixed

**Step 3: Write minimal implementation**

Refactor settings into:

- retail-ready quick actions
- advanced provider/runtime diagnostics

Keep manual provider controls available for power users, but de-emphasized.

**Step 4: Run tests**

Run:

```bash
node --test tests/desktop-task-surface.test.mjs
pnpm --filter @ai-operator/desktop typecheck
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add apps/desktop/src/components/SettingsPanel.tsx apps/desktop/src/App.tsx tests/desktop-task-surface.test.mjs
git commit -m "feat: simplify desktop setup surface for retail users"
```

### Task 8: Add Repair, Retry, And Recovery Actions

**Files:**
- Modify: `apps/desktop/src-tauri/src/local_ai.rs`
- Modify: `apps/desktop/src/components/FreeAiSetupCard.tsx`
- Modify: `apps/desktop/src/lib/localAi.ts`
- Test: `tests/desktop-local-ai-install-runtime.test.mjs`
- Test: `tests/desktop-free-ai-onboarding.test.ts`

**Step 1: Write the failing tests**

Add assertions for:

- retry after runtime download failure
- repair after unhealthy managed runtime
- recovery when the model is missing but runtime exists

**Step 2: Run tests to verify failure**

Run:

```bash
node --test tests/desktop-local-ai-install-runtime.test.mjs
node --import tsx --test tests/desktop-free-ai-onboarding.test.ts
```

Expected:

- FAIL because recovery actions are not first-class retail flows yet

**Step 3: Write minimal implementation**

Add explicit repair/retry commands and UI actions:

- `Retry download`
- `Repair Free AI`
- `Restart local engine`
- `Download model`

**Step 4: Run tests**

Run:

```bash
node --test tests/desktop-local-ai-install-runtime.test.mjs
node --import tsx --test tests/desktop-free-ai-onboarding.test.ts
env CARGO_TARGET_DIR=/tmp/gm7-target cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml --quiet
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add apps/desktop/src-tauri/src/local_ai.rs apps/desktop/src/components/FreeAiSetupCard.tsx apps/desktop/src/lib/localAi.ts tests/desktop-local-ai-install-runtime.test.mjs tests/desktop-free-ai-onboarding.test.ts
git commit -m "feat: add retail repair flows for free AI setup"
```

### Task 9: Full Verification And Beta Release Readiness

**Files:**
- Verify only

**Step 1: Run focused desktop tests**

Run:

```bash
node --test tests/desktop-local-ai-manager.test.mjs
node --test tests/desktop-local-ai-install-runtime.test.mjs
node --test tests/desktop-local-provider-runtime.test.mjs
node --import tsx --test tests/desktop-free-ai-onboarding.test.ts
node --test tests/desktop-retail-ux.test.mjs
node --test tests/desktop-task-surface.test.mjs
node --test tests/desktop-tauri-commands.test.mjs
```

Expected:

- PASS

**Step 2: Run desktop and repo gates**

Run:

```bash
pnpm --filter @ai-operator/desktop typecheck
pnpm --filter @ai-operator/desktop build
pnpm -w test
env CARGO_TARGET_DIR=/tmp/gm7-target pnpm --filter @ai-operator/desktop tauri:check
```

Expected:

- PASS

**Step 3: Prepare release slice**

Before shipping the first retail setup beta, verify:

- managed runtime assets are available for macOS and Windows
- runtime manifest URLs/checksums match shipped assets
- first-run setup works on clean test machines for both platforms

**Step 4: Commit**

```bash
git add .
git commit -m "feat: ship retail local AI self-setup flow"
```
