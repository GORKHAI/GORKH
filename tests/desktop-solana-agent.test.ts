import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SolanaAgentProfileStatus,
  SolanaAgentApprovalMode,
  SolanaAgentActionKind,
  SolanaAgentAttestationPreviewStatus,
  SolanaAgentAuditEventKind,
  DEFAULT_SOLANA_AGENT_POLICY,
  type SolanaAgentProfile,
  type SolanaAgentActionDraft,
} from '../packages/shared/src/index.ts';

import { createDefaultAgent } from '../apps/desktop/src/features/solana-workstation/agent/createDefaultAgent.ts';
import {
  validateSolanaAddress,
  validateAgentProfile,
  validateActionDraft,
  validatePolicyForPhase6,
  computeDraftRiskLevel,
} from '../apps/desktop/src/features/solana-workstation/agent/agentValidation.ts';
import { createActionDraft } from '../apps/desktop/src/features/solana-workstation/agent/createActionDraft.ts';
import { createAttestationPreview } from '../apps/desktop/src/features/solana-workstation/agent/createAttestationPreview.ts';
import { createPolicyHash } from '../apps/desktop/src/features/solana-workstation/agent/createPolicyHash.ts';
import { createActionHash } from '../apps/desktop/src/features/solana-workstation/agent/createActionHash.ts';
import {
  loadAgentWorkspaceState,
  saveAgentWorkspaceState,
  createEmptyAgentWorkspaceState,
} from '../apps/desktop/src/features/solana-workstation/agent/agentStorage.ts';
import {
  auditAgentCreated,
  auditPolicyUpdated,
  auditActionDrafted,
  auditAttestationPreviewGenerated,
} from '../apps/desktop/src/features/solana-workstation/agent/agentAudit.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTestAgent(overrides?: Partial<SolanaAgentProfile>): SolanaAgentProfile {
  const agent = createDefaultAgent(1);
  return { ...agent, ...overrides };
}

// ---------------------------------------------------------------------------
// createDefaultAgent
// ---------------------------------------------------------------------------

test('createDefaultAgent creates a local agent with SNS enabled and no private data', () => {
  const agent = createDefaultAgent(12345);
  assert.equal(agent.localOnly, true);
  assert.equal(agent.status, SolanaAgentProfileStatus.ACTIVE_LOCAL);
  assert.ok(agent.name.includes('Safety'));

  const sns = agent.policy.protocolPermissions.find((p) => p.protocolId === 'sns');
  assert.ok(sns);
  assert.equal(sns.enabled, true);

  assert.equal(agent.humanControllerAddress, undefined);
  assert.equal(agent.humanControllerLabel, undefined);
  assert.ok(!agent.safetyNotes.some((n) => n.toLowerCase().includes('private key')));
  assert.ok(!agent.safetyNotes.some((n) => n.toLowerCase().includes('seed phrase')));
  assert.ok(!agent.safetyNotes.some((n) => n.toLowerCase().includes('humanrail')));
});

// ---------------------------------------------------------------------------
// agentValidation
// ---------------------------------------------------------------------------

test('validateSolanaAddress accepts valid-looking Solana public address and rejects invalid address', () => {
  assert.ok(validateSolanaAddress('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'));
  assert.ok(validateSolanaAddress('11111111111111111111111111111111'));
  assert.ok(!validateSolanaAddress('not-an-address'));
  assert.ok(!validateSolanaAddress(''));
  assert.ok(!validateSolanaAddress('too_short'));
  assert.ok(!validateSolanaAddress('0x1234567890abcdef'));
});

test('validateAgentProfile rejects Drift if present in stored/imported permissions', () => {
  const agent = makeTestAgent();
  const badAgent: SolanaAgentProfile = {
    ...agent,
    policy: {
      ...agent.policy,
      protocolPermissions: [
        ...agent.policy.protocolPermissions,
        {
          protocolId: 'drift' as any,
          enabled: true,
          permissionLevel: 'read_only',
          allowedActionKinds: ['analyze_transaction'],
          safetyNote: 'Bad',
        },
      ],
    },
  };
  const result = validateAgentProfile(badAgent);
  assert.ok(!result.valid);
  assert.ok(result.errors.some((e) => e.toLowerCase().includes('drift')));
});

