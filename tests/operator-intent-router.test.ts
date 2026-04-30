import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  classifyOperatorIntent,
  GORKH_CAPABILITIES_REPLY,
  ACCESSIBILITY_PERMISSION_GUIDANCE,
} from '../apps/desktop/src/lib/operatorIntentRouter.js';

describe('classifyOperatorIntent', () => {
  it('classifies capability questions as informational_capability', () => {
    const cases = [
      'What can you do on my computer?',
      'what do you do',
      'Who are you',
      'What are you',
      'Tell me about yourself',
      'How can you help me',
      'your capabilities',
    ];
    for (const msg of cases) {
      const result = classifyOperatorIntent(msg);
      assert.strictEqual(result.type, 'informational_capability', `Expected informational_capability for: ${msg}`);
    }
  });

  it('classifies empty-trash requests as system_empty_trash with high risk', () => {
    const cases = [
      'Empty my Mac Trash',
      'empty my trash',
      'clear the trash',
      'delete my trash',
      'clean my mac trash',
    ];
    for (const msg of cases) {
      const result = classifyOperatorIntent(msg);
      assert.strictEqual(result.type, 'system_empty_trash', `Expected system_empty_trash for: ${msg}`);
      assert.strictEqual(result.riskLevel, 'high');
      assert.strictEqual(result.requiresAccessibility, false);
      assert.strictEqual(result.requiresWorkspace, false);
      assert.ok(result.goal);
      assert.ok(result.summary);
      assert.ok(result.prompt);
    }
  });

  it('classifies open-terminal requests as open_app_terminal', () => {
    const cases = [
      'Open Terminal',
      'open my terminal',
      'launch terminal',
      'start a new terminal',
      'run terminal',
    ];
    for (const msg of cases) {
      const result = classifyOperatorIntent(msg);
      assert.strictEqual(result.type, 'open_app_terminal', `Expected open_app_terminal for: ${msg}`);
      assert.strictEqual(result.appName, 'Terminal');
      assert.strictEqual(result.requiresAccessibility, false);
    }
  });

  it('classifies open-app requests as open_app', () => {
    const cases = [
      { msg: 'Open Safari', app: 'Safari' },
      { msg: 'Launch TextEdit', app: 'Textedit' },
      { msg: 'open the Notes app', app: 'Notes' },
      { msg: 'start Calculator', app: 'Calculator' },
    ];
    for (const { msg, app } of cases) {
      const result = classifyOperatorIntent(msg);
      assert.strictEqual(result.type, 'open_app', `Expected open_app for: ${msg}`);
      assert.strictEqual(result.appName, app);
      assert.strictEqual(result.requiresAccessibility, false);
    }
  });

  it('classifies computer-use requests as computer_use_task', () => {
    const cases = [
      'Click the button',
      'Type hello world',
      'Scroll down',
      'Press Enter',
      'Move the mouse to the corner',
      'Right-click the file',
      'Double-click the icon',
      'Control my Mac',
      'Interact with my computer',
      'Use my computer to open settings',
    ];
    for (const msg of cases) {
      const result = classifyOperatorIntent(msg);
      assert.strictEqual(result.type, 'computer_use_task', `Expected computer_use_task for: ${msg}`);
      assert.strictEqual(result.requiresAccessibility, true);
    }
  });

  it('classifies file-management requests as file_management', () => {
    const cases = [
      'Organize my downloads',
      'Clean up my desktop',
      'Manage my files',
      'Sort my downloads folder',
    ];
    for (const msg of cases) {
      const result = classifyOperatorIntent(msg);
      assert.strictEqual(result.type, 'file_management', `Expected file_management for: ${msg}`);
      assert.strictEqual(result.requiresWorkspace, true);
    }
  });

  it('classifies normal chat as chat', () => {
    const cases = [
      'Hello',
      'How is the weather today?',
      'Explain quantum computing',
      'Write a poem about cats',
      'What is the capital of France?',
      'Thanks for your help',
      'Goodbye',
      'I opened Terminal yesterday', // vague mention, not a command
      'The trash was full last week', // vague mention, not a command
    ];
    for (const msg of cases) {
      const result = classifyOperatorIntent(msg);
      assert.strictEqual(result.type, 'chat', `Expected chat for: ${msg}`);
    }
  });

  it('GORKH_CAPABILITIES_REPLY does not mention DeepSeek', () => {
    assert.doesNotMatch(GORKH_CAPABILITIES_REPLY, /DeepSeek/i);
    assert.doesNotMatch(GORKH_CAPABILITIES_REPLY, /OpenAI/i);
    assert.doesNotMatch(GORKH_CAPABILITIES_REPLY, /Claude/i);
    assert.match(GORKH_CAPABILITIES_REPLY, /GORKH/);
  });

  it('ACCESSIBILITY_PERMISSION_GUIDANCE uses correct wording', () => {
    assert.match(
      ACCESSIBILITY_PERMISSION_GUIDANCE,
      /Grant Accessibility permission to let GORKH perform approved desktop actions/
    );
    assert.doesNotMatch(
      ACCESSIBILITY_PERMISSION_GUIDANCE,
      /cannot interact/
    );
  });
});
