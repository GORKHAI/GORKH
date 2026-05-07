import { GorkhAgentTaskKind, type GorkhAgentChatRedactedContext } from '@gorkh/shared';
import type { ManualRunResult } from '../agentRuntime.js';
import { summarizeWalletResult } from '../agentWalletTools.js';
import { summarizeMarketsResult } from '../agentMarketsTools.js';

export function formatAgentChatReply(
  intentKind: GorkhAgentTaskKind,
  result: ManualRunResult | null,
  redactedContext: GorkhAgentChatRedactedContext
): string {
  if (!result) {
    if (intentKind === GorkhAgentTaskKind.GENERAL_PLANNING) {
      return [
        'I can safely read local wallet and market summaries, prepare Shield review handoffs, draft Cloak private-send handoffs, create Zerion proposal handoffs, summarize Builder context, and create redacted context bundles.',
        'I cannot sign, execute transactions, run arbitrary shell commands, or bypass Wallet/Cloak/Zerion approval flows.',
      ].join('\n\n');
    }
    return 'I blocked this request because it requires autonomous wallet execution, which GORKH does not allow.';
  }

  if (result.toolCall.status === 'blocked') {
    return 'I blocked this request because it requires autonomous wallet execution, which GORKH does not allow.';
  }

  switch (intentKind) {
    case GorkhAgentTaskKind.PORTFOLIO_ANALYSIS:
      return result.walletResult
        ? `I checked the locally stored wallet snapshot. ${summarizeWalletResult(result.walletResult)} I did not refresh RPC from chat.`
        : 'I checked local wallet state, but no wallet summary was available. I did not refresh RPC from chat.';
    case GorkhAgentTaskKind.TOKEN_ANALYSIS:
      return result.marketsResult
        ? `I read your local Markets watchlist. ${summarizeMarketsResult(result.marketsResult)} I did not fetch Birdeye or execute any market action.`
        : 'I read local Markets state, but no market context was available. I did not fetch Birdeye or execute any market action.';
    case GorkhAgentTaskKind.TRANSACTION_REVIEW:
      return 'I prepared a Shield review handoff. Open Shield to decode or simulate manually.';
    case GorkhAgentTaskKind.CLOAK_PRIVATE_PAYMENT_DRAFT:
      return 'I prepared a Cloak draft handoff. Execution is blocked in chat. Review it inside Wallet → Cloak Private, where the secure wallet approval flow is enforced.';
    case GorkhAgentTaskKind.ZERION_DCA_PROPOSAL:
      return 'I prepared a Zerion proposal. Execution is blocked here. Review it inside the Zerion Executor approval flow.';
    case GorkhAgentTaskKind.BUILDER_REVIEW:
      return result.contextBundle
        ? 'I summarized the Builder workspace from stored local context. I did not run builds, tests, deploys, or shell commands.'
        : 'I looked for stored Builder context. Open Builder to refresh workspace analysis manually.';
    case GorkhAgentTaskKind.CONTEXT_SUMMARY:
      return `I created a redacted context bundle from ${redactedContext.sources.length} safe source(s). It excludes private keys, seed phrases, Cloak notes, viewing keys, API keys, Zerion tokens, and raw signing payloads.`;
    case GorkhAgentTaskKind.GENERAL_PLANNING:
    default:
      return [
        'I can safely help with local summaries, drafts, handoffs, policy explanations, and redacted context bundles.',
        'I cannot sign, execute, or bypass approvals from chat.',
      ].join('\n\n');
  }
}
