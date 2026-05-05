import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

// ---------------------------------------------------------------------------
// Package identity rename verification (Phase 12A)
// ---------------------------------------------------------------------------

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const WORKSPACE_PACKAGES = [
  'package.json',
  'packages/shared/package.json',
  'apps/desktop/package.json',
  'apps/api/package.json',
  'apps/web/package.json',
  'apps/ios/package.json',
];

test('All workspace package.json names use @gorkh/*', () => {
  for (const pkgPath of WORKSPACE_PACKAGES) {
    const pkg = readJson(pkgPath);
    const name = pkg.name ?? '';
    assert.ok(
      !name.includes('@ai-operator'),
      `${pkgPath} name must not contain @ai-operator: got ${name}`
    );
    if (name.startsWith('@')) {
      assert.ok(
        name.startsWith('@gorkh/'),
        `${pkgPath} name should start with @gorkh/: got ${name}`
      );
    }
  }
});

test('Workspace package.json dependencies use @gorkh/* for internal deps', () => {
  for (const pkgPath of WORKSPACE_PACKAGES) {
    const pkg = readJson(pkgPath);
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
      ...pkg.optionalDependencies,
    };
    for (const [depName] of Object.entries(allDeps)) {
      assert.ok(
        !depName.includes('@ai-operator'),
        `${pkgPath} dependency must not contain @ai-operator: got ${depName}`
      );
    }
  }
});

test('Root package.json scripts use @gorkh/* in filter commands', () => {
  const root = readJson('package.json');
  const scriptText = JSON.stringify(root.scripts);
  assert.ok(!scriptText.includes('@ai-operator/'), 'Root scripts should not reference @ai-operator/');
  assert.ok(scriptText.includes('@gorkh/'), 'Root scripts should reference @gorkh/');
});

test('pnpm-lock.yaml contains @gorkh/* and no @ai-operator/*', () => {
  const lockfile = readFileSync('pnpm-lock.yaml', 'utf8');
  assert.ok(lockfile.includes('@gorkh/shared'), 'pnpm-lock.yaml should contain @gorkh/shared');
  assert.ok(
    !lockfile.includes('@ai-operator/'),
    'pnpm-lock.yaml should not contain @ai-operator/ references'
  );
});

test('CI workflows use @gorkh/* in filter commands', () => {
  const ciWorkflow = readFileSync('.github/workflows/ci.yml', 'utf8');
  const desktopCiWorkflow = readFileSync('.github/workflows/desktop-ci.yml', 'utf8');
  const releaseWorkflow = readFileSync('.github/workflows/desktop-release.yml', 'utf8');

  assert.ok(!ciWorkflow.includes('@ai-operator/'), 'ci.yml should not contain @ai-operator/');
  assert.ok(ciWorkflow.includes('@gorkh/'), 'ci.yml should contain @gorkh/');

  assert.ok(!desktopCiWorkflow.includes('@ai-operator/'), 'desktop-ci.yml should not contain @ai-operator/');
  assert.ok(desktopCiWorkflow.includes('@gorkh/'), 'desktop-ci.yml should contain @gorkh/');

  assert.ok(!releaseWorkflow.includes('@ai-operator/'), 'desktop-release.yml should not contain @ai-operator/');
  assert.ok(releaseWorkflow.includes('@gorkh/'), 'desktop-release.yml should contain @gorkh/');
});

test('Active source files import from @gorkh/shared not @ai-operator/shared', () => {
  // Sample key source files that should import from @gorkh/shared
  const sampleFiles = [
    'apps/desktop/src/features/solana-workstation/rpc/solanaRpcClient.ts',
    'apps/desktop/src/features/solana-workstation/wallet/createWalletReceiveRequest.ts',
    'apps/api/src/index.ts',
  ];
  for (const filePath of sampleFiles) {
    const content = readFileSync(filePath, 'utf8');
    assert.ok(
      !content.includes("@ai-operator/shared"),
      `${filePath} should not import from @ai-operator/shared`
    );
    assert.ok(
      content.includes("@gorkh/shared"),
      `${filePath} should import from @gorkh/shared`
    );
  }
});

test('AGENTS.md uses @gorkh/* for package names', () => {
  const content = readFileSync('AGENTS.md', 'utf8');
  assert.ok(!content.includes('@ai-operator/'), 'AGENTS.md should not contain @ai-operator/');
  assert.ok(content.includes('@gorkh/'), 'AGENTS.md should contain @gorkh/');
});

test('No @ai-operator package references remain in active test files', () => {
  const testFiles = readdirSync('tests').filter((f) =>
    (f.endsWith('.test.mjs') || f.endsWith('.test.ts')) && !f.includes('package-identity-rename')
  );
  for (const file of testFiles) {
    const content = readFileSync(`tests/${file}`, 'utf8');
    assert.ok(
      !content.includes('@ai-operator/'),
      `tests/${file} should not contain @ai-operator/`
    );
  }
});
