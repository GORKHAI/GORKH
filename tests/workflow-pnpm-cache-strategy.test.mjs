import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflowPaths = [
  '.github/workflows/ci.yml',
  '.github/workflows/desktop-ci.yml',
  '.github/workflows/desktop-release.yml',
];

test('GitHub workflows use pnpm/action-setup caching instead of setup-node pnpm caching', () => {
  for (const workflowPath of workflowPaths) {
    const source = readFileSync(workflowPath, 'utf8');

    assert.doesNotMatch(
      source,
      /cache:\s*pnpm/,
      `${workflowPath} must not ask setup-node to resolve pnpm for caching`
    );

    if (source.includes('uses: pnpm/action-setup@v4')) {
      assert.match(
        source,
        /uses:\s*pnpm\/action-setup@v4[\s\S]{0,120}cache:\s*true/,
        `${workflowPath} must enable caching on pnpm/action-setup`
      );
    }
  }
});
