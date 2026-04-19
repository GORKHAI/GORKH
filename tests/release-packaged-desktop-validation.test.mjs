import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('packaged desktop report verifier can emit a beta template with the required checks', async () => {
  const { createTemplate } = await import('../scripts/release/verify-packaged-desktop-report.mjs');
  const template = createTemplate({
    channel: 'beta',
    version: '0.0.31-beta.1',
    machine: 'macos-sonoma-arm64',
  });

  assert.equal(template.channel, 'beta');
  assert.equal(template.version, '0.0.31-beta.1');
  assert.equal(template.machine, 'macos-sonoma-arm64');
  assert.equal(template.checks.confirmed_task_local_free_ai.status, 'pending');
  assert.equal(template.checks.non_workspace_non_screen_task.status, 'pending');
  assert.equal(template.checks.hosted_fallback_unavailable.status, 'pending');
  assert.equal(template.checks.overlay_and_dragging.status, 'pending');
  assert.equal(template.checks.beta_updater_truth.status, 'pending');
  assert.equal(template.checks.stable_updater_truth.status, 'not_applicable');
});

test('packaged desktop report verifier accepts a complete stable report and rejects an incomplete beta report', async () => {
  const { validatePackagedDesktopReport } = await import('../scripts/release/verify-packaged-desktop-report.mjs');
  const tempDir = mkdtempSync(path.join(tmpdir(), 'gorkh-packaged-validation-'));

  try {
    const stableReportPath = path.join(tempDir, 'stable.json');
    writeFileSync(
      stableReportPath,
      JSON.stringify(
        {
          version: '0.0.31',
          channel: 'stable',
          machine: 'macos-sonoma-arm64',
          checkedAt: '2026-04-09T12:00:00.000Z',
          checks: {
            confirmed_task_local_free_ai: { status: 'pass', notes: 'Task completed.' },
            non_workspace_non_screen_task: { status: 'pass', notes: 'No blockers shown.' },
            hosted_fallback_unavailable: { status: 'pass', notes: 'Explicit error surfaced.' },
            overlay_and_dragging: { status: 'pass', notes: 'Window dragged and overlay stayed compact.' },
            beta_updater_truth: { status: 'not_applicable', notes: 'Stable build.' },
            stable_updater_truth: { status: 'pass', notes: 'Broken feed returned visible error.' },
          },
        },
        null,
        2,
      ),
    );

    const stableResult = await validatePackagedDesktopReport(stableReportPath);
    assert.deepEqual(stableResult.failures, []);

    const betaReportPath = path.join(tempDir, 'beta.json');
    writeFileSync(
      betaReportPath,
      JSON.stringify(
        {
          version: '0.0.31-beta.1',
          channel: 'beta',
          machine: 'macos-sonoma-arm64',
          checkedAt: '2026-04-09T12:00:00.000Z',
          checks: {
            confirmed_task_local_free_ai: { status: 'pass', notes: 'Task completed.' },
            non_workspace_non_screen_task: { status: 'pending', notes: '' },
            hosted_fallback_unavailable: { status: 'pass', notes: 'Explicit error surfaced.' },
            overlay_and_dragging: { status: 'pass', notes: 'Compact overlay.' },
            beta_updater_truth: { status: 'pass', notes: 'Updater disabled message shown.' },
            stable_updater_truth: { status: 'not_applicable', notes: 'Beta build.' },
          },
        },
        null,
        2,
      ),
    );

    const betaResult = await validatePackagedDesktopReport(betaReportPath);
    assert.notEqual(betaResult.failures.length, 0, 'incomplete beta report should fail verification');
    assert.match(betaResult.failures.join('\n'), /non_workspace_non_screen_task/i);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
