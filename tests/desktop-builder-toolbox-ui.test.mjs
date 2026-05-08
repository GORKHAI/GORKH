import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workbench = readFileSync('apps/desktop/src/features/solana-workstation/builder/components/BuilderWorkbench.tsx', 'utf8');
const toolbox = readFileSync('apps/desktop/src/features/solana-workstation/builder/toolbox/components/DeveloperToolboxPanel.tsx', 'utf8');
const storage = readFileSync('apps/desktop/src/features/solana-workstation/builder/toolbox/builderToolboxStorage.ts', 'utf8');
const rpcStore = readFileSync('apps/desktop/src/features/solana-workstation/builder/toolbox/rpcEndpointManager.ts', 'utf8');
const websocket = readFileSync('apps/desktop/src/features/solana-workstation/builder/toolbox/websocketSubscriptions.ts', 'utf8');
const idlBrowser = readFileSync('apps/desktop/src/features/solana-workstation/builder/toolbox/idlBrowser.ts', 'utf8');
const sharedToolbox = readFileSync('packages/shared/src/solana-builder-toolbox.ts', 'utf8');
const workstation = readFileSync('apps/desktop/src/features/solana-workstation/SolanaWorkstation.tsx', 'utf8');

test('Builder Developer Toolbox is integrated inside Builder with fixed-shell layout', () => {
  assert.match(workbench, /DeveloperToolboxPanel/);
  assert.match(workbench, /Developer Toolbox/);
  assert.match(workbench, /activeTab === 'toolbox'/);
  assert.match(workbench, /gorkh-premium-workbench/);
  assert.match(workbench, /overflow:\s*'hidden'/);
  assert.match(workstation, /activeModule === 'builder'[\s\S]*gorkh-workstation-module-frame/);
  assert.match(workstation, /activeModule === 'builder'[\s\S]*gorkh-workstation-module-body/);
  assert.match(toolbox, /data-testid="builder-developer-toolbox"/);
  assert.match(toolbox, /grid-template-columns:168px minmax\(0,1fr\) 282px/);
  assert.match(toolbox, /height:100%/);
  assert.match(toolbox, /overflow:hidden/);
  assert.doesNotMatch(toolbox, /hero|marketing|page-level/i);
});

test('Builder Developer Toolbox UI exposes required diagnostic states and locked actions', () => {
  for (const label of [
    'Overview',
    'IDL Browser',
    'Account Decoder',
    'Program Logs',
    'RPC & Nodes',
    'Network Monitor',
    'Compute Estimator',
    'Locked Actions',
  ]) {
    assert.match(toolbox, new RegExp(label.replace('&', '&')));
  }
  assert.match(idlBrowser, /No IDL loaded/);
  assert.match(toolbox, /Invalid Anchor IDL JSON/);
  assert.match(toolbox, /No log events yet/);
  assert.match(toolbox, /logs disconnected/);
  assert.match(toolbox, /Run Benchmark/);
  assert.match(toolbox, /Refresh Health/);
  assert.match(toolbox, /Estimate Compute/);
  assert.match(sharedToolbox, /Program Deployment/);
  assert.match(sharedToolbox, /Program Upgrade/);
  assert.match(sharedToolbox, /Arbitrary RPC Playground/);
  assert.match(sharedToolbox, /Offline Signing/);
  assert.match(sharedToolbox, /Dev Faucet/);
  assert.match(toolbox, /aria-disabled="true"/);
});

test('Builder Developer Toolbox has no forbidden execution controls or arbitrary RPC passthrough', () => {
  assert.doesNotMatch(toolbox, /\bsendTransaction\s*\(|\bsendRawTransaction\s*\(|\brequestAirdrop\s*\(/);
  assert.doesNotMatch(toolbox, /\bsignTransaction\s*\(|\bsignAllTransactions\s*\(|\bsignMessage\s*\(/);
  assert.doesNotMatch(toolbox, /solana\s+program\s+deploy|anchor\s+deploy|Command::new/i);
  assert.match(websocket, /accountSubscribe/);
  assert.match(websocket, /logsSubscribe/);
  assert.match(websocket, /slotSubscribe/);
  assert.doesNotMatch(websocket, /sendTransaction|sendRawTransaction|requestAirdrop/);
});

test('Builder Toolbox context and RPC storage redact secrets', () => {
  assert.match(storage, /gorkh\.solana\.builderToolbox\.lastContext\.v1/);
  assert.match(storage, /raw_idl_excluded|apiKey|authHeader|viewingKey/);
  assert.match(rpcStore, /redactedRpcUrl/);
  assert.match(rpcStore, /isLikelySensitiveRpcUrl/);
  assert.match(rpcStore, /Sensitive RPC URLs with API keys or tokens are not stored/);
});
