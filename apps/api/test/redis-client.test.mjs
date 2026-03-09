import assert from 'node:assert/strict';
import test from 'node:test';

const redisModule = await import('../dist/lib/redis.js');

test('rediss URLs are parsed as TLS connections with query-driven TLS options', () => {
  assert.equal(typeof redisModule.__parseRedisUrlForTests, 'function');

  const parsed = redisModule.__parseRedisUrlForTests(
    'rediss://default:secret@leading-buck-54488.upstash.io:6379/0?rejectUnauthorized=false'
  );

  assert.deepEqual(parsed, {
    host: 'leading-buck-54488.upstash.io',
    port: 6379,
    username: 'default',
    password: 'secret',
    database: 0,
    tls: true,
    rejectUnauthorized: false,
  });
});
