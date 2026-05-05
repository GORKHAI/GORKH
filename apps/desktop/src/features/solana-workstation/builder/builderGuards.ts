import {
  SolanaBuilderToolName,
  ALLOWED_BUILDER_VERSION_TOOLS,
  getBuilderVersionCommandArgs,
  isExcludedBuilderDir,
  isExcludedBuilderFile,
} from '@gorkh/shared';

// ============================================================================
// Builder Safety Guards — Phase 4
// ============================================================================
// Enforces read-only inspection. Blocks execution, writes, installs,
// and sensitive file access.
// ============================================================================

/** Commands that are never allowed in Builder v0.1. */
const BLOCKED_COMMAND_PATTERNS = [
  /\banchor\s+build\b/,
  /\banchor\s+test\b/,
  /\banchor\s+deploy\b/,
  /\bsolana\s+program\s+deploy\b/,
  /\bsolana\s+transfer\b/,
  /\bsolana\s+airdrop\b/,
  /\bsolana-keygen\b/,
  /\bcargo\s+build\b/,
  /\bcargo\s+test\b/,
  /\bcargo\s+run\b/,
  /\bnpm\s+install\b/,
  /\bnpm\s+i\b/,
  /\bpnpm\s+install\b/,
  /\bpnpm\s+i\b/,
  /\byarn\s+install\b/,
  /\byarn\s+add\b/,
  /\brm\b/,
  /\bdel\b/,
  /\brmdir\b/,
  /\bmkfs\b/,
  /\bformat\b/,
  /\bdd\b/,
  /\bshred\b/,
  /\bgit\s+push\b/,
  /\bgit\s+pull\b/,
  /\bgit\s+merge\b/,
  /\bgit\s+rebase\b/,
  /\bkeypair\b/,
  /\bprivate.?key\b/,
  /\bdeploy\b/,
  /\btransfer\b/,
  /\bairdrop\b/,
];

/** Full command strings that are blocked regardless of context. */
const BLOCKED_COMMANDS = new Set([
  'anchor build',
  'anchor test',
  'anchor deploy',
  'solana program deploy',
  'solana transfer',
  'solana airdrop',
  'cargo build',
  'cargo test',
  'cargo run',
  'npm install',
  'npm i',
  'pnpm install',
  'pnpm i',
  'yarn install',
  'yarn add',
]);

/**
 * Validate that a terminal command is safe for Builder v0.1.
 * Only version-only commands are allowed.
 */
export function assertSafeBuilderCommand(cmd: string, args: string[]): void {
  const full = `${cmd} ${args.join(' ')}`.trim().toLowerCase();

  // Exact match blocklist
  if (BLOCKED_COMMANDS.has(full)) {
    throw new Error(`Command blocked in Builder v0.1: "${full}"`);
  }

  // Pattern blocklist
  for (const pattern of BLOCKED_COMMAND_PATTERNS) {
    if (pattern.test(full)) {
      throw new Error(`Command pattern blocked in Builder v0.1: "${full}" matches ${pattern.source}`);
    }
  }

  // Must be a --version command
  if (!args.includes('--version')) {
    throw new Error(
      `Only --version commands are allowed in Builder v0.1. Got: "${full}"`
    );
  }
}

/**
 * Check if a terminal command is a safe version-only command.
 */
export function isSafeBuilderVersionCommand(cmd: string, args: string[]): boolean {
  try {
    assertSafeBuilderCommand(cmd, args);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate that a file path is safe to read in Builder v0.1.
 */
export function assertSafeBuilderFilePath(path: string): void {
  if (isExcludedBuilderFile(path)) {
    throw new Error(`File path blocked in Builder v0.1: "${path}"`);
  }
}

/**
 * Check if a file path is safe to read.
 */
export function isSafeBuilderFilePath(path: string): boolean {
  try {
    assertSafeBuilderFilePath(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate that a directory name is safe to list in Builder v0.1.
 */
export function assertSafeBuilderDirName(name: string): void {
  if (isExcludedBuilderDir(name)) {
    throw new Error(`Directory blocked in Builder v0.1: "${name}"`);
  }
}

/**
 * Build a safe version command for a given tool.
 * Throws if the tool is not in the allowlist.
 */
export function buildSafeVersionCommand(tool: string): { cmd: string; args: string[] } {
  if (!ALLOWED_BUILDER_VERSION_TOOLS.includes(tool as SolanaBuilderToolName)) {
    throw new Error(`Tool "${tool}" is not in the Builder v0.1 version allowlist`);
  }
  return getBuilderVersionCommandArgs(tool as SolanaBuilderToolName);
}
