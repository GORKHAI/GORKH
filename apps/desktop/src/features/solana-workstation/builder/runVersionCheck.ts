import {
  SolanaBuilderToolName,
  ALLOWED_BUILDER_VERSION_TOOLS,
  getBuilderVersionCommandArgs,
  type SolanaBuilderToolStatus,
} from '@gorkh/shared';
import { executeTool } from '../../../lib/workspace.js';
import { assertSafeBuilderCommand } from './builderGuards.js';

// ============================================================================
// Version Check Runner — Phase 4
// ============================================================================
// Runs allowed --version commands via the existing terminal.exec tool.
// All commands are validated before execution.
// ============================================================================

export interface VersionCheckOptions {
  tools?: SolanaBuilderToolName[];
  onProgress?: (status: SolanaBuilderToolStatus) => void;
}

/**
 * Run version checks for allowed builder tools.
 * Each check is validated and executed individually.
 */
export async function runBuilderVersionChecks(
  options: VersionCheckOptions = {}
): Promise<SolanaBuilderToolStatus[]> {
  const tools = options.tools ?? ALLOWED_BUILDER_VERSION_TOOLS;
  const results: SolanaBuilderToolStatus[] = [];

  for (const tool of tools) {
    const { cmd, args } = getBuilderVersionCommandArgs(tool);

    // Safety validation
    try {
      assertSafeBuilderCommand(cmd, args);
    } catch (err) {
      const status: SolanaBuilderToolStatus = {
        tool,
        available: false,
        error: err instanceof Error ? err.message : 'Command blocked',
        checkedAt: new Date().toISOString(),
      };
      results.push(status);
      options.onProgress?.(status);
      continue;
    }

    // Execute via existing tool system
    const result = await executeTool({
      tool: 'terminal.exec',
      cmd,
      args,
    });

    if (result.ok && result.data?.exit_code === 0) {
      const stdout = result.data.stdout_preview ?? '';
      const version = stdout.trim().split('\n')[0].trim();
      const status: SolanaBuilderToolStatus = {
        tool,
        available: true,
        version: version || undefined,
        checkedAt: new Date().toISOString(),
      };
      results.push(status);
      options.onProgress?.(status);
    } else {
      const stderr = result.data?.stderr_preview ?? '';
      const status: SolanaBuilderToolStatus = {
        tool,
        available: false,
        error: stderr.trim() || result.error?.message || 'Command not found or failed',
        checkedAt: new Date().toISOString(),
      };
      results.push(status);
      options.onProgress?.(status);
    }
  }

  return results;
}
