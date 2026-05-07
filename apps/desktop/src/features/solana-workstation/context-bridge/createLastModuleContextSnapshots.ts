import {
  SolanaWorkstationContextSource,
  type SolanaAccountLookupResult,
  type SolanaBuilderContextSummary,
  type SolanaShieldRpcAnalysis,
  type SolanaSignatureLookupResult,
  type SolanaSimulationPreview,
  type SolanaWorkstationLastBuilderContext,
  type SolanaWorkstationLastShieldContext,
  type SolanaAddressLookupTableResolution,
} from '@gorkh/shared';

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function previewInput(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 96) return trimmed;
  return `${trimmed.slice(0, 48)}…${trimmed.slice(-24)}`;
}

function highestRisk(
  findings: SolanaShieldRpcAnalysis['riskFindings']
): SolanaWorkstationLastShieldContext['highestRiskLevel'] {
  const levels = findings.map((finding) =>
    typeof finding === 'object' && finding && 'level' in finding
      ? String((finding as { level?: unknown }).level)
      : ''
  );
  if (levels.includes('critical')) return 'critical';
  if (levels.includes('high')) return 'high';
  if (levels.includes('medium')) return 'medium';
  if (levels.includes('low')) return 'low';
  return undefined;
}

function riskTitle(finding: unknown): string | null {
  if (typeof finding !== 'object' || !finding || !('title' in finding)) return null;
  const title = (finding as { title?: unknown }).title;
  return typeof title === 'string' ? title : null;
}

function riskLevel(finding: unknown): string {
  if (typeof finding !== 'object' || !finding || !('level' in finding)) return '';
  const level = (finding as { level?: unknown }).level;
  return typeof level === 'string' ? level : '';
}

export function createLastShieldContextSnapshot(input: {
  analysis: SolanaShieldRpcAnalysis;
  decodedAvailable: boolean;
  accountLookup: SolanaAccountLookupResult | null;
  signatureLookup: SolanaSignatureLookupResult | null;
  simulationPreview: SolanaSimulationPreview | null;
  altResolutions: SolanaAddressLookupTableResolution[] | null;
}): SolanaWorkstationLastShieldContext {
  return {
    source: SolanaWorkstationContextSource.SHIELD,
    inputKind: input.analysis.inputKind,
    inputPreview: previewInput(input.analysis.input),
    inputHash: stableHash(input.analysis.input),
    network: input.analysis.network,
    summary: input.analysis.summary,
    decodedAvailable: input.decodedAvailable,
    riskFindingCount: input.analysis.riskFindings.length,
    highestRiskLevel: highestRisk(input.analysis.riskFindings),
    simulationAvailable: Boolean(input.simulationPreview),
    accountLookupAvailable: Boolean(input.accountLookup),
    signatureLookupAvailable: Boolean(input.signatureLookup),
    lookupTableResolutionCount: input.altResolutions?.length ?? 0,
    warnings: input.analysis.riskFindings
      .filter((finding) => riskLevel(finding) === 'high' || riskLevel(finding) === 'critical')
      .slice(0, 5)
      .map((finding) => riskTitle(finding))
      .filter((title): title is string => Boolean(title)),
    redactionsApplied: ['shield.inputPreview.truncated', 'shield.inputHash.only'],
    updatedAt: Date.now(),
    localOnly: true,
  };
}

function pathLabel(rootPath: string): string | undefined {
  if (!rootPath) return undefined;
  const normalized = rootPath.replace(/\\/g, '/').replace(/\/+$/, '');
  return normalized.split('/').pop() || '[workspace path redacted]';
}

export function createLastBuilderContextSnapshot(
  summary: SolanaBuilderContextSummary
): SolanaWorkstationLastBuilderContext {
  return {
    source: SolanaWorkstationContextSource.BUILDER,
    projectKind: summary.projectKind,
    packageManager: summary.packageManager,
    rootPathLabel: pathLabel(summary.rootPath),
    idlCount: summary.idls.length,
    instructionCount: summary.instructions.length,
    idlErrorCount: summary.errors.length,
    logFindingCount: countRecentLogFindings(summary.copyableMarkdown),
    toolchainAvailable: summary.toolchain.slice(0, 10),
    warnings: summary.warnings.slice(0, 10),
    recommendedNextChecks: summary.recommendedNextChecks.slice(0, 10),
    markdown: summary.copyableMarkdown.replace(summary.rootPath, '[workspace path redacted]'),
    redactionsApplied: [
      'builder.rootPath.labelOnly',
      'builder.secretFiles.excluded',
      'builder.envFiles.excluded',
      'builder.walletFiles.excluded',
    ],
    updatedAt: Date.now(),
    localOnly: true,
  };
}

function countRecentLogFindings(markdown: string): number {
  const start = markdown.indexOf('## Recent Log Findings');
  if (start < 0) return 0;
  const rest = markdown.slice(start);
  const nextSection = rest.slice(1).indexOf('\n## ');
  const section = nextSection >= 0 ? rest.slice(0, nextSection + 1) : rest;
  return section.split('\n').filter((line) => line.startsWith('- **')).length;
}
