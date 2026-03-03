import assert from 'node:assert/strict';
import test from 'node:test';

test('ownership mappings stay isolated by entity type', async () => {
  const { ownership } = await import('../apps/api/dist/lib/ownership.js');
  const id = `entity-${Date.now()}`;

  ownership.setDeviceOwner(id, 'device-owner');
  ownership.setRunOwner(id, 'run-owner');
  ownership.setActionOwner(id, 'action-owner');
  ownership.setToolOwner(id, 'tool-owner');

  assert.equal(ownership.getDeviceOwner(id), 'device-owner');
  assert.equal(ownership.getRunOwner(id), 'run-owner');
  assert.equal(ownership.getActionOwner(id), 'action-owner');
  assert.equal(ownership.getToolOwner(id), 'tool-owner');
});

test('device owner can be explicitly unset without affecting other mappings', async () => {
  const { ownership } = await import('../apps/api/dist/lib/ownership.js');
  const id = `entity-null-${Date.now()}`;

  ownership.setDeviceOwner(id, null);
  ownership.setRunOwner(id, 'run-owner');

  assert.equal(ownership.getDeviceOwner(id), null);
  assert.equal(ownership.getRunOwner(id), 'run-owner');
});
