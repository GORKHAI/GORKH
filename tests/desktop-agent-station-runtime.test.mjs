import assert from 'node:assert/strict';
import test from 'node:test';
import {
  startAgent,
  pauseAgent,
  resumeAgent,
  killAgent,
  tickAgent,
  manualRun,
  rejectApproval,
} from '../apps/desktop/src/features/solana-workstation/agent/station/agentRuntime.ts';
import {
  createEmptyGorkhAgentStationState,
  GorkhAgentRuntimeMode,
} from '../packages/shared/dist/index.js';

function freshState() {
  return createEmptyGorkhAgentStationState(1700000000000);
}

test('startAgent transitions to running and emits audit event', () => {
  const { state, audit } = startAgent(freshState());
  assert.equal(state.runtime.isRunning, true);
  assert.equal(state.profile.status, 'running');
  assert.ok(audit.some((e) => e.kind === 'agent_started'));
});

test('pauseAgent stops ticks and emits audit event', () => {
  const started = startAgent(freshState()).state;
  const { state, audit } = pauseAgent(started);
  assert.equal(state.runtime.isRunning, false);
  assert.equal(state.runtime.isPaused, true);
  assert.equal(state.profile.status, 'paused');
  assert.ok(audit.some((e) => e.kind === 'agent_paused'));
});

test('resumeAgent restores running state', () => {
  const paused = pauseAgent(startAgent(freshState()).state).state;
  const { state, audit } = resumeAgent(paused);
  assert.equal(state.runtime.isRunning, true);
  assert.equal(state.runtime.isPaused, false);
  assert.ok(audit.some((e) => e.kind === 'agent_resumed'));
});

test('killAgent sets killSwitchEnabled and blocks pending approvals', () => {
  let s = startAgent(freshState()).state;
  s = manualRun(s, { intent: 'cloak send privately' }).state;
  const before = s.approvals.filter((a) => a.approvalState === 'pending').length;
  assert.ok(before > 0);
  const { state } = killAgent(s);
  assert.equal(state.runtime.killSwitchEnabled, true);
  assert.equal(state.profile.status, 'killed');
  for (const a of state.approvals) {
    assert.notEqual(a.approvalState, 'pending');
  }
});

test('startAgent does not run when kill switch is engaged', () => {
  let s = killAgent(freshState()).state;
  const { state, audit } = startAgent(s);
  assert.equal(state.runtime.isRunning, false);
  assert.deepEqual(audit, []);
});

test('manual run creates task, tool call, proposal — never executes', () => {
  const s = startAgent(freshState()).state;
  const result = manualRun(s, { intent: 'check my portfolio' });
  assert.equal(result.task.status, 'completed'); // read tool, no approval needed
  assert.equal(result.proposal.executionBlocked, true);
  assert.ok(result.toolCall.toolId.startsWith('wallet.read'));
});

test('manual run for cloak intent yields blocked execution and approval queued', () => {
  const s = startAgent(freshState()).state;
  const result = manualRun(s, { intent: 'cloak private send to friend' });
  assert.equal(result.proposal.kind, 'cloak_draft');
  assert.equal(result.proposal.executionBlocked, true);
  assert.equal(result.task.status, 'waiting_for_approval');
  assert.ok(result.approval, 'approval should be created for cloak draft');
});

test('manual run for zerion intent creates proposal that requires approval', () => {
  const s = startAgent(freshState()).state;
  const result = manualRun(s, { intent: 'DCA tiny SOL via Zerion' });
  assert.equal(result.proposal.kind, 'zerion_proposal');
  assert.equal(result.proposal.requiresApproval, true);
  assert.equal(result.proposal.executionBlocked, true);
});

test('manual run rejects empty intent', () => {
  const s = startAgent(freshState()).state;
  assert.throws(() => manualRun(s, { intent: '' }), /Intent cannot be empty/);
});

test('manual run is blocked when kill switch engaged', () => {
  const s = killAgent(freshState()).state;
  assert.throws(() => manualRun(s, { intent: 'check portfolio' }), /Kill switch/);
});

test('tickAgent updates lastTickAt only when running and never signs', () => {
  let s = startAgent(freshState(), GorkhAgentRuntimeMode.BACKGROUND_WHILE_APP_OPEN).state;
  const before = s.runtime.lastTickAt ?? 0;
  s = tickAgent(s).state;
  assert.ok((s.runtime.lastTickAt ?? 0) >= before);
  // No tasks/tool calls/proposals should be added by a heartbeat tick
  assert.equal(s.tasks.length, 0);
  assert.equal(s.toolCalls.length, 0);
  assert.equal(s.proposals.length, 0);
});

test('tickAgent is a no-op when paused', () => {
  let s = pauseAgent(startAgent(freshState()).state).state;
  const before = s.runtime.lastTickAt;
  s = tickAgent(s).state;
  assert.equal(s.runtime.lastTickAt, before);
});

test('rejectApproval transitions to rejected and adds audit event', () => {
  let s = startAgent(freshState()).state;
  const r = manualRun(s, { intent: 'cloak private send' });
  s = r.state;
  assert.ok(r.approval);
  const { state, audit } = rejectApproval(s, r.approval.id);
  const updated = state.approvals.find((a) => a.id === r.approval.id);
  assert.equal(updated.approvalState, 'rejected');
  assert.ok(audit.some((e) => e.kind === 'approval_rejected'));
});

test('background runtime mode flips backgroundAllowed flag', () => {
  const s = startAgent(freshState(), GorkhAgentRuntimeMode.BACKGROUND_WHILE_APP_OPEN).state;
  assert.equal(s.runtime.backgroundAllowed, true);
});
