import {
  SolanaAgentAttestationPreviewStatus,
  type SolanaAgentProfile,
  type SolanaAgentPolicy,
  type SolanaAgentActionDraft,
  type SolanaAgentAttestationPreview,
  type SolanaNetwork,
} from '@gorkh/shared';
import { createPolicyHash } from './createPolicyHash.js';
import { createActionHash } from './createActionHash.js';

export interface CreateAttestationPreviewInput {
  agent: SolanaAgentProfile;
  policy: SolanaAgentPolicy;
  draft: SolanaAgentActionDraft;
  network: SolanaNetwork;
}

export async function createAttestationPreview(
  input: CreateAttestationPreviewInput
): Promise<SolanaAgentAttestationPreview> {
  const now = Date.now();
  const warnings: string[] = [];

  if (!input.agent.humanControllerAddress) {
    warnings.push('Human controller address is missing. Attestation preview is incomplete.');
  }

  if (input.network === 'mainnet-beta') {
    warnings.push('Mainnet-beta is selected. Mainnet attestations are not supported in Agent v0.1.');
  }

  if (input.draft.blockedReasons.length > 0) {
    warnings.push(
      `Action draft has ${input.draft.blockedReasons.length} blocked reason(s). Preview may not reflect a valid future attestation.`
    );
  }

  if (input.policy.approvalMode !== 'manual_every_action') {
    warnings.push(
      'Policy approval mode is not manual_every_action. Only manual mode is supported in Agent v0.1.'
    );
  }

  const policyHash = await createPolicyHash(input.policy);
  const actionHash = await createActionHash(input.draft);

  const previewPayload: Record<string, unknown> = {
    version: 'gorkh-agent-attestation-preview-v1',
    agent: {
      id: input.agent.id,
      name: input.agent.name,
      localOnly: true,
    },
    humanController: {
      address: input.agent.humanControllerAddress ?? null,
      label: input.agent.humanControllerLabel ?? null,
    },
    policy: {
      id: input.policy.id,
      name: input.policy.name,
      riskTolerance: input.policy.riskTolerance,
      approvalMode: input.policy.approvalMode,
      allowedNetworks: input.policy.allowedNetworks,
      requireShieldSimulationPreview: input.policy.requireShieldSimulationPreview,
      requireHumanApproval: input.policy.requireHumanApproval,
      allowMainnet: input.policy.allowMainnet,
      hash: policyHash,
    },
    action: {
      id: input.draft.id,
      kind: input.draft.kind,
      title: input.draft.title,
      userIntent: input.draft.userIntent,
      protocolIds: input.draft.protocolIds,
      riskLevel: input.draft.riskLevel,
      hash: actionHash,
    },
    hashes: {
      policy: policyHash,
      action: actionHash,
    },
    network: input.network,
    localOnly: true,
    generatedAt: now,
  };

  return {
    id: `attestation-${now}`,
    status: SolanaAgentAttestationPreviewStatus.PREVIEW_ONLY,
    network: input.network,
    agentId: input.agent.id,
    agentName: input.agent.name,
    humanControllerAddress: input.agent.humanControllerAddress,
    policyId: input.policy.id,
    actionDraftId: input.draft.id,
    actionKind: input.draft.kind,
    actionHash,
    policyHash,
    previewPayload,
    generatedAt: now,
    warnings,
    safetyNote: 'Preview only. Not written on-chain. No production attestation was created.',
  };
}
