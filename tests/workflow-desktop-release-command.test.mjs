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
    /pnpm --filter @ai-operator\/desktop tauri:build --config "\$MACOS_TAURI_CONFIG" --bundles app,dmg/,
    'macOS release jobs must build both the app bundle and the DMG via the desktop package script'
  );

  assert.doesNotMatch(
    source,
    /pnpm --filter @ai-operator\/desktop exec tauri build/,
    'Release workflow must not rely on recursive pnpm exec for the Tauri CLI'
  );
});

test('desktop release workflow requests the macOS app bundle before verifying it exists', () => {
  const source = readFileSync(workflowPath, 'utf8');

  assert.match(
    source,
    /find apps\/desktop\/src-tauri\/target\/release\/bundle\/macos -maxdepth 1 -type d -name '\*\.app'/,
    'desktop release workflow should verify the produced macOS .app bundle before notarizing the DMG'
  );

  assert.match(
    source,
    /pnpm --filter @ai-operator\/desktop tauri:build --config "\$MACOS_TAURI_CONFIG" --bundles app,dmg/,
    'desktop release workflow must request the app bundle whenever it later verifies bundle\/macos\/\*.app'
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
    /updates\/desktop\/\{\{target\}\}\/\{\{arch\}\}\/\{\{current_version\}\}\.json/,
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

test('desktop release workflow keeps beta macOS artifacts signed and notarized while leaving updater promotion disabled', () => {
  const source = readFileSync(workflowPath, 'utf8');

  assert.doesNotMatch(
    source,
    /RELEASE_LABEL="UNSIGNED BETA"/,
    'beta release notes should not claim the whole release lane is unsigned once macOS beta artifacts are trusted'
  );

  assert.doesNotMatch(
    source,
    /TRUST_STATUS="Unsigned beta artifacts only"/,
    'beta trust status should describe the real split between macOS and Windows artifacts'
  );

  assert.match(
    source,
    /TRUST_STATUS="macOS Developer ID signed and notarized; Windows beta artifacts unsigned"/,
    'beta trust status should tell testers that macOS artifacts are trusted while Windows beta artifacts remain unsigned'
  );

  assert.match(
    source,
    /Validate beta macOS signing and notarization secrets/,
    'beta macOS releases should fail early when signing or notarization secrets are missing'
  );

  assert.doesNotMatch(
    source,
    /Import Developer ID certificate into temporary keychain\s*\n\s*if:\s*needs\.prepare\.outputs\.channel == 'stable'/,
    'macOS beta builds should not skip Developer ID signing identity import'
  );

  assert.match(
    source,
    /Notarize and staple macOS artifact\s*\n\s*if:\s*needs\.prepare\.outputs\.channel == 'stable'/,
    'macOS stable builds must run notarization and stapling'
  );

  assert.match(
    source,
    /macOS artifacts are Developer ID signed and notarized\. Windows artifacts remain unsigned beta builds\./,
    'beta release notes should describe the platform trust split explicitly'
  );

  assert.match(
    source,
    /Auto-update promotion is disabled and stable clients following DESKTOP_RELEASE_TAG=latest will ignore it by default\./,
    'beta release notes should continue to state that updater promotion stays disabled'
  );
});

test('desktop release workflow verifies DMG integrity and captures notarization diagnostics', () => {
  const source = readFileSync(workflowPath, 'utf8');

  assert.match(
    source,
    /hdiutil verify "\$MACOS_ASSET_PATH"/,
    'macOS release workflow should verify the DMG before submitting it for notarization'
  );

  assert.match(
    source,
    /NOTARY_SUBMISSION_ID=/,
    'macOS release workflow should expose the notary submission ID so stuck notarization runs can be debugged'
  );

  assert.match(
    source,
    /xcrun notarytool log "\$NOTARY_SUBMISSION_ID"/,
    'macOS release workflow should download the notarization log for diagnostics'
  );
});

test('desktop release workflow stores the macOS asset path as an absolute workspace path before signer exec', () => {
  const source = readFileSync(workflowPath, 'utf8');

  assert.match(
    source,
    /TARGET_NAME="\$GITHUB_WORKSPACE\/release-assets\/ai-operator-desktop_\$\{RELEASE_VERSION\}_macos_\$\{RELEASE_ARCH\}\.dmg"/,
    'macOS asset normalization should store the DMG under an absolute workspace path so later package-scoped commands resolve it correctly'
  );

  assert.match(
    source,
    /pnpm --filter @ai-operator\/desktop exec tauri signer sign "\$MACOS_ASSET_PATH"/,
    'stable updater signing still runs through pnpm exec in the desktop package directory, so MACOS_ASSET_PATH must already be absolute'
  );
});

test('desktop release workflow publishes a packaged desktop validation template for the active channel', () => {
  const source = readFileSync(workflowPath, 'utf8');

  assert.match(
    source,
    /Generate packaged desktop validation report template/,
    'desktop release workflow should generate a packaged desktop validation template artifact for human Mac sign-off'
  );

  assert.match(
    source,
    /verify-packaged-desktop-report\.mjs --template --channel "\$\{\{\s*steps\.context\.outputs\.channel\s*\}\}" --version "\$\{\{\s*steps\.context\.outputs\.version\s*\}\}" --machine macos-fill-me/,
    'packaged desktop validation template should be versioned for the active release channel'
  );

  assert.match(
    source,
    /name:\s*packaged-desktop-validation-\$\{\{\s*steps\.context\.outputs\.channel\s*\}\}/,
    'workflow should upload the packaged desktop validation template as a channel-specific artifact'
  );
});

test('desktop release workflow stable notes call out the macOS-only packaged validation artifact', () => {
  const source = readFileSync(workflowPath, 'utf8');

  assert.match(
    source,
    /packaged-desktop-validation-stable/,
    'stable release notes should point operators at the stable packaged validation artifact'
  );

  assert.match(
    source,
    /stable macOS sign-off is required before promotion/i,
    'stable release notes should state that macOS sign-off remains mandatory before promotion'
  );

  assert.match(
    source,
    /Windows remains disabled for now/i,
    'stable release notes should make the current Windows-disabled policy explicit'
  );
});
