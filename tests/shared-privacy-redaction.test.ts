import assert from 'node:assert/strict';
import test from 'node:test';
import {
  redactToolCallForLog,
  sanitizeAgentProposalForPersistence,
  sanitizeRunLogLine,
  sanitizeToolSummaryForPersistence,
} from '../packages/shared/src/index.ts';

test('run log sanitization strips user text, tool targets, and free-form errors', () => {
  assert.equal(sanitizeRunLogLine('User: top secret deployment token'), 'User response (27 chars)');
  assert.equal(sanitizeRunLogLine('Tool executed: fs.read_text secrets/.env.local'), 'Tool executed: fs.read_text');
  assert.equal(
    sanitizeRunLogLine('Tool failed: terminal.exec pnpm -C apps/api deploy - permission denied'),
    'Tool failed: terminal.exec'
  );
  assert.equal(sanitizeRunLogLine('Question: What is in secrets/.env.local?'), 'Question asked');
  assert.equal(sanitizeRunLogLine('Action failed: pasted sensitive value'), 'Action failed');
});

test('tool redaction strips workspace paths and terminal arguments', () => {
  assert.deepEqual(
    redactToolCallForLog({
      tool: 'fs.read_text',
      path: 'secrets/.env.local',
    }),
    {
      tool: 'fs.read_text',
      pathRel: '[workspace path]',
    }
  );

  assert.deepEqual(
    redactToolCallForLog({
      tool: 'terminal.exec',
      cmd: 'pnpm',
      args: ['deploy', '--token', 'super-secret'],
      cwd: 'apps/api',
    }),
    {
      tool: 'terminal.exec',
      cmd: 'pnpm',
    }
  );
});

test('tool summary persistence sanitizes path and command metadata defensively', () => {
  assert.deepEqual(
    sanitizeToolSummaryForPersistence({
      toolEventId: 'tool-1',
      toolCallId: 'call-1',
      runId: 'run-1',
      deviceId: 'device-1',
      tool: 'fs.write_text',
      pathRel: 'secrets/.env.local',
      status: 'executed',
      bytesWritten: 42,
      at: 1_000,
    }),
    {
      toolEventId: 'tool-1',
      toolCallId: 'call-1',
      runId: 'run-1',
      deviceId: 'device-1',
      tool: 'fs.write_text',
      pathRel: '[workspace path]',
      status: 'executed',
      bytesWritten: 42,
      at: 1_000,
    }
  );
});

test('proposal sanitization removes sensitive text, paths, args, and rationale', () => {
  const proposal = sanitizeAgentProposalForPersistence({
    kind: 'propose_tool',
    rationale: 'Read secrets/.env.local and deploy with --token abc123',
    confidence: 0.82,
    toolCall: {
      tool: 'terminal.exec',
      cmd: 'pnpm',
      args: ['deploy', '--token', 'abc123'],
      cwd: 'apps/api',
    },
  });

  assert.equal(proposal.kind, 'propose_tool');
  assert.equal(proposal.rationale, '[redacted rationale]');
  assert.deepEqual(proposal.toolCall, {
    tool: 'terminal.exec',
    cmd: 'pnpm',
    args: [],
    cwd: undefined,
  });

  const typeProposal = sanitizeAgentProposalForPersistence({
    kind: 'propose_action',
    rationale: 'Paste the secret into the terminal',
    action: {
      kind: 'type',
      text: 'super-secret-token',
    },
  });

  assert.equal(typeProposal.kind, 'propose_action');
  assert.equal(typeProposal.rationale, '[redacted rationale]');
  assert.deepEqual(typeProposal.action, {
    kind: 'type',
    text: '[redacted 18 chars]',
  });
});
