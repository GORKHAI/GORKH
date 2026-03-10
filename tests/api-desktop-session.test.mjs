import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const desktopSessionPath = 'apps/api/src/lib/desktop-session.ts';
const apiIndexPath = 'apps/api/src/index.ts';
const devicesRepoPath = 'apps/api/src/repos/devices.ts';
const wsHandlerPath = 'apps/api/src/lib/ws-handler.ts';

test('desktop session helper revokes only the addressed device token and leaves sibling devices untouched', async () => {
  const { revokeDesktopSession } = await import('../apps/api/dist/lib/desktop-session.js');

  const devices = new Map([
    ['token-desktop-a', { device: { deviceId: 'desktop-a' }, ownerUserId: 'user-1', deviceToken: 'token-desktop-a' }],
    ['token-desktop-b', { device: { deviceId: 'desktop-b' }, ownerUserId: 'user-1', deviceToken: 'token-desktop-b' }],
  ]);

  const repo = {
    async findByDeviceToken(deviceToken) {
      return devices.get(deviceToken) ?? null;
    },
    async revokeDeviceSession(deviceId, deviceToken) {
      const record = devices.get(deviceToken);
      if (!record || record.device.deviceId !== deviceId) {
        return null;
      }

      devices.delete(deviceToken);
      return {
        ...record,
        deviceToken: null,
      };
    },
  };

  const result = await revokeDesktopSession({
    deviceToken: 'token-desktop-a',
    devicesRepo: repo,
  });

  assert.deepEqual(result, {
    ok: true,
    deviceId: 'desktop-a',
    userId: 'user-1',
  });
  assert.equal(devices.has('token-desktop-a'), false, 'the revoked desktop token should no longer resolve');
  assert.equal(devices.has('token-desktop-b'), true, 'revoking one desktop must not affect sibling desktop sessions');
});

test('desktop session helper rejects stale or missing desktop tokens', async () => {
  const { revokeDesktopSession } = await import('../apps/api/dist/lib/desktop-session.js');

  const repo = {
    async findByDeviceToken() {
      return null;
    },
    async revokeDeviceSession() {
      throw new Error('should not revoke when token lookup fails');
    },
  };

  const result = await revokeDesktopSession({
    deviceToken: 'missing-token',
    devicesRepo: repo,
  });

  assert.deepEqual(result, {
    ok: false,
    error: 'UNAUTHORIZED',
  });
});

test('desktop logout route uses token-authenticated session revoke instead of browser auth', () => {
  const source = readFileSync(apiIndexPath, 'utf8');

  assert.match(
    source,
    /fastify\.post\('\/desktop\/auth\/logout'/,
    'API should expose a desktop logout route'
  );

  assert.match(
    source,
    /requireDesktopDeviceSession\(request, reply\)/,
    'Desktop logout should authenticate with the current desktop device token'
  );
});

test('desktop session revoke is scoped to the current device token and websocket auth still denies stale tokens', () => {
  const sessionSource = readFileSync(desktopSessionPath, 'utf8');
  const devicesRepoSource = readFileSync(devicesRepoPath, 'utf8');
  const wsHandlerSource = readFileSync(wsHandlerPath, 'utf8');

  assert.match(
    devicesRepoSource,
    /async revokeDeviceSession\(deviceId: string, deviceToken: string\)/,
    'Device repo should expose a token-scoped desktop session revoke method'
  );

  assert.match(
    devicesRepoSource,
    /updateMany\(\s*\{[\s\S]*where:\s*\{[\s\S]*id:\s*deviceId,[\s\S]*deviceToken,[\s\S]*\}/,
    'Desktop session revoke should clear only the matching device/token pair'
  );

  assert.match(
    sessionSource,
    /await devicesRepo\.revokeDeviceSession\(session\.deviceId,\s*input\.deviceToken\)/,
    'Desktop session helper should revoke the exact authenticated desktop session'
  );

  assert.match(
    wsHandlerSource,
    /const tokenMatch = await devicesRepo\.findByDeviceToken\(deviceToken\);[\s\S]*Invalid device token/,
    'WebSocket hello should continue to deny reconnect attempts that present a revoked device token'
  );
});
