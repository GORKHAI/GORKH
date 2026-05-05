import {
  getAgentActionKindLabel,
  getAgentApprovalModeLabel,
  SOLANA_AGENT_PHASE_6_SAFETY_NOTES,
  type SolanaAgentProfile,
  type SolanaAgentActionDraft,
  type SolanaAgentAttestationPreview,
  type SolanaAgentAuditEvent,
} from '@gorkh/shared';

export interface AgentContextInput {
  agent: SolanaAgentProfile;
  drafts?: SolanaAgentActionDraft[];
  attestationPreviews?: SolanaAgentAttestationPreview[];
  auditEvents?: SolanaAgentAuditEvent[];
}

export function createAgentContextMarkdown(input: AgentContextInput): string {
  const { agent } = input;
  const lines: string[] = [];

  lines.push(`# GORKH Agent Context: ${agent.name}`);
  lines.push('');
  lines.push('> **Local-only metadata.** No wallet connection. No signing. No execution.');
  lines.push('> Agent attestation previews mentioned below are **local-only** and are **not on-chain**.');
  lines.push('');

  lines.push(`## Agent Profile`);
  lines.push(`- **Name:** ${agent.name}`);
  lines.push(`- **Status:** ${agent.status}`);
  lines.push(`- **Description:** ${agent.description || 'No description'}`);
  if (agent.humanControllerAddress) {
    lines.push(`- **Human Controller:** ${agent.humanControllerAddress}`);
  } else {
    lines.push(`- **Human Controller:** *(not configured)*`);
  }
  lines.push(`- **Local Only:** ${agent.localOnly}`);
  lines.push('');

  lines.push(`## Policy`);
  lines.push(`- **Name:** ${agent.policy.name}`);
  lines.push(`- **Risk Tolerance:** ${agent.policy.riskTolerance}`);
  lines.push(`- **Approval Mode:** ${getAgentApprovalModeLabel(agent.policy.approvalMode)}`);
  lines.push(`- **Allowed Networks:** ${agent.policy.allowedNetworks.join(', ')}`);
  lines.push(`- **Require Shield Preview:** ${agent.policy.requireShieldSimulationPreview}`);
  lines.push(`- **Require Human Approval:** ${agent.policy.requireHumanApproval}`);
  lines.push(`- **Allow Mainnet:** ${agent.policy.allowMainnet}`);
  lines.push(`- **Max Instructions Per Draft:** ${agent.policy.maxInstructionsPerDraft ?? 'unlimited'}`);
  lines.push('');

  lines.push(`## Enabled Protocol Permissions`);
  const enabled = agent.policy.protocolPermissions.filter((p) => p.enabled);
  if (enabled.length === 0) {
    lines.push('- *(none enabled)*');
  } else {
    for (const p of enabled) {
      lines.push(`- **${p.protocolId}** — ${p.permissionLevel} (${p.allowedActionKinds.join(', ')})`);
    }
  }
  lines.push('');

  const drafts = input.drafts?.filter((d) => d.agentId === agent.id) ?? [];
  if (drafts.length > 0) {
    lines.push(`## Action Drafts (${drafts.length})`);
    for (const draft of drafts) {
      lines.push(`### ${draft.title}`);
      lines.push(`- **Kind:** ${getAgentActionKindLabel(draft.kind)}`);
      lines.push(`- **Status:** ${draft.status}`);
      lines.push(`- **Network:** ${draft.network}`);
      lines.push(`- **Risk Level:** ${draft.riskLevel}`);
      lines.push(`- **User Intent:** ${draft.userIntent}`);
      if (draft.blockedReasons.length > 0) {
        lines.push(`- **Blocked Reasons:**`);
        for (const r of draft.blockedReasons) {
          lines.push(`  - ${r}`);
        }
      }
      lines.push('');
    }
  }

  const previews = input.attestationPreviews?.filter((a) => a.agentId === agent.id) ?? [];
  if (previews.length > 0) {
    lines.push(`## Agent Attestation Previews (${previews.length})`);
    for (const p of previews) {
      lines.push(`- **${p.actionKind}** — ${p.status} — ${p.warnings.length} warning(s)`);
      lines.push(`  - *${p.safetyNote}*`);
    }
    lines.push('');
  }

  const events = input.auditEvents?.filter((e) => e.agentId === agent.id).slice(-10) ?? [];
  if (events.length > 0) {
    lines.push(`## Recent Audit Events (${events.length})`);
    for (const e of events) {
      lines.push(`- ${e.title} (${e.kind})`);
    }
    lines.push('');
  }

  lines.push('## Safety Notes');
  for (const note of SOLANA_AGENT_PHASE_6_SAFETY_NOTES) {
    lines.push(`- ${note}`);
  }
  lines.push('');

  return lines.join('\n');
}
