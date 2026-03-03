import assert from 'node:assert/strict';
import test from 'node:test';

test('deployment metadata reports the current single-instance contract', async () => {
  const { getDeploymentStatus } = await import('../apps/api/dist/lib/deployment.js');

  assert.deepEqual(getDeploymentStatus('single_instance'), {
    mode: 'single_instance',
    stickySessionsRequired: true,
    multiInstanceSupported: false,
    status: 'supported',
  });
});

test('deployment validation rejects unsupported multi-instance mode', async () => {
  const { assertSupportedDeploymentMode } = await import('../apps/api/dist/lib/deployment.js');

  assert.throws(
    () => assertSupportedDeploymentMode('multi_instance'),
    /multi-instance deployment is not supported/i
  );
});
