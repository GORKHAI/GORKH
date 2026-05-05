import { Prisma } from '@prisma/client';
import { sanitizeToolSummaryForPersistence, type ToolSummary } from '@gorkh/shared';
import { prisma } from '../db/prisma.js';

function serializeTool(tool: ToolSummary) {
  const sanitized = sanitizeToolSummaryForPersistence(tool);
  return {
    id: sanitized.toolEventId,
    deviceId: sanitized.deviceId,
    runId: sanitized.runId ?? null,
    tool: sanitized.tool,
    status: sanitized.status,
    summaryJson: {
      toolCallId: sanitized.toolCallId,
      pathRel: sanitized.pathRel,
      cmd: sanitized.cmd,
      exitCode: sanitized.exitCode,
      truncated: sanitized.truncated,
      bytesWritten: sanitized.bytesWritten,
      hunksApplied: sanitized.hunksApplied,
      errorCode: sanitized.errorCode,
      at: sanitized.at,
    } as unknown as Prisma.InputJsonValue,
    createdAt: new Date(sanitized.at),
    updatedAt: new Date(sanitized.at),
  };
}

function mapTool(row: any): ToolSummary {
  const summary = row.summaryJson as {
    toolCallId?: string;
    pathRel?: string;
    cmd?: string;
    exitCode?: number;
    truncated?: boolean;
    bytesWritten?: number;
    hunksApplied?: number;
    errorCode?: string;
    at?: number;
  };

  return {
    toolEventId: row.id,
    toolCallId: summary.toolCallId ?? row.id,
    runId: row.runId ?? undefined,
    deviceId: row.deviceId,
    tool: row.tool as ToolSummary['tool'],
    pathRel: summary.pathRel,
    cmd: summary.cmd,
    status: row.status as ToolSummary['status'],
    exitCode: summary.exitCode,
    truncated: summary.truncated,
    bytesWritten: summary.bytesWritten,
    hunksApplied: summary.hunksApplied,
    errorCode: summary.errorCode,
    at: summary.at ?? row.updatedAt.getTime(),
  };
}

export const toolsRepo = {
  async loadAll() {
    const rows = await prisma.toolEvent.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => ({
      tool: mapTool(row),
      ownerUserId: row.ownerUserId,
    }));
  },

  async save(tool: ToolSummary, ownerUserId: string) {
    const data = serializeTool(sanitizeToolSummaryForPersistence(tool));
    await prisma.toolEvent.upsert({
      where: { id: tool.toolEventId },
      update: { ...data, ownerUserId } as Prisma.ToolEventUncheckedUpdateInput,
      create: { ...data, ownerUserId } as Prisma.ToolEventUncheckedCreateInput,
    });
  },

  async listOwnedByRun(runId: string, ownerUserId: string, limit: number) {
    const rows = await prisma.toolEvent.findMany({
      where: { runId, ownerUserId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
    return rows.map((row) => mapTool(row));
  },

  async listOwnedByDevice(deviceId: string, ownerUserId: string, limit: number) {
    const rows = await prisma.toolEvent.findMany({
      where: { deviceId, ownerUserId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
    return rows.map((row) => mapTool(row));
  },
};
