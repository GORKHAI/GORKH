# Desktop-First Auth And Task Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the desktop app the primary product surface by replacing user-facing pairing with browser-based desktop sign-in, then moving task initiation into the desktop while preserving the current run/device security model.

**Architecture:** Keep the existing durable `Device` ownership and `deviceToken` model, but add a short-lived desktop auth handoff flow that uses the system browser plus a loopback callback. Build desktop-first task creation on top of the current `Run` model so the web dashboard becomes secondary rather than being rewritten from scratch.

**Tech Stack:** Fastify, Next.js App Router, Tauri 2, React, TypeScript, node:test, Prisma/Postgres, existing desktop keychain bridge

---

### Task 1: Add desktop auth handoff primitives

**Files:**
- Create: `apps/api/src/lib/desktop-auth.ts`
- Create: `tests/api-desktop-auth.test.mjs`

**Step 1: Write the failing test**

Add tests that assert the desktop auth helper:
- creates a short-lived auth attempt bound to `deviceId`, callback URL, `state`, and nonce
- issues a one-time handoff token
- rejects reuse after a successful consume
- rejects expired handoff tokens
- rejects mismatched state or device id

**Step 2: Run test to verify it fails**

Run: `node --test tests/api-desktop-auth.test.mjs`

Expected: FAIL because no desktop auth helper exists yet.

**Step 3: Write minimal implementation**

Implement an in-memory desktop auth helper for the current single-instance deployment mode:
- register auth attempts
- issue a single-use handoff token
- consume it atomically
- prune expired attempts

**Step 4: Run test to verify it passes**

Run: `node --test tests/api-desktop-auth.test.mjs`

Expected: PASS

### Task 2: Expose desktop auth start and exchange endpoints

**Files:**
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/repos/devices.ts`
- Modify: `tests/api-auth.test.mjs`
- Modify: `tests/api-device-pairing-route.test.mjs`
- Create: `tests/api-desktop-auth-routes.test.mjs`

**Step 1: Write the failing route tests**

Cover:
- `POST /desktop/auth/start`
- `POST /desktop/auth/exchange`
- expired token rejection
- reused token rejection
- exact callback validation

**Step 2: Run tests to verify they fail**

Run: `node --test tests/api-desktop-auth-routes.test.mjs`

Expected: FAIL because the routes do not exist.

**Step 3: Implement the minimal routes**

Add route handlers that:
- validate callback URL and loopback constraints
- create auth attempts
- consume handoff tokens
- issue/rotate durable device tokens on the existing `Device` row
- keep `/devices/:deviceId/pair` intact for migration

**Step 4: Run tests to verify they pass**

Run: `node --test tests/api-desktop-auth-routes.test.mjs tests/api-auth.test.mjs tests/api-device-pairing-route.test.mjs`

Expected: PASS

### Task 3: Add browser desktop sign-in completion flow

**Files:**
- Create: `apps/web/app/desktop/sign-in/page.tsx`
- Create: `apps/web/app/desktop/complete/page.tsx`
- Modify: `apps/web/lib/auth.ts`
- Create: `tests/web-desktop-signin.test.mjs`

**Step 1: Write the failing web flow test**

Assert that the web app:
- exposes a desktop sign-in page
- requires authenticated browser state
- redirects back to the provided loopback callback only after auth validation

**Step 2: Run test to verify it fails**

Run: `node --test tests/web-desktop-signin.test.mjs`

Expected: FAIL because the flow does not exist.

**Step 3: Implement the minimal browser completion flow**

Use the existing browser session model and keep the web dashboard intact.

**Step 4: Run test to verify it passes**

Run: `node --test tests/web-desktop-signin.test.mjs`

Expected: PASS

### Task 4: Add desktop loopback auth runtime and signed-out UX

**Files:**
- Create: `apps/desktop/src/lib/desktopAuth.ts`
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src-tauri/src/lib.rs`
- Modify: `apps/desktop/src-tauri/permissions/desktop-ipc.toml`
- Modify: `tests/desktop-tauri-commands.test.mjs`
- Create: `tests/desktop-auth-flow.test.ts`

**Step 1: Write the failing desktop auth tests**

Cover:
- signed-out desktop shows `Sign in`
- sign-in opens the external browser
- loopback callback data is validated
- successful exchange stores the durable token through the keychain bridge

**Step 2: Run tests to verify they fail**

Run: `node --test tests/desktop-tauri-commands.test.mjs tests/desktop-auth-flow.test.ts`

Expected: FAIL because the auth runtime does not exist.

**Step 3: Implement the minimal desktop flow**

Add:
- desktop signed-out state
- loopback listener management
- browser launch via the audited opener path
- device token persistence and reconnect wiring
- removal of pairing from the primary desktop entry flow

**Step 4: Run tests to verify it passes**

