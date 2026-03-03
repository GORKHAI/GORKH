import type { DeploymentStatus } from './deployment.js';

export interface StripeReadinessInput {
  secretKeyConfigured: boolean;
  webhookSecretConfigured: boolean;
  priceIdConfigured: boolean;
}

export interface DesktopReleaseReadinessInput {
  source: 'file' | 'github';
  repoConfigured: boolean;
  assetUrlsConfigured: boolean;
}

export interface ReadinessInput {
  deployment: DeploymentStatus;
  stripe: StripeReadinessInput;
  desktopRelease: DesktopReleaseReadinessInput;
  checkDatabase: () => Promise<void>;
}

export interface ReadinessReport {
  ok: boolean;
  database: { ok: boolean };
  deployment: DeploymentStatus;
  stripe: {
    configured: boolean;
    secretKeyConfigured: boolean;
    webhookSecretConfigured: boolean;
    priceIdConfigured: boolean;
  };
  desktopRelease: {
    source: 'file' | 'github';
    configured: boolean;
    repoConfigured: boolean;
    assetUrlsConfigured: boolean;
  };
  failures: string[];
}

export function getStripeReadiness(input: StripeReadinessInput): ReadinessReport['stripe'] {
  const configured = input.secretKeyConfigured && input.webhookSecretConfigured && input.priceIdConfigured;
  return {
    configured,
    secretKeyConfigured: input.secretKeyConfigured,
    webhookSecretConfigured: input.webhookSecretConfigured,
    priceIdConfigured: input.priceIdConfigured,
  };
}

export function getDesktopReleaseReadiness(
  input: DesktopReleaseReadinessInput
): ReadinessReport['desktopRelease'] {
  const configured = input.source === 'github' ? input.repoConfigured : input.assetUrlsConfigured;
  return {
    source: input.source,
    configured,
    repoConfigured: input.repoConfigured,
    assetUrlsConfigured: input.assetUrlsConfigured,
  };
}

export async function evaluateReadiness(input: ReadinessInput): Promise<ReadinessReport> {
  const failures: string[] = [];
  let databaseOk = true;

  try {
    await input.checkDatabase();
  } catch {
    databaseOk = false;
    failures.push('Database probe failed');
  }

  const stripe = getStripeReadiness(input.stripe);
  if (!stripe.configured) {
    failures.push('Stripe config is incomplete');
  }

  const desktopRelease = getDesktopReleaseReadiness(input.desktopRelease);
  if (!desktopRelease.configured) {
    failures.push('Desktop release provider config is incomplete');
  }

  if (input.deployment.status !== 'supported') {
    failures.push('Deployment mode is unsupported');
  }

  return {
    ok: databaseOk && stripe.configured && desktopRelease.configured && input.deployment.status === 'supported',
    database: { ok: databaseOk },
    deployment: input.deployment,
    stripe,
    desktopRelease,
    failures,
  };
}
