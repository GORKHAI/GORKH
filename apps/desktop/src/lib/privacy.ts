import type { ToolCall, ToolSummary } from '@gorkh/shared';
import { redactToolCallForLog, sanitizeToolSummaryForPersistence } from '@gorkh/shared';

interface ToolResultLike {
  ok: boolean;
  data?: unknown;
}

function getRedactedPreviewLabel(kind: 'file preview' | 'stdout' | 'stderr', length: number): string {
  return `[redacted ${kind}: ${length} chars]`;
}

export function buildRedactedToolSummary(
  summary: Pick<ToolSummary, 'toolEventId' | 'toolCallId' | 'runId' | 'deviceId' | 'tool' | 'status' | 'at'> &
    Partial<ToolSummary>,
): ToolSummary {
  return sanitizeToolSummaryForPersistence(summary as ToolSummary);
}

export function getRedactedToolMetadata(toolCall: ToolCall): { pathRel?: string; cmd?: string } {
  const redacted = redactToolCallForLog(toolCall);
  return {
    pathRel: redacted.pathRel,
    cmd: redacted.cmd,
  };
}

export function buildRedactedLocalToolPreview(
  toolCall: ToolCall,
  result: ToolResultLike,
): { text?: string; stdout?: string; stderr?: string } | undefined {
  if (!result.ok || !result.data || typeof result.data !== 'object') {
    return undefined;
  }

  const data = result.data as {
    content?: string;
    stdout_preview?: string;
    stderr_preview?: string;
  };

  if (toolCall.tool === 'fs.read_text' && typeof data.content === 'string') {
    return {
      text: getRedactedPreviewLabel('file preview', data.content.length),
    };
  }

  if (toolCall.tool === 'terminal.exec') {
    const preview: { text?: string; stdout?: string; stderr?: string } = {};
    if (typeof data.stdout_preview === 'string' && data.stdout_preview.length > 0) {
      preview.stdout = getRedactedPreviewLabel('stdout', data.stdout_preview.length);
    }
    if (typeof data.stderr_preview === 'string' && data.stderr_preview.length > 0) {
      preview.stderr = getRedactedPreviewLabel('stderr', data.stderr_preview.length);
    }
    return preview.stdout || preview.stderr ? preview : undefined;
  }

  return undefined;
}
