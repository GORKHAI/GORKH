import assert from 'node:assert/strict';
import test from 'node:test';
import { canPreviewFile } from './safeFilePreview.js';

test('canPreviewFile denies .env files', () => {
  assert.ok(!canPreviewFile('.env'));
  assert.ok(!canPreviewFile('.env.local'));
  assert.ok(!canPreviewFile('config/.env'));
});

test('canPreviewFile denies keypair JSON', () => {
  assert.ok(!canPreviewFile('id.json'));
  assert.ok(!canPreviewFile('wallet.json'));
  assert.ok(!canPreviewFile('wallet-keypair.json'));
  assert.ok(!canPreviewFile('deployer.json'));
  assert.ok(!canPreviewFile('my-deployer.json'));
});

test('canPreviewFile denies path traversal', () => {
  assert.ok(!canPreviewFile('../secrets.txt'));
  assert.ok(!canPreviewFile('programs/../../etc/passwd'));
  assert.ok(!canPreviewFile('/absolute/path'));
});

test('canPreviewFile denies excluded dirs', () => {
  assert.ok(!canPreviewFile('node_modules/foo/index.js'));
  assert.ok(!canPreviewFile('.git/config'));
  assert.ok(!canPreviewFile('target/debug/build.rs'));
});

test('canPreviewFile allows programs/example/src/lib.rs', () => {
  assert.ok(canPreviewFile('programs/example/src/lib.rs'));
  assert.ok(canPreviewFile('programs/example/src/instructions/init.rs'));
});

test('canPreviewFile allows Anchor.toml', () => {
  assert.ok(canPreviewFile('Anchor.toml'));
});

test('canPreviewFile allows Cargo.toml', () => {
  assert.ok(canPreviewFile('Cargo.toml'));
  assert.ok(canPreviewFile('programs/example/Cargo.toml'));
});

test('canPreviewFile allows package.json', () => {
  assert.ok(canPreviewFile('package.json'));
});

test('canPreviewFile allows target/idl/*.json', () => {
  assert.ok(canPreviewFile('target/idl/my_program.json'));
});

test('canPreviewFile allows idl/*.json', () => {
  assert.ok(canPreviewFile('idl/my_program.json'));
});

test('canPreviewFile allows tests and migrations', () => {
  assert.ok(canPreviewFile('tests/my_program.ts'));
  assert.ok(canPreviewFile('tests/my_program.js'));
  assert.ok(canPreviewFile('migrations/deploy.ts'));
  assert.ok(canPreviewFile('migrations/deploy.js'));
});

test('canPreviewFile allows README.md', () => {
  assert.ok(canPreviewFile('README.md'));
});

test('canPreviewFile denies pem/key/secret files', () => {
  assert.ok(!canPreviewFile('server.pem'));
  assert.ok(!canPreviewFile('private.key'));
  assert.ok(!canPreviewFile('api.secret'));
});
