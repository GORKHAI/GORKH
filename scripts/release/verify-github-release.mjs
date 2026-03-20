#!/usr/bin/env node
/**
 * GitHub Release Verification Script (Iteration 29)
 * 
 * Validates that a GitHub Release has the correct assets and metadata
 * for stable or beta channel distribution.
 * 
 * Environment variables:
 * - GITHUB_REPO_OWNER (required)
 * - GITHUB_REPO_NAME (required)
 * - GITHUB_TOKEN (optional, required for private repos)
 * - RELEASE_TAG (e.g., 'v1.0.0', 'v1.0.0-beta.1', or 'latest')
 * - CHANNEL (stable|beta, default: stable)
 */

import { env } from 'node:process';
import { exit } from 'node:process';

const OWNER = env.GITHUB_REPO_OWNER;
const REPO = env.GITHUB_REPO_NAME;
const TOKEN = env.GITHUB_TOKEN;
const RELEASE_TAG = env.RELEASE_TAG || 'latest';
const CHANNEL = env.CHANNEL || 'stable';

const REQUIRED_ASSETS_STABLE = [
  { name: 'ai-operator-desktop_{VERSION}_macos_aarch64.dmg', type: 'installer' },
  { name: 'ai-operator-desktop_{VERSION}_macos_aarch64.dmg.sig', type: 'signature' },
  { name: 'ai-operator-desktop_{VERSION}_macos_x86_64.dmg', type: 'installer' },
  { name: 'ai-operator-desktop_{VERSION}_macos_x86_64.dmg.sig', type: 'signature' },
];

const REQUIRED_ASSETS_BETA = [
  { name: 'ai-operator-desktop_{VERSION}_windows_x86_64.msi', type: 'installer', optional: false },
  { name: 'ai-operator-desktop_{VERSION}_macos_aarch64.dmg', type: 'installer', optional: true },
  { name: 'ai-operator-desktop_{VERSION}_macos_x86_64.dmg', type: 'installer', optional: true },
];

const BETA_DISALLOWED_ASSETS = [
  '.msi.sig',
  '.dmg.sig',
];

function log(message) {
  console.log(message);
}

function logError(message) {
  console.error(message);
}

function sanitizeVersion(tag) {
  // Remove 'v' prefix if present
  return tag.startsWith('v') ? tag.slice(1) : tag;
}

function formatAssetName(template, version) {
  return template.replace('{VERSION}', version);
}

async function fetchGitHubApi(path) {
  const url = `https://api.github.com${path}`;
  const headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  
  if (TOKEN) {
    headers['Authorization'] = `Bearer ${TOKEN}`;
  }

  try {
    const response = await fetch(url, { headers });
    
    if (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0') {
      throw new Error('GitHub API rate limit exceeded. Set GITHUB_TOKEN for higher limits.');
    }
    
    if (response.status === 404) {
      throw new Error(`Release not found: ${path}`);
    }
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new Error('Unable to reach GitHub API. Network may be blocked or GitHub may be down.');
    }
    throw error;
  }
}

async function fetchLatestRelease(owner, repo, channel) {
  // For latest stable, we need to find the most recent non-prerelease
  // For latest beta, we need the most recent prerelease
  
  const releases = await fetchGitHubApi(`/repos/${owner}/${repo}/releases?per_page=10`);
  
  if (!releases || releases.length === 0) {
    throw new Error('No releases found in repository');
  }
  
  if (channel === 'stable') {
    const stableRelease = releases.find(r => !r.prerelease);
    if (!stableRelease) {
      throw new Error('No stable (non-prerelease) release found');
    }
    return stableRelease;
  } else {
    // beta channel - look for prerelease
    const betaRelease = releases.find(r => r.prerelease);
    if (!betaRelease) {
      throw new Error('No beta (prerelease) release found');
    }
    return betaRelease;
  }
}

async function fetchRelease(owner, repo, tag) {
  if (tag === 'latest') {
    return fetchLatestRelease(owner, repo, CHANNEL);
  }
  
  return await fetchGitHubApi(`/repos/${owner}/${repo}/releases/tags/${tag}`);
}

function verifyStableRelease(release, version) {
  const assets = release.assets || [];
  const assetNames = assets.map(a => a.name);
  const missing = [];
  
  for (const required of REQUIRED_ASSETS_STABLE) {
    const expectedName = formatAssetName(required.name, version);
    if (!assetNames.includes(expectedName)) {
      missing.push(expectedName);
    }
  }
  
  return {
    ok: missing.length === 0,
    missing,
    hasSignatureFiles: assetNames.some(n => n.endsWith('.sig')),
  };
}

