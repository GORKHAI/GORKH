import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const desktopSignInPath = 'apps/web/app/desktop/sign-in/page.tsx';
const loginPagePath = 'apps/web/app/login/page.tsx';
const authLibPath = 'apps/web/lib/auth.ts';
const apiIndexPath = 'apps/api/src/index.ts';

test('web app includes a desktop sign-in completion page that resumes after browser auth', () => {
  const source = readFileSync(desktopSignInPath, 'utf8');

  assert.match(
    source,
    /getMe\(\)/,
    'Desktop sign-in page should check the current browser session'
  );

  assert.match(
    source,
    /router\.replace\(`\/login\?\$\{new URLSearchParams\(/,
    'Desktop sign-in page should redirect unauthenticated browsers to login with a next parameter'
  );

  assert.match(
    source,
    /completeDesktopAuth\(attemptId\)/,
    'Desktop sign-in page should request a handoff token from the web auth helper after auth'
  );

  assert.match(
    source,
    /window\.location\.replace\(redirectUrl\.toString\(\)\)/,
    'Desktop sign-in page should redirect the browser to the exact loopback callback URL'
  );
});

test('login page supports redirecting back to the requested next path after successful auth', () => {
  const source = readFileSync(loginPagePath, 'utf8');

  assert.match(
    source,
    /useSearchParams/,
    'Login page should read the next query parameter'
  );

  assert.match(
    source,
    /const next = searchParams\.get\('next'\)/,
    'Login page should pull the next destination from the query string'
  );

  assert.match(
    source,
    /router\.push\(next && next\.startsWith\('\/'\) \? next : '\/dashboard'\)/,
    'Login page should redirect back to the requested internal path after login'
  );
});

test('web auth helper exposes desktop handoff completion', () => {
  const source = readFileSync(authLibPath, 'utf8');

  assert.match(
    source,
    /export async function completeDesktopAuth\(attemptId: string\)/,
    'Auth helper should expose desktop handoff completion'
  );

  assert.match(
    source,
    /apiFetch\('\/desktop\/auth\/complete',\s*\{/,
    'Desktop handoff completion should call the API completion route'
  );
});

test('api exposes an authenticated desktop auth completion route', () => {
  const source = readFileSync(apiIndexPath, 'utf8');

  assert.match(
    source,
    /fastify\.post\('\/desktop\/auth\/complete'/,
    'API should expose a desktop auth completion route'
  );

  assert.match(
    source,
    /const user = await requireAuth\(request, reply\);[\s\S]*desktopAuth\.issueHandoff\(\s*\{[\s\S]*attemptId,[\s\S]*userId: user\.id,/,
    'Desktop auth completion should require browser auth and issue a handoff token for that user'
  );
});
