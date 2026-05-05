import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SolanaBuilderProjectKind,
  SolanaBuilderWorkspaceStatus,
  SolanaBuilderToolName,
  ALLOWED_BUILDER_VERSION_TOOLS,
  BUILDER_EXCLUDED_DIRS,
  BUILDER_EXCLUDED_FILE_PATTERNS,
  isSolanaBuilderProjectKind,
  isSolanaBuilderToolName,
  isAllowedBuilderVersionTool,
  isExcludedBuilderDir,
  isExcludedBuilderFile,
  getBuilderVersionCommandArgs,
  getBuilderToolLabel,
  getBuilderProjectKindLabel,
  SolanaBuilderWorkspaceSummarySchema,
  SolanaAnchorTomlSummarySchema,
  SolanaBuilderIdlSummarySchema,
  SolanaBuilderToolStatusSchema,
} from '../dist/index.js';

test('SolanaBuilderProjectKind constants are defined', () => {
  assert.equal(SolanaBuilderProjectKind.ANCHOR, 'anchor');
  assert.equal(SolanaBuilderProjectKind.SOLANA_RUST, 'solana_rust');
  assert.equal(SolanaBuilderProjectKind.RUST, 'rust');
  assert.equal(SolanaBuilderProjectKind.TYPESCRIPT, 'typescript');
  assert.equal(SolanaBuilderProjectKind.UNKNOWN, 'unknown');
});

test('isSolanaBuilderProjectKind validates correctly', () => {
  assert.ok(isSolanaBuilderProjectKind('anchor'));
  assert.ok(isSolanaBuilderProjectKind('rust'));
  assert.ok(!isSolanaBuilderProjectKind('random'));
  assert.ok(!isSolanaBuilderProjectKind(123));
});

test('SolanaBuilderWorkspaceStatus constants are defined', () => {
  assert.equal(SolanaBuilderWorkspaceStatus.IDLE, 'idle');
  assert.equal(SolanaBuilderWorkspaceStatus.LOADING, 'loading');
  assert.equal(SolanaBuilderWorkspaceStatus.READY, 'ready');
  assert.equal(SolanaBuilderWorkspaceStatus.ERROR, 'error');
});

test('SolanaBuilderToolName constants are defined', () => {
  assert.equal(SolanaBuilderToolName.ANCHOR, 'anchor');
  assert.equal(SolanaBuilderToolName.SOLANA, 'solana');
  assert.equal(SolanaBuilderToolName.RUSTC, 'rustc');
  assert.equal(SolanaBuilderToolName.CARGO, 'cargo');
  assert.equal(SolanaBuilderToolName.NODE, 'node');
  assert.equal(SolanaBuilderToolName.PNPM, 'pnpm');
  assert.equal(SolanaBuilderToolName.NPM, 'npm');
  assert.equal(SolanaBuilderToolName.YARN, 'yarn');
});

test('ALLOWED_BUILDER_VERSION_TOOLS contains all expected tools', () => {
  assert.equal(ALLOWED_BUILDER_VERSION_TOOLS.length, 8);
  assert.ok(ALLOWED_BUILDER_VERSION_TOOLS.includes('anchor'));
  assert.ok(ALLOWED_BUILDER_VERSION_TOOLS.includes('solana'));
  assert.ok(ALLOWED_BUILDER_VERSION_TOOLS.includes('rustc'));
  assert.ok(ALLOWED_BUILDER_VERSION_TOOLS.includes('cargo'));
  assert.ok(ALLOWED_BUILDER_VERSION_TOOLS.includes('node'));
  assert.ok(ALLOWED_BUILDER_VERSION_TOOLS.includes('pnpm'));
  assert.ok(ALLOWED_BUILDER_VERSION_TOOLS.includes('npm'));
  assert.ok(ALLOWED_BUILDER_VERSION_TOOLS.includes('yarn'));
});

test('isAllowedBuilderVersionTool validates correctly', () => {
  assert.ok(isAllowedBuilderVersionTool('anchor'));
  assert.ok(isAllowedBuilderVersionTool('cargo'));
  assert.ok(!isAllowedBuilderVersionTool('python'));
  assert.ok(!isAllowedBuilderVersionTool(''));
});

test('isExcludedBuilderDir blocks sensitive directories', () => {
  assert.ok(isExcludedBuilderDir('node_modules'));
  assert.ok(isExcludedBuilderDir('.git'));
  assert.ok(isExcludedBuilderDir('target'));
  assert.ok(isExcludedBuilderDir('dist'));
  assert.ok(!isExcludedBuilderDir('src'));
  assert.ok(!isExcludedBuilderDir('programs'));
});

