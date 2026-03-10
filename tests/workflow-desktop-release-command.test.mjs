import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflowPath = '.github/workflows/desktop-release.yml';

test('desktop release workflow invokes Tauri through the desktop package script', () => {
  const source = readFileSync(workflowPath, 'utf8');

  assert.match(
    source,
    /pnpm --filter @ai-operator\/desktop tauri:build --config "\$WINDOWS_TAURI_CONFIG" --bundles msi/,
    'Windows release job must build via the desktop package script'
  );

  assert.match(
    source,
    /pnpm --filter @ai-operator\/desktop tauri:build --config "\$MACOS_TAURI_CONFIG" --bundles dmg/,
    'Stable macOS release job must build via the desktop package script'
  );

  assert.match(
    source,
    /pnpm --filter @ai-operator\/desktop tauri:build --config "\$MACOS_TAURI_CONFIG" --bundles dmg/,
    'Beta macOS release job must build via the desktop package script'
  );

  assert.doesNotMatch(
    source,
    /pnpm --filter @ai-operator\/desktop exec tauri build/,
    'Release workflow must not rely on recursive pnpm exec for the Tauri CLI'
  );
});

test('desktop release workflow passes desktop runtime API variables into bundle builds', () => {
  const source = readFileSync(workflowPath, 'utf8');

  assert.match(
    source,
    /VITE_API_HTTP_BASE:\s*\$\{\{\s*vars\.VITE_API_HTTP_BASE\s*\}\}/,
    'Desktop release workflow must pass VITE_API_HTTP_BASE from GitHub Actions variables'
  );

  assert.match(
    source,
    /VITE_API_WS_URL:\s*\$\{\{\s*vars\.VITE_API_WS_URL\s*\}\}/,
    'Desktop release workflow must pass VITE_API_WS_URL from GitHub Actions variables'
  );

  assert.match(
    source,
    /VITE_DESKTOP_UPDATER_ENABLED:\s*\$\{\{\s*needs\.prepare\.outputs\.updater_enabled\s*\}\}/,
    'Desktop release workflow must pass the resolved updater-enabled flag into desktop builds'
  );
});

test('desktop release workflow generates concrete updater config for release builds', () => {
  const source = readFileSync(workflowPath, 'utf8');

  assert.match(
    source,
    /VITE_DESKTOP_UPDATER_PUBLIC_KEY:\s*\$\{\{\s*vars\.VITE_DESKTOP_UPDATER_PUBLIC_KEY\s*\}\}/,
    'Desktop release workflow should read the updater public key from GitHub Actions variables for stable builds'
  );

  assert.match(
    source,
    /updates\/desktop\/\{\{platform\}\}\/\{\{arch\}\}\/\{\{current_version\}\}\.json/,
    'Desktop release workflow should generate the concrete updater endpoint path used by packaged clients'
  );
});

test('desktop release workflow validates packaged desktop API variables before building', () => {
  const source = readFileSync(workflowPath, 'utf8');

  assert.match(
    source,
    /Desktop packaged builds require the VITE_API_HTTP_BASE GitHub Actions variable\./,
    'Desktop release workflow must fail fast when VITE_API_HTTP_BASE is missing'
  );

  assert.match(
    source,
    /Desktop packaged builds require the VITE_API_WS_URL GitHub Actions variable\./,
    'Desktop release workflow must fail fast when VITE_API_WS_URL is missing'
  );

  assert.match(
    source,
    /Desktop packaged builds require VITE_API_HTTP_BASE to use https:\/\//,
    'Desktop release workflow must reject non-https API HTTP base values for packaged builds'
  );

  assert.match(
    source,
    /Desktop packaged builds require VITE_API_WS_URL to use wss:\/\//,
    'Desktop release workflow must reject non-wss API websocket values for packaged builds'
  );
});
