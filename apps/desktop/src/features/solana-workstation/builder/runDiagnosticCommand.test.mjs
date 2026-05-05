import assert from 'node:assert/strict';
import test from 'node:test';
import { runDiagnosticCommand } from './runDiagnosticCommand.js';

test('runDiagnosticCommand rejects anchor build', async () => {
  await assert.rejects(
    () => runDiagnosticCommand('anchor', ['build']),
    /not in the Builder v0.2 diagnostic allowlist/
  );
});

test('runDiagnosticCommand rejects anchor test', async () => {
  await assert.rejects(
    () => runDiagnosticCommand('anchor', ['test']),
    /not in the Builder v0.2 diagnostic allowlist/
  );
});

test('runDiagnosticCommand rejects solana program deploy', async () => {
  await assert.rejects(
    () => runDiagnosticCommand('solana', ['program', 'deploy']),
    /not in the Builder v0.2 diagnostic allowlist/
  );
});

test('runDiagnosticCommand rejects cargo build', async () => {
  await assert.rejects(
    () => runDiagnosticCommand('cargo', ['build']),
    /not in the Builder v0.2 diagnostic allowlist/
  );
});

test('runDiagnosticCommand accepts exact solana config get but will fail without binary', async () => {
  // This command is allowed but may fail if solana is not installed.
  // We just verify it doesn't throw the allowlist error.
  try {
    await runDiagnosticCommand('solana', ['config', 'get']);
  } catch (err) {
    assert.ok(
      !err.message.includes('not in the Builder v0.2 diagnostic allowlist'),
      'Should not be blocked by allowlist'
    );
  }
});

test('runDiagnosticCommand accepts exact anchor --version but will fail without binary', async () => {
  try {
    await runDiagnosticCommand('anchor', ['--version']);
  } catch (err) {
    assert.ok(
      !err.message.includes('not in the Builder v0.2 diagnostic allowlist'),
      'Should not be blocked by allowlist'
    );
  }
});

test('runDiagnosticCommand rejects arbitrary echo command', async () => {
  await assert.rejects(
    () => runDiagnosticCommand('echo', ['hello']),
    /not in the Builder v0.2 diagnostic allowlist/
  );
});
