import {
  GorkhAgentTaskKind,
  GORKH_AGENT_CHAT_BLOCKED_EXECUTION_PHRASES,
  getGorkhAgentTaskKindForIntent,
  type GorkhAgentToolId,
} from '@gorkh/shared';

export interface AgentChatIntentClassification {
  intentKind: GorkhAgentTaskKind;
  toolIds: GorkhAgentToolId[];
  blockedToolId?: GorkhAgentToolId;
  blockedReason?: string;
}

const KIND_TO_TOOLS: Record<GorkhAgentTaskKind, GorkhAgentToolId[]> = {
  portfolio_analysis: ['wallet.read_snapshot', 'wallet.read_portfolio'],
  token_analysis: ['markets.read_watchlist', 'markets.fetch_context'],
  transaction_review: ['shield.decode_transaction'],
  cloak_private_payment_draft: ['cloak.prepare_private_send'],
  zerion_dca_proposal: ['zerion.create_proposal'],
  builder_review: ['builder.inspect_workspace'],
  context_summary: ['context.create_bundle'],
  general_planning: ['wallet.read_snapshot'],
};

export function classifyAgentChatIntent(text: string): AgentChatIntentClassification {
  const lowered = text.toLowerCase();
  if (/(sign|send|execute|swap|trade|vote|shell|terminal).*(without approval|autonomous|directly|now)/i.test(text)) {
    return {
      intentKind: GorkhAgentTaskKind.GENERAL_PLANNING,
      toolIds: [],
      blockedToolId: inferBlockedTool(lowered),
      blockedReason:
        'Request appears to require autonomous execution or bypassing approval, which GORKH Agent Chat blocks.',
    };
  }
  for (const phrase of GORKH_AGENT_CHAT_BLOCKED_EXECUTION_PHRASES) {
    if (lowered.includes(phrase)) {
      return {
        intentKind: GorkhAgentTaskKind.GENERAL_PLANNING,
        toolIds: [],
        blockedToolId: inferBlockedTool(lowered),
        blockedReason: `Blocked execution phrase detected: "${phrase}".`,
      };
    }
  }
  const intentKind = getGorkhAgentTaskKindForIntent(text);
  return { intentKind, toolIds: KIND_TO_TOOLS[intentKind] };
}

function inferBlockedTool(lowered: string): GorkhAgentToolId {
  if (lowered.includes('cloak') && lowered.includes('deposit')) return 'cloak.execute_deposit_autonomous';
  if (lowered.includes('cloak')) return 'cloak.execute_private_send_autonomous';
  if (lowered.includes('zerion') || lowered.includes('swap')) return 'zerion.execute_without_approval';
  if (lowered.includes('shell') || lowered.includes('terminal')) return 'shell.exec_arbitrary';
  if (lowered.includes('trade')) return 'markets.execute_trade_autonomous';
  return 'wallet.send_without_approval';
}
