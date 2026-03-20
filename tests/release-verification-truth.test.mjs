import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const configSource = readFileSync('apps/api/src/config.ts', 'utf8');
const finalSmokeSource = readFileSync('scripts/final-smoke.sh', 'utf8');
const httpSmokeSource = readFileSync('scripts/smoke/httpSmoke.sh', 'utf8');
const wsSmokeSource = readFileSync('scripts/smoke/wsSmoke.sh', 'utf8');
const dbCheckSource = readFileSync('scripts/smoke/dbCheck.js', 'utf8');
const githubVerifySource = readFileSync('scripts/release/verify-github-release.mjs', 'utf8');
const apiVerifySource = readFileSync('scripts/release/verify-api-feed.mjs', 'utf8');
const darwinArmFeed = readFileSync('apps/api/updates/desktop-darwin-aarch64.json', 'utf8');
const darwinIntelFeed = readFileSync('apps/api/updates/desktop-darwin-x86_64.json', 'utf8');
const windowsFeed = readFileSync('apps/api/updates/desktop-windows-x86_64.json', 'utf8');

test('desktop release config does not ship file-mode stub defaults', () => {
  assert.doesNotMatch(
    configSource,
    /DESKTOP_RELEASE_SOURCE:\s*z\.enum\(\['file', 'github'\]\)\.default\('file'\)/,
    'API config must not default launch-critical desktop releases to file mode',
  );

  assert.doesNotMatch(
    configSource,
    /example\.com\/downloads/,
    'API config must not default desktop download URLs to example.com placeholders',
  );
});

test('smoke scripts do not rely on example.com desktop artifacts', () => {
  assert.doesNotMatch(finalSmokeSource, /example\.com\/downloads/);
  assert.doesNotMatch(httpSmokeSource, /example\.com\/downloads/);
});

test('final smoke uses stronger release/feed verification and executes websocket smoke when available', () => {
  assert.match(
    finalSmokeSource,
    /RUN_ID="\$\{SMOKE_RUN_ID:-\$\(date \+%s\)\}"/,
    'final smoke should derive a per-run identifier so repeated runs do not fight over shared temp files'
  );

  assert.match(
    finalSmokeSource,
    /scripts\/release\/verify-api-feed\.mjs/,
    'final smoke should run the dedicated API release/feed verifier instead of relying only on ad hoc endpoint checks'
  );

  assert.match(
    finalSmokeSource,
    /scripts\/smoke\/wsSmoke\.sh/,
    'final smoke should include the websocket smoke script in the launch verification path'
  );

  assert.doesNotMatch(
    finalSmokeSource,
    /Skipping WS smoke/,
    'final smoke should not advertise websocket smoke coverage while skipping it'
  );

  assert.match(
    finalSmokeSource,
    /6\.10: Running release\/feed verifier[\s\S]*6\.11: Testing auth rate limiting/,
    'final smoke should verify release/feed truth before intentionally exhausting the auth rate limit'
  );
});

test('websocket smoke passes its token path through to the mock device process', () => {
  assert.match(
    wsSmokeSource,
    /SMOKE_DEVICE_TOKEN_PATH="\$TOKEN_PATH"/,
    'ws smoke should pass its configured token path to the mock device so pairing and reconnect read the same token file'
  );
});

test('websocket smoke waits for the paired-session follow-up message before forcing reconnect', () => {
  assert.match(
    wsSmokeSource,
    /wait_for_log_line 'WS_RX=server\.chat\.message' "\$MOCK_LOG" 15/,
    'ws smoke should keep the initial paired device connected long enough to drain the pairing success follow-up message before restarting with the stored token'
  );
});

test('websocket smoke uses an explicit DB audit summary instead of grepping a truncated raw event dump', () => {
  assert.match(
    dbCheckSource,
    /DB_AUDIT_OK=/,
    'dbCheck should emit an explicit audit summary line so later events do not hide required launch signals'
  );

  assert.match(
    wsSmokeSource,
    /grep -q 'DB_AUDIT_OK=1' \/tmp\/ai-operator-ws-dbcheck\.txt/,
    'ws smoke should validate the explicit DB audit summary instead of relying on raw event text surviving a limited dump'
  );
});

test('checked-in update feed fixtures do not use placeholder signatures', () => {
  for (const source of [darwinArmFeed, darwinIntelFeed, windowsFeed]) {
    assert.doesNotMatch(source, /replace-with-tauri-signature/);
  }
});

test('release verification truth allows stable GitHub releases to be mac-only', () => {
  const stableAssetsBlock = githubVerifySource.match(/const REQUIRED_ASSETS_STABLE = \[(?<body>[\s\S]*?)\n\];/);
  assert.ok(stableAssetsBlock?.groups?.body, 'stable asset verifier block should be present');

  assert.doesNotMatch(
    stableAssetsBlock.groups.body,
    /windows_x86_64\.msi/,
    'stable GitHub release verification should not require Windows assets when the stable lane is mac-only'
  );

  assert.match(
    stableAssetsBlock.groups.body,
    /macos_aarch64\.dmg[\s\S]*macos_x86_64\.dmg/s,
    'stable GitHub release verification should still require both notarized macOS artifacts and their signatures'
  );
});

test('API release verification tolerates an omitted Windows download URL for mac-only stable releases', () => {
  assert.match(
    apiVerifySource,
    /if \(data\.windowsUrl\) \{/,
    'API feed verification should only assert Windows download reachability when the API actually publishes a Windows URL'
  );
});
