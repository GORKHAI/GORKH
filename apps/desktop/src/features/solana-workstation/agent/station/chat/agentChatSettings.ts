import {
  DEFAULT_GORKH_AGENT_CHAT_SETTINGS,
  GorkhAgentChatSettingsSchema,
  type GorkhAgentChatSettings,
} from '@gorkh/shared';

export function createDefaultAgentChatSettings(): GorkhAgentChatSettings {
  return { ...DEFAULT_GORKH_AGENT_CHAT_SETTINGS };
}

export function normalizeAgentChatSettings(value: unknown): GorkhAgentChatSettings {
  const parsed = GorkhAgentChatSettingsSchema.safeParse(value);
  if (!parsed.success) return createDefaultAgentChatSettings();
  return {
    ...parsed.data,
    plannerMode: parsed.data.allowLlmPlanning ? parsed.data.plannerMode : 'deterministic',
    requireRedactedContext: true,
  };
}
