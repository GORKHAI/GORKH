import type {
  GorkhAgentChatToolCard,
  GorkhAgentCloakDraftHandoff,
  GorkhAgentContextBundleResult,
  GorkhAgentHandoffEntry,
  GorkhAgentShieldToolResult,
  GorkhAgentZerionProposalHandoff,
} from '@gorkh/shared';

export type AgentChatResolvedHandoff =
  | { kind: 'cloak_handoff'; cloakHandoff: GorkhAgentCloakDraftHandoff }
  | { kind: 'zerion_handoff'; zerionHandoff: GorkhAgentZerionProposalHandoff }
  | { kind: 'shield_handoff'; shieldResult: GorkhAgentShieldToolResult }
  | { kind: 'context_bundle'; contextBundle: GorkhAgentContextBundleResult };

export function resolveAgentChatToolCardHandoff(
  card: GorkhAgentChatToolCard,
  entries: GorkhAgentHandoffEntry[]
): AgentChatResolvedHandoff | null {
  if (!card.relatedHandoffEntryId) return null;
  const entry = entries.find((candidate) => candidate.id === card.relatedHandoffEntryId);
  if (!entry) return null;
  if (card.kind === 'cloak_handoff' && entry.cloakHandoff) {
    return { kind: 'cloak_handoff', cloakHandoff: entry.cloakHandoff };
  }
  if (card.kind === 'zerion_handoff' && entry.zerionHandoff) {
    return { kind: 'zerion_handoff', zerionHandoff: entry.zerionHandoff };
  }
  if (card.kind === 'shield_handoff' && entry.shieldResult) {
    return { kind: 'shield_handoff', shieldResult: entry.shieldResult };
  }
  if (card.kind === 'context_bundle' && entry.contextBundle) {
    return { kind: 'context_bundle', contextBundle: entry.contextBundle };
  }
  return null;
}
