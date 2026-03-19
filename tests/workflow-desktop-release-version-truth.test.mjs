import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflowSource = readFileSync('.github/workflows/desktop-release.yml', 'utf8');

test('desktop release workflow validates checked-in version sync before building release artifacts', () => {
  assert.match(
    workflowSource,
    /node scripts\/version-check\.mjs/,
    'desktop release workflow should run the checked-in version sync check before building release artifacts',
  );
});

test('desktop release workflow uses VERSION as the checked-in release source of truth and rejects mismatched pushed tags', () => {
  assert.match(
    workflowSource,
    /cat VERSION|readFileSync\(['"]VERSION['"]|< VERSION/,
    'desktop release workflow should read the checked-in VERSION file',
  );

  assert.match(
    workflowSource,
    /(GITHUB_REF_NAME|RAW_REF)[\s\S]{0,500}(does not match|must match|Expected tag)/,
    'desktop release workflow should fail when a pushed tag does not match the checked-in version',
  );
});

test('desktop release workflow uses GORKH for the public GitHub release name', () => {
  assert.match(
    workflowSource,
    /RELEASE_NAME="GORKH Desktop v\$\{VERSION\}"/,
    'stable desktop releases should publish under the GORKH name',
  );

  assert.match(
    workflowSource,
    /RELEASE_NAME="GORKH Desktop v\$\{VERSION\} \(beta\)"/,
    'beta desktop releases should publish under the GORKH name',
  );
});
