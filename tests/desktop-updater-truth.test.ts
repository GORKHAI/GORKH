import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const apiIndexSource = readFileSync('apps/api/src/index.ts', 'utf8');
const settingsPanelSource = readFileSync('apps/desktop/src/components/SettingsPanel.tsx', 'utf8');

function getDesktopUpdatesRouteBlock(): string {
  const match = apiIndexSource.match(
    /fastify\.get\('\/updates\/desktop\/:platform\/:arch\/:currentVersion\.json', async \(request, reply\) => \{[\s\S]*?\n\}\);\n\nfastify\.get\('\/billing\/status'/,
  );
  assert.ok(match, 'desktop updates route should be readable from source');
  return match[0];
}

test('desktop updater route only returns 204 when updater is intentionally disabled', () => {
  const routeBlock = getDesktopUpdatesRouteBlock();
  const noContentMatches = routeBlock.match(/reply\.status\(204\)/g) ?? [];

  assert.equal(
    noContentMatches.length,
    1,
    'desktop updater route should reserve HTTP 204 for the explicit updater-disabled lane'
  );
  assert.match(routeBlock, /reply\.status\(400\)/, 'invalid update targets should remain a client error');
  assert.match(
    routeBlock,
    /reply\.status\(503\)/,
    'broken release feeds should surface as a real server error instead of pretending there is no update'
  );
  assert.match(
    routeBlock,
    /Desktop updater .* unavailable|release feed/i,
    'updater route should return a user-facing error message for feed/config failures'
  );
});

test('desktop settings explicitly explain that in-app updates are not available', () => {
  assert.match(
    settingsPanelSource,
    /In-app updates are not available for this version/i,
    'desktop settings should explain that in-app updates are not available when the updater is disabled'
  );
});
