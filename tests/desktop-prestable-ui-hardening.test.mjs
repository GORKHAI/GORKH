import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const appSource = readFileSync('apps/desktop/src/App.tsx', 'utf8');
const mainSource = readFileSync('apps/desktop/src/main.tsx', 'utf8');
const cssSource = readFileSync('apps/desktop/src/features/solana-workstation/layout/workstation-shell.css', 'utf8');
const shellSource = readFileSync('apps/desktop/src/features/solana-workstation/layout/WorkstationShell.tsx', 'utf8');
const workstationSource = readFileSync('apps/desktop/src/features/solana-workstation/SolanaWorkstation.tsx', 'utf8');
const sidebarSource = readFileSync('apps/desktop/src/features/solana-workstation/layout/WorkstationSidebar.tsx', 'utf8');
const dashboardSource = readFileSync('apps/desktop/src/features/solana-workstation/layout/WorkstationDashboard.tsx', 'utf8');
const nativeSource = readFileSync('apps/desktop/src-tauri/src/lib.rs', 'utf8');

function listSourceFiles(root) {
  const files = [];
  for (const entry of readdirSync(root)) {
    const fullPath = join(root, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

function isApprovedCloakSignerBridge(file, content, method) {
  return (
    file.endsWith('wallet/cloak/cloakDeposit.ts') &&
    content.includes('wallet_cloak_begin_signing_session') &&
    content.includes('wallet_cloak_sign_transaction') &&
    content.includes('wallet_cloak_sign_message') &&
    content.includes("purpose: 'cloak_deposit'") &&
    content.includes("purpose: 'cloak_viewing_key_registration'") &&
    (method === 'signTransaction' || method === 'signMessage')
  );
}

test('App startup does not poll screen recording or screenshot permissions', () => {
  assert.doesNotMatch(appSource, /useEffect\(\(\)\s*=>\s*\{\s*void refreshPermissionStatus\(\)/);
  assert.match(nativeSource, /permissions_get_status\(\)[\s\S]*screen_recording:\s*PermissionState::Unknown/);
  assert.match(nativeSource, /gorkh_app_snapshot\(\)[\s\S]*screen_recording:\s*PermissionState::Unknown/);
  assert.doesNotMatch(nativeSource, /fn permissions_get_status\(\)[\s\S]{0,160}detect_screen_recording_status\(\)/);
});

test('Desktop Vision is explicit opt-in and opening Assistant alone does not request screen capture', () => {
  assert.match(appSource, /Desktop Vision is optional/);
  assert.match(appSource, /Enable Desktop Vision/);
  assert.match(appSource, /Cancel/);
  assert.match(appSource, /onClick=\{\(\) => handleScreenPreviewToggle\(true\)\}/);
  assert.match(appSource, /assistantActive=\{primaryView === 'assistant'\}/);
  assert.doesNotMatch(appSource, /setPrimaryView\(active \? 'assistant' : 'workstation'\)[\s\S]{0,120}handleScreenPreviewToggle\(true\)/);
});

test('fixed shell owns the desktop viewport and disables page scroll', () => {
  assert.match(mainSource, /workstation-shell\.css/);
  assert.match(cssSource, /html,\s*body,\s*#root\s*\{[\s\S]*height:\s*100%/);
  assert.match(cssSource, /html,\s*body,\s*#root\s*\{[\s\S]*overflow:\s*hidden/);
  assert.match(cssSource, /\.gorkh-workstation-shell\s*\{[\s\S]*height:\s*100vh/);
  assert.match(cssSource, /\.gorkh-workstation-shell\s*\{[\s\S]*width:\s*100vw/);
  assert.match(cssSource, /\.gorkh-workstation-shell\s*\{[\s\S]*overflow:\s*hidden/);
  assert.match(shellSource, /className="gorkh-workstation-workspace"/);
});

test('Assistant stays inside Workstation navigation and is escapable from sidebar', () => {
  assert.match(workstationSource, /assistantActive/);
  assert.match(workstationSource, /assistantContent/);
  assert.match(workstationSource, /onAssistantActiveChange\?\.\(false\)/);
  assert.match(sidebarSource, /Assistant/);
  assert.match(sidebarSource, /onSelect\(null\)/);
  assert.match(sidebarSource, /WORKSTATION_NAV_ITEMS\.map/);
});

test('Dashboard is operational, compact, and not a marketing hero', () => {
  assert.match(dashboardSource, /Wallet Snapshot/);
  assert.match(dashboardSource, /Markets/);
  assert.match(dashboardSource, /Shield/);
  assert.match(dashboardSource, /Builder/);
  assert.match(dashboardSource, /Agent/);
  assert.match(dashboardSource, /Context/);
  assert.doesNotMatch(dashboardSource, /AI-native desktop workstation for Solana agents/);
  assert.doesNotMatch(dashboardSource, /power traders/);
});

test('dark form control styling exists for Workstation inputs, textareas, and selects', () => {
  assert.match(cssSource, /\.gorkh-workstation-shell input/);
  assert.match(cssSource, /\.gorkh-workstation-shell textarea/);
  assert.match(cssSource, /\.gorkh-workstation-shell select/);
  assert.match(cssSource, /background:\s*rgba\(255,\s*255,\s*255,\s*0\.045\)/);
});

test('generic SaaS CTAs and Stop All are not visible in fresh Workstation shell', () => {
  assert.match(appSource, /display:\s*'none'/);
  assert.match(appSource, /<BrandWordmark/);
  assert.match(appSource, /false && primaryView === 'assistant'/);
  assert.doesNotMatch(appSource, />\s*Stop All\s*</);
});

test('Workstation modules render and forbidden chain methods were not introduced', () => {
  for (const name of ['Wallet', 'Markets', 'Shield', 'Builder', 'Agent', 'Context']) {
    assert.match(sidebarSource + dashboardSource, new RegExp(name));
  }

  const forbiddenMethods = [
    'signTransaction',
    'signAllTransactions',
    'sendTransaction',
    'sendRawTransaction',
    'requestAirdrop',
  ];
  const files = [
    'apps/desktop/src/App.tsx',
    ...listSourceFiles('apps/desktop/src/features/solana-workstation'),
  ];

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    for (const method of forbiddenMethods) {
      if (isApprovedCloakSignerBridge(file, content, method)) continue;
      assert.doesNotMatch(content, new RegExp(`\\b${method}\\s*\\(`), `${method}() found in ${file}`);
    }
  }
});

test('release-boundary references were not introduced', () => {
  const allDesktopSource = [
    appSource,
    ...listSourceFiles('apps/desktop/src/features/solana-workstation')
      .filter((file) => !/guard|Guard|test|Test|validation|Validation|AgentWorkbench|PrivateWorkbench/.test(file))
      .map((file) => readFileSync(file, 'utf8')),
  ].join('\n');
  assert.doesNotMatch(allDesktopSource, /@ai-operator\//);
  assert.doesNotMatch(allDesktopSource, /HumanRail/);
  assert.doesNotMatch(allDesktopSource, /White Protocol/);
  assert.doesNotMatch(allDesktopSource, /\bDrift\b/);
});
