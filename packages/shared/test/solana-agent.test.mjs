import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SolanaAgentProfileStatus,
  SolanaAgentRiskTolerance,
  SolanaAgentApprovalMode,
  SolanaAgentActionKind,
  SolanaAgentActionStatus,
  SolanaAgentProtocolPermissionLevel,
  SolanaAgentAttestationPreviewStatus,
  SolanaAgentAuditEventKind,
  SolanaAgentProfileSchema,
  SolanaAgentPolicySchema,
  SolanaAgentActionDraftSchema,
  SolanaAgentAttestationPreviewSchema,
  SolanaAgentAuditEventSchema,
  SolanaAgentWorkspaceStateSchema,
  DEFAULT_SOLANA_AGENT_PROTOCOL_PERMISSIONS,
  DEFAULT_SOLANA_AGENT_POLICY,
  SOLANA_AGENT_DISABLED_APPROVAL_MODES,
  SOLANA_AGENT_PHASE_6_SAFETY_NOTES,
  isDisabledApprovalMode,
  getAgentActionKindLabel,
  getAgentApprovalModeLabel,
  getAgentRiskToleranceLabel,
} from '../dist/index.js';

test('SolanaAgentProfile schema accepts a valid local agent', () => {
  const now = Date.now();
  const valid = {
    id: 'agent-test',
    name: 'Test Agent',
    description: 'A test agent',
    status: 'active_local',
    policy: {
      id: 'policy-test',
      name: 'Test Policy',
      riskTolerance: 'conservative',
      approvalMode: 'manual_every_action',
      allowedNetworks: ['devnet'],
      protocolPermissions: [
        {
          protocolId: 'sns',
          enabled: true,
          permissionLevel: 'read_only',
          allowedActionKinds: ['analyze_transaction'],
          safetyNote: 'Preview only',
        },
      ],
      spendLimits: [
        { enabled: true, tokenSymbol: 'SOL', period: 'manual_only', note: 'Metadata only' },
      ],
      maxInstructionsPerDraft: 5,
      requireShieldSimulationPreview: true,
      requireHumanApproval: true,
      allowMainnet: false,
      createdAt: now,
      updatedAt: now,
      safetyNotes: ['Safe'],
    },
    createdAt: now,
    updatedAt: now,
    localOnly: true,
    safetyNotes: ['Local only'],
  };
  const result = SolanaAgentProfileSchema.safeParse(valid);
  assert.ok(result.success, result.error?.message);
});

test('SolanaAgentPolicy schema accepts DEFAULT_SOLANA_AGENT_POLICY', () => {
  const now = Date.now();
  const policy = {
    ...DEFAULT_SOLANA_AGENT_POLICY,
    id: 'policy-default',
    createdAt: now,
    updatedAt: now,
  };
  const result = SolanaAgentPolicySchema.safeParse(policy);
  assert.ok(result.success, result.error?.message);
});

test('DEFAULT_SOLANA_AGENT_PROTOCOL_PERMISSIONS contains SNS and excludes Drift, HumanRail, White Protocol', () => {
  const ids = DEFAULT_SOLANA_AGENT_PROTOCOL_PERMISSIONS.map((p) => p.protocolId);
  assert.ok(ids.includes('sns'), 'SNS should be present');
  assert.ok(!ids.includes('humanrail'), 'HumanRail must not be present');
  assert.ok(!ids.includes('white_protocol'), 'White Protocol must not be present');
  assert.ok(!ids.includes('drift'), 'Drift must not be present');
  assert.ok(!ids.some((id) => id.toLowerCase().includes('drift')), 'No drift-like ID allowed');
});

test('SNS permission is enabled by default with read_only level', () => {
  const sns = DEFAULT_SOLANA_AGENT_PROTOCOL_PERMISSIONS.find(
    (p) => p.protocolId === 'sns'
  );
  assert.ok(sns);
  assert.equal(sns.enabled, true);
  assert.equal(sns.permissionLevel, 'read_only');
});

test('Squads is disabled by default', () => {
  const squads = DEFAULT_SOLANA_AGENT_PROTOCOL_PERMISSIONS.find(
    (p) => p.protocolId === 'squads'
  );
  assert.ok(squads);
  assert.equal(squads.enabled, false);
});

test('SolanaAgentActionDraft schema accepts a valid draft', () => {
  const now = Date.now();
  const valid = {
    id: 'draft-test',
    agentId: 'agent-test',
    kind: 'analyze_transaction',
    title: 'Analyze tx',
    userIntent: 'Check this transaction',
    network: 'devnet',
    protocolIds: ['sns'],
    status: 'draft',
    riskLevel: 'low',
    proposedSteps: ['Decode tx'],
    blockedReasons: ['Wallet not connected'],
    requiredApprovals: ['Manual human approval required'],
    createdAt: now,
    updatedAt: now,
    safetyNotes: ['Not executable'],
  };
  const result = SolanaAgentActionDraftSchema.safeParse(valid);
  assert.ok(result.success, result.error?.message);
});

