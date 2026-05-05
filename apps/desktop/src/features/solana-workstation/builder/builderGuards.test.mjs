import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertSafeBuilderCommand,
  isSafeBuilderVersionCommand,
  assertSafeBuilderFilePath,
  isSafeBuilderFilePath,
  assertSafeBuilderDirName,
  buildSafeVersionCommand,
} from './builderGuards.js';

test('assertSafeBuilderCommand allows --version commands', () => {
  assert.doesNotThrow(() => assertSafeBuilderCommand('anchor', ['--version']));
  assert.doesNotThrow(() => assertSafeBuilderCommand('solana', ['--version']));
  assert.doesNotThrow(() => assertSafeBuilderCommand('cargo', ['--version']));
  assert.doesNotThrow(() => assertSafeBuilderCommand('node', ['--version']));
});

test('assertSafeBuilderCommand blocks non-version commands', () => {
  assert.throws(() => assertSafeBuilderCommand('echo', ['hello']), /Only --version commands/);
  assert.throws(() => assertSafeBuilderCommand('ls', ['-la']), /Only --version commands/);
  assert.throws(() => assertSafeBuilderCommand('cat', ['file.txt']), /Only --version commands/);
});

test('assertSafeBuilderCommand blocks known dangerous commands', () => {
  assert.throws(() => assertSafeBuilderCommand('anchor', ['build']), /blocked/);
  assert.throws(() => assertSafeBuilderCommand('anchor', ['test']), /blocked/);
  assert.throws(() => assertSafeBuilderCommand('anchor', ['deploy']), /blocked/);
  assert.throws(() => assertSafeBuilderCommand('solana', ['program', 'deploy']), /blocked/);
  assert.throws(() => assertSafeBuilderCommand('solana', ['transfer']), /blocked/);
  assert.throws(() => assertSafeBuilderCommand('solana', ['airdrop']), /blocked/);
  assert.throws(() => assertSafeBuilderCommand('cargo', ['test']), /blocked/);
  assert.throws(() => assertSafeBuilderCommand('cargo', ['run']), /blocked/);
  assert.throws(() => assertSafeBuilderCommand('npm', ['install']), /blocked/);
  assert.throws(() => assertSafeBuilderCommand('pnpm', ['install']), /blocked/);
  assert.throws(() => assertSafeBuilderCommand('yarn', ['add']), /blocked/);
  assert.throws(() => assertSafeBuilderCommand('rm', ['-rf', '/']), /blocked/);
});

test('isSafeBuilderVersionCommand returns correct boolean', () => {
  assert.ok(isSafeBuilderVersionCommand('anchor', ['--version']));
  assert.ok(!isSafeBuilderVersionCommand('anchor', ['build']));
  assert.ok(!isSafeBuilderVersionCommand('cargo', ['test']));
});

test('assertSafeBuilderFilePath blocks sensitive files', () => {
  assert.throws(() => assertSafeBuilderFilePath('.env'));
  assert.throws(() => assertSafeBuilderFilePath('.env.local'));
  assert.throws(() => assertSafeBuilderFilePath('key.pem'));
  assert.throws(() => assertSafeBuilderFilePath('private.key'));
  assert.throws(() => assertSafeBuilderFilePath('wallet.json'));
  assert.throws(() => assertSafeBuilderFilePath('id.json'));
  assert.throws(() => assertSafeBuilderFilePath('.gitignore'));
});

test('assertSafeBuilderFilePath allows safe files', () => {
  assert.doesNotThrow(() => assertSafeBuilderFilePath('Anchor.toml'));
  assert.doesNotThrow(() => assertSafeBuilderFilePath('Cargo.toml'));
  assert.doesNotThrow(() => assertSafeBuilderFilePath('package.json'));
  assert.doesNotThrow(() => assertSafeBuilderFilePath('lib.rs'));
  assert.doesNotThrow(() => assertSafeBuilderFilePath('idl/my_program.json'));
});

test('isSafeBuilderFilePath returns correct boolean', () => {
  assert.ok(!isSafeBuilderFilePath('.env'));
  assert.ok(isSafeBuilderFilePath('Anchor.toml'));
});

test('assertSafeBuilderDirName blocks excluded dirs', () => {
  assert.throws(() => assertSafeBuilderDirName('node_modules'));
  assert.throws(() => assertSafeBuilderDirName('.git'));
  assert.throws(() => assertSafeBuilderDirName('target'));
  assert.throws(() => assertSafeBuilderDirName('dist'));
});

test('assertSafeBuilderDirName allows safe dirs', () => {
  assert.doesNotThrow(() => assertSafeBuilderDirName('src'));
  assert.doesNotThrow(() => assertSafeBuilderDirName('programs'));
  assert.doesNotThrow(() => assertSafeBuilderDirName('tests'));
});

test('buildSafeVersionCommand returns correct commands for allowed tools', () => {
  const anchor = buildSafeVersionCommand('anchor');
  assert.equal(anchor.cmd, 'anchor');
  assert.deepEqual(anchor.args, ['--version']);

  const solana = buildSafeVersionCommand('solana');
  assert.equal(solana.cmd, 'solana');
  assert.deepEqual(solana.args, ['--version']);
});

test('buildSafeVersionCommand throws for disallowed tools', () => {
  assert.throws(() => buildSafeVersionCommand('python'), /not in the Builder/);
  assert.throws(() => buildSafeVersionCommand('make'), /not in the Builder/);
});
