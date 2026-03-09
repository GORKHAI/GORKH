import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflowPaths = [
  '.github/workflows/ci.yml',
  '.github/workflows/desktop-ci.yml',
  '.github/workflows/desktop-release.yml',
];

test('GitHub workflows install workspace dependencies recursively', () => {
  for (const workflowPath of workflowPaths) {
    const source = readFileSync(workflowPath, 'utf8');

    assert.match(
      source,
      /pnpm -r install --frozen-lockfile/,
      `${workflowPath} must install dependencies recursively so package-local node_modules are created`
    );

    assert.doesNotMatch(
      source,
      /pnpm -w install --frozen-lockfile/,
      `${workflowPath} must not use root-only install for workspace jobs`
    );
  }
});
