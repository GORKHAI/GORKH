import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  getPermissionBannerMessage,
  getPermissionInstructions,
  getPermissionSettingsButtonLabel,
} from '../apps/desktop/src/lib/permissions.ts';

test('windows permission guidance stays best-effort and avoids macOS-style grant language', () => {
  const screenInstructions = getPermissionInstructions('screenRecording', 'windows').join(' ');
  const accessibilityInstructions = getPermissionInstructions('accessibility', 'windows').join(' ');

  assert.match(
    screenInstructions,
    /cannot reliably preflight screen capture permission/i,
    'Windows screen guidance should say the check is best-effort'
  );
  assert.doesNotMatch(
    screenInstructions,
    /System Settings|Privacy & Security|Enable access for GORKH Desktop/i,
    'Windows screen guidance should not reuse macOS permission instructions'
  );

  assert.match(
    accessibilityInstructions,
    /same privilege level|input-control permission/i,
    'Windows accessibility guidance should mention realistic control limitations'
  );
  assert.doesNotMatch(
    accessibilityInstructions,
    /System Settings|Privacy & Security|Enable access for GORKH Desktop/i,
    'Windows accessibility guidance should not reuse macOS permission instructions'
  );

  assert.equal(
    getPermissionSettingsButtonLabel('screenRecording', 'windows'),
    'Open Windows Privacy Settings'
  );
  assert.equal(
    getPermissionSettingsButtonLabel('accessibility', 'windows'),
    'Open Windows Accessibility Settings'
  );

  assert.match(
    getPermissionBannerMessage('screenRecording', 'windows'),
    /does not expose a single screen recording permission/i,
    'Windows screen banner should avoid pretending there is a direct permission pane'
  );
  assert.match(
    getPermissionBannerMessage('accessibility', 'windows'),
    /does not expose a single accessibility permission/i,
    'Windows accessibility banner should avoid pretending there is a direct permission pane'
  );
});

test('windows native settings links point at general settings surfaces instead of fake per-app grants', () => {
  const rustSource = readFileSync('apps/desktop/src-tauri/src/lib.rs', 'utf8');

  assert.match(
    rustSource,
    /PermissionTarget::ScreenRecording => "ms-settings:privacy"/,
    'Windows screen help should open a general privacy settings surface'
  );
  assert.match(
    rustSource,
    /PermissionTarget::Accessibility => "ms-settings:easeofaccess"/,
    'Windows accessibility help should open a general accessibility settings surface'
  );
  assert.doesNotMatch(
    rustSource,
    /ms-settings:easeofaccess-keyboard/,
    'Windows accessibility help should not imply a keyboard-only pane is the permission source of truth'
  );
});
