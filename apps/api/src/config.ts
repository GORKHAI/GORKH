import { z } from 'zod';
import { assertSupportedDeploymentMode } from './lib/deployment.js';
import { validateDesktopDownloadsPayload } from './lib/releases/validation.js';
import { validateSecurityRuntimeConfig } from './lib/security.js';

const configSchema = z.object({
  PORT: z.string().transform((s) => parseInt(s, 10)).default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  DEPLOYMENT_MODE: z.enum(['single_instance', 'multi_instance']).default('single_instance'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_KEY_ID: z.string().default('v1'),
  JWT_SECRET_MIN_LENGTH: z.string().transform((s) => parseInt(s, 10)).default('32'),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('30m'),
  REFRESH_TOKEN_TTL_DAYS: z.string().transform((s) => parseInt(s, 10)).default('14'),
  CSRF_COOKIE_NAME: z.string().default('csrf_token'),
  ACCESS_COOKIE_NAME: z.string().default('access_token'),
  REFRESH_COOKIE_NAME: z.string().default('refresh_token'),
  COOKIE_DOMAIN: z.string().optional(),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  ALLOW_INSECURE_DEV: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  STRIPE_SECRET_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),
  STRIPE_PRICE_ID: z.string().default(''),
  APP_BASE_URL: z.string().url().default('http://localhost:3000'),
  API_PUBLIC_BASE_URL: z.string().url().default('http://localhost:3001'),
  DESKTOP_UPDATE_FEED_DIR: z.string().default('./updates'),
  DESKTOP_UPDATE_ENABLED: z.enum(['true', 'false']).default('true').transform((value) => value === 'true'),
  DESKTOP_RELEASE_SOURCE: z.enum(['file', 'github']).default('github'),
  GITHUB_REPO_OWNER: z.string().default(''),
  GITHUB_REPO_NAME: z.string().default(''),
  GITHUB_TOKEN: z.string().optional(),
  DESKTOP_RELEASE_CACHE_TTL_SECONDS: z.string().transform((s) => parseInt(s, 10)).default('60'),
  DESKTOP_RELEASE_TAG: z.string().default('latest'),
  DESKTOP_VERSION: z.string().default(''),
  DESKTOP_WIN_URL: z.string().default(''),
  DESKTOP_MAC_INTEL_URL: z.string().default(''),
  DESKTOP_MAC_ARM_URL: z.string().default(''),
  ADMIN_API_KEY: z.string().default(''),
  METRICS_PUBLIC: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  AUTH_LOGIN_PER_MIN: z.string().transform((s) => parseInt(s, 10)).default('10'),
  AUTH_REFRESH_PER_MIN: z.string().transform((s) => parseInt(s, 10)).default('30'),
  BILLING_PER_MIN: z.string().transform((s) => parseInt(s, 10)).default('10'),
  RUNS_CREATE_PER_MIN: z.string().transform((s) => parseInt(s, 10)).default('6'),
  CONTROL_ACTIONS_PER_10S: z.string().transform((s) => parseInt(s, 10)).default('5'),
  TOOL_EVENTS_PER_10S: z.string().transform((s) => parseInt(s, 10)).default('20'),
  SSE_CONNECT_PER_MIN: z.string().transform((s) => parseInt(s, 10)).default('30'),
  AUDIT_RETENTION_DAYS: z.string().transform((s) => parseInt(s, 10)).default('30'),
  STRIPE_EVENT_RETENTION_DAYS: z.string().transform((s) => parseInt(s, 10)).default('30'),
  SESSION_RETENTION_DAYS: z.string().transform((s) => parseInt(s, 10)).default('30'),
  RUN_RETENTION_DAYS: z.string().transform((s) => parseInt(s, 10)).default('90'),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  RATE_LIMIT_BACKEND: z.enum(['redis', 'memory']).default('memory'),
  BILLING_ENABLED: z.enum(['true', 'false']).default('true').transform((value) => value === 'true'),
  FREE_AI_FALLBACK_ENABLED: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  FREE_AI_FALLBACK_BASE_URL: z.string().default(''),
  FREE_AI_FALLBACK_MODEL: z.string().default(''),
  FREE_AI_FALLBACK_VISION_MODEL: z.string().default(''),
  FREE_AI_FALLBACK_API_KEY: z.string().default(''),
  FREE_AI_FALLBACK_DAILY_LIMIT: z.string().transform((s) => parseInt(s, 10)).default('5'),
  FREE_TIER_ENABLED: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  DEEPSEEK_FREE_TIER_API_KEY: z.string().default(''),
  RUN_RECOVERY_POLICY: z.enum(['fail', 'cancel']).default('fail'),
  // Error tracking (optional)
  SENTRY_DSN: z.string().default(''),
  SENTRY_ENVIRONMENT: z.string().default(''),
  SENTRY_SAMPLE_RATE: z.string().transform((s) => parseFloat(s)).default('1.0'),
});

