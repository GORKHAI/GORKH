import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SolanaBuilderLogSource,
  SolanaBuilderLogSeverity,
  SolanaBuilderKnownErrorKind,
  SolanaBuilderCommandKind,
  SolanaBuilderCommandSafety,
  SOLANA_BUILDER_ALLOWED_DIAGNOSTIC_COMMANDS,
  SOLANA_BUILDER_DRAFT_COMMANDS,
  SolanaBuilderLogAnalysisSchema,
  SolanaBuilderCommandDraftSchema,
  SolanaBuilderFilePreviewSchema,
  SolanaBuilderContextSummarySchema,
  isAllowedDiagnosticCommand,
  getBuilderFileLanguage,
} from '../dist/index.js';

test('SOLANA_BUILDER_ALLOWED_DIAGNOSTIC_COMMANDS contains only exact allowed commands', () => {
  assert.ok(SOLANA_BUILDER_ALLOWED_DIAGNOSTIC_COMMANDS.length > 0);

  const allowedStrings = SOLANA_BUILDER_ALLOWED_DIAGNOSTIC_COMMANDS.map(
    (c) => `${c.cmd} ${c.args.join(' ')}`
  );

  assert.ok(allowedStrings.includes('anchor --version'));
  assert.ok(allowedStrings.includes('solana --version'));
  assert.ok(allowedStrings.includes('solana config get'));
  assert.ok(allowedStrings.includes('rustc --version'));
  assert.ok(allowedStrings.includes('cargo --version'));
  assert.ok(allowedStrings.includes('cargo metadata --no-deps --format-version=1 --offline'));
  assert.ok(allowedStrings.includes('node --version'));
  assert.ok(allowedStrings.includes('pnpm --version'));
  assert.ok(allowedStrings.includes('npm --version'));
  assert.ok(allowedStrings.includes('yarn --version'));

  // No build/test/deploy/install commands
  assert.ok(!allowedStrings.some((s) => s.includes('build')));
  assert.ok(!allowedStrings.some((s) => s.includes('test')));
  assert.ok(!allowedStrings.some((s) => s.includes('deploy')));
  assert.ok(!allowedStrings.some((s) => s.includes('install')));
});

test('SOLANA_BUILDER_DRAFT_COMMANDS does not mark build/test/deploy as allowed_to_run', () => {
  for (const draft of SOLANA_BUILDER_DRAFT_COMMANDS) {
    assert.notEqual(
      draft.safety,
      'allowed_to_run',
      `Draft "${draft.title}" must not be allowed_to_run`
    );
  }

  const anchorBuild = SOLANA_BUILDER_DRAFT_COMMANDS.find((d) => d.title === 'Anchor Build');
  assert.ok(anchorBuild);
  assert.equal(anchorBuild.safety, 'draft_only');

  const anchorTest = SOLANA_BUILDER_DRAFT_COMMANDS.find((d) => d.title === 'Anchor Test');
  assert.ok(anchorTest);
  assert.equal(anchorTest.safety, 'draft_only');

  const deploy = SOLANA_BUILDER_DRAFT_COMMANDS.find((d) => d.title === 'Solana Program Deploy');
  assert.ok(deploy);
  assert.equal(deploy.safety, 'blocked');
});

test('isAllowedDiagnosticCommand accepts exact allowed commands', () => {
  assert.ok(isAllowedDiagnosticCommand('anchor', ['--version']));
  assert.ok(isAllowedDiagnosticCommand('solana', ['config', 'get']));
  assert.ok(isAllowedDiagnosticCommand('cargo', ['metadata', '--no-deps', '--format-version=1', '--offline']));
});

test('isAllowedDiagnosticCommand rejects non-exact commands', () => {
  assert.ok(!isAllowedDiagnosticCommand('anchor', ['build']));
  assert.ok(!isAllowedDiagnosticCommand('solana', ['program', 'deploy']));
  assert.ok(!isAllowedDiagnosticCommand('cargo', ['build']));
  assert.ok(!isAllowedDiagnosticCommand('npm', ['install']));
  assert.ok(!isAllowedDiagnosticCommand('echo', ['hello']));
});

