import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRedactedLocalToolPreview } from '../apps/desktop/src/lib/privacy.ts';

test('desktop local tool previews never keep file contents or terminal output', () => {
  assert.deepEqual(
    buildRedactedLocalToolPreview(
      {
        tool: 'fs.read_text',
        path: 'secrets/.env.local',
      },
      {
        ok: true,
        data: {
          content: 'super-secret-token',
        },
      },
    ),
    {
      text: '[redacted file preview: 18 chars]',
    }
  );

  assert.deepEqual(
    buildRedactedLocalToolPreview(
      {
        tool: 'terminal.exec',
        cmd: 'pnpm',
        args: ['deploy'],
      },
      {
        ok: true,
        data: {
          stdout_preview: 'token=abc123',
          stderr_preview: 'permission denied',
        },
      },
    ),
    {
      stdout: '[redacted stdout: 12 chars]',
      stderr: '[redacted stderr: 17 chars]',
    }
  );
});
