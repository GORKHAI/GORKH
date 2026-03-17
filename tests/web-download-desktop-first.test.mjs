import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const downloadPagePath = 'apps/web/app/download/page.tsx';

test('desktop download page treats desktop acquisition as part of the free local product path', () => {
  const source = readFileSync(downloadPagePath, 'utf8');

  assert.match(
    source,
    /Download GORKH|Download .*desktop app|Install the signed desktop app/i,
    'download page should present desktop acquisition as a normal product surface'
  );

  assert.doesNotMatch(
    source,
    /active subscription is required to access desktop downloads|Subscribe to download/i,
    'download page should not tell free-local users to subscribe just to acquire the desktop app'
  );
});
