import type {
  GorkhAgentChatToolCard,
  GorkhAgentToolCallStatus,
} from '@gorkh/shared';
import type { ManualRunResult } from '../agentRuntime.js';
import { summarizeWalletResult } from '../agentWalletTools.js';
import { summarizeMarketsResult } from '../agentMarketsTools.js';
import { summarizeShieldResult } from '../agentShieldTools.js';
import { summarizeCloakHandoff } from '../agentCloakHandoff.js';
import { summarizeZerionHandoff } from '../agentZerionHandoff.js';

function cardId(kind: string): string {
  return `gorkh-chat-card-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createAgentChatToolCards(result: ManualRunResult): GorkhAgentChatToolCard[] {
  const cards: GorkhAgentChatToolCard[] = [];
  const relatedHandoffEntryId = result.handoffEntry?.id;
  if (result.walletResult) {
    cards.push({
      id: cardId('wallet'),
      kind: 'wallet_summary',
      title: 'Wallet Summary',
      summary: summarizeWalletResult(result.walletResult),
      status: 'completed',
      targetModule: 'wallet',
      relatedHandoffEntryId,
      localOnly: true,
    });
  }
  if (result.marketsResult) {
    cards.push({
      id: cardId('markets'),
      kind: 'markets_summary',
      title: 'Markets Summary',
      summary: summarizeMarketsResult(result.marketsResult),
      status: 'completed',
      targetModule: 'markets',
      relatedHandoffEntryId,
      localOnly: true,
    });
  }
  if (result.shieldResult) {
    cards.push({
      id: cardId('shield'),
      kind: 'shield_handoff',
      title: 'Shield Review Handoff',
      summary: summarizeShieldResult(result.shieldResult),
      status: 'requires_review',
      targetModule: 'shield',
      actionLabel: 'Open Shield',
      relatedHandoffEntryId,
      localOnly: true,
    });
  }
  if (result.cloakHandoff) {
    cards.push({
      id: cardId('cloak'),
      kind: 'cloak_handoff',
      title: 'Cloak Draft Handoff',
      summary: summarizeCloakHandoff(result.cloakHandoff),
      status: result.cloakHandoff.handoffStatus === 'ready_for_wallet_review' ? 'requires_review' : 'blocked',
      targetModule: 'wallet_cloak',
      actionLabel: 'Open Wallet → Cloak Private',
      relatedHandoffEntryId,
      localOnly: true,
    });
  }
  if (result.zerionHandoff) {
    cards.push({
      id: cardId('zerion'),
      kind: 'zerion_handoff',
      title: 'Zerion Proposal Handoff',
      summary: summarizeZerionHandoff(result.zerionHandoff),
      status: result.zerionHandoff.handoffStatus === 'ready_for_zerion_review' ? 'requires_review' : 'blocked',
      targetModule: 'zerion_executor',
      actionLabel: 'Open Agent → Zerion Executor',
      relatedHandoffEntryId,
      localOnly: true,
    });
  }
  if (result.contextBundle) {
    cards.push({
      id: cardId('context'),
      kind: 'context_bundle',
      title: 'Context Bundle',
      summary: `Redacted context bundle ready with ${result.contextBundle.sources.length} source(s).`,
      status: 'ready',
      targetModule: 'context',
      actionLabel: 'Copy Context Bundle',
      relatedHandoffEntryId,
      localOnly: true,
    });
  }
  if (result.toolCall.status === ('blocked' as GorkhAgentToolCallStatus)) {
    cards.push({
      id: cardId('policy'),
      kind: 'policy_block',
      title: 'Policy Blocked',
      summary: result.toolCall.error ?? 'Policy blocked this request.',
      status: 'blocked',
      localOnly: true,
    });
  }
  return cards;
}
