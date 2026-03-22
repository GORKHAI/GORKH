import test from 'node:test';
import assert from 'node:assert/strict';

const chatTaskFlow = await import('./chatTaskFlow.ts');

test('assistant task confirmation responses still parse explicit confirm and cancel answers', () => {
  assert.equal(chatTaskFlow.interpretAssistantTaskConfirmationResponse('yes'), 'confirm');
  assert.equal(chatTaskFlow.interpretAssistantTaskConfirmationResponse('Go ahead!'), 'confirm');
  assert.equal(chatTaskFlow.interpretAssistantTaskConfirmationResponse("don't"), 'cancel');
  assert.equal(chatTaskFlow.interpretAssistantTaskConfirmationResponse('maybe later'), null);
});

test('free AI setup approval responses parse explicit confirm and cancel answers', () => {
  assert.equal(chatTaskFlow.interpretFreeAiSetupResponse('yes'), 'confirm');
  assert.equal(chatTaskFlow.interpretFreeAiSetupResponse('Go ahead!'), 'confirm');
  assert.equal(chatTaskFlow.interpretFreeAiSetupResponse('cancel'), 'cancel');
  assert.equal(chatTaskFlow.interpretFreeAiSetupResponse('maybe later'), null);
});

test('assistant task start confirmation depends on active execution state', () => {
  assert.equal(chatTaskFlow.shouldConfirmAssistantTaskStart(null), true);
  assert.equal(
    chatTaskFlow.shouldConfirmAssistantTaskStart({
      runId: 'run-active',
      goal: 'Fix tests in this repo',
      status: 'waiting_for_user',
      createdAt: 1,
      updatedAt: 1,
      deviceId: 'device-1',
      steps: [],
    }),
    false
  );
});

test('free AI setup preflight report stays retail friendly and asks for approval', () => {
  const report = chatTaskFlow.buildFreeAiSetupPreflightReport({
    providerConfigured: false,
  });

  const text = [
    report.title,
    report.summary,
    report.details,
    report.prompt,
  ].join('\n');

  assert.match(report.title, /Free AI/i);
  assert.match(report.summary, /required/i);
  assert.match(report.details, /local engine/i);
  assert.match(report.details, /AI model/i);
  assert.match(report.prompt, /approve|approval/i);
  assert.doesNotMatch(text, /brew|ollama pull|manual install/i);
  assert.doesNotMatch(text, /OpenAI|Claude|paid provider/i);
});
