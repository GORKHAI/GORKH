import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

test('desktop runtime JS uses the shared Tauri error parser for settings and chat failures', () => {
  const appSource = readFileSync('apps/desktop/src/App.js', 'utf8');
  const settingsSource = readFileSync('apps/desktop/src/components/SettingsPanel.js', 'utf8');

  assert.ok(
    existsSync('apps/desktop/src/lib/tauriError.js'),
    'runtime desktop JS should include a tauriError.js helper for direct .js imports'
  );

  assert.match(
    appSource,
    /from '\.\/lib\/tauriError\.js'/,
    'App.js should import the shared Tauri error parser'
  );
  assert.match(
    appSource,
    /parseDesktopError\(err,\s*'The assistant could not start the task from chat\.'\)/,
    'App.js should normalize task-start failures before rendering a chat error'
  );
  assert.match(
    appSource,
    /parseDesktopError\(err,\s*'The assistant could not respond right now\.'\)/,
    'App.js should normalize conversation failures before rendering a chat error'
  );

  assert.match(
    settingsSource,
    /from '\.\.\/lib\/tauriError\.js'/,
    'SettingsPanel.js should import the shared Tauri error parser'
  );
  assert.match(
    settingsSource,
    /parseDesktopError\(e,\s*'Test failed'\)/,
    'SettingsPanel.js should normalize structured Tauri errors before categorizing connection failures'
  );
});
