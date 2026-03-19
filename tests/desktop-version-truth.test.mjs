import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('desktop runtime version comes from checked-in versioned metadata instead of a hardcoded literal', () => {
  const appSource = readFileSync('apps/desktop/src/App.tsx', 'utf8');

  assert.doesNotMatch(
    appSource,
    /appVersion:\s*['"]\d+\.\d+\.\d+(?:-[^'"]+)?['"]/,
    'desktop runtime should not hardcode the appVersion literal in App.tsx',
  );
});