function loadConfig() {
  const raw = {
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL,
    DEPLOYMENT_MODE: process.env.DEPLOYMENT_MODE,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_KEY_ID: process.env.JWT_KEY_ID,
    JWT_SECRET_MIN_LENGTH: process.env.JWT_SECRET_MIN_LENGTH,
    ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN ?? process.env.JWT_EXPIRES_IN,
    REFRESH_TOKEN_TTL_DAYS: process.env.REFRESH_TOKEN_TTL_DAYS,
    CSRF_COOKIE_NAME: process.env.CSRF_COOKIE_NAME,
    ACCESS_COOKIE_NAME: process.env.ACCESS_COOKIE_NAME,
    REFRESH_COOKIE_NAME: process.env.REFRESH_COOKIE_NAME,
    COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
    WEB_ORIGIN: process.env.WEB_ORIGIN,
    ALLOW_INSECURE_DEV: process.env.ALLOW_INSECURE_DEV,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
    APP_BASE_URL: process.env.APP_BASE_URL,
    API_PUBLIC_BASE_URL: process.env.API_PUBLIC_BASE_URL,
    DESKTOP_UPDATE_FEED_DIR: process.env.DESKTOP_UPDATE_FEED_DIR,
    DESKTOP_UPDATE_ENABLED: process.env.DESKTOP_UPDATE_ENABLED,
    DESKTOP_RELEASE_SOURCE: process.env.DESKTOP_RELEASE_SOURCE,
    GITHUB_REPO_OWNER: process.env.GITHUB_REPO_OWNER,
    GITHUB_REPO_NAME: process.env.GITHUB_REPO_NAME,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    DESKTOP_RELEASE_CACHE_TTL_SECONDS: process.env.DESKTOP_RELEASE_CACHE_TTL_SECONDS,
    DESKTOP_RELEASE_TAG: process.env.DESKTOP_RELEASE_TAG,
    DESKTOP_VERSION: process.env.DESKTOP_VERSION,
    DESKTOP_WIN_URL: process.env.DESKTOP_WIN_URL,
    DESKTOP_MAC_INTEL_URL: process.env.DESKTOP_MAC_INTEL_URL,
    DESKTOP_MAC_ARM_URL: process.env.DESKTOP_MAC_ARM_URL,
    ADMIN_API_KEY: process.env.ADMIN_API_KEY,
    METRICS_PUBLIC: process.env.METRICS_PUBLIC,
    AUTH_LOGIN_PER_MIN: process.env.AUTH_LOGIN_PER_MIN,
    AUTH_REFRESH_PER_MIN: process.env.AUTH_REFRESH_PER_MIN,
    BILLING_PER_MIN: process.env.BILLING_PER_MIN,
    RUNS_CREATE_PER_MIN: process.env.RUNS_CREATE_PER_MIN,
    CONTROL_ACTIONS_PER_10S: process.env.CONTROL_ACTIONS_PER_10S,
    TOOL_EVENTS_PER_10S: process.env.TOOL_EVENTS_PER_10S,
    SSE_CONNECT_PER_MIN: process.env.SSE_CONNECT_PER_MIN,
    AUDIT_RETENTION_DAYS: process.env.AUDIT_RETENTION_DAYS,
    STRIPE_EVENT_RETENTION_DAYS: process.env.STRIPE_EVENT_RETENTION_DAYS,
    SESSION_RETENTION_DAYS: process.env.SESSION_RETENTION_DAYS,
    RUN_RETENTION_DAYS: process.env.RUN_RETENTION_DAYS,
    REDIS_URL: process.env.REDIS_URL,
    RATE_LIMIT_BACKEND: process.env.RATE_LIMIT_BACKEND,
    BILLING_ENABLED: process.env.BILLING_ENABLED,
    FREE_AI_FALLBACK_ENABLED: process.env.FREE_AI_FALLBACK_ENABLED,
    FREE_AI_FALLBACK_BASE_URL: process.env.FREE_AI_FALLBACK_BASE_URL,
    FREE_AI_FALLBACK_MODEL: process.env.FREE_AI_FALLBACK_MODEL,
    FREE_AI_FALLBACK_VISION_MODEL: process.env.FREE_AI_FALLBACK_VISION_MODEL,
    FREE_AI_FALLBACK_API_KEY: process.env.FREE_AI_FALLBACK_API_KEY,
    FREE_AI_FALLBACK_DAILY_LIMIT: process.env.FREE_AI_FALLBACK_DAILY_LIMIT,
    FREE_TIER_ENABLED: process.env.FREE_TIER_ENABLED,
    DEEPSEEK_FREE_TIER_API_KEY: process.env.DEEPSEEK_FREE_TIER_API_KEY,
    RUN_RECOVERY_POLICY: process.env.RUN_RECOVERY_POLICY,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
    SENTRY_SAMPLE_RATE: process.env.SENTRY_SAMPLE_RATE,
  };

  const result = configSchema.safeParse(raw);

  if (!result.success) {
    console.error('❌ Invalid configuration:');
    for (const issue of result.error.issues) {
      console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
    }
    console.error('\nRequired environment variables:');
    console.error('   PORT (default: 3001)');
    console.error('   NODE_ENV (default: development)');
    console.error('   LOG_LEVEL (default: info)');
    console.error('   DEPLOYMENT_MODE (default: single_instance)');
    console.error('   DATABASE_URL');
    console.error('   JWT_SECRET');
    console.error('   ACCESS_TOKEN_EXPIRES_IN (default: 30m)');
    console.error('   REFRESH_TOKEN_TTL_DAYS (default: 14)');
    console.error('   CSRF_COOKIE_NAME (default: csrf_token)');
    console.error('   ACCESS_COOKIE_NAME (default: access_token)');
    console.error('   REFRESH_COOKIE_NAME (default: refresh_token)');
    console.error('   COOKIE_DOMAIN (optional, e.g. .example.com)');
    console.error('   WEB_ORIGIN (default: http://localhost:3000)');
    console.error('   ALLOW_INSECURE_DEV (default: false)');
    console.error('   STRIPE_SECRET_KEY');
    console.error('   STRIPE_WEBHOOK_SECRET');
    console.error('   STRIPE_PRICE_ID');
    console.error('   APP_BASE_URL (default: http://localhost:3000)');
    console.error('   API_PUBLIC_BASE_URL (default: http://localhost:3001)');
    console.error('   DESKTOP_UPDATE_FEED_DIR (default: ./updates)');
    console.error('   DESKTOP_UPDATE_ENABLED (default: true)');
    console.error('   DESKTOP_RELEASE_SOURCE (default: github)');
    console.error('   GITHUB_REPO_OWNER (required for github mode)');
    console.error('   GITHUB_REPO_NAME (required for github mode)');
    console.error('   GITHUB_TOKEN (optional, required for private repos)');
    console.error('   DESKTOP_RELEASE_CACHE_TTL_SECONDS (default: 60)');
    console.error('   DESKTOP_RELEASE_TAG (default: latest)');
    console.error('   DESKTOP_VERSION (required for file mode)');
    console.error('   DESKTOP_WIN_URL (required for file mode)');
    console.error('   DESKTOP_MAC_INTEL_URL (required for file mode)');
    console.error('   DESKTOP_MAC_ARM_URL (required for file mode)');
    console.error('   ADMIN_API_KEY (default: disabled)');
    console.error('   METRICS_PUBLIC (default: false)');
    console.error('   AUTH_LOGIN_PER_MIN (default: 10)');
    console.error('   AUTH_REFRESH_PER_MIN (default: 30)');
    console.error('   BILLING_PER_MIN (default: 10)');
    console.error('   RUNS_CREATE_PER_MIN (default: 6)');
    console.error('   CONTROL_ACTIONS_PER_10S (default: 5)');
    console.error('   TOOL_EVENTS_PER_10S (default: 20)');
    console.error('   SSE_CONNECT_PER_MIN (default: 30)');
    console.error('   AUDIT_RETENTION_DAYS (default: 30)');
    console.error('   STRIPE_EVENT_RETENTION_DAYS (default: 30)');
    console.error('   SESSION_RETENTION_DAYS (default: 30)');
    console.error('   RUN_RETENTION_DAYS (default: 90)');
    process.exit(1);
  }

  const webOrigins = result.data.WEB_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // Production-hardening validations
  if (result.data.NODE_ENV === 'production') {
    // JWT secret must meet minimum length for security
    if (result.data.JWT_SECRET.length < result.data.JWT_SECRET_MIN_LENGTH) {
      console.error(`❌ Invalid configuration:`);
      console.error(`   - JWT_SECRET must be at least ${result.data.JWT_SECRET_MIN_LENGTH} characters in production`);
      console.error(`     Current length: ${result.data.JWT_SECRET.length}`);
      console.error(`     Set JWT_SECRET_MIN_LENGTH to override (default: 32)`);
      process.exit(1);
    }

    // Admin API key should be set in production
    if (!result.data.ADMIN_API_KEY || result.data.ADMIN_API_KEY.length < 16) {
      console.error('❌ Invalid configuration:');
      console.error('   - ADMIN_API_KEY must be set and at least 16 characters in production');
      process.exit(1);
    }
  }

  try {
    assertSupportedDeploymentMode(result.data.DEPLOYMENT_MODE);
    validateSecurityRuntimeConfig({
      nodeEnv: result.data.NODE_ENV,
      allowInsecureDev: result.data.ALLOW_INSECURE_DEV,
      appBaseUrl: result.data.APP_BASE_URL,
      webOrigins,
    });
    if (result.data.DESKTOP_RELEASE_SOURCE === 'file') {
      validateDesktopDownloadsPayload(
        {
          version: result.data.DESKTOP_VERSION,
          windowsUrl: result.data.DESKTOP_WIN_URL,
          macIntelUrl: result.data.DESKTOP_MAC_INTEL_URL,
          macArmUrl: result.data.DESKTOP_MAC_ARM_URL,
        },
        {
          nodeEnv: result.data.NODE_ENV,
          allowInsecureDev: result.data.ALLOW_INSECURE_DEV,
          apiPublicBaseUrl: result.data.API_PUBLIC_BASE_URL,
        }
      );
    }
  } catch (error) {
    console.error('❌ Invalid configuration:');
    console.error(`   - ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  return {
    ...result.data,
    WEB_ORIGINS: webOrigins,
  };
}

export const config = loadConfig();
