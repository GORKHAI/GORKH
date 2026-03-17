import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('../../apps/api/node_modules/@prisma/client');

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
    const key = line.slice(0, index);
    const value = line.slice(index + 1);
    values[key] = value;
  }
  return values;
}

function redactToken(token) {
  if (!token) {
    return null;
  }
  return token.length <= 6 ? `${token}...` : `${token.slice(0, 6)}...`;
}

const fileEnv = loadEnvFile(ENV_PATH);
if (!process.env.DATABASE_URL && fileEnv.DATABASE_URL) {
  process.env.DATABASE_URL = fileEnv.DATABASE_URL;
}
const testEmail = process.env.TEST_EMAIL || fileEnv.TEST_EMAIL || null;
const testDeviceId = process.env.TEST_DEVICE_ID || fileEnv.TEST_DEVICE_ID || null;

const prisma = new PrismaClient();

try {
  const user = testEmail
    ? await prisma.user.findUnique({
        where: { email: testEmail },
        select: {
          id: true,
          email: true,
        },
      })
    : null;

  const auditEvents = await prisma.auditEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      eventType: true,
      userId: true,
      deviceId: true,
      runId: true,
      createdAt: true,
      meta: true,
    },
  });

  const device = testDeviceId
    ? await prisma.device.findUnique({
        where: { id: testDeviceId },
        select: {
          id: true,
          ownerUserId: true,
          pairedAt: true,
          deviceToken: true,
          deviceTokenHash: true,
          deviceTokenIssuedAt: true,
          deviceTokenExpiresAt: true,
          deviceTokenLastUsedAt: true,
          deviceTokenRevokedAt: true,
          controlEnabled: true,
          screenStreamEnabled: true,
          lastSeenAt: true,
        },
      })
    : null;

  const counts = user
    ? await Promise.all([
        prisma.run.count({ where: { ownerUserId: user.id } }),
        prisma.action.count({ where: { ownerUserId: user.id } }),
        prisma.toolEvent.count({ where: { ownerUserId: user.id } }),
      ])
    : [0, 0, 0];

  const auditSummary = testDeviceId
    ? {
        deviceClaimed: await prisma.auditEvent.count({
          where: {
            deviceId: testDeviceId,
            eventType: 'device.claimed',
          },
        }),
        controlRequested: await prisma.auditEvent.count({
          where: {
            deviceId: testDeviceId,
            eventType: 'control.requested',
          },
        }),
        toolExecuted: await prisma.auditEvent.count({
          where: {
            deviceId: testDeviceId,
            eventType: 'tool.executed',
          },
        }),
      }
    : {
        deviceClaimed: 0,
        controlRequested: 0,
        toolExecuted: 0,
      };
  const dbAuditOk = auditSummary.deviceClaimed > 0
    && auditSummary.controlRequested > 0
    && auditSummary.toolExecuted > 0;

  process.stdout.write(`AUDIT_EVENTS=${JSON.stringify(auditEvents)}\n`);
  process.stdout.write(
    `DEVICE_ROW=${JSON.stringify(
      device
        ? {
            ...device,
            deviceToken: redactToken(device.deviceToken),
            deviceTokenHash: redactToken(device.deviceTokenHash),
            hasDeviceToken: Boolean(device.deviceTokenHash || device.deviceToken),
          }
        : null
    )}\n`
  );
  process.stdout.write(
    `COUNTS=${JSON.stringify({
      userId: user?.id || null,
      testEmail,
      runs: counts[0],
      actions: counts[1],
      tools: counts[2],
    })}\n`
  );
  process.stdout.write(`DB_AUDIT_SUMMARY=${JSON.stringify(auditSummary)}\n`);
  process.stdout.write(`DB_AUDIT_OK=${dbAuditOk ? 1 : 0}\n`);
} finally {
  await prisma.$disconnect();
}
