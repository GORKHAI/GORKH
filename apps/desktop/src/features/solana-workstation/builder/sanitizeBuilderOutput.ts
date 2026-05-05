// ============================================================================
// Sanitize Builder Output — Phase 5
// ============================================================================
// Redacts sensitive data from command outputs before display.
// ============================================================================

const REDACTION_PATTERNS = [
  // Keypair path in solana config get
  { pattern: /(wallet|keypair|deployer).*path.*:.*(\S+)/gi, replacement: '$1 path: [redacted]' },
  // Private key array of 64 numbers
  { pattern: /\[\s*\d+\s*(,\s*\d+\s*){63}\s*\]/g, replacement: '[PRIVATE_KEY_REDACTED]' },
  // Common secret env values
  { pattern: /(PRIVATE_KEY|SECRET|MNEMONIC|SEED_PHRASE|API_KEY)\s*=\s*.+/gi, replacement: '$1=[REDACTED]' },
  // RPC URL with embedded credentials
  { pattern: /(https?:\/\/)([^:]+):([^@]+)@/gi, replacement: '$1[CREDENTIALS]@' },
  // Home directory paths
  { pattern: /(\/home\/[^\/]+|\/Users\/[^\/]+|C:\\Users\\[^\\]+)/gi, replacement: '[HOME]' },
];

/**
 * Sanitize command output before displaying in Builder UI.
 */
export function sanitizeBuilderOutput(output: string): string {
  let result = output;
  for (const { pattern, replacement } of REDACTION_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Redact keypair path specifically from solana config output.
 */
export function redactSolanaConfigOutput(output: string): string {
  return output
    .replace(/Keypair Path:\s*\S+/gi, 'Keypair Path: [redacted]')
    .replace(/Config File:\s*\S+/gi, 'Config File: [redacted]')
    .replace(/RPC URL:\s*(https?:\/\/)([^:]+):([^@]+)@/gi, 'RPC URL: $1[CREDENTIALS]@');
}
