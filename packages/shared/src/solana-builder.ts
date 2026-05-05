import { z } from 'zod';

// ============================================================================
// Solana Builder — Shared Domain Types (Phase 4 + 5)
// ============================================================================
// Read-only local workspace inspector for Anchor/Solana/Rust/TypeScript
// projects. No execution, no signing, no deployment, no builds.
// ============================================================================

// ----------------------------------------------------------------------------
// Core Enums
// ----------------------------------------------------------------------------

export const SolanaBuilderProjectKind = {
  ANCHOR: 'anchor',
  SOLANA_RUST: 'solana_rust',
  RUST: 'rust',
  TYPESCRIPT: 'typescript',
  UNKNOWN: 'unknown',
} as const;
export type SolanaBuilderProjectKind =
  (typeof SolanaBuilderProjectKind)[keyof typeof SolanaBuilderProjectKind];

export const SolanaBuilderWorkspaceStatus = {
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error',
} as const;
export type SolanaBuilderWorkspaceStatus =
  (typeof SolanaBuilderWorkspaceStatus)[keyof typeof SolanaBuilderWorkspaceStatus];

export const SolanaBuilderToolName = {
  ANCHOR: 'anchor',
  SOLANA: 'solana',
  RUSTC: 'rustc',
  CARGO: 'cargo',
  NODE: 'node',
  PNPM: 'pnpm',
  NPM: 'npm',
  YARN: 'yarn',
} as const;
export type SolanaBuilderToolName =
  (typeof SolanaBuilderToolName)[keyof typeof SolanaBuilderToolName];

// ----------------------------------------------------------------------------
// Phase 5: Log Analysis Enums
// ----------------------------------------------------------------------------

export const SolanaBuilderLogSource = {
  PASTED: 'pasted',
  FILE_PREVIEW: 'file_preview',
  TERMINAL_OUTPUT: 'terminal_output',
  UNKNOWN: 'unknown',
} as const;
export type SolanaBuilderLogSource =
  (typeof SolanaBuilderLogSource)[keyof typeof SolanaBuilderLogSource];

export const SolanaBuilderLogSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
} as const;
export type SolanaBuilderLogSeverity =
  (typeof SolanaBuilderLogSeverity)[keyof typeof SolanaBuilderLogSeverity];

export const SolanaBuilderKnownErrorKind = {
  ANCHOR_ERROR: 'anchor_error',
  ANCHOR_CONSTRAINT_ERROR: 'anchor_constraint_error',
  CUSTOM_PROGRAM_ERROR: 'custom_program_error',
  PROGRAM_LOG_ERROR: 'program_log_error',
  INSTRUCTION_ERROR: 'instruction_error',
  ACCOUNT_NOT_FOUND: 'account_not_found',
  ACCOUNT_OWNED_BY_WRONG_PROGRAM: 'account_owned_by_wrong_program',
  SIGNATURE_MISSING: 'signature_missing',
  INSUFFICIENT_FUNDS: 'insufficient_funds',
  BLOCKHASH_NOT_FOUND: 'blockhash_not_found',
  COMPUTE_BUDGET_EXCEEDED: 'compute_budget_exceeded',
  IDL_ERROR_MATCH: 'idl_error_match',
  TOOLCHAIN_ERROR: 'toolchain_error',
  UNKNOWN: 'unknown',
} as const;
export type SolanaBuilderKnownErrorKind =
  (typeof SolanaBuilderKnownErrorKind)[keyof typeof SolanaBuilderKnownErrorKind];

export const SolanaBuilderCommandKind = {
  VERSION_CHECK: 'version_check',
  CONFIG_CHECK: 'config_check',
  METADATA_CHECK: 'metadata_check',
  BUILD: 'build',
  TEST: 'test',
  DEPLOY: 'deploy',
  LOCAL_VALIDATOR: 'local_validator',
  INSTALL: 'install',
  CUSTOM: 'custom',
} as const;
export type SolanaBuilderCommandKind =
  (typeof SolanaBuilderCommandKind)[keyof typeof SolanaBuilderCommandKind];

export const SolanaBuilderCommandSafety = {
  ALLOWED_TO_RUN: 'allowed_to_run',
  DRAFT_ONLY: 'draft_only',
  BLOCKED: 'blocked',
} as const;
export type SolanaBuilderCommandSafety =
  (typeof SolanaBuilderCommandSafety)[keyof typeof SolanaBuilderCommandSafety];

