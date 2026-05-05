import { redactToolCallForLog, type ToolCall } from '@gorkh/shared';

export function redactToolCallForLogs(toolCall: ToolCall): { tool: ToolCall['tool']; pathRel?: string; cmd?: string } {
  return redactToolCallForLog(toolCall);
}
