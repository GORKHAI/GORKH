# Full Suite Failure Accounting

Run: `2026-04-28T09:13:42+00:00`  
Branch: `feature/byo-key-fix`  
Version: `0.0.41`

## Commands Run

```bash
node --import tsx --test --test-force-exit tests/*.test.mjs tests/*.test.ts
```

Also run separately:

```bash
node --import tsx --test --test-force-exit tests/desktop-*.test.* tests/shared-*.test.*
```

## Summary

| Metric | Count |
|--------|-------|
| Total tests | 299 |
| Pass | 291 |
| Fail | 7 |
| Skipped | 1 (`redis device command e2e requires REDIS_URL`) |
| Cancelled | 0 |

## Failing Tests (7)

### 1. `tests/api-desktop-session.test.mjs:29`
**Name:** `desktop session helper revokes only the addressed device token and leaves sibling devices untouched`

**Error:**
```
AssertionError: Expected values to be strictly deep-equal:
+ actual - expected
  {
+   error: 'UNAUTHORIZED',
+   ok: false
-   deviceId: 'desktop-a',
-   ok: true,
-   userId: 'user-1'
  }
```

**Category:** E) unrelated product area (API auth / session management)  
**Pre-existing:** Yes — this test exercises the Fastify session revocation route and fails because the device-token auth layer returns `UNAUTHORIZED` instead of revoking the targeted session. No files touched in the last two patches affect API auth.  
**Related to computer-use / provider / security:** No.

---

### 2. `tests/web-branding-gorkh.test.mjs:8`
**Name:** `web app branding and shell shift to GORKH for the retail surface`

**Error:**
```
AssertionError: The input did not match the regular expression /title:\s*'GORKH'|title:\s*`GORKH`/
Input: title: 'GORKH — AI That Runs on Your Mac',
```

**Category:** E) unrelated product area (web portal Next.js metadata)  
**Pre-existing:** Yes — the Next.js layout metadata title includes a subtitle (`GORKH — AI That Runs on Your Mac`) but the test expects an exact match on `'GORKH'`. This is a stale assertion in the web portal, untouched by desktop patches.  
**Related to computer-use / provider / security:** No.

---

### 3. `tests/web-download-trust-messaging.test.mjs:7`
**Name:** `desktop download page distinguishes beta trust between macOS and Windows instead of making a generic signed-release claim`

**Error:**
```
AssertionError: download page should clearly state the macOS beta trust posture
expected: /macOS beta.*Developer ID signed.*notarized|Developer ID signed and notarized.*macOS beta/i
```

**Category:** E) unrelated product area (web download page copy)  
**Pre-existing:** Yes — the web download page does not contain the expected trust-messaging copy about macOS beta / Developer ID / notarization. No desktop files were changed for this page.  
**Related to computer-use / provider / security:** No.

---

### 4. `tests/web-download-trust-messaging.test.mjs:41`
**Name:** `desktop download page scopes direct downloads separately from updater-feed truth`

**Error:**
```
AssertionError: download page should avoid implying the current direct-download path is the full stable updater truth
expected: /Automatic updates are configured\s+separately|updater feeds are configured\s+separately|stable auto-update/i
```

**Category:** E) unrelated product area (web download page copy)  
**Pre-existing:** Yes — same web download page lacks updater-feed separation copy.  
**Related to computer-use / provider / security:** No.

---

### 5. `tests/web-download-trust-messaging.test.mjs:51`
**Name:** `desktop download page only renders the Windows download action when a Windows URL exists`

**Error:**
```
AssertionError: download page should handle mac-only stable releases without rendering a broken Windows download button
expected: /downloads\.windowsUrl\s*\?/
```

**Category:** E) unrelated product area (web download page conditional rendering)  
**Pre-existing:** Yes — the download page does not conditionally render the Windows button based on `downloads.windowsUrl`.  
**Related to computer-use / provider / security:** No.

---

### 6. `tests/workflow-desktop-release-command.test.mjs:67`
**Name:** `desktop release workflow generates concrete updater config for release builds`

**Error:**
```
AssertionError: Desktop release workflow should generate the concrete updater endpoint path used by packaged clients
expected: /updates\/desktop\/\{\{platform\}\}\/\{\{arch\}\}\/\{\{current_version\}\}\.json/
```

**Category:** E) unrelated product area (GitHub Actions release workflow)  
**Pre-existing:** Yes — the release workflow YAML does not contain the concrete updater endpoint path pattern.  
**Related to computer-use / provider / security:** No.

---

### 7. `tests/workflow-desktop-release-command.test.mjs:111`
**Name:** `desktop release workflow keeps beta macOS artifacts signed and notarized while leaving updater promotion disabled`

**Error:**
```
AssertionError: macOS beta builds should not skip notarization and stapling
operator: doesNotMatch
expected: /Notarize and staple macOS artifact\s*\n\s*if:\s*needs\.prepare\.outputs\.channel == 'stable'/
```

**Category:** E) unrelated product area (GitHub Actions release workflow)  
**Pre-existing:** Yes — the release workflow does not gate notarization on the stable channel in the way the test expects.  
**Related to computer-use / provider / security:** No.

---

## Tests Fixed in This Pass (from 8 → 7 failures)

- `tests/desktop-security-config.test.mjs` — **Fixed**  
  This failure was introduced by replacing `updater:default` with explicit updater permissions in `default.json`. The security test expected the old coarse permission. Updated the test to expect the new explicit permissions (`updater:allow-check`, `updater:allow-download`, `updater:allow-install`, `process:allow-restart`), which are *more* narrowly scoped and therefore preserve the original security intent.

---

## Classification of All 7 Remaining Failures

| # | File | Category | Computer-use | Provider/fallback | Desktop security | CI/test harness | Unrelated product |
|---|------|----------|-------------|-------------------|------------------|-----------------|-------------------|
| 1 | `api-desktop-session.test.mjs` | E | — | — | — | — | ✅ |
| 2 | `web-branding-gorkh.test.mjs` | E | — | — | — | — | ✅ |
| 3 | `web-download-trust-messaging.test.mjs` | E | — | — | — | — | ✅ |
| 4 | `web-download-trust-messaging.test.mjs` | E | — | — | — | — | ✅ |
| 5 | `web-download-trust-messaging.test.mjs` | E | — | — | — | — | ✅ |
| 6 | `workflow-desktop-release-command.test.mjs` | E | — | — | — | — | ✅ |
| 7 | `workflow-desktop-release-command.test.mjs` | E | — | — | — | — | ✅ |

**None** of the remaining failures are in categories A–D (computer-use runtime, provider/fallback behavior, desktop permissions/security, or CI/test harness drift).
