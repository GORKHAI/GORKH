import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const downloadPagePath = 'apps/web/app/download/page.tsx';

test('desktop download page states macOS trust posture for stable release', () => {
  const source = readFileSync(downloadPagePath, 'utf8');

  assert.doesNotMatch(
    source,
    /macOS beta|Windows beta|beta build/i,
    'download page should not describe the stable release as beta'
  );

  assert.match(
    source,
    /Developer ID signed/i,
    'download page should state that macOS builds are Developer ID signed'
  );

  assert.match(
    source,
    /Notarized/i,
    'download page should state that macOS builds are notarized'
  );

  assert.match(
    source,
    /macOS only|Windows support is on the roadmap/i,
    'download page should describe the current macOS-only stable lane truthfully'
  );
});

test('desktop download page scopes direct downloads separately from updater-feed truth', () => {
  const source = readFileSync(downloadPagePath, 'utf8');

  assert.doesNotMatch(
    source,
    /updater feed|auto-update|automatic updates/i,
    'download page should avoid implying the current direct-download path includes auto-updates'
  );
});

test('desktop download page does not render a broken Windows download button', () => {
  const source = readFileSync(downloadPagePath, 'utf8');

  assert.doesNotMatch(
    source,
    /windowsUrl|Windows download|Download for Windows/i,
    'download page should not render a Windows download button when Windows is not supported'
  );
});
