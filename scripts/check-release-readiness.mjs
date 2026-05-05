#!/usr/bin/env node
// ----------------------------------------------------------------------------
// check-release-readiness.mjs
// ----------------------------------------------------------------------------
// Apple/macOS release readiness guard script.
// Verifies package identity, security boundaries, and Tauri config presence.
// Does NOT create tags, upload artifacts, or modify source.
// ----------------------------------------------------------------------------

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const results = [];
let passCount = 0;
let failCount = 0;

function ok(message) {
  results.push({ status: 'PASS', message });
  passCount++;
}

function fail(message) {
  results.push({ status: 'FAIL', message });
  failCount++;
}

function section(title) {
  results.push({ status: 'SECTION', message: title });
}

// ---------------------------------------------------------------------------
// 1. Package identity
// ---------------------------------------------------------------------------
section('Package Identity');

const workspacePackages = [
  'apps/api/package.json',
  'apps/desktop/package.json',
  'apps/ios/package.json',
  'apps/web/package.json',
  'packages/shared/package.json',
];

for (const pkgPath of workspacePackages) {
  const fullPath = resolve(pkgPath);
  if (!existsSync(fullPath)) {
    fail(`Missing package.json: ${pkgPath}`);
    continue;
  }
  const pkg = JSON.parse(readFileSync(fullPath, 'utf8'));
  const name = pkg.name ?? '';
  if (name.startsWith('@gorkh/')) {
    ok(`${pkgPath} name is ${name}`);
  } else {
    fail(`${pkgPath} name is ${name} (expected @gorkh/*)`);
  }
}

// ---------------------------------------------------------------------------
// 2. No active @ai-operator references in source
// ---------------------------------------------------------------------------
section('Source References');

const sourceRoots = [
  'apps/desktop/src',
  'apps/web/app',
  'apps/api/src',
  'packages/shared/src',
];

let aiOperatorFound = false;
for (const root of sourceRoots) {
  const fullRoot = resolve(root);
  if (!existsSync(fullRoot)) continue;
  const files = listTsJsFiles(fullRoot);
  for (const f of files) {
    const content = readFileSync(f, 'utf8');
    if (content.includes('@ai-operator/')) {
      fail(`Found @ai-operator/ reference in ${f}`);
      aiOperatorFound = true;
    }
  }
}
if (!aiOperatorFound) {
  ok('No @ai-operator/ references in active source files');
}

// ---------------------------------------------------------------------------
// 3. macOS / Tauri config presence
// ---------------------------------------------------------------------------
section('macOS / Tauri Config');

const tauriConfigPath = resolve('apps/desktop/src-tauri/tauri.conf.json');
if (existsSync(tauriConfigPath)) {
  const tauriConfig = JSON.parse(readFileSync(tauriConfigPath, 'utf8'));
  ok('tauri.conf.json exists');
  if (tauriConfig.productName === 'GORKH') {
    ok('productName is GORKH');
  } else {
    fail(`productName is ${tauriConfig.productName} (expected GORKH)`);
  }
  if (tauriConfig.bundle?.icon?.some((i) => i.includes('.icns'))) {
    ok('macOS .icns icon is configured');
  } else {
    fail('macOS .icns icon is missing from bundle config');
  }
  if (tauriConfig.app?.macOSPrivateApi === true) {
    ok('macOSPrivateApi is enabled');
  } else {
    fail('macOSPrivateApi is not enabled');
  }
} else {
  fail('tauri.conf.json is missing');
}

const cargoTomlPath = resolve('apps/desktop/src-tauri/Cargo.toml');
if (existsSync(cargoTomlPath)) {
  const cargoToml = readFileSync(cargoTomlPath, 'utf8');
  ok('Cargo.toml exists');
  if (cargoToml.includes('tauri = { version = "2"')) {
    ok('Tauri v2 dependency confirmed');
  } else {
    fail('Tauri v2 dependency not detected in Cargo.toml');
  }
} else {
  fail('Cargo.toml is missing');
}

// ---------------------------------------------------------------------------
// 4. Denied blockchain methods
// ---------------------------------------------------------------------------
section('Denied Blockchain Methods');

const workstationRoots = [
  resolve('apps/desktop/src/features/solana-workstation'),
];

const forbiddenCalls = [
  'sendTransaction',
  'sendRawTransaction',
  'requestAirdrop',
  'signTransaction',
  'signAllTransactions',
];

let forbiddenFound = false;
for (const root of workstationRoots) {
  if (!existsSync(root)) continue;
  const files = listTsJsFiles(root);
  for (const f of files) {
    const content = readFileSync(f, 'utf8');
    for (const method of forbiddenCalls) {
      // Look for actual calls, not just mentions in strings/comments/guards
      const callRegex = new RegExp(`\\b${method}\\s*\\(`, 'g');
      const matches = content.match(callRegex);
      if (matches) {
        // Allow if in a guard/test/constant file that lists denied methods
        const basename = f.split('/').pop() ?? '';
        const isGuardOrTest =
          basename.includes('guard') ||
          basename.includes('test') ||
          basename.includes('constant') ||
          basename.includes('denied') ||
          basename.includes('schema');
        if (!isGuardOrTest) {
          fail(`Forbidden call ${method}() found in ${f}`);
          forbiddenFound = true;
        }
      }
    }
  }
}
if (!forbiddenFound) {
  ok('No forbidden blockchain method calls in workstation source (outside guards/tests)');
}

