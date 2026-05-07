import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GorkhAgentStatus,
  GorkhAgentRuntimeMode,
  GorkhAgentTaskKind,
  GorkhAgentTaskStatus,
  GorkhAgentTemplateStatus,
  GorkhAgentProfileSchema,
  GorkhAgentRuntimeStateSchema,
  GorkhAgentPolicySchema,
  GorkhAgentMemoryEntrySchema,
  GorkhAgentTaskSchema,
  GorkhAgentToolCallSchema,
  GorkhAgentProposalSchema,
  GorkhAgentApprovalItemSchema,
  GorkhAgentAuditEventSchema,
  GorkhAgentTemplateSchema,
  GorkhAgentStationStateSchema,
  GORKH_AGENT_ALLOWED_TOOL_IDS,
  GORKH_AGENT_BLOCKED_TOOL_IDS,
  GORKH_AGENT_TEMPLATES,
  GORKH_AGENT_STATION_SAFETY_NOTES,
  GORKH_AGENT_BACKGROUND_COPY,
  createDefaultGorkhAgentProfile,
  createDefaultGorkhAgentRuntimeState,
  createDefaultGorkhAgentPolicy,
  createEmptyGorkhAgentStationState,
  getGorkhAgentTaskKindForIntent,
  getGorkhAgentTaskKindLabel,
  getGorkhAgentStatusLabel,
  getGorkhAgentTemplate,
  isGorkhAgentAllowedToolId,
  isGorkhAgentBlockedToolId,
} from '../dist/index.js';

test('default GORKH Agent profile validates', () => {
  const profile = createDefaultGorkhAgentProfile(1700000000000);
  const result = GorkhAgentProfileSchema.safeParse(profile);
  assert.ok(result.success, result.error?.message);
  assert.equal(profile.name, 'GORKH Agent');
  assert.equal(profile.localOnly, true);
  assert.equal(profile.status, GorkhAgentStatus.IDLE);
});

test('default runtime state validates and defaults to manual mode', () => {
  const state = createDefaultGorkhAgentRuntimeState();
  const result = GorkhAgentRuntimeStateSchema.safeParse(state);
  assert.ok(result.success, result.error?.message);
  assert.equal(state.runtimeMode, GorkhAgentRuntimeMode.MANUAL);
  assert.equal(state.killSwitchEnabled, false);
  assert.equal(state.isRunning, false);
});

test('default policy blocks autonomous main wallet, cloak, trading and DAO', () => {
  const policy = createDefaultGorkhAgentPolicy(1700000000000);
  const result = GorkhAgentPolicySchema.safeParse(policy);
  assert.ok(result.success, result.error?.message);
  assert.equal(policy.allowMainWalletAutonomousExecution, false);
  assert.equal(policy.allowAutonomousCloakSend, false);
  assert.equal(policy.allowAutonomousTrading, false);
  assert.equal(policy.allowAutonomousDaoVoting, false);
  assert.equal(policy.requireApprovalForTransactions, true);
  assert.equal(policy.requireApprovalForCloak, true);
  assert.equal(policy.requireApprovalForZerion, true);
});

test('memory entry schema enforces sensitive flag and local-only', () => {
  const now = Date.now();
  const valid = {
    id: 'mem-1',
    kind: 'observation',
    title: 'wallet drift observed',
    content: 'sample observation',
    tags: ['wallet'],
    source: 'gorkh-agent',
    createdAt: now,
    updatedAt: now,
    localOnly: true,
    sensitive: false,
  };
  const result = GorkhAgentMemoryEntrySchema.safeParse(valid);
  assert.ok(result.success, result.error?.message);

  const localFalse = { ...valid, localOnly: false };
  assert.ok(!GorkhAgentMemoryEntrySchema.safeParse(localFalse).success);
});