// ----------------------------------------------------------------------------
// Zod Schemas
// ----------------------------------------------------------------------------

export const SolanaBuilderProjectKindSchema = z.enum([
  SolanaBuilderProjectKind.ANCHOR,
  SolanaBuilderProjectKind.SOLANA_RUST,
  SolanaBuilderProjectKind.RUST,
  SolanaBuilderProjectKind.TYPESCRIPT,
  SolanaBuilderProjectKind.UNKNOWN,
]);

export const SolanaBuilderWorkspaceStatusSchema = z.enum([
  SolanaBuilderWorkspaceStatus.IDLE,
  SolanaBuilderWorkspaceStatus.LOADING,
  SolanaBuilderWorkspaceStatus.READY,
  SolanaBuilderWorkspaceStatus.ERROR,
]);

export const SolanaBuilderToolNameSchema = z.enum([
  SolanaBuilderToolName.ANCHOR,
  SolanaBuilderToolName.SOLANA,
  SolanaBuilderToolName.RUSTC,
  SolanaBuilderToolName.CARGO,
  SolanaBuilderToolName.NODE,
  SolanaBuilderToolName.PNPM,
  SolanaBuilderToolName.NPM,
  SolanaBuilderToolName.YARN,
]);

export const SolanaBuilderToolStatusSchema = z.object({
  tool: SolanaBuilderToolNameSchema,
  available: z.boolean(),
  version: z.string().optional(),
  error: z.string().optional(),
  checkedAt: z.string().optional(),
});

export const SolanaBuilderWorkspaceSummarySchema = z.object({
  rootPath: z.string().min(1),
  projectKind: SolanaBuilderProjectKindSchema,
  detectedPackageManager: z.enum(['pnpm', 'npm', 'yarn', 'bun', 'unknown']).optional(),
  hasAnchorToml: z.boolean(),
  hasCargoToml: z.boolean(),
  hasPackageJson: z.boolean(),
  hasProgramsDir: z.boolean(),
  hasTestsDir: z.boolean(),
  hasMigrationsDir: z.boolean(),
  hasTargetIdlDir: z.boolean(),
  detectedAt: z.string(),
  warnings: z.array(z.string()),
});

export const SolanaAnchorTomlProgramEntrySchema = z.object({
  cluster: z.string(),
  programName: z.string(),
  programId: z.string(),
});

export const SolanaAnchorTomlScriptEntrySchema = z.object({
  name: z.string(),
  commandPreview: z.string(),
});

export const SolanaAnchorTomlSummarySchema = z.object({
  providerCluster: z.string().optional(),
  providerWalletPathPresent: z.boolean(),
  providerWalletPathRedacted: z.string().optional(),
  programsByCluster: z.array(SolanaAnchorTomlProgramEntrySchema),
  scripts: z.array(SolanaAnchorTomlScriptEntrySchema),
});

// IDL schemas (read-only inspection)

export const SolanaBuilderIdlAccountFieldSchema = z.object({
  name: z.string(),
  type: z.unknown(),
  docs: z.array(z.string()).optional(),
});

export const SolanaBuilderIdlAccountSchema = z.object({
  name: z.string(),
  docs: z.array(z.string()).optional(),
  type: z.object({
    kind: z.literal('struct'),
    fields: z.array(SolanaBuilderIdlAccountFieldSchema).optional(),
  }),
});

export const SolanaBuilderIdlInstructionArgSchema = z.object({
  name: z.string(),
  type: z.unknown(),
});

export const SolanaBuilderIdlInstructionAccountSchema = z.object({
  name: z.string(),
  isMut: z.boolean().optional(),
  isSigner: z.boolean().optional(),
  docs: z.array(z.string()).optional(),
  pda: z.unknown().optional(),
  relations: z.array(z.string()).optional(),
});

export const SolanaBuilderIdlInstructionSchema = z.object({
  name: z.string(),
  docs: z.array(z.string()).optional(),
  accounts: z.array(SolanaBuilderIdlInstructionAccountSchema),
  args: z.array(SolanaBuilderIdlInstructionArgSchema),
  returns: z.unknown().optional(),
});

export const SolanaBuilderIdlErrorSchema = z.object({
  code: z.number(),
  name: z.string(),
  msg: z.string(),
});

export const SolanaBuilderIdlEventSchema = z.object({
  name: z.string(),
  fields: z.array(
    z.object({
      name: z.string(),
      type: z.unknown(),
      index: z.boolean().optional(),
    })
  ),
});