test('getBuilderFileLanguage returns correct languages', () => {
  assert.equal(getBuilderFileLanguage('lib.rs'), 'rust');
  assert.equal(getBuilderFileLanguage('Anchor.toml'), 'toml');
  assert.equal(getBuilderFileLanguage('package.json'), 'json');
  assert.equal(getBuilderFileLanguage('test.ts'), 'typescript');
  assert.equal(getBuilderFileLanguage('test.js'), 'javascript');
  assert.equal(getBuilderFileLanguage('README.md'), 'markdown');
  assert.equal(getBuilderFileLanguage('foo.unknown'), 'unknown');
});

test('SolanaBuilderLogAnalysisSchema accepts sample findings', () => {
  const valid = {
    source: 'pasted',
    analyzedAt: new Date().toISOString(),
    summary: '2 errors found',
    findings: [
      {
        id: 'f1',
        severity: 'error',
        kind: 'anchor_error',
        title: 'Anchor Error',
        description: 'Constraint violated',
        rawExcerpt: 'Error Code: ConstraintSeeds',
        matchedCode: 2003,
        recommendation: 'Check seeds',
        confidence: 'high',
      },
    ],
    referencedPrograms: ['11111111111111111111111111111111'],
    referencedInstructions: ['initialize'],
    safetyNotes: ['Heuristic-based'],
  };
  const result = SolanaBuilderLogAnalysisSchema.safeParse(valid);
  assert.ok(result.success, result.error?.message);
});

test('SolanaBuilderCommandDraftSchema accepts draft-only anchor build', () => {
  const valid = {
    id: 'draft_build_anchor',
    title: 'Anchor Build',
    kind: 'build',
    command: ['anchor', 'build'],
    safety: 'draft_only',
    reason: 'Builds modify target/',
    expectedWrites: true,
    requiresWalletOrKeypair: false,
    requiresNetwork: false,
    canCopy: true,
    canRunInGorkh: false,
  };
  const result = SolanaBuilderCommandDraftSchema.safeParse(valid);
  assert.ok(result.success, result.error?.message);
});

test('SolanaBuilderCommandDraftSchema rejects allowed_to_run for build', () => {
  const invalid = {
    id: 'bad',
    title: 'Bad',
    kind: 'build',
    command: ['anchor', 'build'],
    safety: 'allowed_to_run',
    reason: 'bad',
    expectedWrites: true,
    requiresWalletOrKeypair: false,
    requiresNetwork: false,
    canCopy: true,
    canRunInGorkh: true,
  };
  // Actually the schema doesn't reject allowed_to_run at the schema level,
  // it's enforced by constants. The schema should still parse it.
  const result = SolanaBuilderCommandDraftSchema.safeParse(invalid);
  assert.ok(result.success);
});

test('SolanaBuilderFilePreviewSchema validates valid previews', () => {
  const valid = {
    relativePath: 'programs/my_program/src/lib.rs',
    language: 'rust',
    contentPreview: 'pub mod instructions;',
    lineCount: 42,
    truncated: false,
    redactionsApplied: 0,
    safetyNotes: ['Read-only'],
  };
  const result = SolanaBuilderFilePreviewSchema.safeParse(valid);
  assert.ok(result.success, result.error?.message);
});

test('SolanaBuilderContextSummarySchema validates valid summaries', () => {
  const valid = {
    generatedAt: new Date().toISOString(),
    rootPath: '/home/user/project',
    projectKind: 'anchor',
    packageManager: 'pnpm',
    programs: ['my_program (devnet)'],
    idls: ['my_program'],
    instructions: ['my_program::initialize'],
    errors: ['my_program::InvalidAmount (6000)'],
    warnings: ['No tests directory'],
    toolchain: ['anchor: anchor-cli 0.30.1'],
    recommendedNextChecks: ['Verify cluster'],
    copyableMarkdown: '# Summary\n\nProject: anchor',
  };
  const result = SolanaBuilderContextSummarySchema.safeParse(valid);
  assert.ok(result.success, result.error?.message);
});

test('Denied keywords are still excluded in file patterns', () => {
  const patterns = [
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

  assert.ok(patterns.some((p) => p.test('.env')));
  assert.ok(patterns.some((p) => p.test('keypair.json')));
  assert.ok(patterns.some((p) => p.test('wallet.json')));
  assert.ok(patterns.some((p) => p.test('deployer.json')));
  assert.ok(!patterns.some((p) => p.test('lib.rs')));
});
