import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const appPath = 'apps/desktop/src/App.tsx';
const helperPath = 'apps/desktop/src/lib/desktopAuth.ts';
const tauriPath = 'apps/desktop/src-tauri/src/lib.rs';

test('desktop app replaces pairing UI with browser sign-in entrypoint', () => {
  const source = readFileSync(appPath, 'utf8');

  assert.match(source, /Sign in/i, 'desktop signed-out state should expose Sign in');
  assert.doesNotMatch(
    source,
    /Request Pairing Code|Device Pairing|Connect to server to request pairing code/,
    'desktop primary UX should no longer expose pairing language'
  );
});

test('desktop auth helper uses loopback handoff with system browser and existing exchange endpoints', () => {
  assert.equal(existsSync(helperPath), true, 'desktop auth helper should exist');

  const source = readFileSync(helperPath, 'utf8');

  assert.match(
    source,
    /invoke<[^>]*>\('desktop_auth_listen_start'/,
    'desktop auth helper should start a native loopback listener'
  );

  assert.match(
    source,
    /invoke<[^>]*>\('desktop_auth_listen_finish'/,
    'desktop auth helper should wait for the loopback callback result'
  );

  assert.match(
    source,
    /invoke<[^>]*>\('open_external_url'/,
    'desktop auth helper should open the external system browser'
  );

  assert.match(
    source,
    /\/desktop\/auth\/start/,
    'desktop auth helper should start the auth handoff through the API'
  );

  assert.match(
    source,
    /\/desktop\/auth\/exchange/,
    'desktop auth helper should exchange the one-time handoff token through the API'
  );

  assert.match(
    source,
    /\/desktop\/auth\/logout/,
    'desktop auth helper should expose desktop logout against the API revoke route'
  );
});

test('desktop app exposes sign out and clears local desktop session state', () => {
  const source = readFileSync(appPath, 'utf8');

  assert.match(source, /Sign out/i, 'desktop signed-in state should expose Sign out');
  assert.match(
    source,
    /invoke<[^>]*>\('device_token_clear'/,
    'desktop sign-out should clear the durable device token from keychain storage'
  );
  assert.match(
    source,
    /logoutDesktopSession\(/,
    'desktop sign-out should revoke the current desktop session through the API'
  );
  assert.match(
    source,
    /setSessionDeviceToken\(null\)/,
    'desktop sign-out should clear the in-memory desktop session token'
  );
  assert.match(
    source,
    /setAuthState\('signed_out'\)/,
    'desktop sign-out should return the UI to the signed-out state'
  );
});

test('desktop tauri runtime exports loopback auth commands for the sign-in flow', () => {
  const source = readFileSync(tauriPath, 'utf8');

  assert.match(source, /fn desktop_auth_listen_start\(/, 'desktop loopback listener start command should exist');
  assert.match(source, /fn desktop_auth_listen_finish\(/, 'desktop loopback listener finish command should exist');
  assert.match(source, /fn desktop_auth_listen_cancel\(/, 'desktop loopback listener cancel command should exist');
});
