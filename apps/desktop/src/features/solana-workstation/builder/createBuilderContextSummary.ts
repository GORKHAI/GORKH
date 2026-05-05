import {
  type SolanaBuilderContextSummary,
  type SolanaBuilderWorkspaceSummary,
  type SolanaAnchorTomlSummary,
  type SolanaBuilderIdlSummary,
  type SolanaBuilderToolStatus,
  type SolanaBuilderLogAnalysis,
  getBuilderProjectKindLabel,
} from '@gorkh/shared';

// ============================================================================
// Builder Context Summary — Phase 5
// ============================================================================
// Generates a copyable markdown summary for AI debugging assistance.
// Excludes all secret material.
// ============================================================================

export function createBuilderContextSummary(
  workspace: SolanaBuilderWorkspaceSummary | null,
  anchorToml: SolanaAnchorTomlSummary | null,
  idls: SolanaBuilderIdlSummary[],
  toolchain: SolanaBuilderToolStatus[],
  logAnalysis?: SolanaBuilderLogAnalysis | null
): SolanaBuilderContextSummary {
  const programs: string[] = [];
  const idlNames: string[] = [];
  const instructionNames: string[] = [];
  const errorNames: string[] = [];
  const warnings: string[] = [];
  const recommendedNextChecks: string[] = [];

  if (workspace) {
    if (workspace.hasAnchorToml) {
      recommendedNextChecks.push('Verify Anchor.toml cluster matches your intended network.');
    }
    if (workspace.hasProgramsDir) {
      recommendedNextChecks.push('Review program source for constraint correctness.');
    }
    if (!workspace.hasTestsDir) {
      warnings.push('No tests directory detected.');
    }
  }

  if (anchorToml) {
    for (const p of anchorToml.programsByCluster) {
      programs.push(`${p.programName} (${p.cluster})`);
    }
  }

  for (const idl of idls) {
    idlNames.push(idl.name);
    for (const inst of idl.instructions) {
      instructionNames.push(`${idl.name}::${inst.name}`);
    }
    for (const err of idl.errors) {
      errorNames.push(`${idl.name}::${err.name} (${err.code})`);
    }
  }

  const toolchainLines = toolchain
    .filter((t) => t.available)
    .map((t) => `- ${t.tool}: ${t.version}`);

  const logFindings = logAnalysis?.findings ?? [];
  const logSection =
    logFindings.length > 0
      ? `\n## Recent Log Findings\n${logFindings
          .map(
            (f) =>
              `- **${f.title}** (${f.severity})\n  - ${f.description}\n  - Recommendation: ${f.recommendation}`
          )
          .join('\n')}`
      : '';

  const copyableMarkdown = [
    '# GORKH Builder Context Summary',
    '',
    `**Project:** ${workspace ? getBuilderProjectKindLabel(workspace.projectKind) : 'Unknown'}`,
    `**Package Manager:** ${workspace?.detectedPackageManager ?? 'unknown'}`,
    `**Cluster:** ${anchorToml?.providerCluster ?? 'unknown'}`,
    '',
    '## Programs',
    programs.length > 0 ? programs.map((p) => `- ${p}`).join('\n') : '- None detected',
    '',
    '## IDLs',
    idlNames.length > 0 ? idlNames.map((n) => `- ${n}`).join('\n') : '- None detected',
    '',
    '## Instructions',
    instructionNames.length > 0
      ? instructionNames.map((i) => `- ${i}`).join('\n')
      : '- None detected',
    '',
    '## IDL Errors',
    errorNames.length > 0
      ? errorNames.map((e) => `- ${e}`).join('\n')
      : '- None detected',
    '',
    '## Toolchain',
    toolchainLines.length > 0 ? toolchainLines.join('\n') : '- Not checked',
    '',
    '## Warnings',
    warnings.length > 0 ? warnings.map((w) => `- ${w}`).join('\n') : '- None',
    '',
    '## Recommended Next Checks',
    recommendedNextChecks.length > 0
      ? recommendedNextChecks.map((c) => `- ${c}`).join('\n')
      : '- None',
    logSection,
    '',
    '> **Safety Note:** This context excludes private key files, .env files, wallet files, and secret material.',
  ].join('\n');

  return {
    generatedAt: new Date().toISOString(),
    rootPath: workspace?.rootPath ?? '',
    projectKind: workspace?.projectKind ?? 'unknown',
    packageManager: workspace?.detectedPackageManager,
    programs,
    idls: idlNames,
    instructions: instructionNames,
    errors: errorNames,
    warnings,
    toolchain: toolchain.filter((t) => t.available).map((t) => `${t.tool}: ${t.version}`),
    recommendedNextChecks,
    copyableMarkdown,
  };
}
