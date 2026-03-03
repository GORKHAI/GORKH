import assert from 'node:assert/strict';
import test from 'node:test';

test('readiness is healthy when DB probing succeeds and required config is present', async () => {
  const { evaluateReadiness } = await import('../apps/api/dist/lib/readiness.js');
  const { getDeploymentStatus } = await import('../apps/api/dist/lib/deployment.js');

  const readiness = await evaluateReadiness({
    deployment: getDeploymentStatus('single_instance'),
    stripe: {
      secretKeyConfigured: true,
      webhookSecretConfigured: true,
      priceIdConfigured: true,
    },
    desktopRelease: {
      source: 'github',
      repoConfigured: true,
      assetUrlsConfigured: false,
    },
    checkDatabase: async () => {},
  });

  assert.equal(readiness.ok, true);
  assert.deepEqual(readiness.failures, []);
  assert.equal(readiness.database.ok, true);
  assert.equal(readiness.desktopRelease.configured, true);
});

test('readiness reports concrete failures when DB probing fails or provider config is incomplete', async () => {
  const { evaluateReadiness } = await import('../apps/api/dist/lib/readiness.js');
  const { getDeploymentStatus } = await import('../apps/api/dist/lib/deployment.js');

  const readiness = await evaluateReadiness({
    deployment: getDeploymentStatus('single_instance'),
    stripe: {
      secretKeyConfigured: true,
      webhookSecretConfigured: false,
      priceIdConfigured: true,
    },
    desktopRelease: {
      source: 'github',
      repoConfigured: false,
      assetUrlsConfigured: false,
    },
    checkDatabase: async () => {
      throw new Error('db offline');
    },
  });

  assert.equal(readiness.ok, false);
  assert.equal(readiness.database.ok, false);
  assert.equal(readiness.stripe.configured, false);
  assert.equal(readiness.desktopRelease.configured, false);
  assert.match(readiness.failures.join(' | '), /database/i);
  assert.match(readiness.failures.join(' | '), /stripe/i);
  assert.match(readiness.failures.join(' | '), /desktop release/i);
});
