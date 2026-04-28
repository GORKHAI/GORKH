import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('desktop runtime JS uses the shared Tauri error parser for settings and chat failures', () => {
  const appSource = readFileSync('apps/desktop/src/App.tsx', 'utf8');
  const settingsSource = readFileSync('apps/desktop/src/components/SettingsPanel.tsx', 'utf8');

  assert.match(
    appSource,
    /from '\.\/lib\/tauriError\.js'/,
    'App.tsx should import the shared Tauri error parser'
  );
  assert.match(
    appSource,
    /parseDesktopError\(err,\s*'The assistant could not start the task from chat\.'\)/,
    'App.tsx should normalize task-start failures before rendering a chat error'
  );
  assert.match(
    appSource,
    /parseDesktopError\(err,\s*'The assistant could not respond right now\.'\)/,
    'App.tsx should normalize conversation failures before rendering a chat error'
  );

  assert.match(
    settingsSource,
    /from '\.\.\/lib\/tauriError\.js'/,
    'SettingsPanel.tsx should import the shared Tauri error parser'
  );
  assert.match(
    settingsSource,
    /parseDesktopError\(e,\s*'Test failed'\)/,
    'SettingsPanel.tsx should normalize structured Tauri errors before categorizing connection failures'
  );
});
