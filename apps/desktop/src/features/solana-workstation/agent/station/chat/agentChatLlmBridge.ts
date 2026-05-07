import type { GorkhAgentChatRedactedContext, GorkhAgentChatSettings } from '@gorkh/shared';

export interface AgentChatLlmSuggestion {
  intentKind?: string;
  toolId?: string;
  replyHint?: string;
}

export interface AgentChatLlmBridgeResult {
  used: boolean;
  reason: string;
  suggestion?: AgentChatLlmSuggestion;
}

export async function planAgentChatWithLlm(
  settings: GorkhAgentChatSettings,
  _redactedContext: GorkhAgentChatRedactedContext,
  _userText: string
): Promise<AgentChatLlmBridgeResult> {
  if (!settings.allowLlmPlanning || settings.plannerMode !== 'llm_redacted_context') {
    return { used: false, reason: 'LLM planning is disabled by default.' };
  }
  return {
    used: false,
    reason:
      'LLM planning scaffold is present, but v0.3 keeps deterministic planning active until a redacted provider path is explicitly wired and policy-validated.',
  };
}
