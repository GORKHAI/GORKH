import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAnchorToml } from './parseAnchorToml.js';

const SAMPLE_ANCHOR_TOML = `
[features]
seeds = false
skip-lint = false

[programs.localnet]
my_program = "Fg6PaFpoGXkYidMpUDBkeD3WfHpCuhD8VB2g9N1K2f1K"
other_program = "11111111111111111111111111111111"

[programs.devnet]
my_program = "Fg6PaFpoGXkYidMpUDBkeD3WfHpCuhD8VB2g9N1K2f1K"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "Localnet"
wallet = "/home/user/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
lint = "cargo clippy"
`;

test('parseAnchorToml extracts provider cluster', () => {
  const result = parseAnchorToml(SAMPLE_ANCHOR_TOML);
  assert.equal(result.providerCluster, 'Localnet');
});

test('parseAnchorToml detects wallet path and redacts it', () => {
  const result = parseAnchorToml(SAMPLE_ANCHOR_TOML);
  assert.equal(result.providerWalletPathPresent, true);
  assert.equal(result.providerWalletPathRedacted, '[redacted]');
});

test('parseAnchorToml extracts programs by cluster', () => {
  const result = parseAnchorToml(SAMPLE_ANCHOR_TOML);
  assert.equal(result.programsByCluster.length, 3);

  const localnet = result.programsByCluster.filter((p) => p.cluster === 'localnet');
  assert.equal(localnet.length, 2);
  assert.ok(localnet.some((p) => p.programName === 'my_program'));
  assert.ok(localnet.some((p) => p.programName === 'other_program'));

  const devnet = result.programsByCluster.filter((p) => p.cluster === 'devnet');
  assert.equal(devnet.length, 1);
  assert.equal(devnet[0].programName, 'my_program');
});

test('parseAnchorToml extracts scripts', () => {
  const result = parseAnchorToml(SAMPLE_ANCHOR_TOML);
  assert.equal(result.scripts.length, 2);
  assert.ok(result.scripts.some((s) => s.name === 'test'));
  assert.ok(result.scripts.some((s) => s.name === 'lint'));
});

test('parseAnchorToml handles missing provider wallet', () => {
  const toml = `
[provider]
cluster = "Devnet"
`;
  const result = parseAnchorToml(toml);
  assert.equal(result.providerWalletPathPresent, false);
  assert.equal(result.providerWalletPathRedacted, undefined);
});

test('parseAnchorToml handles empty input', () => {
  const result = parseAnchorToml('');
  assert.equal(result.providerCluster, undefined);
  assert.equal(result.providerWalletPathPresent, false);
  assert.equal(result.programsByCluster.length, 0);
  assert.equal(result.scripts.length, 0);
});

test('parseAnchorToml ignores comments', () => {
  const toml = `
# This is a comment
[provider]
cluster = "Mainnet" # inline comment
`;
  const result = parseAnchorToml(toml);
  assert.equal(result.providerCluster, 'Mainnet');
});
