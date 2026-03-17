import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const configSource = readFileSync('apps/api/src/config.ts', 'utf8');
const finalSmokeSource = readFileSync('scripts/final-smoke.sh', 'utf8');
const httpSmokeSource = readFileSync('scripts/smoke/httpSmoke.sh', 'utf8');
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

test('checked-in update feed fixtures do not use placeholder signatures', () => {
  for (const source of [darwinArmFeed, darwinIntelFeed, windowsFeed]) {
    assert.doesNotMatch(source, /replace-with-tauri-signature/);
  }
});
