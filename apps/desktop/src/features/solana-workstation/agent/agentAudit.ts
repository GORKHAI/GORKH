import {
  SolanaAgentAuditEventKind,
  type SolanaAgentAuditEvent,
  type SolanaAgentProfile,
  type SolanaAgentActionDraft,
  type SolanaAgentAttestationPreview,
} from '@gorkh/shared';

function makeEvent(
  kind: SolanaAgentAuditEventKind,
  agentId: string,
  title: string,
  description: string,
  opts?: { actionDraftId?: string; attestationPreviewId?: string }
): SolanaAgentAuditEvent {
  const now = Date.now();
  return {
    id: `audit-${kind}-${now}`,
    kind,
    agentId,
    actionDraftId: opts?.actionDraftId,
    attestationPreviewId: opts?.attestationPreviewId,
    title,
    description,
    createdAt: now,
    localOnly: true,
  };
}

export function auditAgentCreated(agent: SolanaAgentProfile): SolanaAgentAuditEvent {
  return makeEvent(
    SolanaAgentAuditEventKind.AGENT_CREATED,
    agent.id,
    `Agent "${agent.name}" created`,
    `Local agent profile created with status ${agent.status}.`
  );
}

export function auditAgentUpdated(agent: SolanaAgentProfile): SolanaAgentAuditEvent {
  return makeEvent(
    SolanaAgentAuditEventKind.AGENT_UPDATED,
    agent.id,
    `Agent "${agent.name}" updated`,
    `Agent profile was updated at ${new Date(agent.updatedAt).toISOString()}.`
  );
}

export function auditPolicyUpdated(agent: SolanaAgentProfile): SolanaAgentAuditEvent {
  return makeEvent(
    SolanaAgentAuditEventKind.POLICY_UPDATED,
    agent.id,
    `Policy "${agent.policy.name}" updated`,
    `Policy updated with approval mode ${agent.policy.approvalMode} and networks ${agent.policy.allowedNetworks.join(', ')}.`
  );
}

export function auditActionDrafted(
  agent: SolanaAgentProfile,
  draft: SolanaAgentActionDraft
): SolanaAgentAuditEvent {
  return makeEvent(
    SolanaAgentAuditEventKind.ACTION_DRAFTED,
    agent.id,
    `Draft "${draft.title}" created`,
    `Action draft of kind ${draft.kind} created with ${draft.blockedReasons.length} blocked reason(s).`,
    { actionDraftId: draft.id }
  );
}

export function auditAttestationPreviewGenerated(
  agent: SolanaAgentProfile,
  preview: SolanaAgentAttestationPreview
): SolanaAgentAuditEvent {
  return makeEvent(
    SolanaAgentAuditEventKind.ATTESTATION_PREVIEW_GENERATED,
    agent.id,
    `Attestation preview generated for "${preview.actionKind}"`,
    `Local agent attestation preview generated with status ${preview.status} and ${preview.warnings.length} warning(s).`,
    { actionDraftId: preview.actionDraftId, attestationPreviewId: preview.id }
  );
}

export function auditActionRejectedLocal(
  agent: SolanaAgentProfile,
  draft: SolanaAgentActionDraft
): SolanaAgentAuditEvent {
  return makeEvent(
    SolanaAgentAuditEventKind.ACTION_REJECTED_LOCAL,
    agent.id,
    `Draft "${draft.title}" rejected locally`,
    `Action draft was rejected by the user without generating an attestation preview.`,
    { actionDraftId: draft.id }
  );
}
