# Desktop Updater Diagnosis Report

Generated: 2026-04-20  
Context: Signed macOS DMG (v0.0.33) built by desktop-release.yml. User clicks "Check for Updates" and gets: **"Could not fetch a valid release JSON from the remote."**

---

## 1. The exact URL the installed DMG is hitting

### Build-time configuration
The updater endpoint URL is baked into the DMG at build time via Tauri config interpolation.

**tauri.conf.json updater block** ([`apps/desktop/src-tauri/tauri.conf.json:52-56`](apps/desktop/src-tauri/tauri.conf.json:52)):
```json
"endpoints": [
  "{{env:VITE_API_HTTP_BASE}}/updates/desktop/{{platform}}/{{arch}}/{{current_version}}.json"
]
```

**What Tauri substitutes at runtime on macOS Apple Silicon:**
- `{{platform}}` → `darwin` (Tauri 2 native platform identifier for macOS)
- `{{arch}}` → `aarch64` (Apple Silicon)
- `{{current_version}}` → `0.0.33` (from `tauri.conf.json` `version` field)

**Final expected URL pattern:**
```
https://<VITE_API_HTTP_BASE>/updates/desktop/darwin/aarch64/0.0.33.json
```

### Where VITE_API_HTTP_BASE comes from in CI
**`.github/workflows/desktop-release.yml:112`** (prepare job):
```yaml
env:
  VITE_API_HTTP_BASE: ${{ vars.VITE_API_HTTP_BASE }}
```

**`.github/workflows/desktop-release.yml:324`** (build-windows job):
```yaml
env:
  VITE_API_HTTP_BASE: ${{ vars.VITE_API_HTTP_BASE }}
```

**`.github/workflows/desktop-release.yml:447`** (build-macos job):
```yaml
env:
  VITE_API_HTTP_BASE: ${{ vars.VITE_API_HTTP_BASE }}
```

**Conclusion:** `VITE_API_HTTP_BASE` is read from a **GitHub Actions repository variable** (`vars.VITE_API_HTTP_BASE`), not a secret, not hardcoded. The exact value is not visible in the repo.

### Validation performed in CI
**`.github/workflows/desktop-release.yml:109-183`** — "Validate desktop API runtime variables" step:
- Validates `VITE_API_HTTP_BASE`, `VITE_API_WS_URL`, `APP_BASE_URL` are all present, absolute URLs, using `https://` protocol, and that HTTP base and WS URL share the same host/port.
- For **stable** builds specifically (lines 376-392 for Windows, 506-537 for macOS), the workflow writes a temporary Tauri config that sets the updater endpoint to:
  ```
  ${VITE_API_HTTP_BASE%/}/updates/desktop/{{platform}}/{{arch}}/{{current_version}}.json
  ```

### API route handler accepts these exact values
**`apps/api/src/index.ts:1666`**:
```ts
fastify.get('/updates/desktop/:platform/:arch/:currentVersion.json', async (request, reply) => { ... })
```

The route handler does not restrict `platform` or `arch` to a whitelist at the routing layer. Inside `getDesktopUpdateManifest()` ([`index.ts:626`](apps/api/src/index.ts:626)), the `platformMap` explicitly includes both `darwin-x86_64` and `darwin-aarch64` ([`index.ts:657-658`](apps/api/src/index.ts:657)):
```ts
'darwin-x86_64': resolved.macIntel,
'darwin-aarch64': resolved.macArm,
```

**Unverified:** We do not know the exact production value of `vars.VITE_API_HTTP_BASE` and therefore cannot construct the absolute URL to probe.

---

## 2. Live probe of the production endpoint

**Status: Could not reach the production API.**

The production base URL is stored in GitHub Actions variables (`vars.VITE_API_HTTP_BASE`) and/or Render environment variables. It is not committed to the repository. We attempted to probe several candidate URLs based on references found in test files:

| Candidate URL | Result |
|---------------|--------|
| `https://gm7.onrender.com/updates/desktop/darwin/aarch64/0.0.33.json` | HTTP 404 |
| `https://ai-operator-api.onrender.com/updates/desktop/darwin/aarch64/0.0.33.json` | HTTP 404 |
| `https://gorkh-api.onrender.com/updates/desktop/darwin/aarch64/0.0.33.json` | HTTP 404 |

**What's needed:** The exact production `VITE_API_HTTP_BASE` value (e.g., `https://api.gorkh.app`) to perform live probes.