test('SolanaAgentAttestationPreview schema requires preview_only/not_written status', () => {
  const now = Date.now();
  const valid = {
    id: 'att-test',
    status: 'preview_only',
    network: 'devnet',
    agentId: 'agent-test',
    agentName: 'Test Agent',
    policyId: 'policy-test',
    actionDraftId: 'draft-test',
    actionKind: 'analyze_transaction',
    actionHash: 'abc123',
    policyHash: 'def456',
    previewPayload: { version: 'v1' },
    generatedAt: now,
    warnings: [],
    safetyNote: 'Preview only. Not written on-chain. No production attestation was created.',
  };
  const result = SolanaAgentAttestationPreviewSchema.safeParse(valid);
  assert.ok(result.success, result.error?.message);

  const invalidStatus = { ...valid, status: 'invalid_status' };
  const invalidResult = SolanaAgentAttestationPreviewSchema.safeParse(invalidStatus);
  assert.ok(!invalidResult.success);
});

test('Approval modes manual_high_risk and future_policy_based are disabled/future', () => {
  assert.ok(SOLANA_AGENT_DISABLED_APPROVAL_MODES.includes('manual_high_risk'));
  assert.ok(SOLANA_AGENT_DISABLED_APPROVAL_MODES.includes('future_policy_based'));
  assert.ok(!SOLANA_AGENT_DISABLED_APPROVAL_MODES.includes('manual_every_action'));
});

test('isDisabledApprovalMode returns true for disabled modes', () => {
  assert.ok(isDisabledApprovalMode('manual_high_risk'));
  assert.ok(isDisabledApprovalMode('future_policy_based'));
  assert.ok(!isDisabledApprovalMode('manual_every_action'));
});

test('Default policy has manual_every_action, devnet only, requireHumanApproval true, requireShieldSimulationPreview true, allowMainnet false', () => {
  assert.equal(DEFAULT_SOLANA_AGENT_POLICY.approvalMode, 'manual_every_action');
  assert.deepStrictEqual(DEFAULT_SOLANA_AGENT_POLICY.allowedNetworks, ['devnet']);
  assert.equal(DEFAULT_SOLANA_AGENT_POLICY.requireHumanApproval, true);
  assert.equal(DEFAULT_SOLANA_AGENT_POLICY.requireShieldSimulationPreview, true);
  assert.equal(DEFAULT_SOLANA_AGENT_POLICY.allowMainnet, false);
});

test('SOLANA_AGENT_PHASE_6_SAFETY_NOTES contains expected messages', () => {
  assert.ok(
    SOLANA_AGENT_PHASE_6_SAFETY_NOTES.some((n) => n.includes('local metadata')),
    'Should mention local metadata'
  );
  assert.ok(
    SOLANA_AGENT_PHASE_6_SAFETY_NOTES.some((n) => n.includes('No wallet connection')),
    'Should mention no wallet connection'
  );
  assert.ok(
    SOLANA_AGENT_PHASE_6_SAFETY_NOTES.some((n) => n.includes('No signing')),
    'Should mention no signing'
  );
  assert.ok(
    SOLANA_AGENT_PHASE_6_SAFETY_NOTES.some((n) => n.includes('Attestation previews are local-only')),
    'Should mention preview-only attestations'
  );
});

test('getAgentActionKindLabel returns human-readable labels', () => {
  assert.equal(getAgentActionKindLabel('analyze_transaction'), 'Analyze Transaction');
  assert.equal(getAgentActionKindLabel('prepare_protocol_action'), 'Prepare Protocol Action');
  assert.equal(getAgentActionKindLabel('custom_request'), 'Custom Request');
});

test('getAgentApprovalModeLabel returns human-readable labels', () => {
  assert.equal(getAgentApprovalModeLabel('manual_every_action'), 'Manual — Every Action');
  assert.ok(getAgentApprovalModeLabel('manual_high_risk').includes('Future'));
});

test('getAgentRiskToleranceLabel returns human-readable labels', () => {
  assert.equal(getAgentRiskToleranceLabel('conservative'), 'Conservative');
  assert.equal(getAgentRiskToleranceLabel('balanced'), 'Balanced');
  assert.equal(getAgentRiskToleranceLabel('aggressive'), 'Aggressive');
});

test('SolanaAgentAuditEvent schema accepts a valid local event', () => {
  const valid = {
    id: 'audit-1',
    kind: 'agent_created',
    agentId: 'agent-test',
    title: 'Agent created',
    description: 'Created',
    createdAt: Date.now(),
    localOnly: true,
  };
  const result = SolanaAgentAuditEventSchema.safeParse(valid);
  assert.ok(result.success, result.error?.message);
});

test('SolanaAgentWorkspaceState schema validates empty state', () => {
  const valid = {
    agents: [],
    drafts: [],
    attestationPreviews: [],
    auditEvents: [],
    updatedAt: Date.now(),
  };
  const result = SolanaAgentWorkspaceStateSchema.safeParse(valid);
  assert.ok(result.success, result.error?.message);
});
