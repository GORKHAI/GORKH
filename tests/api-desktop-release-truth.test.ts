import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  validateDesktopDownloadsPayload,
  validateDesktopUpdateManifest,
} from '../apps/api/src/lib/releases/validation.ts';

const repoRoot = process.cwd();
const updateFixtures = [
  'apps/api/updates/desktop-darwin-aarch64.json',
  'apps/api/updates/desktop-darwin-x86_64.json',
  'apps/api/updates/desktop-windows-x86_64.json',
];

test('desktop release validators reject placeholder signatures and example download URLs', () => {
  assert.throws(
    () =>
      validateDesktopDownloadsPayload(
        {
          version: '0.1.0',
          windowsUrl: 'https://example.com/downloads/ai-operator-setup.exe',
          macIntelUrl: 'https://downloads.gorkh.example/app-intel.dmg',
          macArmUrl: 'https://downloads.gorkh.example/app-arm.dmg',
        },
        {
          nodeEnv: 'production',
          allowInsecureDev: false,
        },
      ),
    /placeholder|example/i,
  );

  assert.throws(
    () =>
      validateDesktopUpdateManifest(
        {
          version: '0.1.0',
          platforms: {
            'darwin-aarch64': {
              url: '/downloads/desktop/artifacts/ai-operator-0.1.0-aarch64.dmg',
              signature: 'replace-with-tauri-signature',
            },
          },
        },
        {
          target: 'darwin-aarch64',
          apiPublicBaseUrl: 'https://api.gorkh.example',
          nodeEnv: 'production',
          allowInsecureDev: false,
        },
      ),
    /signature/i,
  );
});

test('desktop release validators only allow localhost fixture downloads when insecure dev is enabled', () => {
  assert.throws(
    () =>
      validateDesktopDownloadsPayload(
        {
          version: '0.1.0',
          windowsUrl: 'http://localhost:3001/downloads/desktop/artifacts/ai-operator-0.1.0-x64-setup.exe',
          macIntelUrl: 'http://localhost:3001/downloads/desktop/artifacts/ai-operator-0.1.0-x64.dmg',
          macArmUrl: 'http://localhost:3001/downloads/desktop/artifacts/ai-operator-0.1.0-aarch64.dmg',
        },
        {
          nodeEnv: 'production',
          allowInsecureDev: false,
        },
      ),
    /localhost|https/i,
  );

  assert.doesNotThrow(() =>
    validateDesktopDownloadsPayload(
      {
        version: '0.1.0',
        windowsUrl: 'http://localhost:3001/downloads/desktop/artifacts/ai-operator-0.1.0-x64-setup.exe',
        macIntelUrl: 'http://localhost:3001/downloads/desktop/artifacts/ai-operator-0.1.0-x64.dmg',
        macArmUrl: 'http://localhost:3001/downloads/desktop/artifacts/ai-operator-0.1.0-aarch64.dmg',
      },
      {
        nodeEnv: 'production',
        allowInsecureDev: true,
      },
    ),
  );
});

test('checked-in update fixtures are safe for local smoke verification', () => {
  for (const relativePath of updateFixtures) {
    const manifest = JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8'));
    const target = path.basename(relativePath, '.json').replace(/^desktop-/, '');

    assert.doesNotThrow(() =>
      validateDesktopUpdateManifest(manifest, {
        target,
        apiPublicBaseUrl: 'http://localhost:3001',
        nodeEnv: 'production',
        allowInsecureDev: true,
      }),
    );
  }
});