test('task schema accepts all task kinds and statuses', () => {
  const now = Date.now();
  for (const kind of Object.values(GorkhAgentTaskKind)) {
    const valid = {
      id: `task-${kind}`,
      title: 'analysis',
      userIntent: 'check my portfolio',
      kind,
      status: GorkhAgentTaskStatus.DRAFT,
      riskLevel: 'low',
      createdAt: now,
      updatedAt: now,
    };
    const result = GorkhAgentTaskSchema.safeParse(valid);
    assert.ok(result.success, `${kind}: ${result.error?.message}`);
  }
});

test('tool call accepts allowed and blocked tool ids', () => {
  const now = Date.now();
  for (const toolId of [...GORKH_AGENT_ALLOWED_TOOL_IDS, ...GORKH_AGENT_BLOCKED_TOOL_IDS]) {
    const result = GorkhAgentToolCallSchema.safeParse({
      id: `call-${toolId}`,
      taskId: 'task-1',
      toolId,
      inputSummary: 'in',
      outputSummary: 'out',
      status: 'pending',
      startedAt: now,
    });
    assert.ok(result.success, `${toolId}: ${result.error?.message}`);
  }
});

test('proposal schema enforces executionBlocked literal true', () => {
  const valid = {
    id: 'p1',
    taskId: 't1',
    kind: 'informational',
    summary: 'Observation about wallet',
    requiresApproval: false,
    executionBlocked: true,
    blockedReasons: [],
    policyDigest: 'abc',
    createdAt: Date.now(),
  };
  assert.ok(GorkhAgentProposalSchema.safeParse(valid).success);
  assert.ok(!GorkhAgentProposalSchema.safeParse({ ...valid, executionBlocked: false }).success);
});

test('approval item schema requires approval and validates states', () => {
  for (const state of ['pending', 'approved', 'rejected', 'expired', 'blocked']) {
    const result = GorkhAgentApprovalItemSchema.safeParse({
      id: `a-${state}`,
      proposalId: 'p1',
      title: 'review action',
      description: 'desc',
      riskLevel: 'medium',
      approvalState: state,
      approvalRequired: true,
      createdAt: Date.now(),
    });
    assert.ok(result.success, `${state}: ${result.error?.message}`);
  }
});

test('audit event schema requires localOnly true', () => {
  const valid = {
    id: 'e1',
    kind: 'agent_started',
    summary: 'Agent started',
    createdAt: Date.now(),
    localOnly: true,
  };
  assert.ok(GorkhAgentAuditEventSchema.safeParse(valid).success);
  assert.ok(!GorkhAgentAuditEventSchema.safeParse({ ...valid, localOnly: false }).success);
});

test('templates contain GORKH Agent active and required coming soon templates', () => {
  const ids = GORKH_AGENT_TEMPLATES.map((t) => t.id);
  assert.ok(ids.includes('gorkh_agent'));
  for (const expected of [
    'copy_trader',
    'momentum_bot',
    'yield_optimizer',
    'dao_auto_voter',
    'lp_manager',
    'health_factor_auto_repay',
    'autonomous_cloak_private_send',
  ]) {
    const tpl = GORKH_AGENT_TEMPLATES.find((t) => t.id === expected);
    assert.ok(tpl, `missing ${expected}`);
    assert.equal(tpl.status, GorkhAgentTemplateStatus.COMING_SOON, `${expected} should be coming_soon`);
  }
});

test('only GORKH Agent template is active', () => {
  const active = GORKH_AGENT_TEMPLATES.filter((t) => t.status === 'active');
  assert.equal(active.length, 1);
  assert.equal(active[0].id, 'gorkh_agent');
});

test('main_wallet_without_approval template is blocked with explicit unavailableReason', () => {
  const tpl = getGorkhAgentTemplate('main_wallet_without_approval');
  assert.ok(tpl);
  assert.equal(tpl.status, GorkhAgentTemplateStatus.BLOCKED);
  assert.match(tpl.unavailableReason ?? '', /Main wallet actions require explicit policy and approval/i);
  assert.match(
    tpl.safetyNotes.join(' '),
    /god-?mode wallet access/i
  );
});

