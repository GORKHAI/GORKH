import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateAgentToolRequest,
  computePolicyDigest,
} from '../apps/desktop/src/features/solana-workstation/agent/station/agentPolicyEngine.ts';
import {
  createDefaultGorkhAgentPolicy,
  createDefaultGorkhAgentRuntimeState,
} from '../packages/shared/dist/index.js';

function defaultPolicy() {
  return createDefaultGorkhAgentPolicy(1700000000000);
}

function defaultRuntime() {
  return createDefaultGorkhAgentRuntimeState();
}

function killedRuntime() {
  return { ...defaultRuntime(), killSwitchEnabled: true };
}

test('allows wallet.read_snapshot without approval', () => {
  const e = evaluateAgentToolRequest(defaultPolicy(), defaultRuntime(), {
    toolId: 'wallet.read_snapshot',
    isProposalDraft: true,
  });
  assert.equal(e.allowed, true);
  assert.equal(e.requiresApproval, false);
});

test('allows markets.read_watchlist without approval', () => {
  const e = evaluateAgentToolRequest(defaultPolicy(), defaultRuntime(), {
    toolId: 'markets.read_watchlist',
    isProposalDraft: true,
  });
  assert.equal(e.allowed, true);
});

test('zerion.create_proposal allowed but requires approval', () => {
  const e = evaluateAgentToolRequest(defaultPolicy(), defaultRuntime(), {
    toolId: 'zerion.create_proposal',
    isProposalDraft: true,
    protocol: 'zerion_cli',
  });
  assert.equal(e.allowed, true);
  assert.equal(e.requiresApproval, true);
  assert.equal(e.riskLevel, 'high');
});

test('cloak.prepare_private_send allowed but requires approval', () => {
  const e = evaluateAgentToolRequest(defaultPolicy(), defaultRuntime(), {
    toolId: 'cloak.prepare_private_send',
    isProposalDraft: true,
    protocol: 'cloak',
  });
  assert.equal(e.allowed, true);
  assert.equal(e.requiresApproval, true);
});

test('blocks wallet.sign_without_approval', () => {
  const e = evaluateAgentToolRequest(defaultPolicy(), defaultRuntime(), {
    toolId: 'wallet.sign_without_approval',
    isProposalDraft: false,
  });
  assert.equal(e.allowed, false);
  assert.ok(e.blockedReasons.length > 0);
});

test('blocks cloak.execute_private_send_autonomous', () => {
  const e = evaluateAgentToolRequest(defaultPolicy(), defaultRuntime(), {
    toolId: 'cloak.execute_private_send_autonomous',
    isProposalDraft: false,
  });
  assert.equal(e.allowed, false);
});

test('blocks cloak.execute_deposit_autonomous', () => {
  const e = evaluateAgentToolRequest(defaultPolicy(), defaultRuntime(), {
    toolId: 'cloak.execute_deposit_autonomous',
    isProposalDraft: false,
  });
  assert.equal(e.allowed, false);
});

test('blocks zerion.execute_without_approval', () => {
  const e = evaluateAgentToolRequest(defaultPolicy(), defaultRuntime(), {
    toolId: 'zerion.execute_without_approval',
    isProposalDraft: false,
  });
  assert.equal(e.allowed, false);
});

test('blocks copytrade.execute_autonomous', () => {
  const e = evaluateAgentToolRequest(defaultPolicy(), defaultRuntime(), {
    toolId: 'copytrade.execute_autonomous',
    isProposalDraft: false,
  });
  assert.equal(e.allowed, false);
});

test('blocks markets.execute_trade_autonomous', () => {
  const e = evaluateAgentToolRequest(defaultPolicy(), defaultRuntime(), {
    toolId: 'markets.execute_trade_autonomous',
    isProposalDraft: false,
  });
  assert.equal(e.allowed, false);
});

test('kill switch blocks all tool requests including read tools', () => {
  const e = evaluateAgentToolRequest(defaultPolicy(), killedRuntime(), {
    toolId: 'wallet.read_snapshot',
    isProposalDraft: true,
  });
  assert.equal(e.allowed, false);
  assert.match(e.blockedReasons.join(' '), /Kill switch/);
});

test('cloak draft tool when called with isProposalDraft=false is blocked', () => {
  const e = evaluateAgentToolRequest(defaultPolicy(), defaultRuntime(), {
    toolId: 'cloak.prepare_private_send',
    isProposalDraft: false,
  });
  assert.equal(e.allowed, false);
  assert.match(e.blockedReasons.join(' '), /Wallet → Cloak Private/);
});

test('zerion proposal tool when called with isProposalDraft=false is blocked', () => {
  const e = evaluateAgentToolRequest(defaultPolicy(), defaultRuntime(), {
    toolId: 'zerion.create_proposal',
    isProposalDraft: false,
  });
  assert.equal(e.allowed, false);
  assert.match(e.blockedReasons.join(' '), /Zerion Executor/);
});

test('policy digest is deterministic', () => {
  const p = defaultPolicy();
  assert.equal(computePolicyDigest(p), computePolicyDigest(p));
});
