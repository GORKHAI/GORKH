import test from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluateDesktopTaskReadiness,
  getDesktopControlExecutionBlocker,
} from './taskReadiness.js';

const baseInput = {
  mode: 'ai_assist',
  subscriptionStatus: 'inactive',
  platform: 'macos',
  permissionStatus: {
    screenRecording: 'granted',
    accessibility: 'denied',
  },
  localSettings: {
    screenPreviewEnabled: true,
    allowControlEnabled: false,
    startMinimizedToTray: false,
    autostartEnabled: false,
  },
  workspaceConfigured: true,
  providerConfigured: true,
  isManagedLocalProvider: true,
};

test('launch readiness stays ready when only desktop control permissions are missing', () => {
  const readiness = evaluateDesktopTaskReadiness({
    ...baseInput,
    requireControl: false,
  });

  assert.equal(readiness.ready, true);
  assert.deepEqual(
    readiness.requiredSetup.map((item) => item.id),
    []
  );
});

test('control readiness still blocks missing allow-control and accessibility', () => {
  const readiness = evaluateDesktopTaskReadiness({
    ...baseInput,
    requireControl: true,
  });

  assert.equal(readiness.ready, false);
  assert.deepEqual(
    readiness.requiredSetup.map((item) => item.id),
    ['control-toggle', 'accessibility-permission']
  );
});

test('control execution blocker reports allow-control before accessibility', () => {
  const blocker = getDesktopControlExecutionBlocker({
    platform: 'macos',
    permissionStatus: {
      screenRecording: 'granted',
      accessibility: 'denied',
    },
    localSettings: {
      allowControlEnabled: false,
    },
  });

  assert.equal(blocker?.id, 'control-toggle');
});

test('control execution blocker reports missing accessibility when control is enabled', () => {
  const blocker = getDesktopControlExecutionBlocker({
    platform: 'macos',
    permissionStatus: {
      screenRecording: 'granted',
      accessibility: 'denied',
    },
    localSettings: {
      allowControlEnabled: true,
    },
  });

  assert.equal(blocker?.id, 'accessibility-permission');
});