export const SolanaBuilderIdlTypeDefSchema = z.object({
  name: z.string(),
  type: z.unknown(),
  docs: z.array(z.string()).optional(),
});

export const SolanaBuilderIdlSummarySchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  spec: z.string().optional(),
  description: z.string().optional(),
  instructions: z.array(SolanaBuilderIdlInstructionSchema),
  accounts: z.array(SolanaBuilderIdlAccountSchema),
  errors: z.array(SolanaBuilderIdlErrorSchema),
  events: z.array(SolanaBuilderIdlEventSchema).optional(),
  types: z.array(SolanaBuilderIdlTypeDefSchema).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  sourcePath: z.string().optional(),
});

// ----------------------------------------------------------------------------
// Phase 5: Log Analysis Schemas
// ----------------------------------------------------------------------------

export const SolanaBuilderLogSourceSchema = z.enum([
  SolanaBuilderLogSource.PASTED,
  SolanaBuilderLogSource.FILE_PREVIEW,
  SolanaBuilderLogSource.TERMINAL_OUTPUT,
  SolanaBuilderLogSource.UNKNOWN,
]);

export const SolanaBuilderLogSeveritySchema = z.enum([
  SolanaBuilderLogSeverity.INFO,
  SolanaBuilderLogSeverity.WARNING,
  SolanaBuilderLogSeverity.ERROR,
  SolanaBuilderLogSeverity.CRITICAL,
]);

export const SolanaBuilderKnownErrorKindSchema = z.enum([
  SolanaBuilderKnownErrorKind.ANCHOR_ERROR,
  SolanaBuilderKnownErrorKind.ANCHOR_CONSTRAINT_ERROR,
  SolanaBuilderKnownErrorKind.CUSTOM_PROGRAM_ERROR,
  SolanaBuilderKnownErrorKind.PROGRAM_LOG_ERROR,
  SolanaBuilderKnownErrorKind.INSTRUCTION_ERROR,
  SolanaBuilderKnownErrorKind.ACCOUNT_NOT_FOUND,
  SolanaBuilderKnownErrorKind.ACCOUNT_OWNED_BY_WRONG_PROGRAM,
  SolanaBuilderKnownErrorKind.SIGNATURE_MISSING,
  SolanaBuilderKnownErrorKind.INSUFFICIENT_FUNDS,
  SolanaBuilderKnownErrorKind.BLOCKHASH_NOT_FOUND,
  SolanaBuilderKnownErrorKind.COMPUTE_BUDGET_EXCEEDED,
  SolanaBuilderKnownErrorKind.IDL_ERROR_MATCH,
  SolanaBuilderKnownErrorKind.TOOLCHAIN_ERROR,
  SolanaBuilderKnownErrorKind.UNKNOWN,
]);

export const SolanaBuilderLogFindingSchema = z.object({
  id: z.string().min(1),
  severity: SolanaBuilderLogSeveritySchema,
  kind: SolanaBuilderKnownErrorKindSchema,
  title: z.string().min(1),
  description: z.string(),
  rawExcerpt: z.string().optional(),
  matchedCode: z.number().optional(),
  matchedHexCode: z.string().optional(),
  matchedIdlErrorName: z.string().optional(),
  matchedInstructionName: z.string().optional(),
  recommendation: z.string(),
  confidence: z.enum(['low', 'medium', 'high']),
});

export const SolanaBuilderLogAnalysisSchema = z.object({
  source: SolanaBuilderLogSourceSchema,
  analyzedAt: z.string(),
  summary: z.string(),
  findings: z.array(SolanaBuilderLogFindingSchema),
  referencedPrograms: z.array(z.string()),
  referencedInstructions: z.array(z.string()),
  safetyNotes: z.array(z.string()),
});

// Phase 5: Command Draft Schemas

export const SolanaBuilderCommandKindSchema = z.enum([
  SolanaBuilderCommandKind.VERSION_CHECK,
  SolanaBuilderCommandKind.CONFIG_CHECK,
  SolanaBuilderCommandKind.METADATA_CHECK,
  SolanaBuilderCommandKind.BUILD,
  SolanaBuilderCommandKind.TEST,
  SolanaBuilderCommandKind.DEPLOY,
  SolanaBuilderCommandKind.LOCAL_VALIDATOR,
  SolanaBuilderCommandKind.INSTALL,
  SolanaBuilderCommandKind.CUSTOM,
]);