// ---------------------------------------------------------------------------
// 5. signMessage usage
// ---------------------------------------------------------------------------
section('signMessage Usage');

const signMessageRoots = [
  resolve('apps/desktop/src/features/solana-workstation'),
  resolve('apps/desktop/src/lib'),
];

let signMessageOutsideProof = false;
for (const root of signMessageRoots) {
  if (!existsSync(root)) continue;
  const files = listTsJsFiles(root);
  for (const f of files) {
    const content = readFileSync(f, 'utf8');
    const callRegex = /\bsignMessage\s*\(/g;
    if (callRegex.test(content)) {
      const basename = f.split('/').pop() ?? '';
      const isOwnershipProof =
        basename.includes('ownership') ||
        basename.includes('proof') ||
        basename.includes('verify');
      if (!isOwnershipProof) {
        fail(`signMessage() found outside ownership-proof context: ${f}`);
        signMessageOutsideProof = true;
      }
    }
  }
}
if (!signMessageOutsideProof) {
  ok('signMessage is only used in ownership-proof contexts');
}

// ---------------------------------------------------------------------------
// 6. Stable tag auto-creation guard
// ---------------------------------------------------------------------------
section('Stable Tag Guard');

const scriptsDir = resolve('scripts');
const workflowsDir = resolve('.github/workflows');
let autoTagFound = false;

for (const dir of [scriptsDir, workflowsDir]) {
  if (!existsSync(dir)) continue;
  const files = listFiles(dir, (n) => n.endsWith('.mjs') || n.endsWith('.sh') || n.endsWith('.yml') || n.endsWith('.yaml'));
  for (const f of files) {
    const content = readFileSync(f, 'utf8');
    // Detect automated stable tag creation
    if (/git\s+tag\s+-a\s+.*stable|git\s+push\s+.*stable.*tag|gh\s+release\s+create\s+.*stable/.test(content)) {
      fail(`Potential automated stable tag creation in ${f}`);
      autoTagFound = true;
    }
  }
}
if (!autoTagFound) {
  ok('No automated stable tag creation detected in scripts/workflows');
}

// ---------------------------------------------------------------------------
// 7. Rust formatting status
// ---------------------------------------------------------------------------
section('Rust Formatting');

const knownIssuesPath = resolve('docs/qa/known-issues.md');
if (existsSync(knownIssuesPath)) {
  const knownIssues = readFileSync(knownIssuesPath, 'utf8');
  if (knownIssues.includes('Rust Formatting Diffs') && knownIssues.includes('Pre-existing')) {
    fail('docs/qa/known-issues.md still lists Rust formatting as unresolved');
  } else if (knownIssues.includes('Rust Formatting Diffs') && knownIssues.includes('Resolved')) {
    ok('Rust formatting marked resolved in known-issues.md');
  } else {
    ok('Rust formatting status checked in known-issues.md');
  }
} else {
  fail('docs/qa/known-issues.md not found');
}

// ---------------------------------------------------------------------------
// 8. HumanRail / White Protocol / Drift guard
// ---------------------------------------------------------------------------
section('Excluded Protocols');

const sharedSource = resolve('packages/shared/src');
let excludedProtocolFound = false;
if (existsSync(sharedSource)) {
  const files = listTsJsFiles(sharedSource);
  for (const f of files) {
    const content = readFileSync(f, 'utf8');
    // HumanRail and White Protocol should not appear as allowed integrations
    if (/HumanRail.*integration|White Protocol.*integration/i.test(content)) {
      fail(`Unexpected integration reference in ${f}`);
      excludedProtocolFound = true;
    }
  }
}
if (!excludedProtocolFound) {
  ok('No HumanRail or White Protocol integration references');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function listTsJsFiles(dir) {
  return listFiles(dir, (n) => n.endsWith('.ts') || n.endsWith('.tsx') || n.endsWith('.js') || n.endsWith('.jsx'));
}

function listFiles(dir, predicate) {
  const entries = readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('node_modules') && entry.name !== 'dist' && entry.name !== '.next' && entry.name !== 'target') {
      files = files.concat(listFiles(fullPath, predicate));
    } else if (entry.isFile() && predicate(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
console.log('║         GORKH Release Readiness Report                              ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

for (const r of results) {
  if (r.status === 'SECTION') {
    console.log(`\n▶ ${r.message}`);
  } else if (r.status === 'PASS') {
    console.log(`  ✔ ${r.message}`);
  } else {
    console.log(`  ✖ ${r.message}`);
  }
}

console.log(`\n────────────────────────────────────────────────────────────────────────`);
console.log(`Results: ${passCount} passed, ${failCount} failed`);
console.log(`────────────────────────────────────────────────────────────────────────\n`);

if (failCount > 0) {
  console.log('Release readiness: FAILED — address failures before release.\n');
  process.exit(1);
} else {
  console.log('Release readiness: PASSED\n');
  process.exit(0);
}
