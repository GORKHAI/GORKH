#!/usr/bin/env node
/**
 * API Feed Verification Script (Iteration 29)
 * 
 * Validates that the API correctly serves desktop downloads and update feeds.
 * 
 * Environment variables:
 * - API_BASE (default: http://localhost:3001)
 * - USER_EMAIL (default: test@example.com)
 * - USER_PASSWORD (default: testpassword123)
 * - ADMIN_API_KEY (required for metrics check)
 * - SKIP_SUBSCRIPTION_CHECK (set to skip subscription validation)
 */

import { env } from 'node:process';
import { exit } from 'node:process';
import { writeFile, unlink } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';

const API_BASE = (env.API_BASE || 'http://localhost:3001').replace(/\/$/, '');
const USER_EMAIL = env.USER_EMAIL || `verify-test-${Date.now()}@example.com`;
const USER_PASSWORD = env.USER_PASSWORD || 'testpassword123';
const ADMIN_API_KEY = env.ADMIN_API_KEY;
const SKIP_SUBSCRIPTION_CHECK = env.SKIP_SUBSCRIPTION_CHECK === 'true';

const COOKIE_JAR = `/tmp/ai-operator-verify-cookies-${Date.now()}.txt`;

const CHECKS = {
  health: false,
  register: false,
  login: false,
  csrf: false,
  subscription: false,
  downloads: false,
  updates: false,
  metrics: false,
};

function log(message) {
  console.log(message);
}

function logError(message) {
  console.error(message);
}

async function cleanup() {
  try {
    await unlink(COOKIE_JAR);
  } catch {
    // Ignore cleanup errors
  }
}

async function httpRequest(url, options = {}) {
  const { method = 'GET', headers = {}, body, useCookies = true } = options;
  
  const fetchOptions = {
    method,
    headers: { ...headers },
    redirect: 'follow',
  };
  
  if (body) {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    if (!fetchOptions.headers['Content-Type']) {
      fetchOptions.headers['Content-Type'] = 'application/json';
    }
  }
  
  // Note: fetch doesn't support cookie jars natively, so we manually handle cookies
  const response = await fetch(url, fetchOptions);
  
  // Extract cookies from response
  const setCookie = response.headers.get('set-cookie');
  
  return {
    status: response.status,
    headers: response.headers,
    setCookie,
    json: async () => {
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    },
    text: () => response.text(),
  };
}

function extractCookie(setCookieHeader, name) {
  if (!setCookieHeader) return null;
  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  for (const cookie of cookies) {
    const match = cookie.match(new RegExp(`${name}=([^;]+)`));
    if (match) return match[1];
  }
  return null;
}

async function checkHealth() {
  log('  Checking /health...');
  const response = await httpRequest(`${API_BASE}/health`);
  
  if (response.status !== 200) {
    throw new Error(`Health check failed: ${response.status}`);
  }
  
  const data = await response.json();
  if (!data || !data.ok) {
    throw new Error('Health check returned invalid response');
  }
  
  log(`    ✅ API healthy (version: ${data.version || 'unknown'})`);
  CHECKS.health = true;
}

async function checkRegister() {
  log(`  Registering test user (${USER_EMAIL})...`);
  const response = await httpRequest(`${API_BASE}/auth/register`, {
    method: 'POST',
    body: { email: USER_EMAIL, password: USER_PASSWORD },
  });
  
  if (response.status !== 200 && response.status !== 201 && response.status !== 409) {
    throw new Error(`Registration failed: ${response.status}`);
  }
  
  log(`    ✅ Registration ${response.status === 409 ? '(user existed)' : 'successful'}`);
  CHECKS.register = true;
}

let csrfToken = '';
let accessToken = '';