function verifyBetaRelease(release, version) {
  const assets = release.assets || [];
  const assetNames = assets.map(a => a.name);
  const missing = [];
  const disallowed = [];
  
  // Check for required assets
  for (const required of REQUIRED_ASSETS_BETA) {
    const expectedName = formatAssetName(required.name, version);
    if (!assetNames.includes(expectedName) && !required.optional) {
      missing.push(expectedName);
    }
  }
  
  // Check for disallowed signature files
  for (const name of assetNames) {
    if (BETA_DISALLOWED_ASSETS.some(ext => name.endsWith(ext))) {
      disallowed.push(name);
    }
  }
  
  // Beta must be prerelease
  if (!release.prerelease) {
    return {
      ok: false,
      missing: [...missing, 'prerelease flag must be true'],
      disallowed,
      hasSignatureFiles: false,
    };
  }
  
  return {
    ok: missing.length === 0 && disallowed.length === 0,
    missing,
    disallowed,
    hasSignatureFiles: false,
  };
}

async function main() {
  log('========================================');
  log('GitHub Release Verification (Iteration 29)');
  log('========================================');
  log('');
  
  // Validate inputs
  if (!OWNER || !REPO) {
    logError('ERROR: GITHUB_REPO_OWNER and GITHUB_REPO_NAME are required');
    log('Usage: GITHUB_REPO_OWNER=owner GITHUB_REPO_NAME=repo [GITHUB_TOKEN=token] [RELEASE_TAG=v1.0.0] [CHANNEL=stable|beta] node verify-github-release.mjs');
    exit(1);
  }
  
  log(`Repository: ${OWNER}/${REPO}`);
  log(`Channel: ${CHANNEL}`);
  log(`Release Tag: ${RELEASE_TAG}`);
  log(`Auth: ${TOKEN ? 'Yes (token provided)' : 'No (anonymous, lower rate limits)'}`);
  log('');
  
  let release;
  try {
    release = await fetchRelease(OWNER, REPO, RELEASE_TAG);
  } catch (error) {
    logError(`ERROR: Failed to fetch release: ${error.message}`);
    exit(1);
  }
  
  const version = sanitizeVersion(release.tag_name);
  log(`Found Release:`);
  log(`  Tag: ${release.tag_name}`);
  log(`  Version: ${version}`);
  log(`  Name: ${release.name}`);
  log(`  Prerelease: ${release.prerelease}`);
  log(`  Published: ${release.published_at}`);
  log(`  Assets: ${release.assets?.length || 0}`);
  log('');
  
  // Verify channel matches
  if (CHANNEL === 'stable' && release.prerelease) {
    logError('ERROR: Channel is "stable" but release is marked as prerelease');
    log('');
    printMachineReadable(false, version, ['Release is prerelease but channel is stable']);
    exit(1);
  }
  
  if (CHANNEL === 'beta' && !release.prerelease) {
    logError('ERROR: Channel is "beta" but release is NOT marked as prerelease');
    log('');
    printMachineReadable(false, version, ['Release is not prerelease but channel is beta']);
    exit(1);
  }
  
  // Run channel-specific verification
  let result;
  if (CHANNEL === 'stable') {
    result = verifyStableRelease(release, version);
  } else {
    result = verifyBetaRelease(release, version);
  }
  
  // Print results
  log('Verification Results:');
  log(`  Status: ${result.ok ? '✅ PASS' : '❌ FAIL'}`);
  
  if (result.missing.length > 0) {
    log('  Missing Assets:');
    for (const item of result.missing) {
      log(`    - ${item}`);
    }
  }
  
  if (result.disallowed && result.disallowed.length > 0) {
    log('  Disallowed Assets (beta should not have signatures):');
    for (const item of result.disallowed) {
      log(`    - ${item}`);
    }
  }
  
  log('');
  
  // Machine-readable summary
  printMachineReadable(result.ok, version, result.missing, result.disallowed);
  
  exit(result.ok ? 0 : 1);
}

function printMachineReadable(ok, version, missing, disallowed = []) {
  const issues = [...missing, ...(disallowed || []).map(d => `disallowed:${d}`)];
  console.log('---');
  console.log(`RELEASE_OK=${ok}`);
  console.log(`VERSION=${version}`);
  console.log(`MISSING_ASSETS=[${issues.map(i => `"${i}"`).join(', ')}]`);
  console.log('---');
}

main().catch(error => {
  logError(`ERROR: ${error.message}`);
  exit(1);
});
