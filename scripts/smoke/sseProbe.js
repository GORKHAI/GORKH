import { existsSync, readFileSync } from 'node:fs';

const ENV_PATH = process.env.SMOKE_ENV_FILE || '/tmp/ai-operator-smoke.env';

function loadEnvFile(path) {
  const values = {};
  if (!existsSync(path)) {
    return values;
  }

  const lines = readFileSync(path, 'utf8').split('\n');
  for (const line of lines) {
    if (!line || line.startsWith('#') || !line.includes('=')) {
      continue;
    }
    const index = line.indexOf('=');
    values[line.slice(0, index)] = line.slice(index + 1);
  }
  return values;
}

function readCookieJar(path) {
  if (!path || !existsSync(path)) {
    throw new Error(`Cookie jar not found: ${path}`);
  }

  const lines = readFileSync(path, 'utf8').split('\n');
  const pairs = [];
  for (const line of lines) {
    if (!line || (line.startsWith('#') && !line.startsWith('#HttpOnly_'))) {
      continue;
    }
    const normalized = line.startsWith('#HttpOnly_') ? line.replace(/^#HttpOnly_/, '') : line;
    const parts = normalized.split('\t');
    if (parts.length >= 7) {
      pairs.push(`${parts[5]}=${parts[6]}`);
    }
  }
  return pairs.join('; ');
}

const envFile = loadEnvFile(ENV_PATH);
const apiBase = process.env.API_BASE || envFile.API_BASE || 'http://localhost:3001';
const cookieJar = process.env.COOKIE_JAR || envFile.COOKIE_JAR;

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 5_000);
let reader;

try {
  const response = await fetch(`${apiBase}/events`, {
    headers: {
      Cookie: readCookieJar(cookieJar),
    },
    signal: controller.signal,
  });

  process.stdout.write(`SSE_STATUS=${response.status}\n`);
  process.stdout.write(`SSE_CONTENT_TYPE=${response.headers.get('content-type') || ''}\n`);

  if (!response.ok || !response.body) {
    process.exit(1);
  }

  reader = response.body.getReader();
  let totalBytes = 0;
  while (totalBytes < 5_120) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    totalBytes += value.byteLength;
    if (totalBytes > 0) {
      break;
    }
  }

  process.stdout.write(`SSE_BYTES=${totalBytes}\n`);
  process.stdout.write(`SSE_OK=${totalBytes > 0 ? '1' : '0'}\n`);
} catch (error) {
  process.stdout.write(`SSE_ERROR=${error instanceof Error ? error.message : 'unknown'}\n`);
  process.exit(1);
} finally {
  clearTimeout(timer);
  controller.abort();
  if (reader) {
    try {
      await reader.cancel();
    } catch {
      // Ignore cleanup errors from an already-closed stream.
    }
  }
}