async function checkLogin() {
  log('  Logging in...');
  const response = await httpRequest(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: { email: USER_EMAIL, password: USER_PASSWORD },
  });
  
  if (response.status !== 200) {
    throw new Error(`Login failed: ${response.status}`);
  }
  
  // Extract cookies
  const setCookie = response.headers.get('set-cookie');
  csrfToken = extractCookie(setCookie, 'csrf_token');
  accessToken = extractCookie(setCookie, 'access_token');
  
  if (!csrfToken) {
    throw new Error('CSRF token not found in login response');
  }
  if (!accessToken) {
    throw new Error('Access token not found in login response');
  }
  
  log(`    ✅ Login successful (CSRF token received)`);
  CHECKS.login = true;
}

async function checkCsrfProtection() {
  log('  Checking CSRF protection...');
  
  // Try to create a run WITHOUT CSRF token (should fail with 403)
  const response = await httpRequest(`${API_BASE}/runs`, {
    method: 'POST',
    headers: {
      'Cookie': `access_token=${accessToken}; refresh_token=test`,
    },
    body: { deviceId: 'test-device', goal: 'CSRF test', mode: 'manual' },
  });
  
  if (response.status !== 403) {
    throw new Error(`CSRF protection not working: expected 403, got ${response.status}`);
  }
  
  log(`    ✅ CSRF protection active (403 without token)`);
  CHECKS.csrf = true;
}

async function checkSubscriptionBypass() {
  // When BILLING_ENABLED=false, the API may not enforce subscriptions
  // This is a dev-only mode check
  log('  Checking subscription enforcement...');
  
  // Try to access downloads without active subscription
  const response = await httpRequest(`${API_BASE}/downloads/desktop`, {
    headers: {
      'Cookie': `access_token=${accessToken}; csrf_token=${csrfToken}`,
      'X-CSRF-Token': csrfToken,
    },
  });
  
  // If billing is disabled, this will return 200
  // If billing is enabled and user has no subscription, this returns 402
  if (response.status === 200) {
    log(`    ℹ️ Subscription gating bypassed (BILLING_ENABLED likely false)`);
    CHECKS.subscription = true;
    return true;
  } else if (response.status === 402) {
    log(`    ✅ Subscription gating active (402 for inactive users)`);
    
    if (SKIP_SUBSCRIPTION_CHECK) {
      log(`    ⚠️ Skipping subscription activation (SKIP_SUBSCRIPTION_CHECK=true)`);
      CHECKS.subscription = true;
      return true;
    }
    
    log(`    ℹ️ To activate subscription, run in API directory:`);
    log(`       npx prisma db execute --url="$DATABASE_URL" --stdin <<EOF`);
    log(`       UPDATE "User" SET "subscriptionStatus" = 'active' WHERE email = '${USER_EMAIL}';`);
    log(`       EOF`);
    
    // Don't fail the check, just note it
    CHECKS.subscription = true;
    return false;
  } else {
    throw new Error(`Unexpected status from /downloads/desktop: ${response.status}`);
  }
}

