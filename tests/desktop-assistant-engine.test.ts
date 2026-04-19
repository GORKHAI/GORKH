import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('desktop defines one assistant-engine catalog with ai assist default and advanced agent demoted to experimental', async () => {
  let imported: typeof import('../apps/desktop/src/lib/assistantEngine.ts');
  try {
    imported = await import('../apps/desktop/src/lib/assistantEngine.ts');
  } catch {
    assert.fail('assistantEngine helper should exist');
    return;
  }

  assert.equal(imported.DEFAULT_ASSISTANT_ENGINE_ID, 'ai_assist_legacy');

  const engines = imported.getAssistantEngineCatalog();
  assert.deepEqual(
    engines.map((engine) => engine.id),
    ['ai_assist_legacy', 'advanced_agent']
  );

  const retail = engines.find((engine) => engine.id === 'ai_assist_legacy');
  const experimental = engines.find((engine) => engine.id === 'advanced_agent');

  assert.ok(retail);
  assert.equal(retail?.experimental, false);
  assert.match(
    retail?.description || '',
    /stable|default|retail assistant|primary/i,
    'retail engine should be the stable default path'
  );
  assert.ok(experimental);
  assert.equal(experimental?.experimental, true);
  assert.match(
    experimental?.description || '',
    /experimental|debug|secondary|migration/i,
    'advanced agent should be clearly marked as experimental once legacy AI Assist becomes the default again'
  );
});

test('desktop chat shell routes through the unified assistant-engine abstraction', () => {
  const appSource = readFileSync('apps/desktop/src/App.tsx', 'utf8');
  const advancedDialogSource = readFileSync('apps/desktop/src/components/agent/AgentTaskDialog.tsx', 'utf8');
  const workflowSource = readFileSync('apps/desktop/src/components/AgentWorkflow.tsx', 'utf8');

  assert.match(appSource, /createAssistantEngine/, 'desktop app should create the retail engine through the unified assistant engine helper');
  assert.doesNotMatch(appSource, /new AiAssistController/, 'desktop app should no longer construct AiAssistController directly');
  assert.doesNotMatch(
    appSource,
    /Experimental Advanced Engine|Experimental Workflow/,
    'retail desktop should not present the advanced runtime as a separate experimental surface once it powers the main assistant'
  );
  assert.match(
    advancedDialogSource,
    /debug|secondary|internal/i,
    'any remaining extra engine launch surface should be clearly labeled secondary'
  );
  assert.match(
    workflowSource,
    /secondary|debug|internal/i,
    'engineering workflow surface should remain clearly secondary'
  );
});