test('isExcludedBuilderFile blocks sensitive files', () => {
  assert.ok(isExcludedBuilderFile('.env'));
  assert.ok(isExcludedBuilderFile('.env.local'));
  assert.ok(isExcludedBuilderFile('key.pem'));
  assert.ok(isExcludedBuilderFile('private.key'));
  assert.ok(isExcludedBuilderFile('my.secret'));
  assert.ok(isExcludedBuilderFile('id.json'));
  assert.ok(isExcludedBuilderFile('wallet-keypair.json'));
  assert.ok(!isExcludedBuilderFile('Anchor.toml'));
  assert.ok(!isExcludedBuilderFile('lib.rs'));
});

test('getBuilderVersionCommandArgs returns correct commands', () => {
  const anchor = getBuilderVersionCommandArgs('anchor');
  assert.equal(anchor.cmd, 'anchor');
  assert.deepEqual(anchor.args, ['--version']);

  const solana = getBuilderVersionCommandArgs('solana');
  assert.equal(solana.cmd, 'solana');
  assert.deepEqual(solana.args, ['--version']);

  const node = getBuilderVersionCommandArgs('node');
  assert.equal(node.cmd, 'node');
  assert.deepEqual(node.args, ['--version']);
});

test('getBuilderToolLabel returns human-readable labels', () => {
  assert.equal(getBuilderToolLabel('anchor'), 'Anchor');
  assert.equal(getBuilderToolLabel('solana'), 'Solana CLI');
  assert.equal(getBuilderToolLabel('rustc'), 'Rustc');
});

test('getBuilderProjectKindLabel returns human-readable labels', () => {
  assert.equal(getBuilderProjectKindLabel('anchor'), 'Anchor Workspace');
  assert.equal(getBuilderProjectKindLabel('solana_rust'), 'Solana Rust Program');
  assert.equal(getBuilderProjectKindLabel('rust'), 'Rust Project');
  assert.equal(getBuilderProjectKindLabel('typescript'), 'TypeScript Project');
  assert.equal(getBuilderProjectKindLabel('unknown'), 'Unknown Project');
});

test('SolanaBuilderWorkspaceSummarySchema validates valid summaries', () => {
  const valid = {
    rootPath: '/home/user/my-project',
    projectKind: 'anchor',
    detectedPackageManager: 'pnpm',
    hasAnchorToml: true,
    hasCargoToml: true,
    hasPackageJson: true,
    hasProgramsDir: true,
    hasTestsDir: true,
    hasMigrationsDir: false,
    hasTargetIdlDir: true,
    detectedAt: new Date().toISOString(),
    warnings: [],
  };
  const result = SolanaBuilderWorkspaceSummarySchema.safeParse(valid);
  assert.ok(result.success, result.error?.message);
});

test('SolanaBuilderWorkspaceSummarySchema rejects invalid project kind', () => {
  const invalid = {
    rootPath: '/home/user/my-project',
    projectKind: 'invalid',
    hasAnchorToml: true,
    hasCargoToml: true,
    hasPackageJson: true,
    hasProgramsDir: true,
    hasTestsDir: true,
    hasMigrationsDir: false,
    hasTargetIdlDir: true,
    detectedAt: new Date().toISOString(),
    warnings: [],
  };
  const result = SolanaBuilderWorkspaceSummarySchema.safeParse(invalid);
  assert.ok(!result.success);
});

test('SolanaAnchorTomlSummarySchema validates valid summaries', () => {
  const valid = {
    providerCluster: 'devnet',
    providerWalletPathPresent: true,
    providerWalletPathRedacted: '[redacted]',
    programsByCluster: [
      { cluster: 'devnet', programName: 'my_program', programId: '11111111111111111111111111111111' },
    ],
    scripts: [{ name: 'test', commandPreview: 'anchor test' }],
  };
  const result = SolanaAnchorTomlSummarySchema.safeParse(valid);
  assert.ok(result.success, result.error?.message);
});

test('SolanaBuilderIdlSummarySchema validates valid IDLs', () => {
  const valid = {
    name: 'my_program',
    version: '0.1.0',
    spec: '0.1.0',
    instructions: [
      {
        name: 'initialize',
        accounts: [{ name: 'payer', isMut: true, isSigner: true }],
        args: [{ name: 'amount', type: 'u64' }],
      },
    ],
    accounts: [
      {
        name: 'Config',
        type: { kind: 'struct', fields: [{ name: 'owner', type: 'publicKey' }] },
      },
    ],
    errors: [{ code: 6000, name: 'InvalidAmount', msg: 'Amount must be greater than zero' }],
  };
  const result = SolanaBuilderIdlSummarySchema.safeParse(valid);
  assert.ok(result.success, result.error?.message);
});

test('SolanaBuilderToolStatusSchema validates valid statuses', () => {
  const valid = {
    tool: 'anchor',
    available: true,
    version: 'anchor-cli 0.30.1',
    checkedAt: new Date().toISOString(),
  };
  const result = SolanaBuilderToolStatusSchema.safeParse(valid);
  assert.ok(result.success, result.error?.message);
});