Run: `node --test tests/desktop-tauri-commands.test.mjs tests/desktop-auth-flow.test.ts`

Expected: PASS

### Task 5: Add desktop sign-out and server-side revoke

**Files:**
- Modify: `apps/api/src/index.ts`
- Modify: `apps/desktop/src/App.tsx`
- Create: `tests/api-desktop-auth-logout.test.mjs`
- Modify: `tests/desktop-auth-flow.test.ts`

**Step 1: Write the failing logout tests**

Cover:
- desktop sign-out clears the local token
- API revoke invalidates the matching desktop token
- other desktop sessions for the same user remain valid

**Step 2: Run tests to verify they fail**

Run: `node --test tests/api-desktop-auth-logout.test.mjs tests/desktop-auth-flow.test.ts`

Expected: FAIL because logout/revoke does not exist.

**Step 3: Implement the minimal revoke flow**

Keep revocation scoped to the current desktop only.

**Step 4: Run tests to verify it passes**

Run: `node --test tests/api-desktop-auth-logout.test.mjs tests/desktop-auth-flow.test.ts`

Expected: PASS

### Task 6: Add desktop account/readiness bootstrap

**Files:**
- Modify: `apps/api/src/index.ts`
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/components/SettingsPanel.tsx`
- Create: `tests/api-desktop-bootstrap.test.mjs`

**Step 1: Write the failing bootstrap tests**

Cover:
- desktop can fetch account/subscription status
- desktop can fetch readiness-related account data without the dashboard

**Step 2: Run tests to verify they fail**

Run: `node --test tests/api-desktop-bootstrap.test.mjs`

Expected: FAIL because the bootstrap endpoint does not exist.

**Step 3: Implement the minimal bootstrap endpoint and desktop wiring**

Return only the account data the desktop needs.

**Step 4: Run tests to verify it passes**

Run: `node --test tests/api-desktop-bootstrap.test.mjs`

Expected: PASS

### Task 7: Add desktop-initiated task creation on the existing run model

**Files:**
- Modify: `apps/api/src/index.ts`
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/components/RunPanel.tsx`
- Create: `tests/api-desktop-runs.test.mjs`
- Create: `tests/desktop-task-creation.test.ts`

**Step 1: Write the failing task-creation tests**

Cover:
- desktop can create a run directly
- backend persists it as a normal `Run`
- the existing web dashboard still observes it through current APIs/SSE

**Step 2: Run tests to verify they fail**

Run: `node --test tests/api-desktop-runs.test.mjs tests/desktop-task-creation.test.ts`

Expected: FAIL because desktop-initiated task creation is not wired.

**Step 3: Implement the minimal desktop-first task path**

Reuse the current `POST /runs` path if possible; add a desktop-specific path only if needed.

**Step 4: Run tests to verify it passes**

Run: `node --test tests/api-desktop-runs.test.mjs tests/desktop-task-creation.test.ts`

Expected: PASS

### Task 8: Demote dashboard-first UX and add migration docs

**Files:**
- Modify: `apps/web/app/dashboard/page.tsx`
- Create: `docs/desktop-signin-flow.md`
- Create: `docs/migration-pairing-to-signin.md`
- Modify: `README.md`
- Create: `tests/web-dashboard-secondary-flow.test.mjs`

**Step 1: Write the failing dashboard/docs test**

Cover:
- dashboard messaging treats web task creation as secondary/admin/fallback
- pairing is no longer positioned as the primary operator flow

**Step 2: Run test to verify it fails**

Run: `node --test tests/web-dashboard-secondary-flow.test.mjs`

Expected: FAIL because the dashboard still presents the old flow.

**Step 3: Implement the minimal UX and docs changes**

Keep legacy functionality, but demote it.

**Step 4: Run test to verify it passes**

Run: `node --test tests/web-dashboard-secondary-flow.test.mjs`

Expected: PASS

### Task 9: Verify the full repo gates

**Files:**
- Modify: none

**Step 1: Run targeted tests**

Run:
- `node --test tests/api-desktop-auth.test.mjs`
- `node --test tests/api-desktop-auth-routes.test.mjs`
- `node --test tests/api-desktop-auth-logout.test.mjs`
- `node --test tests/api-desktop-bootstrap.test.mjs`
- `node --test tests/api-desktop-runs.test.mjs`
- `node --test tests/web-desktop-signin.test.mjs`
- `node --test tests/web-dashboard-secondary-flow.test.mjs`
- `node --test tests/desktop-auth-flow.test.ts tests/desktop-task-creation.test.ts`

**Step 2: Run core repo verification**

Run:
- `pnpm -w build`
- `pnpm -w typecheck`
- `pnpm -w test`
- `pnpm check:desktop:security`
- `pnpm smoke:final`

**Step 3: Commit**

Commit only after all checks pass and the desktop-first flow is verified end to end.
