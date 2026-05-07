import type { ZerionAuditEvent, ZerionCommandKind } from '@gorkh/shared';

export function createZerionAuditEvent(input: {
  kind: ZerionAuditEvent['kind'];
  title: string;
  description: string;
  proposalId?: string;
  policyName?: string;
  txHash?: string;
  commandKind?: ZerionCommandKind;
  now?: number;
}): ZerionAuditEvent {
  const now = input.now ?? Date.now();
  return {
    id: `zerion-audit-${input.kind}-${now}`,
    kind: input.kind,
    title: input.title,
    description: input.description,
    proposalId: input.proposalId,
    policyName: input.policyName,
    txHash: input.txHash,
    commandKind: input.commandKind,
    createdAt: now,
    localOnly: true,
  };
}