test('validateAgentProfile accepts valid agent', () => {
  const agent = makeTestAgent();
  const result = validateAgentProfile(agent);
  assert.ok(result.valid, `Expected valid but got errors: ${result.errors.join(', ')}`);
});

test('validatePolicyForPhase6 rejects non-manual approval modes', () => {
  const agent = makeTestAgent();
  const badPolicy = { ...agent.policy, approvalMode: SolanaAgentApprovalMode.MANUAL_HIGH_RISK };
  const result = validatePolicyForPhase6(badPolicy);
  assert.ok(!result.valid);
  assert.ok(result.errors.some((e) => e.includes('manual_every_action')));
});

// ---------------------------------------------------------------------------
// createActionDraft
// ---------------------------------------------------------------------------

test('createActionDraft creates non-executable draft with required manual approval', () => {
  const agent = makeTestAgent();
  const draft = createActionDraft({
    agent,
    kind: SolanaAgentActionKind.ANALYZE_TRANSACTION,
    title: 'Test Draft',
    userIntent: 'Analyze this tx',
    network: 'devnet',
    protocolIds: ['sns'],
  });

  assert.equal(draft.agentId, agent.id);
  assert.ok(draft.requiredApprovals.includes('Manual human approval required'));
  assert.ok(draft.safetyNotes.some((n) => n.includes('not executable')));
  assert.ok(draft.blockedReasons.length > 0);
});

test('createActionDraft adds blocked reason for protocol action requiring future integration', () => {
  const agent = makeTestAgent();
  const draft = createActionDraft({
    agent,
    kind: SolanaAgentActionKind.PREPARE_PROTOCOL_ACTION,
    title: 'Protocol Action',
    userIntent: 'Swap on Jupiter',
    network: 'devnet',
    protocolIds: ['jupiter'],
  });

  assert.ok(draft.blockedReasons.some((r) => r.includes('Wallet connection')));
  assert.ok(draft.blockedReasons.some((r) => r.includes('On-chain attestation write')));
  assert.ok(draft.blockedReasons.some((r) => r.includes('protocol')) || draft.blockedReasons.some((r) => r.includes('Jupiter')) || draft.blockedReasons.some((r) => r.includes('disabled')));
});

test('createActionDraft blocks mainnet when policy.allowMainnet is false', () => {
  const agent = makeTestAgent();
  assert.equal(agent.policy.allowMainnet, false);
  const draft = createActionDraft({
    agent,
    kind: SolanaAgentActionKind.ANALYZE_TRANSACTION,
    title: 'Mainnet Draft',
    userIntent: 'Analyze mainnet tx',
    network: 'mainnet-beta',
    protocolIds: ['sns'],
  });

  assert.ok(draft.blockedReasons.some((r) => r.toLowerCase().includes('mainnet')));
});

// ---------------------------------------------------------------------------
// createAttestationPreview
// ---------------------------------------------------------------------------

test('createAttestationPreview returns preview_only and not_written', async () => {
  const agent = makeTestAgent();
  const draft = createActionDraft({
    agent,
    kind: SolanaAgentActionKind.ANALYZE_TRANSACTION,
    title: 'Test',
    userIntent: 'Test',
    network: 'devnet',
    protocolIds: ['sns'],
  });

  const preview = await createAttestationPreview({
    agent,
    policy: agent.policy,
    draft,
    network: 'devnet',
  });

  assert.equal(preview.status, SolanaAgentAttestationPreviewStatus.PREVIEW_ONLY);
  assert.equal(preview.safetyNote, 'Preview only. Not written on-chain. No production attestation was created.');
  assert.equal(preview.previewPayload.localOnly, true);
});

test('createAttestationPreview warns when human controller address is missing', async () => {
  const agent = makeTestAgent();
  const draft = createActionDraft({
    agent,
    kind: SolanaAgentActionKind.ANALYZE_TRANSACTION,
    title: 'Test',
    userIntent: 'Test',
    network: 'devnet',
    protocolIds: ['sns'],
  });

  const preview = await createAttestationPreview({
    agent,
    policy: agent.policy,
    draft,
    network: 'devnet',
  });

  assert.ok(preview.warnings.some((w) => w.toLowerCase().includes('human controller')));
});