export const SolanaBuilderCommandSafetySchema = z.enum([
  SolanaBuilderCommandSafety.ALLOWED_TO_RUN,
  SolanaBuilderCommandSafety.DRAFT_ONLY,
  SolanaBuilderCommandSafety.BLOCKED,
]);

export const SolanaBuilderCommandDraftSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  kind: SolanaBuilderCommandKindSchema,
  command: z.array(z.string()),
  workingDirectory: z.string().optional(),
  safety: SolanaBuilderCommandSafetySchema,
  reason: z.string(),
  expectedWrites: z.boolean(),
  requiresWalletOrKeypair: z.boolean(),
  requiresNetwork: z.boolean(),
  warning: z.string().optional(),
  canCopy: z.boolean(),
  canRunInGorkh: z.boolean(),
});

// Phase 5: File Preview Schema

export const SolanaBuilderFilePreviewSchema = z.object({
  relativePath: z.string().min(1),
  language: z.enum(['rust', 'toml', 'json', 'typescript', 'javascript', 'markdown', 'text', 'unknown']),
  contentPreview: z.string(),
  lineCount: z.number().int().nonnegative(),
  truncated: z.boolean(),
  redactionsApplied: z.number().int().nonnegative(),
  safetyNotes: z.array(z.string()),
});

// Phase 5: Context Summary Schema

export const SolanaBuilderContextSummarySchema = z.object({
  generatedAt: z.string(),
  rootPath: z.string(),
  projectKind: SolanaBuilderProjectKindSchema,
  packageManager: z.string().optional(),
  programs: z.array(z.string()),
  idls: z.array(z.string()),
  instructions: z.array(z.string()),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  toolchain: z.array(z.string()),
  recommendedNextChecks: z.array(z.string()),
  copyableMarkdown: z.string(),
});

// ----------------------------------------------------------------------------
// Inferred Types
// ----------------------------------------------------------------------------

export type SolanaBuilderToolStatus = z.infer<typeof SolanaBuilderToolStatusSchema>;
export type SolanaBuilderWorkspaceSummary = z.infer<typeof SolanaBuilderWorkspaceSummarySchema>;
export type SolanaAnchorTomlSummary = z.infer<typeof SolanaAnchorTomlSummarySchema>;
export type SolanaAnchorTomlProgramEntry = z.infer<typeof SolanaAnchorTomlProgramEntrySchema>;
export type SolanaAnchorTomlScriptEntry = z.infer<typeof SolanaAnchorTomlScriptEntrySchema>;
export type SolanaBuilderIdlSummary = z.infer<typeof SolanaBuilderIdlSummarySchema>;
export type SolanaBuilderIdlInstruction = z.infer<typeof SolanaBuilderIdlInstructionSchema>;
export type SolanaBuilderIdlAccount = z.infer<typeof SolanaBuilderIdlAccountSchema>;
export type SolanaBuilderIdlError = z.infer<typeof SolanaBuilderIdlErrorSchema>;
export type SolanaBuilderIdlEvent = z.infer<typeof SolanaBuilderIdlEventSchema>;

// Phase 5 inferred types
export type SolanaBuilderLogFinding = z.infer<typeof SolanaBuilderLogFindingSchema>;
export type SolanaBuilderLogAnalysis = z.infer<typeof SolanaBuilderLogAnalysisSchema>;
export type SolanaBuilderCommandDraft = z.infer<typeof SolanaBuilderCommandDraftSchema>;
export type SolanaBuilderFilePreview = z.infer<typeof SolanaBuilderFilePreviewSchema>;
export type SolanaBuilderContextSummary = z.infer<typeof SolanaBuilderContextSummarySchema>;

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

export const ALLOWED_BUILDER_VERSION_TOOLS: SolanaBuilderToolName[] = [
  SolanaBuilderToolName.ANCHOR,
  SolanaBuilderToolName.SOLANA,
  SolanaBuilderToolName.RUSTC,
  SolanaBuilderToolName.CARGO,
  SolanaBuilderToolName.NODE,
  SolanaBuilderToolName.PNPM,
  SolanaBuilderToolName.NPM,
  SolanaBuilderToolName.YARN,
];

/** Directories that should never be recursively scanned. */
export const BUILDER_EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'target',
  'dist',
  'build',
  'coverage',
  '.next',
  '.turbo',
  '.anchor',
  '.vercel',
]);

