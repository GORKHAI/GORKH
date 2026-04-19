import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const cargoTomlPath = path.join(repoRoot, 'apps/desktop/src-tauri/Cargo.toml');
const tauriConfigPath = path.join(repoRoot, 'apps/desktop/src-tauri/tauri.conf.json');
const libRsPath = path.join(repoRoot, 'apps/desktop/src-tauri/src/lib.rs');
const agentModPath = path.join(repoRoot, 'apps/desktop/src-tauri/src/agent/mod.rs');
const turboConfigPath = path.join(repoRoot, 'turbo.json');
const iconPath = path.join(repoRoot, 'apps/desktop/src-tauri/icons/icon.png');
const windowsIconPath = path.join(repoRoot, 'apps/desktop/src-tauri/icons/icon.ico');

test('desktop release cargo config includes required tray and error dependencies', () => {
  const cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');

  assert.match(
    cargoToml,
    /^tauri\s*=\s*\{[^}]*features\s*=\s*\[[^\]]*"tray-icon"[^\]]*\][^}]*\}/m,
    'desktop Tauri crate should enable the tray-icon feature',
  );

  assert.match(
    cargoToml,
    /^thiserror\s*=\s*".+"/m,
    'desktop Rust crate should declare thiserror for derive(Error) usage',
  );
});

test('desktop release cargo config enables Tokio macros for select-based auth listener flow', () => {
  const cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');

  assert.match(
    cargoToml,
    /^tokio\s*=\s*\{[^}]*features\s*=\s*\[[^\]]*"macros"[^\]]*\][^}]*\}/m,
    'desktop Rust crate should enable the tokio macros feature so tokio::select! compiles in release builds',
  );
});

test('desktop release config includes a tracked icon asset', () => {
  const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'));

  assert.ok(fs.existsSync(iconPath), 'desktop release should include src-tauri/icons/icon.png');
  assert.ok(
    fs.existsSync(windowsIconPath),
    'desktop release should include src-tauri/icons/icon.ico',
  );
  assert.ok(
    Array.isArray(tauriConfig.bundle?.icon) &&
      tauriConfig.bundle.icon.includes('icons/icon.png'),
    'desktop release config should reference icons/icon.png explicitly',
  );
  assert.ok(
    Array.isArray(tauriConfig.bundle?.icon) &&
      tauriConfig.bundle.icon.includes('icons/icon.ico'),
    'desktop release config should reference icons/icon.ico explicitly',
  );
});

test('desktop base Tauri config includes updater plugin with env var placeholders', () => {
  const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'));

  // Updater should be configured with env var placeholders for release workflow
  assert.ok(
    tauriConfig.plugins?.updater,
    'desktop Tauri config should include updater plugin configuration',
  );
  
  assert.equal(
    tauriConfig.plugins.updater.active,
    true,
    'desktop updater plugin should be active',
  );

  assert.equal(
    tauriConfig.build?.beforeBuildCommand,
    'pnpm build',
    'desktop Tauri release builds should use a beforeBuildCommand that resolves to the desktop package from either the app root or src-tauri so CI does not depend on Tauri hook cwd quirks',
  );
});

test('turbo forwards desktop Vite environment variables used in release builds', () => {
  const turboConfig = JSON.parse(fs.readFileSync(turboConfigPath, 'utf8'));
  const globalEnv = new Set(turboConfig.globalEnv || []);

  for (const requiredEnv of [
    'VITE_API_HTTP_BASE',
    'VITE_API_WS_URL',
    'VITE_DESKTOP_ALLOW_INSECURE_LOCALHOST',
    'VITE_DESKTOP_UPDATER_ENABLED',
    'VITE_DESKTOP_UPDATER_PUBLIC_KEY',
  ]) {
    assert.ok(
      globalEnv.has(requiredEnv),
      `turbo globalEnv should include ${requiredEnv} so desktop production builds do not fall back to localhost defaults`,
    );
  }
});

test('desktop rust sources avoid the broken API usage that blocked CI', () => {
  const libRs = fs.readFileSync(libRsPath, 'utf8');

  assert.ok(
    !libRs.includes('image.rgba()'),
    'desktop screen capture should not call image.rgba(); use raw RGBA bytes compatible with the screenshots crate',
  );

  assert.ok(
    !libRs.includes('mouse_double_click('),
    'desktop input injection should not call the unavailable Enigo mouse_double_click API',
  );

  assert.ok(
    !libRs.includes('delete_password()'),
    'desktop keyring integration should use keyring v3 delete_credential() instead of removed delete_password()',
  );

  assert.ok(
    libRs.includes('delete_credential()'),
    'desktop keyring integration should delete stored credentials through delete_credential()',
  );

  // Updater plugin is now always initialized (controlled by active: true/false in config)
  assert.ok(
    libRs.includes('tauri_plugin_updater::Builder::new().build()'),
    'desktop should initialize the updater plugin',
  );

  // The VITE_DESKTOP_UPDATER_ENABLED env var is still used to control dialog visibility
  assert.match(
    libRs,
    /option_env!\("VITE_DESKTOP_UPDATER_ENABLED"\)/,
    'desktop runtime should check VITE_DESKTOP_UPDATER_ENABLED to control update dialog behavior',
  );
});

test('desktop overlay restore uses Tauri 2-compatible maximize APIs', () => {
  const libRs = fs.readFileSync(libRsPath, 'utf8');

  assert.ok(
    !libRs.includes('.set_maximized('),
    'desktop overlay restore should not call the removed WebviewWindow set_maximized API',
  );

  assert.match(
    libRs,
    /if snapshot\.maximized[\s\S]*maximize\(\)[\s\S]*else[\s\S]*unmaximize\(\)/,
    'desktop overlay restore should use maximize and unmaximize when restoring maximized state',
  );
});

test('desktop auth cancel command returns Result for async State-based Tauri command compatibility', () => {
  const libRs = fs.readFileSync(libRsPath, 'utf8');

  assert.match(
    libRs,
    /async fn desktop_auth_listen_cancel\(\s*runtime: State<'_, DesktopAuthRuntimeState>,\s*\) -> Result<KeyResult, String>/,
    'desktop_auth_listen_cancel should return Result<KeyResult, String> so async Tauri command generation compiles',
  );
});

test('advanced agent module exports the runtime type used by Tauri commands', () => {
  const agentMod = fs.readFileSync(agentModPath, 'utf8');

  assert.match(
    agentMod,
    /pub struct AdvancedAgent\b/,
    'desktop advanced agent module should export AdvancedAgent for the Tauri command layer',
  );
});
