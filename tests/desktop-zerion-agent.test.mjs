import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const zerionRoot = 'apps/desktop/src/features/solana-workstation/agent/zerion';
const agentWorkbenchPath = 'apps/desktop/src/features/solana-workstation/agent/components/AgentWorkbench.tsx';
const cloakRoot = 'apps/desktop/src/features/solana-workstation/wallet/cloak';

function listFiles(dir, predicate) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(fullPath, predicate);
    return entry.isFile() && predicate(entry.name) ? [fullPath] : [];
  });
}

test('Zerion Executor exists inside Agent workbench', () => {
  assert.ok(existsSync(path.join(zerionRoot, 'components/ZerionAgentExecutorPanel.tsx')));
  const workbench = readFileSync(agentWorkbenchPath, 'utf8');
  assert.match(workbench, /ZerionAgentExecutorPanel/);
  assert.match(workbench, /Zerion Executor/);
});

test('Zerion UI includes tiny wallet, real transaction, disabled bridge-send, approval, and preview copy', () => {
  const source = listFiles(zerionRoot, (name) => /\.(ts|tsx)$/.test(name))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
  assert.match(source, /fresh Zerion agent wallet with tiny funds/);
  assert.match(source, /Do not use your main GORKH wallet/);
  assert.match(source, /real onchain transaction/);
  assert.match(source, /Bridge and send are disabled|Bridge disabled/);
  assert.match(source, /type="checkbox"/);
  assert.match(source, /commandPreview/);
});

test('Zerion storage and context do not persist secrets', () => {
  const storage = readFileSync(path.join(zerionRoot, 'zerionStorage.ts'), 'utf8');
  assert.match(storage, /FORBIDDEN_KEYS/);
  assert.match(storage, /Zerion API keys must not be stored in localStorage/);

  const context = readFileSync(path.join(zerionRoot, 'zerionContext.ts'), 'utf8');
  assert.match(context, /No API keys, agent tokens, private keys, or Cloak notes are included/);
});

test('Zerion is not imported into Cloak and Cloak is not imported into Zerion', () => {
  const cloakSource = listFiles(cloakRoot, (name) => /\.(ts|tsx)$/.test(name))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
  const zerionSource = listFiles(zerionRoot, (name) => /\.(ts|tsx)$/.test(name))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
  assert.doesNotMatch(cloakSource, /zerion/i);
  assert.doesNotMatch(zerionSource, /cloakDeposit|cloakClient|CloakNote|wallet_cloak/);
});

test('Assistant, Markets, Context, and Wallet do not invoke Zerion swap execution', () => {
  for (const dir of [
    'apps/desktop/src/features/solana-workstation/assistant',
    'apps/desktop/src/features/solana-workstation/markets',
    'apps/desktop/src/features/solana-workstation/context-bridge',
    'apps/desktop/src/features/solana-workstation/wallet',
  ]) {
    if (!existsSync(dir)) continue;
    const source = listFiles(dir, (name) => /\.(ts|tsx)$/.test(name))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');
    assert.doesNotMatch(source, /zerion_cli_swap_execute/);
  }
});