/** File patterns that should never be read. */
export const BUILDER_EXCLUDED_FILE_PATTERNS = [
  /^\.env/,
  /\.pem$/,
  /\.key$/,
  /\.secret$/,
  /keypair/,
  /id\.json$/,
  /wallet.*\.json$/,
  /deployer.*\.json$/,
  /\.gitignore$/,
];

// Phase 5 constants

/** Allowed diagnostic commands with exact args. Never build/test/deploy/install. */
export const SOLANA_BUILDER_ALLOWED_DIAGNOSTIC_COMMANDS: Array<{ cmd: string; args: string[] }> = [
  { cmd: 'anchor', args: ['--version'] },
  { cmd: 'solana', args: ['--version'] },
  { cmd: 'solana', args: ['config', 'get'] },
  { cmd: 'rustc', args: ['--version'] },
  { cmd: 'cargo', args: ['--version'] },
  { cmd: 'cargo', args: ['metadata', '--no-deps', '--format-version=1', '--offline'] },
  { cmd: 'node', args: ['--version'] },
  { cmd: 'pnpm', args: ['--version'] },
  { cmd: 'npm', args: ['--version'] },
  { cmd: 'yarn', args: ['--version'] },
];

/** Draft-only command templates. Never allowed_to_run in this phase. */
export const SOLANA_BUILDER_DRAFT_COMMANDS: Array<{
  title: string;
  kind: SolanaBuilderCommandKind;
  command: string[];
  safety: SolanaBuilderCommandSafety;
  reason: string;
  expectedWrites: boolean;
  requiresWalletOrKeypair: boolean;
  requiresNetwork: boolean;
  warning?: string;
}> = [
  {
    title: 'Anchor Build',
    kind: SolanaBuilderCommandKind.BUILD,
    command: ['anchor', 'build'],
    safety: SolanaBuilderCommandSafety.DRAFT_ONLY,
    reason: 'Build commands compile artifacts and modify target/ directory.',
    expectedWrites: true,
    requiresWalletOrKeypair: false,
    requiresNetwork: false,
    warning: 'Builder v0.2 does not run build commands. Copy and run in your own terminal.',
  },
  {
    title: 'Anchor Test',
    kind: SolanaBuilderCommandKind.TEST,
    command: ['anchor', 'test'],
    safety: SolanaBuilderCommandSafety.DRAFT_ONLY,
    reason: 'Test commands execute project code and may start local validators.',
    expectedWrites: true,
    requiresWalletOrKeypair: true,
    requiresNetwork: false,
    warning: 'Builder v0.2 does not run test commands. Copy and run in your own terminal.',
  },
  {
    title: 'Cargo Build',
    kind: SolanaBuilderCommandKind.BUILD,
    command: ['cargo', 'build'],
    safety: SolanaBuilderCommandSafety.DRAFT_ONLY,
    reason: 'Build commands compile artifacts and modify target/ directory.',
    expectedWrites: true,
    requiresWalletOrKeypair: false,
    requiresNetwork: false,
    warning: 'Builder v0.2 does not run build commands. Copy and run in your own terminal.',
  },
  {
    title: 'Cargo Test',
    kind: SolanaBuilderCommandKind.TEST,
    command: ['cargo', 'test'],
    safety: SolanaBuilderCommandSafety.DRAFT_ONLY,
    reason: 'Test commands execute project code.',
    expectedWrites: false,
    requiresWalletOrKeypair: false,
    requiresNetwork: false,
    warning: 'Builder v0.2 does not run test commands. Copy and run in your own terminal.',
  },
  {
    title: 'Start Local Validator',
    kind: SolanaBuilderCommandKind.LOCAL_VALIDATOR,
    command: ['solana-test-validator'],
    safety: SolanaBuilderCommandSafety.DRAFT_ONLY,
    reason: 'Local validator spawns a background process and writes ledger data.',
    expectedWrites: true,
    requiresWalletOrKeypair: false,
    requiresNetwork: false,
    warning: 'Builder v0.2 does not run validators. Copy and run in your own terminal.',
  },
  {
    title: 'Solana Program Deploy',
    kind: SolanaBuilderCommandKind.DEPLOY,
    command: ['solana', 'program', 'deploy', 'target/deploy/<program>.so'],
    safety: SolanaBuilderCommandSafety.BLOCKED,
    reason: 'Deployment executes transactions on-chain and requires a funded keypair.',
    expectedWrites: false,
    requiresWalletOrKeypair: true,
    requiresNetwork: true,
    warning: 'Deployment is intentionally blocked in GORKH Builder v0.2.',
  },
];

