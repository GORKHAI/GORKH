import {
  SolanaAgentApprovalMode,
  WorkstationRiskLevel,
  type SolanaAgentProfile,
  type SolanaAgentActionDraft,
  type SolanaAgentPolicy,
} from '@gorkh/shared';

export interface AgentValidationResult {
  valid: boolean;
  errors: string[];
}

const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function validateSolanaAddress(address: string): boolean {
  return SOLANA_ADDRESS_REGEX.test(address);
}

export function validateAgentProfile(profile: SolanaAgentProfile): AgentValidationResult {
  const errors: string[] = [];

  if (!profile.name || profile.name.length < 2 || profile.name.length > 64) {
    errors.push('Agent name must be between 2 and 64 characters.');
  }

  if (profile.description && profile.description.length > 280) {
    errors.push('Description must be 280 characters or fewer.');
  }

  if (profile.humanControllerAddress && !validateSolanaAddress(profile.humanControllerAddress)) {
    errors.push('Human controller address does not look like a valid Solana public key.');
  }

  if (profile.policy.approvalMode !== SolanaAgentApprovalMode.MANUAL_EVERY_ACTION) {
    errors.push(
      'Only manual_every_action approval mode is supported in Agent v0.1. Other modes are disabled.'
    );
  }

  if (profile.policy.allowMainnet) {
    errors.push(
      'Mainnet is not allowed in Agent v0.1. Toggle "Allow mainnet previews" to enable future preview support.'
    );
  }

  if (!profile.policy.protocolPermissions || profile.policy.protocolPermissions.length === 0) {
    errors.push('At least one protocol permission must be configured.');
  }

  // Drift rejection
  const hasDrift = profile.policy.protocolPermissions.some(
    (p) => p.protocolId.toLowerCase().includes('drift')
  );
  if (hasDrift) {
    errors.push('Drift is not permitted in GORKH agent policies.');
  }

  return { valid: errors.length === 0, errors };
}

export function validateActionDraft(draft: SolanaAgentActionDraft): AgentValidationResult {
  const errors: string[] = [];

  if (!draft.userIntent || draft.userIntent.trim().length === 0) {
    errors.push('User intent is required to create an action draft.');
  }

  if (!draft.title || draft.title.trim().length === 0) {
    errors.push('Draft title is required.');
  }

  if (draft.protocolIds.some((id) => id.toLowerCase().includes('drift'))) {
    errors.push('Drift is not permitted in action drafts.');
  }

  return { valid: errors.length === 0, errors };
}

export function validatePolicyForPhase6(policy: SolanaAgentPolicy): AgentValidationResult {
  const errors: string[] = [];

  if (policy.approvalMode !== SolanaAgentApprovalMode.MANUAL_EVERY_ACTION) {
    errors.push('Only manual_every_action is live in Agent v0.1.');
  }

  if (policy.allowMainnet) {
    errors.push('Mainnet previews are disabled by default in Agent v0.1.');
  }

  if (!policy.requireHumanApproval) {
    errors.push('Human approval is mandatory in Agent v0.1.');
  }

  return { valid: errors.length === 0, errors };
}

export function computeDraftRiskLevel(
  draft: Pick<SolanaAgentActionDraft, 'blockedReasons' | 'kind'>
): typeof WorkstationRiskLevel[keyof typeof WorkstationRiskLevel] {
  if (draft.blockedReasons.length > 0) {
    return WorkstationRiskLevel.HIGH;
  }
  if (draft.kind === 'prepare_protocol_action' || draft.kind === 'prepare_private_payment') {
    return WorkstationRiskLevel.MEDIUM;
  }
  if (draft.kind === 'custom_request') {
    return WorkstationRiskLevel.MEDIUM;
  }
  return WorkstationRiskLevel.LOW;
}