test('every template validates against schema', () => {
  for (const tpl of GORKH_AGENT_TEMPLATES) {
    const result = GorkhAgentTemplateSchema.safeParse(tpl);
    assert.ok(result.success, `${tpl.id}: ${result.error?.message}`);
  }
});

test('intent classifier maps keywords to expected task kinds', () => {
  assert.equal(getGorkhAgentTaskKindForIntent('check my portfolio'), GorkhAgentTaskKind.PORTFOLIO_ANALYSIS);
  assert.equal(getGorkhAgentTaskKindForIntent('analyze this token mint'), GorkhAgentTaskKind.TOKEN_ANALYSIS);
  assert.equal(getGorkhAgentTaskKindForIntent('decode this transaction'), GorkhAgentTaskKind.TRANSACTION_REVIEW);
  assert.equal(getGorkhAgentTaskKindForIntent('private cloak send'), GorkhAgentTaskKind.CLOAK_PRIVATE_PAYMENT_DRAFT);
  assert.equal(getGorkhAgentTaskKindForIntent('DCA via zerion'), GorkhAgentTaskKind.ZERION_DCA_PROPOSAL);
  assert.equal(getGorkhAgentTaskKindForIntent('build anchor workspace'), GorkhAgentTaskKind.BUILDER_REVIEW);
  assert.equal(getGorkhAgentTaskKindForIntent('export context summary'), GorkhAgentTaskKind.CONTEXT_SUMMARY);
  assert.equal(getGorkhAgentTaskKindForIntent('hello there'), GorkhAgentTaskKind.GENERAL_PLANNING);
});

test('label helpers return human strings', () => {
  assert.equal(getGorkhAgentTaskKindLabel('portfolio_analysis'), 'Portfolio Analysis');
  assert.equal(getGorkhAgentStatusLabel('killed'), 'Kill Switch Engaged');
});

test('blocked tool ids include autonomous wallet, cloak, zerion, trading, DAO, copy-trade, shell', () => {
  const blocked = new Set(GORKH_AGENT_BLOCKED_TOOL_IDS);
  for (const id of [
    'wallet.export_private_key',
    'wallet.sign_without_approval',
    'wallet.send_without_approval',
    'cloak.execute_private_send_autonomous',
    'cloak.execute_deposit_autonomous',
    'cloak.export_note_secret',
    'cloak.export_viewing_key',
    'zerion.execute_without_approval',
    'markets.execute_trade_autonomous',
    'dao.vote_autonomous',
    'yield.move_funds_autonomous',
    'copytrade.execute_autonomous',
    'terminal.exec_arbitrary',
    'shell.exec_arbitrary',
  ]) {
    assert.ok(blocked.has(id), `${id} must be blocked`);
  }
});

test('tool id type guards distinguish allowed vs blocked', () => {
  assert.ok(isGorkhAgentAllowedToolId('wallet.read_snapshot'));
  assert.ok(!isGorkhAgentAllowedToolId('wallet.sign_without_approval'));
  assert.ok(isGorkhAgentBlockedToolId('shell.exec_arbitrary'));
  assert.ok(!isGorkhAgentBlockedToolId('zerion.create_proposal'));
});

test('default station state validates as a whole', () => {
  const state = createEmptyGorkhAgentStationState(1700000000000);
  const result = GorkhAgentStationStateSchema.safeParse(state);
  assert.ok(result.success, result.error?.message);
});

test('background copy explicitly mentions app-open scope and not after quit', () => {
  assert.match(GORKH_AGENT_BACKGROUND_COPY, /while the desktop app is open/);
  assert.match(GORKH_AGENT_BACKGROUND_COPY, /not run after the app is fully quit/);
});

test('safety notes mention no Telegram/WhatsApp/Discord and no cloud agents', () => {
  const joined = GORKH_AGENT_STATION_SAFETY_NOTES.join(' ');
  assert.match(joined, /Telegram, WhatsApp, or Discord/i);
  assert.match(joined, /No cloud background agents/i);
});
