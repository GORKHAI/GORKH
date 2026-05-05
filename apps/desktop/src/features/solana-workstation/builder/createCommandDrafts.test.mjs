import assert from 'node:assert/strict';
import test from 'node:test';
import { createSolanaBuilderCommandDrafts } from './createCommandDrafts.js';

test('createCommandDrafts marks anchor build as draft_only, not runnable', () => {
  const drafts = createSolanaBuilderCommandDrafts(null);
  const build = drafts.find((d) => d.title === 'Anchor Build');
  assert.ok(build);
  assert.equal(build.safety, 'draft_only');
  assert.equal(build.canRunInGorkh, false);
  assert.equal(build.canCopy, true);
});

test('createCommandDrafts marks anchor test as draft_only, not runnable', () => {
  const drafts = createSolanaBuilderCommandDrafts(null);
  const t = drafts.find((d) => d.title === 'Anchor Test');
  assert.ok(t);
  assert.equal(t.safety, 'draft_only');
  assert.equal(t.canRunInGorkh, false);
});

test('createCommandDrafts marks cargo build as draft_only, not runnable', () => {
  const drafts = createSolanaBuilderCommandDrafts(null);
  const build = drafts.find((d) => d.title === 'Cargo Build');
  assert.ok(build);
  assert.equal(build.safety, 'draft_only');
  assert.equal(build.canRunInGorkh, false);
});

test('createCommandDrafts marks cargo test as draft_only, not runnable', () => {
  const drafts = createSolanaBuilderCommandDrafts(null);
  const t = drafts.find((d) => d.title === 'Cargo Test');
  assert.ok(t);
  assert.equal(t.safety, 'draft_only');
  assert.equal(t.canRunInGorkh, false);
});

test('createCommandDrafts marks solana program deploy as blocked', () => {
  const drafts = createSolanaBuilderCommandDrafts(null);
  const deploy = drafts.find((d) => d.title === 'Solana Program Deploy');
  assert.ok(deploy);
  assert.equal(deploy.safety, 'blocked');
  assert.equal(deploy.canRunInGorkh, false);
  assert.equal(deploy.canCopy, false);
  assert.equal(deploy.requiresWalletOrKeypair, true);
  assert.equal(deploy.requiresNetwork, true);
});

test('createCommandDrafts adds package manager test draft when workspace has npm', () => {
  const workspace = {
    rootPath: '/tmp/project',
    projectKind: 'anchor',
    detectedPackageManager: 'npm',
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
  const drafts = createSolanaBuilderCommandDrafts(workspace);
  const npmTest = drafts.find((d) => d.title === 'npm Test');
  assert.ok(npmTest);
  assert.equal(npmTest.safety, 'draft_only');
});

test('createCommandDrafts adds pnpm test draft when workspace has pnpm', () => {
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
  const drafts = createSolanaBuilderCommandDrafts(workspace);
  const pnpmTest = drafts.find((d) => d.title === 'pnpm Test');
  assert.ok(pnpmTest);
  assert.equal(pnpmTest.safety, 'draft_only');
});
