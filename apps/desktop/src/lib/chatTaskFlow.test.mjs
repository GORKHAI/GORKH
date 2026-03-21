import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ASSISTANT_OPENING_GOAL,
  getAssistantDisplayGoal,
  isAssistantOpeningGoal,
} from './chatTaskFlow.js';

test('assistant opening goal is recognized exactly', () => {
  assert.equal(isAssistantOpeningGoal(ASSISTANT_OPENING_GOAL), true);
  assert.equal(isAssistantOpeningGoal('Organize my Downloads'), false);
});

test('assistant display goal hides the internal opening goal before first user request', () => {
  assert.equal(
    getAssistantDisplayGoal(ASSISTANT_OPENING_GOAL),
    'Ready for your instructions'
  );
});

test('assistant display goal prefers the real user request once available', () => {
  assert.equal(
    getAssistantDisplayGoal(ASSISTANT_OPENING_GOAL, 'Open Canva and edit that photo'),
    'Open Canva and edit that photo'
  );
});
