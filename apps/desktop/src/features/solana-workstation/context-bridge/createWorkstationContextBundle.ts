import {
  SolanaWorkstationContextFormat,
  SolanaWorkstationContextSource,
  SOLANA_WORKSTATION_CONTEXT_SAFETY_NOTES,
  type SolanaWorkstationContextBundle,
  type SolanaWorkstationContextReference,
} from '@gorkh/shared';
import { sanitizeContextForExport } from './sanitizeContextForExport.js';

export interface WorkstationContextBundleInput {
  title: string;
  description: string;
  agentMarkdown?: string;
  builderMarkdown?: string;
  shieldMarkdown?: string;
  privateMarkdown?: string;
  zerionMarkdown?: string;
  references: SolanaWorkstationContextReference[];
}

export function createWorkstationContextBundle(
  input: WorkstationContextBundleInput
): SolanaWorkstationContextBundle {
  const now = Date.now();
  const sources: SolanaWorkstationContextSource[] = [];
  const parts: string[] = [];
  const redactions: string[] = [];

  if (input.agentMarkdown) {
    const sanitized = sanitizeContextForExport(input.agentMarkdown);
    parts.push(sanitized.text);
    sources.push(SolanaWorkstationContextSource.AGENT);
    redactions.push(...sanitized.redactionsApplied);
  }

  if (input.builderMarkdown) {
    const sanitized = sanitizeContextForExport(input.builderMarkdown);
    parts.push(sanitized.text);
    sources.push(SolanaWorkstationContextSource.BUILDER);
    redactions.push(...sanitized.redactionsApplied);
  }

  if (input.shieldMarkdown) {
    const sanitized = sanitizeContextForExport(input.shieldMarkdown);
    parts.push(sanitized.text);
    sources.push(SolanaWorkstationContextSource.SHIELD);
    redactions.push(...sanitized.redactionsApplied);
  }

  if (input.privateMarkdown) {
    const sanitized = sanitizeContextForExport(input.privateMarkdown);
    parts.push(sanitized.text);
    sources.push(SolanaWorkstationContextSource.PRIVATE);
    redactions.push(...sanitized.redactionsApplied);
  }

  if (input.zerionMarkdown) {
    const sanitized = sanitizeContextForExport(input.zerionMarkdown);
    parts.push(sanitized.text);
    sources.push(SolanaWorkstationContextSource.ZERION_AGENT);
    redactions.push(...sanitized.redactionsApplied);
  }

  const markdown = parts.join('\n\n---\n\n');
  const uniqueRedactions = Array.from(new Set(redactions));

  const jsonPreview = JSON.stringify(
    {
      title: input.title,
      description: input.description,
      sources,
      references: input.references.map((r) => ({
        id: r.id,
        kind: r.kind,
        title: r.title,
        sensitivity: r.sensitivity,
      })),
      redactionsApplied: uniqueRedactions,
      localOnly: true,
      createdAt: now,
    },
    null,
    2
  );

  return {
    id: `bundle-${now}`,
    title: input.title,
    description: input.description,
    format: SolanaWorkstationContextFormat.MARKDOWN,
    sources,
    references: input.references,
    markdown,
    jsonPreview,
    createdAt: now,
    localOnly: true,
    redactionsApplied: uniqueRedactions,
    safetyNotes: [
      ...SOLANA_WORKSTATION_CONTEXT_SAFETY_NOTES,
      'Paste this into the assistant manually for explanation or planning.',
      'Do not treat assistant output as approval to sign or execute.',
    ],
  };
}
