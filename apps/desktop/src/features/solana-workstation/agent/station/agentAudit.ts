import {
  GorkhAgentAuditEventKind,
  type GorkhAgentAuditEvent,
} from '@gorkh/shared';

export function createAuditEvent(
  kind: GorkhAgentAuditEventKind,
  summary: string,
  metadata?: Record<string, string>
): GorkhAgentAuditEvent {
  return {
    id: `gorkh-agent-audit-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    summary,
    metadata,
    createdAt: Date.now(),
    localOnly: true,
  };
}

export const auditAgentStarted = (mode: string): GorkhAgentAuditEvent =>
  createAuditEvent(GorkhAgentAuditEventKind.AGENT_STARTED, `GORKH Agent started in ${mode} mode.`, {
    mode,
  });

export const auditAgentPaused = (): GorkhAgentAuditEvent =>
  createAuditEvent(GorkhAgentAuditEventKind.AGENT_PAUSED, 'GORKH Agent paused.');

export const auditAgentResumed = (): GorkhAgentAuditEvent =>
  createAuditEvent(GorkhAgentAuditEventKind.AGENT_RESUMED, 'GORKH Agent resumed.');

export const auditAgentKilled = (): GorkhAgentAuditEvent =>
  createAuditEvent(GorkhAgentAuditEventKind.AGENT_KILLED, 'GORKH Agent kill switch engaged.');

export const auditTaskCreated = (
  taskId: string,
  title: string,
  kind: string
): GorkhAgentAuditEvent =>
  createAuditEvent(GorkhAgentAuditEventKind.TASK_CREATED, `Task "${title}" created.`, {
    taskId,
    kind,
  });

export const auditTaskCompleted = (taskId: string, title: string): GorkhAgentAuditEvent =>
  createAuditEvent(GorkhAgentAuditEventKind.TASK_COMPLETED, `Task "${title}" completed.`, {
    taskId,
  });

export const auditToolCalled = (
  taskId: string,
  toolId: string,
  status: string
): GorkhAgentAuditEvent =>
  createAuditEvent(GorkhAgentAuditEventKind.TOOL_CALLED, `Tool ${toolId} (${status}).`, {
    taskId,
    toolId,
    status,
  });

export const auditProposalCreated = (
  proposalId: string,
  taskId: string,
  kind: string
): GorkhAgentAuditEvent =>
  createAuditEvent(GorkhAgentAuditEventKind.PROPOSAL_CREATED, `Proposal ${kind} created.`, {
    proposalId,
    taskId,
    kind,
  });

export const auditApprovalRequired = (
  proposalId: string,
  riskLevel: string
): GorkhAgentAuditEvent =>
  createAuditEvent(
    GorkhAgentAuditEventKind.APPROVAL_REQUIRED,
    `Approval required for proposal ${proposalId} (${riskLevel}).`,
    { proposalId, riskLevel }
  );

export const auditApprovalRejected = (proposalId: string): GorkhAgentAuditEvent =>
  createAuditEvent(GorkhAgentAuditEventKind.APPROVAL_REJECTED, `Approval rejected for ${proposalId}.`, {
    proposalId,
  });

export const auditPolicyBlocked = (
  toolId: string,
  reasons: string[]
): GorkhAgentAuditEvent =>
  createAuditEvent(
    GorkhAgentAuditEventKind.POLICY_BLOCKED,
    `Policy blocked tool ${toolId}: ${reasons.slice(0, 2).join('; ')}`,
    { toolId, reasonCount: String(reasons.length) }
  );

export const auditMemoryCreated = (
  memoryId: string,
  kind: string
): GorkhAgentAuditEvent =>
  createAuditEvent(GorkhAgentAuditEventKind.MEMORY_CREATED, `Memory entry (${kind}) created.`, {
    memoryId,
    kind,
  });

export const auditRoadmapTemplateViewed = (templateId: string): GorkhAgentAuditEvent =>
  createAuditEvent(
    GorkhAgentAuditEventKind.ROADMAP_TEMPLATE_VIEWED,
    `Viewed roadmap template ${templateId}.`,
    { templateId }
  );
