/**
 * Tests for the GORKH internal app tools layer (STEP 2).
 *
 * Verifies that:
 * - The shared ToolCall type correctly includes GORKH tool variants
 * - isGorkhReadOnlyToolCall / isGorkhWriteToolCall predicates are correct
 * - isGorkhToolCall covers both
 * - sanitizeToolCallForPersistence passes GORKH tools through unchanged
 * - redactToolCallForLog returns only tool name for GORKH tools (no paths/commands)
 * - ToolName constants include GORKH tools
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isGorkhReadOnlyToolCall,
  isGorkhWriteToolCall,
  isGorkhToolCall,
  sanitizeToolCallForPersistence,
  redactToolCallForLog,
  ToolName,
  type AppGetStateToolCall,
  type AppSettingsSetToolCall,
  type AppFreeAiInstallToolCall,
  type FsListToolCall,
} from '../packages/shared/src/index.ts';

// ---------------------------------------------------------------------------
// Predicate correctness
// ---------------------------------------------------------------------------

test('isGorkhReadOnlyToolCall: app.get_state is true', () => {
  const tool: AppGetStateToolCall = { tool: 'app.get_state' };
  assert.equal(isGorkhReadOnlyToolCall(tool), true);
});

test('isGorkhReadOnlyToolCall: settings.set is false', () => {
  const tool: AppSettingsSetToolCall = { tool: 'settings.set', key: 'autostart', value: true };
  assert.equal(isGorkhReadOnlyToolCall(tool), false);
});

test('isGorkhReadOnlyToolCall: free_ai.install is false', () => {
  const tool: AppFreeAiInstallToolCall = { tool: 'free_ai.install', tier: 'standard' };
  assert.equal(isGorkhReadOnlyToolCall(tool), false);
});

test('isGorkhWriteToolCall: settings.set is true', () => {
  const tool: AppSettingsSetToolCall = { tool: 'settings.set', key: 'autostart', value: false };
  assert.equal(isGorkhWriteToolCall(tool), true);
});

test('isGorkhWriteToolCall: free_ai.install is true', () => {
  const tool: AppFreeAiInstallToolCall = { tool: 'free_ai.install', tier: 'light' };
  assert.equal(isGorkhWriteToolCall(tool), true);
});

test('isGorkhWriteToolCall: app.get_state is false', () => {
  const tool: AppGetStateToolCall = { tool: 'app.get_state' };
  assert.equal(isGorkhWriteToolCall(tool), false);
});

test('isGorkhToolCall: covers all three GORKH tools', () => {
  assert.equal(isGorkhToolCall({ tool: 'app.get_state' }), true);
  assert.equal(isGorkhToolCall({ tool: 'settings.set', key: 'autostart', value: true }), true);
  assert.equal(isGorkhToolCall({ tool: 'free_ai.install', tier: 'vision' }), true);
});

test('isGorkhToolCall: returns false for workspace tools', () => {
  const fsList: FsListToolCall = { tool: 'fs.list', path: '.' };
  assert.equal(isGorkhToolCall(fsList), false);
  assert.equal(isGorkhToolCall({ tool: 'fs.read_text', path: 'file.ts' }), false);
  assert.equal(isGorkhToolCall({ tool: 'terminal.exec', cmd: 'ls', args: [] }), false);
});

// ---------------------------------------------------------------------------
// Sanitize / redact
// ---------------------------------------------------------------------------

test('sanitizeToolCallForPersistence passes app.get_state through unchanged', () => {
  const tool: AppGetStateToolCall = { tool: 'app.get_state' };
  const result = sanitizeToolCallForPersistence(tool);
  assert.deepEqual(result, { tool: 'app.get_state' });
});

test('sanitizeToolCallForPersistence passes settings.set through unchanged', () => {
  const tool: AppSettingsSetToolCall = { tool: 'settings.set', key: 'autostart', value: true };
  const result = sanitizeToolCallForPersistence(tool);
  assert.deepEqual(result, tool);
});

test('sanitizeToolCallForPersistence passes free_ai.install through unchanged', () => {
  const tool: AppFreeAiInstallToolCall = { tool: 'free_ai.install', tier: 'standard' };
  const result = sanitizeToolCallForPersistence(tool);
  assert.deepEqual(result, tool);
});

test('redactToolCallForLog returns only tool name for GORKH tools (no paths or commands)', () => {
  const getState = redactToolCallForLog({ tool: 'app.get_state' });
  assert.equal(getState.tool, 'app.get_state');
  assert.equal(getState.pathRel, undefined);
  assert.equal(getState.cmd, undefined);

  const settingsSet = redactToolCallForLog({ tool: 'settings.set', key: 'autostart', value: true });
  assert.equal(settingsSet.tool, 'settings.set');
  assert.equal(settingsSet.pathRel, undefined);
  assert.equal(settingsSet.cmd, undefined);

  const install = redactToolCallForLog({ tool: 'free_ai.install', tier: 'light' });
  assert.equal(install.tool, 'free_ai.install');
  assert.equal(install.pathRel, undefined);
  assert.equal(install.cmd, undefined);
});

// ---------------------------------------------------------------------------
// ToolName constants
// ---------------------------------------------------------------------------

test('ToolName includes GORKH tool names', () => {
  assert.equal(ToolName.APP_GET_STATE, 'app.get_state');
  assert.equal(ToolName.SETTINGS_SET, 'settings.set');
  assert.equal(ToolName.FREE_AI_INSTALL, 'free_ai.install');
});

test('ToolName still includes all original workspace tool names', () => {
  assert.equal(ToolName.FS_LIST, 'fs.list');
  assert.equal(ToolName.FS_READ_TEXT, 'fs.read_text');
  assert.equal(ToolName.FS_WRITE_TEXT, 'fs.write_text');
  assert.equal(ToolName.FS_APPLY_PATCH, 'fs.apply_patch');
  assert.equal(ToolName.TERMINAL_EXEC, 'terminal.exec');
});

// ---------------------------------------------------------------------------
// Type-level: tier values
// ---------------------------------------------------------------------------

test('free_ai.install tier accepts all three values', () => {
  const tiers = ['light', 'standard', 'vision'] as const;
  for (const tier of tiers) {
    const tool: AppFreeAiInstallToolCall = { tool: 'free_ai.install', tier };
    assert.equal(tool.tier, tier);
  }
});

test('settings.set key accepts "autostart"', () => {
  const tool: AppSettingsSetToolCall = { tool: 'settings.set', key: 'autostart', value: true };
  assert.equal(tool.key, 'autostart');
});
