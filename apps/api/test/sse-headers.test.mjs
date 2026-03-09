import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSseHeaders } from '../dist/lib/sse.js';

test('buildSseHeaders includes CORS headers for an allowed browser origin', () => {
  assert.deepEqual(
    buildSseHeaders('https://gm7-tau.vercel.app', ['https://gm7-tau.vercel.app']),
    {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': 'https://gm7-tau.vercel.app',
      'Access-Control-Allow-Credentials': 'true',
      Vary: 'Origin',
    }
  );
});

test('buildSseHeaders omits CORS headers when there is no matching origin', () => {
  assert.deepEqual(
    buildSseHeaders('https://evil.example', ['https://gm7-tau.vercel.app']),
    {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  );
});
