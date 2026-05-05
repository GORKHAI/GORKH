import {
  SolanaAgentProfileStatus,
  DEFAULT_SOLANA_AGENT_POLICY,
  SOLANA_AGENT_PHASE_6_SAFETY_NOTES,
  type SolanaAgentProfile,
} from '@gorkh/shared';

export function createDefaultAgent(now: number = Date.now()): SolanaAgentProfile {
  const policy = {
    ...DEFAULT_SOLANA_AGENT_POLICY,
    id: `policy-${now}`,
    createdAt: now,
    updatedAt: now,
    protocolPermissions: DEFAULT_SOLANA_AGENT_POLICY.protocolPermissions.map((p) => ({ ...p })),
    spendLimits: DEFAULT_SOLANA_AGENT_POLICY.spendLimits.map((s) => ({ ...s })),
    safetyNotes: [...DEFAULT_SOLANA_AGENT_POLICY.safetyNotes],
  };

  return {
    id: `agent-${now}`,
    name: 'Solana Safety Agent',
    description:
      'Local preview agent for transaction review, Builder context analysis, market intelligence review, and future policy-gated Solana actions.',
    status: SolanaAgentProfileStatus.ACTIVE_LOCAL,
    policy,
    createdAt: now,
    updatedAt: now,
    localOnly: true,
    safetyNotes: [
      ...SOLANA_AGENT_PHASE_6_SAFETY_NOTES,
      'This default agent is configured with conservative settings.',
      'Attestation preview is local-only and not written on-chain.'
    ],
  };
}
