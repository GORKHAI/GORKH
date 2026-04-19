import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const wsHandlerSource = readFileSync('apps/api/src/lib/ws-handler.ts', 'utf8');

function getCaseBlock(caseName: string): string {
  const matcher = new RegExp(`case '${caseName}': \\{[\\s\\S]*?\\n\\s*break;\\n\\s*\\}`);
  const match = wsHandlerSource.match(matcher);
  assert.ok(match, `expected to find case block for ${caseName}`);
  return match[0];
}

test('AI Assist runs are not marked running on mere device accept', () => {
  const acceptCase = getCaseBlock('device.run.accept');

  assert.doesNotMatch(
    acceptCase,
    /runStore\.updateStatus\(runId,\s*'running'\)/,
    'server should not advertise AI Assist runs as running before the device shows real execution activity'
  );
});

test('AI Assist runs become running only after real device-side execution activity', () => {
  assert.match(
    wsHandlerSource,
    /async function markAiAssistRunRunningFromActivity/,
    'ws handler should centralize the running-state transition behind a device-activity helper'
  );

  for (const caseName of [
    'device.run.step_update',
    'device.run.log',
    'device.agent.proposal',
    'device.action.create',
    'device.tool.request',
    'device.tool.result',
  ]) {
    const caseBlock = getCaseBlock(caseName);
    assert.match(
      caseBlock,
      /markAiAssistRunRunningFromActivity\(runId\)/,
      `${caseName} should count as real execution activity for AI Assist runs`
    );
  }
});
