import {
  SOLANA_BUILDER_ALLOWED_DIAGNOSTIC_COMMANDS,
} from '@gorkh/shared';
import { executeTool } from '../../../lib/workspace.js';
import { sanitizeBuilderOutput, redactSolanaConfigOutput } from './sanitizeBuilderOutput.js';

// ============================================================================
// Diagnostic Command Runner — Phase 5
// ============================================================================
// Runs only exact allowlisted diagnostic commands via existing terminal.exec.
// ============================================================================

export interface DiagnosticResult {
  cmd: string;
  args: string[];
  stdout: string;
  stderr: string;
  exitCode: number;
  ranAt: string;
  redactionApplied: boolean;
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, i) => val === b[i]);
}

function isAllowedDiagnosticCommand(cmd: string, args: string[]): boolean {
  return SOLANA_BUILDER_ALLOWED_DIAGNOSTIC_COMMANDS.some(
    (allowed) => allowed.cmd === cmd && arraysEqual(allowed.args, args)
  );
}

/**
 * Run a diagnostic command if it is in the exact allowlist.
 */
export async function runDiagnosticCommand(
  cmd: string,
  args: string[]
): Promise<DiagnosticResult> {
  if (!isAllowedDiagnosticCommand(cmd, args)) {
    throw new Error(
      `Command "${cmd} ${args.join(' ')}" is not in the Builder v0.2 diagnostic allowlist.`
    );
  }

  const result = await executeTool({
    tool: 'terminal.exec',
    cmd,
    args,
  });

  const ranAt = new Date().toISOString();

  if (!result.ok || result.data?.exit_code === undefined) {
    throw new Error(
      result.error?.message ?? `Diagnostic command "${cmd}" failed to execute.`
    );
  }

  const exitCode = result.data.exit_code;
  let stdout = result.data.stdout_preview ?? '';
  let stderr = result.data.stderr_preview ?? '';

  // Apply redactions
  stdout = sanitizeBuilderOutput(stdout);
  stderr = sanitizeBuilderOutput(stderr);

  if (cmd === 'solana' && args[0] === 'config' && args[1] === 'get') {
    stdout = redactSolanaConfigOutput(stdout);
  }

  return {
    cmd,
    args,
    stdout,
    stderr,
    exitCode,
    ranAt,
    redactionApplied: true,
  };
}
