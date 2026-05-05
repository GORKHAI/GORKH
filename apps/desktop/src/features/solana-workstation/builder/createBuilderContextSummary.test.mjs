import assert from 'node:assert/strict';
import test from 'node:test';
import { createBuilderContextSummary } from './createBuilderContextSummary.js';

test('createBuilderContextSummary includes programs and IDL names but excludes secret files', () => {
  const workspace = {
    rootPath: '/tmp/project',
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

  const anchorToml = {
    providerCluster: 'devnet',
    providerWalletPathPresent: true,
    providerWalletPathRedacted: '[redacted]',
    programsByCluster: [
      { cluster: 'devnet', programName: 'my_program', programId: 'Fg6PaFpoGXkYidMpUDBkeD3WfHpCuhD8VB2g9N1K2f1K' },
    ],
    scripts: [{ name: 'test', commandPreview: 'anchor test' }],
  };

  const idls = [
    {
      name: 'my_program',
      version: '0.1.0',
      spec: '0.1.0',
      instructions: [
        { name: 'initialize', accounts: [], args: [] },
      ],
      accounts: [],
      errors: [
        { code: 6000, name: 'InvalidAmount', msg: 'Amount must be greater than zero' },
      ],
      sourcePath: 'target/idl/my_program.json',
    },
  ];

  const toolchain = [
    { tool: 'anchor', available: true, version: 'anchor-cli 0.30.1', checkedAt: new Date().toISOString() },
  ];

  const summary = createBuilderContextSummary(workspace, anchorToml, idls, toolchain);

  assert.ok(summary.copyableMarkdown.includes('my_program'));
  assert.ok(summary.copyableMarkdown.includes('initialize'));
  assert.ok(summary.copyableMarkdown.includes('InvalidAmount'));
  assert.ok(summary.copyableMarkdown.includes('anchor-cli 0.30.1'));
  assert.ok(summary.programs.includes('my_program (devnet)'));
  assert.ok(summary.idls.includes('my_program'));
  assert.ok(summary.instructions.includes('my_program::initialize'));
  assert.ok(summary.errors.includes('my_program::InvalidAmount (6000)'));

  // Should not include actual wallet paths, .env content, or keypair data
  assert.ok(!summary.copyableMarkdown.includes('.config/solana'));
  assert.ok(!summary.copyableMarkdown.includes('API_KEY='));
  assert.ok(!summary.copyableMarkdown.includes('PRIVATE_KEY='));
  assert.ok(!summary.copyableMarkdown.includes('-----BEGIN PRIVATE KEY-----'));
  assert.ok(!summary.copyableMarkdown.includes('[1, 2, 3,'));

  // Safety note present
  assert.ok(summary.copyableMarkdown.includes('excludes private key files'));
});

test('createBuilderContextSummary handles null workspace gracefully', () => {
  const summary = createBuilderContextSummary(null, null, [], []);
  assert.equal(summary.rootPath, '');
  assert.equal(summary.projectKind, 'unknown');
  assert.ok(summary.copyableMarkdown.includes('Unknown'));
});
