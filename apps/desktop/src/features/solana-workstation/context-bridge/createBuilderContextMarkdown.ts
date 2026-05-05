import { type SolanaBuilderContextSummary } from '@gorkh/shared';

export interface BuilderContextInput {
  summary: SolanaBuilderContextSummary | null;
}

export function createBuilderContextMarkdown(input: BuilderContextInput): string {
  const { summary } = input;
  const lines: string[] = [];

  lines.push('# GORKH Builder Context');
  lines.push('');
  lines.push('> **Sanitized summary only.** Full source code is not included.');
  lines.push('> Secret files, wallet paths, and .env files are excluded.');
  lines.push('');

  if (!summary) {
    lines.push('No builder workspace context is currently saved.');
    lines.push('');
    return lines.join('\n');
  }

  lines.push(`## Workspace`);
  lines.push(`- **Project Kind:** ${summary.projectKind}`);
  if (summary.packageManager) {
    lines.push(`- **Package Manager:** ${summary.packageManager}`);
  }
  lines.push('');

  if (summary.programs.length > 0) {
    lines.push(`## Programs`);
    for (const p of summary.programs) {
      lines.push(`- ${p}`);
    }
    lines.push('');
  }

  if (summary.idls.length > 0) {
    lines.push(`## IDLs`);
    for (const i of summary.idls) {
      lines.push(`- ${i}`);
    }
    lines.push('');
  }

  if (summary.instructions.length > 0) {
    lines.push(`## Instructions`);
    for (const i of summary.instructions) {
      lines.push(`- ${i}`);
    }
    lines.push('');
  }

  if (summary.errors.length > 0) {
    lines.push(`## Errors`);
    for (const e of summary.errors) {
      lines.push(`- ${e}`);
    }
    lines.push('');
  }

  if (summary.warnings.length > 0) {
    lines.push(`## Warnings`);
    for (const w of summary.warnings) {
      lines.push(`- ${w}`);
    }
    lines.push('');
  }

  if (summary.toolchain.length > 0) {
    lines.push(`## Toolchain`);
    for (const t of summary.toolchain) {
      lines.push(`- ${t}`);
    }
    lines.push('');
  }

  if (summary.recommendedNextChecks.length > 0) {
    lines.push(`## Recommended Next Checks`);
    for (const c of summary.recommendedNextChecks) {
      lines.push(`- ${c}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('*Builder context is a sanitized summary, not a full codebase export.*');
  lines.push('');

  return lines.join('\n');
}
