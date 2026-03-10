import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const apiIndexPath = 'apps/api/src/index.ts';

test('device pairing and owned-device routes use persisted device records', () => {
  const source = readFileSync(apiIndexPath, 'utf8');

  assert.match(
    source,
    /async function getOwnedDevices\(userId: string\)\s*\{[\s\S]*devicesRepo\.listOwned\(userId\)/,
    'Owned device listing should come from persisted device ownership'
  );

  assert.match(
    source,
    /async function getOwnedDevice\(userId: string, deviceId: string\)\s*\{[\s\S]*devicesRepo\.getOwned\(deviceId, userId\)/,
    'Single-device lookups should come from persisted device ownership'
  );

  assert.match(
    source,
    /async function getPairableDevice\(deviceId: string\)\s*\{[\s\S]*devicesRepo\.findByDeviceId\(deviceId\)/,
    'Pairing should resolve the target device from persisted device records'
  );

  assert.match(
    source,
    /const pairable = await getPairableDevice\(deviceId\);/,
    'Pair route should use the persisted pairable-device lookup instead of process-local state'
  );
});