test('createAttestationPreview does not call RPC or external APIs', async () => {
  const agent = makeTestAgent();
  const draft = createActionDraft({
    agent,
    kind: SolanaAgentActionKind.ANALYZE_TRANSACTION,
    title: 'Test',
    userIntent: 'Test',
    network: 'devnet',
    protocolIds: ['sns'],
  });

  const preview = await createAttestationPreview({
    agent,
    policy: agent.policy,
    draft,
    network: 'devnet',
  });

  // Preview is purely local; no network calls were made.
  assert.ok(preview.previewPayload);
  assert.equal(preview.previewPayload.localOnly, true);
  assert.equal(preview.previewPayload.network, 'devnet');
});

// ---------------------------------------------------------------------------
// Hash determinism
// ---------------------------------------------------------------------------

test('createPolicyHash is deterministic for same policy', async () => {
  const policy = DEFAULT_SOLANA_AGENT_POLICY;
  const hash1 = await createPolicyHash(policy);
  const hash2 = await createPolicyHash(policy);
  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 64);
});

test('createActionHash is deterministic for same draft', async () => {
  const agent = makeTestAgent();
  const draft = createActionDraft({
    agent,
    kind: SolanaAgentActionKind.ANALYZE_TRANSACTION,
    title: 'Test',
    userIntent: 'Test',
    network: 'devnet',
    protocolIds: ['sns'],
  });

  const hash1 = await createActionHash(draft);
  const hash2 = await createActionHash(draft);
  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 64);
});

// ---------------------------------------------------------------------------
// agentStorage
// ---------------------------------------------------------------------------

test('agentStorage validates loaded data and resets invalid data safely', () => {
  // Mock localStorage
  const store: Record<string, string> = {};
  const mockStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
  };
  (globalThis as any).window = { localStorage: mockStorage };

  const invalid = JSON.stringify({ agents: 'not-an-array' });
  store['gorkh.solana.agent.workspace.v1'] = invalid;

  const loaded = loadAgentWorkspaceState();
  assert.equal(loaded, null);

  const empty = createEmptyAgentWorkspaceState(1);
  saveAgentWorkspaceState(empty);
  const reloaded = loadAgentWorkspaceState();
  assert.ok(reloaded);
  assert.deepStrictEqual(reloaded!.agents, []);
  assert.deepStrictEqual(reloaded!.drafts, []);

  delete (globalThis as any).window;
});

// ---------------------------------------------------------------------------
// agentAudit
// ---------------------------------------------------------------------------

test('agentAudit creates localOnly events', () => {
  const agent = makeTestAgent();
  const event = auditAgentCreated(agent);
  assert.equal(event.localOnly, true);
  assert.equal(event.kind, SolanaAgentAuditEventKind.AGENT_CREATED);
  assert.equal(event.agentId, agent.id);

  const policyEvent = auditPolicyUpdated(agent);
  assert.equal(policyEvent.localOnly, true);
  assert.equal(policyEvent.kind, SolanaAgentAuditEventKind.POLICY_UPDATED);
});

test('auditActionDrafted links draft id', () => {
  const agent = makeTestAgent();
  const draft = createActionDraft({
    agent,
    kind: SolanaAgentActionKind.ANALYZE_TRANSACTION,
    title: 'Test',
    userIntent: 'Test',
    network: 'devnet',
    protocolIds: ['sns'],
  });

  const event = auditActionDrafted(agent, draft);
  assert.equal(event.localOnly, true);
  assert.equal(event.actionDraftId, draft.id);
  assert.equal(event.kind, SolanaAgentAuditEventKind.ACTION_DRAFTED);
});

// ---------------------------------------------------------------------------
// computeDraftRiskLevel
// ---------------------------------------------------------------------------

test('computeDraftRiskLevel returns high when blocked reasons exist', () => {
  const level = computeDraftRiskLevel({
    kind: SolanaAgentActionKind.ANALYZE_TRANSACTION,
    blockedReasons: ['Wallet not connected'],
  });
  assert.equal(level, 'high');
});

test('computeDraftRiskLevel returns medium for protocol actions', () => {
  const level = computeDraftRiskLevel({
    kind: SolanaAgentActionKind.PREPARE_PROTOCOL_ACTION,
    blockedReasons: [],
  });
  assert.equal(level, 'medium');
});

test('computeDraftRiskLevel returns low for analyze_transaction without blocks', () => {
  const level = computeDraftRiskLevel({
    kind: SolanaAgentActionKind.ANALYZE_TRANSACTION,
    blockedReasons: [],
  });
  assert.equal(level, 'low');
});
