import {
  type SolanaBuilderFilePreview,
  getBuilderFileLanguage,
  isExcludedBuilderFile,
  isExcludedBuilderDir,
} from '@gorkh/shared';
import { executeTool, type ToolResult } from '../../../lib/workspace.js';

// ============================================================================
// Safe File Preview — Phase 5
// ============================================================================
// Read-only file preview with path validation, size limits, and redaction.
// ============================================================================

const MAX_PREVIEW_BYTES = 200_000;
const MAX_PREVIEW_LINES = 400;

/** Allowed file path patterns for preview. */
const ALLOWED_PREVIEW_PATTERNS = [
  /^Anchor\.toml$/i,
  /^Cargo\.toml$/i,
  /^package\.json$/i,
  /^README\.md$/i,
  /^programs\/[^/]+\/Cargo\.toml$/i,
  /^programs\/[^/]+\/src\/lib\.rs$/i,
  /^programs\/[^/]+\/src\/.*\.rs$/i,
  /^target\/idl\/[^/]+\.json$/i,
  /^idl\/[^/]+\.json$/i,
  /^tests\/[^/]+\.(ts|js|rs)$/i,
  /^migrations\/[^/]+\.(ts|js)$/i,
];

const REDACTION_KEYWORDS = [
  'PRIVATE_KEY',
  'SECRET',
  'MNEMONIC',
  'SEED_PHRASE',
  'API_KEY',
];

function isAllowedPreviewPath(relPath: string): boolean {
  // Block path traversal
  if (relPath.includes('..')) return false;
  if (relPath.startsWith('/')) return false;

  // Block excluded dirs
  const parts = relPath.split('/');
  for (const part of parts) {
    if (isExcludedBuilderDir(part)) {
      // Special case: target/idl/*.json is allowed
      if (!(part === 'target' && parts.includes('idl'))) {
        return false;
      }
    }
  }

  // Block excluded files
  if (isExcludedBuilderFile(relPath)) return false;

  // Must match allowlist
  return ALLOWED_PREVIEW_PATTERNS.some((pattern) => pattern.test(relPath));
}

function redactContent(content: string): { text: string; count: number } {
  let redacted = 0;
  let result = content;

  // Redact secret keyword lines
  for (const keyword of REDACTION_KEYWORDS) {
    const regex = new RegExp(`(${keyword})\\s*[:=]\\s*.+`, 'gi');
    result = result.replace(regex, (_match: string, key: string) => {
      redacted++;
      return `${key}: [REDACTED]`;
    });
  }

  // Redact private key arrays [1, 2, 3, ..., 64]
  result = result.replace(
    /\[\s*(?:\d+\s*,\s*){63}\d+\s*\]/g,
    () => {
      redacted++;
      return '[PRIVATE_KEY_ARRAY_REDACTED]';
    }
  );

  // Redact RPC URLs with credentials
  result = result.replace(
    /(https?:\/\/)([^:]+):([^@]+)@/g,
    () => {
      redacted++;
      return '$1[CREDENTIALS]@';
    }
  );

  return { text: result, count: redacted };
}

/**
 * Create a safe file preview for an allowed file path.
 */
export async function createSafeFilePreview(relPath: string): Promise<SolanaBuilderFilePreview | null> {
  if (!isAllowedPreviewPath(relPath)) {
    return null;
  }

  const result: ToolResult = await executeTool({ tool: 'fs.read_text', path: relPath });
  if (!result.ok || !result.data?.content) {
    return null;
  }

  const rawContent = result.data.content;
  const truncated = result.data.truncated ?? rawContent.length > MAX_PREVIEW_BYTES;

  // Limit lines
  const lines = rawContent.split('\n');
  const lineCount = lines.length;
  let previewLines = lines;
  if (lines.length > MAX_PREVIEW_LINES) {
    previewLines = lines.slice(0, MAX_PREVIEW_LINES);
  }

  const { text: redactedContent, count: redactionsApplied } = redactContent(previewLines.join('\n'));

  const safetyNotes: string[] = [];
  if (truncated) {
    safetyNotes.push(`File truncated to ${MAX_PREVIEW_LINES} lines / ${MAX_PREVIEW_BYTES} bytes.`);
  }
  if (redactionsApplied > 0) {
    safetyNotes.push(`${redactionsApplied} potential secret value(s) redacted.`);
  }
  safetyNotes.push('Preview is read-only. GORKH does not modify files.');

  return {
    relativePath: relPath,
    language: getBuilderFileLanguage(relPath),
    contentPreview: redactedContent,
    lineCount,
    truncated: lines.length > MAX_PREVIEW_LINES || truncated,
    redactionsApplied,
    safetyNotes,
  };
}

/**
 * Check if a file path is previewable without actually reading it.
 */
export function canPreviewFile(relPath: string): boolean {
  return isAllowedPreviewPath(relPath);
}
