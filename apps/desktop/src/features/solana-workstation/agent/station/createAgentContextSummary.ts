import {
  type GorkhAgentApprovalItem,
  type GorkhAgentAuditEvent,
  type GorkhAgentMemoryEntry,
  type GorkhAgentPolicy,
  type GorkhAgentProfile,
  type GorkhAgentProposal,
  type GorkhAgentRuntimeState,
  type GorkhAgentTask,
  type GorkhAgentTemplate,
  GORKH_AGENT_BACKGROUND_COPY,
  getGorkhAgentStatusLabel,
  getGorkhAgentTemplateStatusLabel,
} from '@gorkh/shared';

export interface AgentStationContextInput {
  profile: GorkhAgentProfile;
  runtime: GorkhAgentRuntimeState;
  policy: GorkhAgentPolicy;
  tasks: GorkhAgentTask[];
  proposals: GorkhAgentProposal[];
  approvals: GorkhAgentApprovalItem[];
  audit: GorkhAgentAuditEvent[];
  memory: GorkhAgentMemoryEntry[];
  templates: GorkhAgentTemplate[];
}

export interface AgentStationContextSummary {
  markdown: string;
  redactionsApplied: string[];
}

export function createAgentStationContextSummary(
  input: AgentStationContextInput
): AgentStationContextSummary {
  const lines: string[] = [];
  const redactions: string[] = [];

  lines.push(`# GORKH Agent Station — Context`);
  lines.push('');
  lines.push(`Profile: ${input.profile.name} (${input.profile.version})`);
  lines.push(`Status: ${getGorkhAgentStatusLabel(input.profile.status)}`);
  lines.push(
    `Runtime: ${input.runtime.runtimeMode} — running=${input.runtime.isRunning} paused=${input.runtime.isPaused} kill=${input.runtime.killSwitchEnabled}`
  );
  lines.push(`Background: ${GORKH_AGENT_BACKGROUND_COPY}`);
  lines.push('');

  lines.push('## Policy');
  lines.push(`Name: ${input.policy.name}`);
  lines.push(`Allowed tools: ${input.policy.allowedTools.length}`);
  lines.push(`Blocked tools: ${input.policy.blockedTools.length}`);
  lines.push(
    `allowMainWalletAutonomousExecution=${input.policy.allowMainWalletAutonomousExecution}, allowAutonomousCloakSend=${input.policy.allowAutonomousCloakSend}, allowAutonomousTrading=${input.policy.allowAutonomousTrading}, allowAutonomousDaoVoting=${input.policy.allowAutonomousDaoVoting}`
  );
  lines.push('');

  lines.push('## Tasks');
  if (input.tasks.length === 0) {
    lines.push('(no tasks)');
  } else {
    for (const task of input.tasks.slice(-10)) {
      lines.push(`- [${task.status}] ${task.title} (${task.kind}, risk=${task.riskLevel})`);
    }
  }
  lines.push('');

  lines.push('## Proposals');
  if (input.proposals.length === 0) {
    lines.push('(no proposals)');
  } else {
    for (const proposal of input.proposals.slice(-10)) {
      lines.push(`- ${proposal.kind}: ${proposal.summary} (executionBlocked=${proposal.executionBlocked})`);
    }
  }
  lines.push('');

  lines.push('## Approvals');
  if (input.approvals.length === 0) {
    lines.push('(no approvals queued)');
  } else {
    for (const approval of input.approvals.slice(-10)) {
      lines.push(`- ${approval.title} — ${approval.approvalState} (risk=${approval.riskLevel})`);
    }
  }
  lines.push('');

  lines.push('## Audit (recent)');
  for (const event of input.audit.slice(-15)) {
    lines.push(`- [${new Date(event.createdAt).toISOString()}] ${event.kind}: ${event.summary}`);
  }
  lines.push('');

  lines.push('## Memory (non-sensitive only)');
  const nonSensitive = input.memory.filter((m) => !m.sensitive);
  if (nonSensitive.length === 0) {
    lines.push('(no non-sensitive memory entries)');
  } else {
    for (const entry of nonSensitive.slice(-10)) {
      lines.push(`- (${entry.kind}) ${entry.title}`);
    }
  }
  if (nonSensitive.length !== input.memory.length) {
    redactions.push('memory.sensitive');
    lines.push(`(${input.memory.length - nonSensitive.length} sensitive memory entries excluded)`);
  }
  lines.push('');

  lines.push('## Roadmap Templates');
  for (const tpl of input.templates) {
    lines.push(`- [${getGorkhAgentTemplateStatusLabel(tpl.status)}] ${tpl.name}: ${tpl.description}`);
  }

  redactions.push(
    'agent.privateKeys',
    'agent.cloakNoteSecrets',
    'agent.viewingKeys',
    'agent.zerionTokens'
  );

  return {
    markdown: lines.join('\n'),
    redactionsApplied: Array.from(new Set(redactions)),
  };
}