// ----------------------------------------------------------------------------
// Utility Guards
// ----------------------------------------------------------------------------

export function isSolanaBuilderProjectKind(value: unknown): value is SolanaBuilderProjectKind {
  return (
    typeof value === 'string' &&
    Object.values(SolanaBuilderProjectKind).includes(value as SolanaBuilderProjectKind)
  );
}

export function isSolanaBuilderToolName(value: unknown): value is SolanaBuilderToolName {
  return (
    typeof value === 'string' &&
    Object.values(SolanaBuilderToolName).includes(value as SolanaBuilderToolName)
  );
}

export function isAllowedBuilderVersionTool(tool: string): tool is SolanaBuilderToolName {
  return isSolanaBuilderToolName(tool) && ALLOWED_BUILDER_VERSION_TOOLS.includes(tool);
}

/** Check if a directory name is in the exclusion list. */
export function isExcludedBuilderDir(name: string): boolean {
  return BUILDER_EXCLUDED_DIRS.has(name);
}

/** Check if a file path matches any excluded pattern. */
export function isExcludedBuilderFile(path: string): boolean {
  const lower = path.toLowerCase();
  return BUILDER_EXCLUDED_FILE_PATTERNS.some((pattern) => pattern.test(lower));
}

/** Get the version command args for a given tool. */
export function getBuilderVersionCommandArgs(
  tool: SolanaBuilderToolName
): { cmd: string; args: string[] } {
  switch (tool) {
    case SolanaBuilderToolName.ANCHOR:
      return { cmd: 'anchor', args: ['--version'] };
    case SolanaBuilderToolName.SOLANA:
      return { cmd: 'solana', args: ['--version'] };
    case SolanaBuilderToolName.RUSTC:
      return { cmd: 'rustc', args: ['--version'] };
    case SolanaBuilderToolName.CARGO:
      return { cmd: 'cargo', args: ['--version'] };
    case SolanaBuilderToolName.NODE:
      return { cmd: 'node', args: ['--version'] };
    case SolanaBuilderToolName.PNPM:
      return { cmd: 'pnpm', args: ['--version'] };
    case SolanaBuilderToolName.NPM:
      return { cmd: 'npm', args: ['--version'] };
    case SolanaBuilderToolName.YARN:
      return { cmd: 'yarn', args: ['--version'] };
    default:
      throw new Error(`Unknown builder tool: ${tool}`);
  }
}

/** Labels for tool names. */
export function getBuilderToolLabel(tool: SolanaBuilderToolName): string {
  const labels: Record<SolanaBuilderToolName, string> = {
    anchor: 'Anchor',
    solana: 'Solana CLI',
    rustc: 'Rustc',
    cargo: 'Cargo',
    node: 'Node.js',
    pnpm: 'pnpm',
    npm: 'npm',
    yarn: 'Yarn',
  };
  return labels[tool] ?? tool;
}

/** Labels for project kinds. */
export function getBuilderProjectKindLabel(kind: SolanaBuilderProjectKind): string {
  const labels: Record<SolanaBuilderProjectKind, string> = {
    anchor: 'Anchor Workspace',
    solana_rust: 'Solana Rust Program',
    rust: 'Rust Project',
    typescript: 'TypeScript Project',
    unknown: 'Unknown Project',
  };
  return labels[kind] ?? kind;
}

// Phase 5 helpers

/** Check if a command is in the allowed diagnostic list. */
export function isAllowedDiagnosticCommand(cmd: string, args: string[]): boolean {
  return SOLANA_BUILDER_ALLOWED_DIAGNOSTIC_COMMANDS.some(
    (allowed) => allowed.cmd === cmd && arraysEqual(allowed.args, args)
  );
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, i) => val === b[i]);
}

/** Get language from file extension. */
export function getBuilderFileLanguage(path: string): SolanaBuilderFilePreview['language'] {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'rs': return 'rust';
    case 'toml': return 'toml';
    case 'json': return 'json';
    case 'ts': return 'typescript';
    case 'js': return 'javascript';
    case 'md': return 'markdown';
    case 'txt': return 'text';
    default: return 'unknown';
  }
}
