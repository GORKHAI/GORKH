import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const desktopLibSource = readFileSync('apps/desktop/src-tauri/src/lib.rs', 'utf8');

test('desktop keychain access uses the GORKH service name with legacy ai-operator fallback', () => {
  assert.match(
    desktopLibSource,
    /const KEYRING_SERVICE_NAME: &str = "gorkh";/,
    'desktop secure storage should write under the GORKH service name',
  );

  assert.match(
    desktopLibSource,
    /const LEGACY_KEYRING_SERVICE_NAME: &str = "ai-operator";/,
    'desktop secure storage should keep a legacy ai-operator fallback for existing installs',
  );

  assert.match(
    desktopLibSource,
    /keyring_entry_for_service\(LEGACY_KEYRING_SERVICE_NAME, account\)/,
    'desktop secure storage should still read legacy ai-operator entries during migration',
  );
});
