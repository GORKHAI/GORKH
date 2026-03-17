import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeRunForPersistence } from '../apps/api/src/lib/run-privacy.ts';

test('run persistence sanitizes step logs and latest proposals before storage', () => {
  const sanitized = sanitizeRunForPersistence({
    runId: 'run-1',
    deviceId: 'device-1',
    goal: 'Deploy the project',
    status: 'running',
    createdAt: 1_000,
    updatedAt: 2_000,
    mode: 'ai_assist',
    actionCount: 2,
    steps: [
      {
        stepId: 'step-1',
        title: 'Read secrets',
        status: 'running',
        logs: [
          {
            line: 'User: paste super-secret-token',
            level: 'info',
            at: 1_500,
          },
          {
            line: 'Tool executed: fs.read_text secrets/.env.local',
            level: 'info',
            at: 1_600,
          },
        ],
      },
    ],
    latestProposal: {
      kind: 'propose_tool',
      rationale: 'Open secrets/.env.local and run deploy --token abc123',
      toolCall: {
        tool: 'fs.read_text',
        path: 'secrets/.env.local',
      },
    },
    messages: [],
  });

  assert.equal(sanitized.steps[0]?.logs[0]?.line, 'User response (24 chars)');
  assert.equal(sanitized.steps[0]?.logs[1]?.line, 'Tool executed: fs.read_text');
  assert.deepEqual(sanitized.latestProposal, {
    kind: 'propose_tool',
    rationale: '[redacted rationale]',
    toolCall: {
      tool: 'fs.read_text',
      path: '[workspace path]',
    },
  });
});
