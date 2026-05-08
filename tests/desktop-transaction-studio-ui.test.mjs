import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workbench = readFileSync(
  new URL('../apps/desktop/src/features/solana-workstation/transaction-studio/components/TransactionStudioWorkbench.tsx', import.meta.url),
  'utf8'
);
const sourcePanel = readFileSync(
  new URL('../apps/desktop/src/features/solana-workstation/transaction-studio/components/TransactionStudioSourcePanel.tsx', import.meta.url),
  'utf8'
);
const timeline = readFileSync(
  new URL('../apps/desktop/src/features/solana-workstation/transaction-studio/components/TransactionStudioInstructionTimeline.tsx', import.meta.url),
  'utf8'
);
const risk = readFileSync(
  new URL('../apps/desktop/src/features/solana-workstation/transaction-studio/components/TransactionStudioRiskPanel.tsx', import.meta.url),
  'utf8'
);
const comingSoon = readFileSync(
  new URL('../apps/desktop/src/features/solana-workstation/transaction-studio/components/TransactionStudioComingSoonPanel.tsx', import.meta.url),
  'utf8'
);
const simulation = readFileSync(
  new URL('../apps/desktop/src/features/solana-workstation/transaction-studio/components/TransactionStudioSimulationPanel.tsx', import.meta.url),
  'utf8'
);
const balance = readFileSync(
  new URL('../apps/desktop/src/features/solana-workstation/transaction-studio/components/TransactionStudioBalanceDiffPanel.tsx', import.meta.url),
  'utf8'
);
const explanation = readFileSync(
  new URL('../apps/desktop/src/features/solana-workstation/transaction-studio/components/TransactionStudioExplanationPanel.tsx', import.meta.url),
  'utf8'
);
const copy = readFileSync(
  new URL('../apps/desktop/src/features/solana-workstation/transaction-studio/transactionStudioCopy.ts', import.meta.url),
  'utf8'
);
const navigation = readFileSync(
  new URL('../apps/desktop/src/features/solana-workstation/layout/workstationNavigation.ts', import.meta.url),
  'utf8'
);
const shell = readFileSync(
  new URL('../apps/desktop/src/features/solana-workstation/layout/WorkstationShell.tsx', import.meta.url),
  'utf8'
);
const workstation = readFileSync(
  new URL('../apps/desktop/src/features/solana-workstation/SolanaWorkstation.tsx', import.meta.url),
  'utf8'
);

test('Transaction Studio UI exposes fixed workstation layout and required panels', () => {
  assert.match(copy, /GORKH Transaction Studio/);
  assert.match(workbench, /txs-workbench/);
  assert.match(workbench, /data-testid="transaction-studio-workbench"/);
  assert.match(workbench, /data-testid="transaction-studio-visible-status"/);
  assert.match(workbench, /grid-template-rows: 42px minmax\(0, 1fr\) 188px/);
  assert.match(workbench, /height: 100%/);
  assert.match(workbench, /min-height: 0/);
  assert.match(workbench, /overflow: hidden/);
  assert.doesNotMatch(workbench, /height: calc\(100vh/);
  assert.doesNotMatch(workbench, /height:\s*auto/);
  assert.match(sourcePanel, /Sources \/ Input/);
  assert.match(timeline, /Instruction Timeline/);
  assert.match(risk, /Risk Inspector/);
  assert.match(simulation, /transaction-studio-simulation-panel/);
  assert.match(copy, /Current-State Simulation/);
  assert.match(copy, /Replay Against Current State is labeled as a future review mode/);
  assert.match(balance, /transaction-studio-balance-diffs-panel/);
  assert.match(explanation, /transaction-studio-explanation-panel/);
  assert.match(navigation, /transaction-studio/);
  assert.match(workstation, /activeModule === 'transaction-studio'[\s\S]*gorkh-workstation-module-frame/);
  assert.match(workstation, /activeModule === 'transaction-studio'[\s\S]*gorkh-workstation-module-body/);
  assert.match(shell, /WorkstationSidebar/);
  assert.match(shell, /WorkstationTopBar/);
  assert.match(shell, /WorkstationInspector/);
  assert.match(shell, /WorkstationStatusBar/);
  assert.doesNotMatch(workbench, /hero|marketing/i);
});

test('Transaction Studio UI shows Coming Soon and Locked advanced features', () => {
  assert.match(comingSoon, /Visual Transaction Builder/);
  assert.match(comingSoon, /Batch Transaction Builder/);
  assert.match(comingSoon, /Priority Fee Advisor/);
  assert.match(comingSoon, /Replay Against Current State/);
  assert.match(comingSoon, /Jito Bundle Composer/);
  assert.match(comingSoon, /Raw Transaction Broadcast/);
  assert.match(copy, /Locked\. This feature can submit transactions/);
  assert.match(comingSoon, /txs-roadmap-item-locked/);
  assert.match(comingSoon, /aria-disabled=\{locked\}/);
});

test('Transaction Studio UI exposes honest input, simulation, and balance states', () => {
  assert.match(workbench, /Base58 raw transaction detected\. Decode is detection-only in v0\.1\./);
  assert.match(workbench, /Invalid or unsupported input/);
  assert.match(workbench, /Signature detected\. Fetch Transaction uses read-only RPC only\./);
  assert.match(workbench, /Address detected\. Lookup Account uses read-only RPC only\./);
  assert.match(workbench, /Transaction decoded offline\./);
  assert.match(workbench, /Simulating via read-only RPC with sigVerify false/);
  assert.match(workbench, /Simulation failed:/);
  assert.match(simulation, /Simulation has not been run/);
  assert.match(simulation, /loading/);
  assert.match(simulation, /rpc error/);
  assert.match(balance, /No balance diff data available from this source/);
  assert.match(balance, /post-state snapshot/);
});