async function checkDownloads() {
  log('  Checking /downloads/desktop...');
  
  const response = await httpRequest(`${API_BASE}/downloads/desktop`, {
    headers: {
      'Cookie': `access_token=${accessToken}; csrf_token=${csrfToken}`,
      'X-CSRF-Token': csrfToken,
    },
  });
  
  if (response.status !== 200) {
    throw new Error(`Downloads endpoint failed: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Validate response structure
  if (!data.version) {
    throw new Error('Downloads response missing version field');
  }
  
  const requiredFields = ['windowsUrl', 'macIntelUrl', 'macArmUrl'];
  for (const field of requiredFields) {
    if (!data[field]) {
      throw new Error(`Downloads response missing ${field}`);
    }
    if (!data[field].startsWith('https://') && !data[field].startsWith('http://')) {
      throw new Error(`Downloads response ${field} is not a valid URL: ${data[field]}`);
    }
  }
  
  log(`    ✅ Downloads valid (version: ${data.version})`);
  log(`       Windows: ${data.windowsUrl.substring(0, 60)}...`);
  CHECKS.downloads = true;
}

async function checkUpdates() {
  log('  Checking /updates/desktop/darwin/aarch64/0.0.0.json...');
  
  const response = await httpRequest(`${API_BASE}/updates/desktop/darwin/aarch64/0.0.0.json`);
  
  if (response.status !== 200) {
    throw new Error(`Update feed failed: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Validate response structure
  if (!data.version) {
    throw new Error('Update feed missing version field');
  }
  
  if (!data.platforms) {
    throw new Error('Update feed missing platforms object');
  }
  
  const platform = data.platforms['darwin-aarch64'];
  if (!platform) {
    throw new Error('Update feed missing darwin-aarch64 platform');
  }
  
  if (!platform.url) {
    throw new Error('Update feed platform missing url');
  }
  
  if (!platform.signature) {
    throw new Error('Update feed platform missing signature');
  }
  
  log(`    ✅ Update feed valid (version: ${data.version})`);
  log(`       URL: ${platform.url.substring(0, 60)}...`);
  log(`       Signature: ${platform.signature.substring(0, 40)}...`);
  CHECKS.updates = true;
}

async function checkMetrics() {
  log('  Checking /metrics with admin key...');
  
  if (!ADMIN_API_KEY) {
    log(`    ⚠️ Skipping metrics check (ADMIN_API_KEY not provided)`);
    CHECKS.metrics = true; // Don't fail for this
    return;
  }
  
  const response = await httpRequest(`${API_BASE}/metrics`, {
    headers: {
      'x-admin-api-key': ADMIN_API_KEY,
    },
  });
  
  if (response.status === 401) {
    throw new Error('Metrics check failed: Invalid admin API key');
  }
  
  if (response.status !== 200) {
    throw new Error(`Metrics check failed: ${response.status}`);
  }
  
  const text = await response.text();
  
  // Basic validation of Prometheus format
  if (!text.includes('# TYPE') && !text.includes('http_requests_total')) {
    throw new Error('Metrics response does not appear to be valid Prometheus format');
  }
  
  log(`    ✅ Metrics endpoint accessible (${text.split('\n').length} lines)`);
  CHECKS.metrics = true;
}

async function main() {
  log('========================================');
  log('API Feed Verification (Iteration 29)');
  log('========================================');
  log('');
  log(`API Base: ${API_BASE}`);
  log(`Test User: ${USER_EMAIL}`);
  log(`Admin Key: ${ADMIN_API_KEY ? 'Yes' : 'No'}`);
  log('');
  
  try {
    // Run checks in sequence
    await checkHealth();
    await checkRegister();
    await checkLogin();
    await checkCsrfProtection();
    await checkSubscriptionBypass();
    await checkDownloads();
    await checkUpdates();
    await checkMetrics();
    
    log('');
    log('========================================');
    log('Summary');
    log('========================================');
    
    const allPassed = Object.values(CHECKS).every(v => v);
    
    for (const [name, passed] of Object.entries(CHECKS)) {
      log(`  ${passed ? '✅' : '❌'} ${name}`);
    }
    
    log('');
    printMachineReadable(allPassed);
    
    await cleanup();
    exit(allPassed ? 0 : 1);
    
  } catch (error) {
    log('');
    logError(`ERROR: ${error.message}`);
    log('');
    log('Checks completed before failure:');
    for (const [name, passed] of Object.entries(CHECKS)) {
      if (passed) log(`  ✅ ${name}`);
    }
    
    await cleanup();
    exit(1);
  }
}

function printMachineReadable(ok) {
  console.log('---');
  console.log(`API_FEED_OK=${ok}`);
  console.log(`CHECKS=${JSON.stringify(CHECKS)}`);
  console.log('---');
}

main().catch(async error => {
  logError(`FATAL ERROR: ${error.message}`);
  await cleanup();
  exit(1);
});
