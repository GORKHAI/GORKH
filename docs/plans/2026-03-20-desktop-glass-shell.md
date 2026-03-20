# Desktop Glass Shell Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship a new macOS desktop release with a true translucent glass window, a simpler assistant-first home screen, and proper branded bundle icons.

**Architecture:** Keep the existing desktop runtime and assistant flow intact while changing presentation boundaries. The main shell in `App.tsx` becomes lighter and more consumer-facing, the moved operational panels become first-class Settings sections, and Tauri window configuration plus runtime effects provide the macOS glass treatment. Bundle icons are generated from a single brand SVG source and wired into the existing Tauri packaging config.

**Tech Stack:** React 19, TypeScript, Tauri 2, Rust, Vite, existing pnpm/Turbo monorepo tooling

---

### Task 1: Save design docs and preserve current release fix work

**Files:**
- Create: `docs/plans/2026-03-20-desktop-glass-shell-design.md`
- Create: `docs/plans/2026-03-20-desktop-glass-shell.md`

**Step 1: Confirm the approved scope**

Review:
- `apps/desktop/src/App.tsx`
- `apps/desktop/src/components/SettingsPanel.tsx`
- `apps/desktop/src-tauri/tauri.conf.json`
- `apps/desktop/src-tauri/Cargo.toml`

Expected: current shell is opaque, advanced content is still on the home screen, and bundle icons are incomplete for macOS.

**Step 2: Save the approved design**

Write the approved design into:
- `docs/plans/2026-03-20-desktop-glass-shell-design.md`

Expected: design records the macOS private API tradeoff, assistant-first layout, Settings migration, and icon packaging goal.

**Step 3: Save the execution plan**

Write this implementation plan into:
- `docs/plans/2026-03-20-desktop-glass-shell.md`

Expected: implementation tasks are explicit enough for a zero-context engineer.

### Task 2: Add the macOS glass window foundation

**Files:**
- Modify: `apps/desktop/src-tauri/tauri.conf.json`
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/components/SettingsPanel.tsx`
- Test: `apps/desktop/package.json`

**Step 1: Add the failing behavior check**

Run:

```bash
pnpm --filter @ai-operator/desktop build
```

Expected: PASS before changes, establishing the current baseline.

**Step 2: Update Tauri window config**

Modify `apps/desktop/src-tauri/tauri.conf.json` to:
- enable `app.macOSPrivateApi`
- make the main window transparent
- use a transparent or overlay title bar style that still supports dragging and controls

Expected: config expresses the macOS glass intent while keeping other platforms working.

**Step 3: Apply runtime window effects**

Update `apps/desktop/src/App.tsx` to detect macOS at runtime and apply native window effects through the Tauri window API.

Expected: the desktop background becomes visible through the main window on macOS.

**Step 4: Restyle the app shell**

Update `apps/desktop/src/App.tsx` and `apps/desktop/src/components/SettingsPanel.tsx` so the main shell and Settings use translucent surfaces, softer borders, and more spacious layout.

Expected: the app no longer reads like a flat admin dashboard.

**Step 5: Re-run the desktop build**

Run:

```bash
pnpm --filter @ai-operator/desktop build
```

Expected: PASS

### Task 3: Simplify the main screen and move secondary panels into Settings

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/components/SettingsPanel.tsx`

**Step 1: Write the failing UX boundary**

Use the current main render in `apps/desktop/src/App.tsx` as the failure case:
- it still shows advanced readiness/account/activity panels on the home screen
- screen preview and control panels still live under `Advanced`

Expected: this establishes exactly what is being simplified.

**Step 2: Reduce the home screen**

Modify `apps/desktop/src/App.tsx` to keep:
- top status/header
- compact sign-in/session summary
- assistant card and setup blocker
- run panel
- pending approvals

Expected: the first screen is easier to understand for retail users.

**Step 3: Expand Settings into the operational hub**

Modify `apps/desktop/src/components/SettingsPanel.tsx` to add sections for:
- overview/readiness summary
- connected desktops
- recent activity
- screen preview
- remote control

Pass the required data and callbacks from `apps/desktop/src/App.tsx`.

Expected: users can still reach every feature, but secondary controls are no longer crowding the home screen.

**Step 4: Re-run the desktop build**

Run:

```bash
pnpm --filter @ai-operator/desktop build
```

Expected: PASS

### Task 4: Generate and wire the branded bundle icons

**Files:**
- Create: `apps/desktop/src-tauri/icons/icon.svg`
- Modify: `apps/desktop/src-tauri/icons/`
- Modify: `apps/desktop/src-tauri/tauri.conf.json`

**Step 1: Create the source brand icon**

Create `apps/desktop/src-tauri/icons/icon.svg` as a square app icon derived from the approved black `GORKH` badge.

Expected: single source asset matches the provided logo direction.

**Step 2: Generate platform assets**

Generate macOS and cross-platform icon assets from the source icon so the directory contains the bundle formats Tauri expects, including `.icns`.

Expected: Finder and Dock can resolve the real branded icon instead of a generic fallback.

**Step 3: Verify bundle config points at the icon set**

Check `apps/desktop/src-tauri/tauri.conf.json`.

Expected: `bundle.icon` references the generated assets.

### Task 5: Verify the full change and cut the release

**Files:**
- Modify: `VERSION`
- Modify: `apps/api/package.json`
- Modify: `apps/desktop/package.json`
- Modify: `apps/desktop/src-tauri/Cargo.toml`
- Modify: `apps/desktop/src-tauri/tauri.conf.json`
- Test: `tests/api-security.test.mjs`

**Step 1: Run regression checks**

Run:

```bash
node --test tests/api-security.test.mjs
pnpm --filter @ai-operator/api build
pnpm --filter @ai-operator/desktop build
```

Expected: PASS

**Step 2: Review changed files**

Run:

```bash
git status --short
```

Expected: only intended desktop/API/versioning/doc/icon changes are staged for release.

**Step 3: Commit the work**

Run:

```bash
git add VERSION apps/api/package.json apps/api/src/index.ts apps/api/src/lib/security.ts apps/desktop/package.json apps/desktop/src-tauri/Cargo.toml apps/desktop/src-tauri/tauri.conf.json apps/desktop/src/lib/desktopAccount.ts apps/desktop/src/lib/desktopTasks.ts apps/desktop/src/lib/desktopApi.ts apps/desktop/src/App.tsx apps/desktop/src/components/SettingsPanel.tsx apps/desktop/src-tauri/icons docs/plans/2026-03-20-desktop-glass-shell-design.md docs/plans/2026-03-20-desktop-glass-shell.md tests/api-security.test.mjs
git commit -m "feat: ship glass desktop shell"
```

Expected: commit succeeds without including unrelated screenshots or docs.

**Step 4: Tag and push the release**

Run:

```bash
git tag v0.0.11
git push origin main
git push origin v0.0.11
```

Expected: GitHub Actions starts the next desktop release workflow.