---

## 3. API endpoint logic trace

### Route handler ([`apps/api/src/index.ts:1666-1695`](apps/api/src/index.ts:1666))

Line-by-line behavior:
1. **Line 1667:** If `config.DESKTOP_UPDATE_ENABLED` is `false`, returns **HTTP 204** (Tauri's documented convention for "no update available"). This would **not** produce the observed error.
2. **Line 1674-1678:** Extracts `platform`, `arch`, `currentVersion` from route params.
3. **Line 1681:** Calls `getDesktopUpdateManifest(platform, arch, currentVersion)`.
4. **Line 1683-1693:** If `getDesktopUpdateManifest` throws:
   - If error message is `'Invalid update target'` → **HTTP 400**
   - Otherwise → **HTTP 503** with body `{ error: 'Desktop updater release feed is unavailable. Check release feed configuration.' }`

### `getDesktopUpdateManifest()` ([`index.ts:626-686`](apps/api/src/index.ts:626))

**File mode** (`DESKTOP_RELEASE_SOURCE === 'file'`):
- Reads `desktop-${platform}-${arch}.json` from `config.DESKTOP_UPDATE_FEED_DIR`.
- Validates with `validateDesktopUpdateManifest()`.

**GitHub mode** (`DESKTOP_RELEASE_SOURCE === 'github'`, default):
1. **Line 650:** `fetchDesktopRelease()` — fetches release metadata from GitHub API.
2. **Line 651:** `resolveDesktopAssets(release)` — resolves DMG URLs and signature contents.
3. **Line 652:** Constructs `target = \`${platform}-${arch}\`` → e.g., `darwin-aarch64`.
4. **Lines 653-659:** Platform mapping:
   ```ts
   'windows-x86_64': resolved.windows ?? undefined,
   'macos-x86_64': resolved.macIntel,
   'macos-aarch64': resolved.macArm,
   'darwin-x86_64': resolved.macIntel,
   'darwin-aarch64': resolved.macArm,
   ```
5. **Lines 660-664:** If `targetAsset` is missing → throws `'Invalid update target'`.
6. **Lines 678-685:** Returns manifest:
   ```ts
   {
     version: resolved.version,
     notes: resolved.notes,
     pub_date: resolved.publishedAt ?? new Date().toISOString(),
     platforms: { [target]: targetAsset },
   }
   ```

### `fetchDesktopRelease()` → GitHub API path

**File:** [`apps/api/src/lib/releases/github.ts:125-134`](apps/api/src/lib/releases/github.ts:125)

```ts
export async function fetchDesktopRelease(): Promise<GitHubReleaseResult> {
  const repoPath = getRepoPath();
  const releaseTag = config.DESKTOP_RELEASE_TAG.trim();

  if (!releaseTag || releaseTag === 'latest') {
    return getOrFetchRelease('latest', `${repoPath}/releases/latest`);
  }

  return getOrFetchRelease(`tag:${releaseTag}`, `${repoPath}/releases/tags/${encodeURIComponent(releaseTag)}`);
}
```

**Critical dependency:** `getRepoPath()` ([`github.ts:32-38`](apps/api/src/lib/releases/github.ts:32)):
```ts
function getRepoPath(): string {
  if (!config.GITHUB_REPO_OWNER || !config.GITHUB_REPO_NAME) {
    throw new Error('GitHub desktop releases are not configured');
  }
  return `/repos/${config.GITHUB_REPO_OWNER}/${config.GITHUB_REPO_NAME}`;
}
```

**If `GITHUB_REPO_OWNER` or `GITHUB_REPO_NAME` are empty, `fetchDesktopRelease()` throws immediately.** This throw propagates to the route handler, which returns **HTTP 503** with the error JSON body.

### `resolveDesktopAssets()` — asset name expectations

**File:** [`apps/api/src/lib/releases/resolveDesktopAssets.ts:40-45`](apps/api/src/lib/releases/resolveDesktopAssets.ts:40)

```ts
export function buildDesktopAssetNames(version: string): Record<DesktopTarget, string> {
  return {
    'windows-x86_64': `ai-operator-desktop_${version}_windows_x86_64.msi`,
    'macos-x86_64': `ai-operator-desktop_${version}_macos_x86_64.dmg`,
    'macos-aarch64': `ai-operator-desktop_${version}_macos_aarch64.dmg`,
  };
}
```

For `resolveSignedAsset()` ([`resolveDesktopAssets.ts:66-78`](apps/api/src/lib/releases/resolveDesktopAssets.ts:66)):
- Requires the DMG asset by exact name match.
- Requires the `.sig` asset by exact name match (`${assetName}.sig`).
- Downloads the `.sig` content via `fetchReleaseAssetText()`.

**What happens if `.sig` is missing:** `getRequiredAsset()` throws `Missing release asset: ${name}`.

### Validation rules applied before returning

**File:** [`apps/api/src/lib/releases/validation.ts`](apps/api/src/lib/releases/validation.ts)

Rules that would cause a **reject (throw)**:
1. **Placeholder host** ([`validation.ts:63-64`](apps/api/src/lib/releases/validation.ts:63)): Rejects URLs with `example.com` hostname.
2. **HTTPS enforcement** ([`validation.ts:68-74`](apps/api/src/lib/releases/validation.ts:68)): In strict production mode (`NODE_ENV=production` + `ALLOW_INSECURE_DEV=false`), rejects `http://` and localhost URLs.
3. **Signature regex** ([`validation.ts:91-92`](apps/api/src/lib/releases/validation.ts:91)): `UPDATER_SIGNATURE_PATTERN = /^[A-Za-z0-9+/=_-]{40,}$/`. Rejects signatures that don't match.
4. **Placeholder signature** ([`validation.ts:87-88`](apps/api/src/lib/releases/validation.ts:87)): Rejects signatures containing `replace-with-tauri-signature`, `placeholder-signature`, or `changeme-signature`.
5. **Missing target** ([`validation.ts:131-133`](apps/api/src/lib/releases/validation.ts:131)): `validateDesktopUpdateManifest()` throws if the requested target is not in `platforms`.

**What the API returns when no release matches:**
- If GitHub API returns 404 (release not found): `fetchGitHubJson()` throws → `getDesktopUpdateManifest()` throws → **HTTP 503**.
- If the release exists but the required asset is missing: `getRequiredAsset()` throws → **HTTP 503**.
- If the current version equals the latest version: The API **still returns the manifest** (Tauri performs version comparison client-side).

---

## 4. GitHub Release state

**Repo:** `GORKHAI/GORKH` (determined from git remote).

**Latest release:** `v0.0.33` — marked as `Latest`, **not** a prerelease, published `2026-04-09T11:08:22Z`.

**Assets in v0.0.33:**
| Asset | Size | Type |
|-------|------|------|
| `ai-operator-desktop_0.0.33_macos_aarch64.dmg` | 6,601,348 bytes | DMG |
| `ai-operator-desktop_0.0.33_macos_aarch64.dmg.sig` | 440 bytes | Signature |
| `ai-operator-desktop_0.0.33_macos_x86_64.dmg` | 7,001,101 bytes | DMG |
| `ai-operator-desktop_0.0.33_macos_x86_64.dmg.sig` | 440 bytes | Signature |

**Signature content verification:** Downloaded and inspected both `.sig` files. They contain base64-encoded Tauri minisign signatures (not placeholders). Example (aarch64):
```
dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkK...
```

**Version comparison:** The installed DMG is v0.0.33. The latest release is v0.0.33. Tauri should detect "up to date" and return `null` from `check()` — **not** an error. The error indicates the updater never reached the version-comparison stage because the manifest fetch/parse failed first.

---

## 5. Render/Vercel production config — best-effort audit

**`render.yaml`** ([`render.yaml:1-22`](render.yaml:1)):
```yaml
services:
  - type: web
    name: ai-operator-api
    runtime: docker
    dockerContext: .
    dockerfilePath: apps/api/Dockerfile
    healthCheckPath: /ready
    envVars:
      - key: NODE_ENV
        value: production
      - key: DEPLOYMENT_MODE
        value: single_instance
      - key: RATE_LIMIT_BACKEND
        value: redis
      - key: METRICS_PUBLIC
        value: "false"
      - key: BILLING_ENABLED
        value: "false"
      - key: DESKTOP_RELEASE_SOURCE
        value: github
      - key: DESKTOP_RELEASE_TAG
        value: latest
```

**Flagged omissions in `render.yaml`:**
| Variable | Set in render.yaml? | Default in config.ts | Risk |
|----------|---------------------|----------------------|------|
| `GITHUB_REPO_OWNER` | **NO** | `''` (empty) | **CRITICAL: updater will 503** |
| `GITHUB_REPO_NAME` | **NO** | `''` (empty) | **CRITICAL: updater will 503** |
| `GITHUB_TOKEN` | **NO** | `undefined` | Rate limit risk (60 req/hr anonymous) |
| `DESKTOP_UPDATE_ENABLED` | **NO** | `true` | OK |
| `API_PUBLIC_BASE_URL` | **NO** | `http://localhost:3001` | URL validation may fail in production |

**`.env.prod.example`** ([`.env.prod.example:50-51`](.env.prod.example:50)):
```
GITHUB_REPO_OWNER=
GITHUB_REPO_NAME=
```

These are explicitly empty in the template. If the production deployment used this template without filling them in, the updater endpoint is guaranteed to fail.

---

## 6. Tauri-side updater plugin behavior

### Plugin registration
**`apps/desktop/src-tauri/src/lib.rs:2426`**:
```rust
let builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
```

The updater plugin is registered unconditionally. No custom headers or auth are configured.

### Frontend invocation path
**Settings UI button click:** `SettingsPanel.tsx` receives `onCheckForUpdates` prop.

**`App.tsx:4216`**:
```tsx
onCheckForUpdates={() => runDesktopUpdateCheck(false)}
```

**`App.tsx:568-613`** — `runDesktopUpdateCheck`:
```ts
const runDesktopUpdateCheck = useCallback(async (checkedInBackground: boolean) => {
  if (!DESKTOP_UPDATER_ENABLED || desktopUpdaterActionBusyRef.current) {
    return;
  }
  // ... set state to 'checking' ...
  const result = await checkForDesktopUpdate({
    currentVersion: DESKTOP_APP_VERSION,
    checkedInBackground,
  });
  // ...
}, [replaceDesktopUpdateHandle]);
```

**`apps/desktop/src/lib/desktopUpdater.ts:169-203`** — `checkForDesktopUpdate`:
```ts
export async function checkForDesktopUpdate({ currentVersion, checkedInBackground = false }) {
  try {
    const { check } = await loadUpdaterApi();
    const update = await check();
    // ...
  } catch (error) {
    return {
      update: null,
      state: {
        ...createIdleDesktopUpdaterState(currentVersion),
        status: 'error',
        error: parseDesktopError(error, 'Failed to check for updates').message,
        checkedInBackground,
      },
    };
  }
}
```

**`apps/desktop/src/lib/desktopUpdater.ts:106-109`** — `loadUpdaterApi`:
```ts
async function loadUpdaterApi(): Promise<UpdaterApi> {
  updaterApiPromise ??= import('@tauri-apps/plugin-updater');
  return updaterApiPromise;
}
```

**`@tauri-apps/plugin-updater` JS wrapper** ([`node_modules/.pnpm/.../dist-js/index.js:61-66`](node_modules/.pnpm/@tauri-apps+plugin-updater@2.10.0/node_modules/@tauri-apps/plugin-updater/dist-js/index.js:61)):
```js
async function check(options) {
  convertToRustHeaders(options);
  const metadata = await invoke('plugin:updater|check', { ...options });
  return metadata ? new Update(metadata) : null;
}
```

### Error message source
**"Could not fetch a valid release JSON from the remote"** is **not a custom app string**. It originates from the **Rust side of the Tauri updater plugin** (`tauri-plugin-updater` crate). This is confirmed by:
1. Zero matches for this string in `apps/desktop/src/`.
2. Zero matches in the JS wrapper (`@tauri-apps/plugin-updater/dist-js/index.js`).
3. Multiple confirmed reports in the Tauri ecosystem (e.g., [tauri-apps/tauri#6656](https://github.com/tauri-apps/tauri/issues/6656), [tauri-apps/plugins-workspace#2610](https://github.com/tauri-apps/plugins-workspace/issues/2610)) showing this exact error from the plugin.

**What the error means:** The plugin successfully made an HTTP request to the updater endpoint and received a response, but the response body could not be deserialized into a valid Tauri release manifest. This rules out pure network failures and points to either:
- A non-2xx HTTP status with an error body (e.g., 503)
- A 2xx status with JSON that is missing required fields (`version`, `platforms`, etc.)

---

## 7. Hypothesis ranking

### H1 (most likely): Production API is missing `GITHUB_REPO_OWNER` and `GITHUB_REPO_NAME`
- **Evidence:**
  - `render.yaml` does not set these variables.
  - `.env.prod.example` leaves them empty.
  - `config.ts` defaults them to empty strings.
  - `github.ts:getRepoPath()` throws `'GitHub desktop releases are not configured'` when either is empty.
  - This throw causes `getDesktopUpdateManifest()` to throw, and the route handler returns **HTTP 503** with body `{ error: 'Desktop updater release feed is unavailable...' }`.
  - The Tauri plugin receives this 503 response, tries to parse the error JSON as a release manifest, and fails with **"Could not fetch a valid release JSON from the remote."**
- **Test:** `curl https://<PROD_API>/updates/desktop/darwin/aarch64/0.0.33.json`. If it returns 503 with an `error` field, this hypothesis is confirmed.

### H2: Production API has incorrect `GITHUB_REPO_OWNER` / `GITHUB_REPO_NAME`
- **Evidence:**
  - If the variables are set but point to a non-existent repo or a repo without releases, `fetchGitHubJson()` would throw (`GitHub API request failed (404)`).
  - Same outcome: 503 from API → Tauri parse failure.
- **Test:** Check the Render environment variables for `GITHUB_REPO_OWNER` and `GITHUB_REPO_NAME`. They should be `GORKHAI` and `GORKH` respectively.

### H3: GitHub API rate limit exceeded (anonymous access)
- **Evidence:**
  - `render.yaml` does not set `GITHUB_TOKEN`.
  - Anonymous GitHub API access is capped at 60 requests/hour.
  - The API has a 5-minute cache TTL when no token is present, but a restart clears the cache.
  - If rate-limited, `fetchGitHubJson()` throws → 503 from API.
- **Counter-evidence:** The cache should make 60 req/hr sufficient for normal operation. This is less likely unless the API is restarting frequently or being hit by many clients.
- **Test:** Check API logs for `GitHub API request failed (403)` or check the `x-ratelimit-remaining` header on a direct GitHub API call.

### H4: `DESKTOP_UPDATE_ENABLED` is `false` in production
- **Evidence:**
  - Not set in `render.yaml`; defaults to `true`.
  - If it were `false`, the API would return **HTTP 204**, which Tauri handles as "no update available" — **this would NOT produce the observed error**.
- **Conclusion:** Ruled out. The error message specifically indicates an invalid JSON response, not a 204.

### H5: VITE_API_HTTP_BASE mismatch (DMG baked with wrong URL)
- **Evidence:**
  - The DMG was built with whatever value was in `vars.VITE_API_HTTP_BASE` at build time.
  - If this URL points to a different API instance (e.g., staging) that is misconfigured, the same H1/H2 logic applies.
  - If the URL is completely wrong (404), Tauri might show a different error, but some reverse proxies return HTML 404 pages that Tauri tries to parse as JSON.
- **Test:** Inspect the actual HTTP traffic from the running DMG (e.g., via proxy or packet capture) to see the exact URL being requested and the response code/body.

---

## 8. What's needed from the human

1. **The exact production API base URL** (`VITE_API_HTTP_BASE` as set in the Render environment or GitHub Actions variables at build time). We need this to `curl` the updater endpoint and see the live response.

2. **The Render environment variable values for:**
   - `GITHUB_REPO_OWNER`
   - `GITHUB_REPO_NAME`
   - `GITHUB_TOKEN` (presence/absence, not the value itself)
   - `DESKTOP_UPDATE_ENABLED`
   - `API_PUBLIC_BASE_URL`

3. **The API server logs** for a request to `/updates/desktop/darwin/aarch64/0.0.33.json` made at the time the user clicked "Check for Updates." The log line at [`index.ts:1685`](apps/api/src/index.ts:1685) records: `Desktop update manifest unavailable` with `platform`, `arch`, `currentVersion`, and the error message.

4. **Network trace from the DMG** (optional but definitive): Run the installed app with a system proxy (e.g., Proxyman, Charles) or check macOS Console logs for the exact HTTP request/response when the updater check runs. We need the status code and raw response body.

5. **Confirmation of the GitHub Actions variable value** used for the v0.0.33 stable build: Check the `desktop-release.yml` workflow run logs for the `build-macos` job to see what `VITE_API_HTTP_BASE` was set to.

---

DIAGNOSIS COMPLETE — most likely cause: **Production API is missing `GITHUB_REPO_OWNER` and `GITHUB_REPO_NAME` environment variables, causing the updater endpoint to return HTTP 503 with an error JSON body that the Tauri updater plugin cannot parse as a valid release manifest.** Confidence: **high**.
