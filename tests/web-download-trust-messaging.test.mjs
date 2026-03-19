import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const downloadPagePath = 'apps/web/app/download/page.tsx';

test('desktop download page distinguishes beta trust between macOS and Windows instead of making a generic signed-release claim', () => {
  const source = readFileSync(downloadPagePath, 'utf8');

  assert.doesNotMatch(
    source,
    /Signed release|Install the signed desktop app/i,
    'download page should not make a generic signed-release claim for the current beta surface',
  );

  assert.match(
    source,
    /macOS beta.*Developer ID signed.*notarized|Developer ID signed and notarized.*macOS beta/i,
    'download page should clearly state the macOS beta trust posture',
  );

  assert.match(
    source,
    /Windows beta.*not yet Authenticode signed|Windows beta.*SmartScreen/i,
    'download page should clearly state the Windows beta trust posture',
  );

  assert.match(
    source,
    /Stable releases add signed Windows\s+installers|signed Windows\s+installers[\s\S]*stable/i,
    'download page should set truthful expectations for stable release trust',
  );
});

test('desktop download page scopes direct downloads separately from updater-feed truth', () => {
  const source = readFileSync(downloadPagePath, 'utf8');

  assert.match(
    source,
    /direct installer download|direct beta download/i,
    'download page should describe the current website path as a direct download surface',
  );

  assert.match(
    source,
    /Automatic updates are configured\s+separately|updater feeds are configured\s+separately|stable auto-update/i,
    'download page should avoid implying the current direct-download path is the full stable updater truth',
  );
});
