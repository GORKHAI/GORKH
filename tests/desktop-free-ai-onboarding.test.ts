import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

test('desktop local AI helper exposes retail-friendly tier guidance and install stage labels', async () => {
  const imported = await import('../apps/desktop/src/lib/localAi.ts');

  assert.equal(typeof imported.getLocalAiTierDetails, 'function');
  assert.equal(typeof imported.getLocalAiInstallStageLabel, 'function');
  assert.equal(typeof imported.formatLocalAiByteCount, 'function');
  assert.equal(typeof imported.getLocalAiInstallProgressSummary, 'function');

  const light = imported.getLocalAiTierDetails('light');
  const standard = imported.getLocalAiTierDetails('standard');
  const vision = imported.getLocalAiTierDetails('vision');

  assert.match(light.title, /light/i);
  assert.match(light.downloadSizeLabel, /gb/i);
  assert.match(light.performanceExpectation, /lighter|responsive|average/i);

  assert.match(standard.title, /standard/i);
  assert.match(standard.bestFor, /code|reasoning|planning/i);

  assert.match(vision.title, /vision/i);
  assert.equal(vision.optional, true);
  assert.match(vision.bestFor, /screen|vision|ui/i);

  assert.equal(imported.getLocalAiInstallStageLabel('not_started'), 'Not installed');
  assert.equal(imported.getLocalAiInstallStageLabel('installing'), 'Downloading');
  assert.equal(imported.getLocalAiInstallStageLabel('installed'), 'Installed');
  assert.equal(imported.getLocalAiInstallStageLabel('starting'), 'Starting');
  assert.equal(imported.getLocalAiInstallStageLabel('ready'), 'Ready');
  assert.equal(imported.getLocalAiInstallStageLabel('error'), 'Error');

  assert.equal(imported.formatLocalAiByteCount(512), '512 B');
  assert.equal(imported.formatLocalAiByteCount(1536), '1.5 KB');
  assert.equal(imported.formatLocalAiByteCount(3 * 1024 * 1024 * 1024), '3.0 GB');
  assert.equal(
    imported.getLocalAiInstallProgressSummary({
      stage: 'installing',
      selectedTier: 'standard',
      selectedModel: 'qwen2.5:3b',
      progressPercent: 42,
      downloadedBytes: 2 * 1024 * 1024 * 1024,
      totalBytes: 5 * 1024 * 1024 * 1024,
      message: 'Downloading runtime...',
      updatedAtMs: 1710000000000,
    }),
    '42% • 2.0 GB of 5.0 GB'
  );
});

test('desktop retail shell includes a visible Set Up Free AI onboarding surface', () => {
  const appSource = readFileSync('apps/desktop/src/App.tsx', 'utf8');
  const componentPath = 'apps/desktop/src/components/FreeAiSetupCard.tsx';

  assert.equal(existsSync(componentPath), true, 'free local AI onboarding component should exist');
  const componentSource = readFileSync(componentPath, 'utf8');

  assert.match(appSource, /Set Up Free AI|Install local engine|Ready to use/i, 'main desktop shell should expose the free local AI onboarding entry point');
  assert.match(componentSource, /Set Up Free AI/i);
  assert.match(componentSource, /Recommended for this device/i);
  assert.match(componentSource, /Install progress|Download progress/i);
  assert.match(componentSource, /Available disk|disk free/i);
  assert.match(componentSource, /Runtime source/i);
  assert.match(componentSource, /Managed runtime folder/i);
  assert.match(componentSource, /Selected model/i);
  assert.doesNotMatch(componentSource, /Light recommended|Standard recommended|Vision Boost optional/i);
  assert.match(componentSource, /Check this device/i);
  assert.match(componentSource, /Install local engine/i);
  assert.match(componentSource, /Download AI model/i);
  assert.match(componentSource, /Start local engine/i);
  assert.match(componentSource, /Ready to use/i);
  assert.match(componentSource, /Repair available/i);
});
