import {
  GorkhAgentMemoryKind,
  type GorkhAgentMemoryEntry,
} from '@gorkh/shared';

const REJECTION_PATTERNS: RegExp[] = [
  /\bprivate[\s_-]?key\b/i,
  /\bseed[\s_-]?phrase\b/i,
  /\bmnemonic\b/i,
  /\bviewing[\s_-]?key\b/i,
  /\bnote[\s_-]?secret\b/i,
  /zk_[A-Za-z0-9_-]{8,}/,
  /(^|[^a-z])sk_[A-Za-z0-9_-]{16,}/,
  /[1-9A-HJ-NP-Za-km-z]{32,44}\s*[:=]\s*\d/, // base58 key paired with index
];

export function detectSensitiveMemoryContent(content: string): string | null {
  for (const pattern of REJECTION_PATTERNS) {
    if (pattern.test(content)) {
      return `Memory rejected: looks like sensitive material (${pattern.source}).`;
    }
  }
  return null;
}

export function createMemoryEntry(input: {
  kind: GorkhAgentMemoryKind;
  title: string;
  content: string;
  tags?: string[];
  source?: string;
  sensitive?: boolean;
}): GorkhAgentMemoryEntry {
  const content = input.content.trim();
  const violation = detectSensitiveMemoryContent(content);
  if (violation) {
    throw new Error(violation);
  }
  const now = Date.now();
  return {
    id: `gorkh-memory-${now}-${Math.random().toString(36).slice(2, 8)}`,
    kind: input.kind,
    title: input.title.trim().slice(0, 140),
    content: content.slice(0, 4000),
    tags: (input.tags ?? []).slice(0, 16).map((t) => t.slice(0, 48)),
    source: (input.source ?? 'gorkh-agent').slice(0, 140),
    createdAt: now,
    updatedAt: now,
    localOnly: true,
    sensitive: input.sensitive ?? false,
  };
}
