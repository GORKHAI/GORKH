import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const appSource = readFileSync('apps/desktop/src/App.tsx', 'utf8');
const version = readFileSync('VERSION', 'utf8').trim();

function listSourceFiles(root) {
  if (!existsSync(root)) return [];
  const files = [];
  for (const entry of readdirSync(root)) {
    const fullPath = join(root, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
      continue;
    }
    if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
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

test('desktop primary view defaults to Workstation', () => {
  assert.match(appSource, /type\s+DesktopPrimaryView\s*=\s*'workstation'\s*\|\s*'assistant'/);
  assert.match(
    appSource,
    /useState<DesktopPrimaryView>\('workstation'\)/,
    'App should open the Workstation view on fresh launch'
  );
});

test('assistant is still reachable as a secondary surface', () => {
  assert.match(appSource, /Open Assistant/);
  assert.match(appSource, /Back to Workstation/);
  assert.match(appSource, /primaryView\s*===\s*'assistant'/);
});

test('Workstation is no longer presented as the hidden optional CTA', () => {
  assert.doesNotMatch(appSource, /Back to Assistant/);
  assert.doesNotMatch(appSource, />\s*Solana Workstation\s*</);
  assert.doesNotMatch(appSource, /\?\s*'Back to Assistant'\s*:\s*'Solana Workstation'/);
});

test('App copy uses GORKH Workstation-first language', () => {
  assert.match(appSource, /Workstation-first Solana desktop/);
  assert.match(appSource, /Assistant is a secondary workspace for chat, planning, and approved desktop tasks\./);
  assert.doesNotMatch(appSource, /AI Operator/);
  assert.doesNotMatch(appSource, /The home screen now stays focused on the assistant/);
  assert.doesNotMatch(appSource, /assistant-focused/);
});

test('fresh Workstation primary shell does not expose generic assistant stop copy', () => {
  assert.match(appSource, /const hasActiveAssistantTasks\s*=/);
  assert.match(appSource, /primaryView === 'assistant' \|\| hasActiveAssistantTasks/);
  assert.doesNotMatch(appSource, />\s*Stop All\s*</);
  assert.match(appSource, /Stop Assistant Tasks/);
  assert.match(appSource, /Stop Active Assistant Tasks/);
});

test('desktop App does not introduce old package references or removed protocol copy', () => {
  assert.doesNotMatch(appSource, /@ai-operator\//);
  assert.doesNotMatch(appSource, /HumanRail/);
  assert.doesNotMatch(appSource, /White Protocol/);
  assert.doesNotMatch(appSource, /\bDrift\b/);
});

test('active Workstation source does not introduce forbidden blockchain method calls', () => {
  const forbiddenMethods = [
    'sendTransaction',
    'sendRawTransaction',
    'requestAirdrop',
    'signTransaction',
    'signAllTransactions',
  ];
  const roots = ['apps/desktop/src/App.tsx', 'apps/desktop/src/features/solana-workstation'];
  const files = roots.flatMap((root) => {
    if (!existsSync(root)) return [];
    return statSync(root).isDirectory() ? listSourceFiles(root) : [root];
  });

  for (const file of files) {
    const basename = file.split('/').pop() ?? '';
    const isGuardOrTest =
      basename.includes('guard') ||
      basename.includes('test') ||
      basename.includes('constant') ||
      basename.includes('denied') ||
      basename.includes('schema');
    if (isGuardOrTest) continue;

    const content = readFileSync(file, 'utf8');
    for (const method of forbiddenMethods) {
      if (isApprovedCloakSignerBridge(file, content, method)) continue;
      assert.doesNotMatch(content, new RegExp(`\\b${method}\\s*\\(`), `${method}() found in ${file}`);
    }
  }
});

test('signMessage remains constrained to ownership-proof contexts', () => {
  const files = listSourceFiles('apps/desktop/src/features/solana-workstation');
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    if (!/\bsignMessage\s*\(/.test(content)) continue;
    if (isApprovedCloakSignerBridge(file, content, 'signMessage')) continue;
    assert.match(file, /ownership|proof|verify/i, `signMessage() found outside ownership proof context: ${file}`);
  }
});

test('pre-stable release docs use current VERSION metadata', () => {
  const docs = [
    'docs/qa/workstation-qa-checklist.md',
    'docs/release/apple-macos-readiness.md',
    'docs/release/apple-beta-dry-run.md',
  ];

  for (const file of docs) {
    const content = readFileSync(file, 'utf8');
    assert.match(content, new RegExp(`Version: ${version.replace(/\./g, '\\.')}`), `${file} should match VERSION`);
    assert.doesNotMatch(content, /Version: 0\.0\.47/, `${file} should not carry stale release metadata`);
  }
});

test('release docs explain legacy artifact filenames as continuity names', () => {
  const dryRunDoc = readFileSync('docs/release/apple-beta-dry-run.md', 'utf8');
  assert.match(dryRunDoc, /legacy continuity name/);
  assert.match(dryRunDoc, /retained by the release workflow for updater and asset-resolution continuity/);
});

test('Birdeye API key remains memory-only in the desktop fetch panel', () => {
  const birdeyePanel = readFileSync(
    'apps/desktop/src/features/solana-workstation/markets/market-data/birdeye/components/BirdeyeFetchPanel.tsx',
    'utf8'
  );
  assert.match(birdeyePanel, /const \[apiKey, setApiKey\] = useState\(''\)/);
  assert.match(birdeyePanel, /Key is never stored by GORKH/);
  assert.doesNotMatch(birdeyePanel, /localStorage|sessionStorage|saveMarketsProviderConfig|setItem/);
});
