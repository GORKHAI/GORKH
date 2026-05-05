import { randomUUID } from 'node:crypto';
import {
  createServerMessage,
  isRetryableDeviceCommandAckErrorCode,
  type DeviceCommandAck,
  type ServerCommand,
} from '@gorkh/shared';
import {
  redisClient,
  type RedisClientLike,
  type RedisStreamMessage,
} from './redis.js';

export const DEVICE_COMMAND_CONSUMER_GROUP = 'ws-gateway';
export const DEVICE_COMMAND_TTL_MS = 15 * 60 * 1000;
export const DEVICE_COMMAND_RETRY_BASE_DELAY_MS = 2_000;
export const DEVICE_COMMAND_RETRY_MAX_DELAY_MS = 30_000;
export const DEVICE_COMMAND_ACK_TTL_SECONDS = 24 * 60 * 60;

const DEVICE_COMMAND_STREAM_PREFIX = 'device:cmd:';
const DEVICE_COMMAND_ENTRY_PREFIX = 'device:cmd:entry:';
const DEVICE_COMMAND_ACK_PREFIX = 'device:cmd:ack:';
const DEVICE_COMMAND_RETRY_PREFIX = 'device:cmd:retry:';
const CLEANUP_BATCH_SIZE = 50;

export interface DeviceCommandRecord {
  deviceId: string;
  commandId: string;
  commandType: string;
  payload: Record<string, unknown>;
  ts: number;
  expiresAt: number;
}

export interface QueuedDeviceCommand {
  streamId: string;
  command: DeviceCommandRecord;
}

export interface DeviceCommandRetryState {
  attempts: number;
  availableAt: number;
  lastErrorCode?: string;
}

export interface DeviceCommandAckOutcome {
  status: 'acked' | 'retry' | 'ignored';
  retryAt?: number;
  command?: DeviceCommandRecord;
}

export interface DeviceCommandDispatchResult {
  commandId: string;
  queued: boolean;
  delivered: boolean;
  command: DeviceCommandRecord;
  message: ServerCommand;
}

let redisFacade: RedisClientLike = redisClient;
let nowProvider: () => number = () => Date.now();
let warnedQueueDisabled = false;

function nowMs(): number {
  return nowProvider();
}

function warnQueueDisabledOnce() {
  if (!warnedQueueDisabled) {
    warnedQueueDisabled = true;
    console.warn('[device-commands] Redis device queue unavailable, falling back to direct WebSocket delivery');
  }
}

function shouldUseRedis(backend: string): boolean {
  return backend === 'redis';
}

function streamKey(deviceId: string): string {
  return `${DEVICE_COMMAND_STREAM_PREFIX}${deviceId}`;
}

function entryKey(deviceId: string, commandId: string): string {
  return `${DEVICE_COMMAND_ENTRY_PREFIX}${deviceId}:${commandId}`;
}

function ackKey(deviceId: string, commandId: string): string {
  return `${DEVICE_COMMAND_ACK_PREFIX}${deviceId}:${commandId}`;
}

function retryKey(deviceId: string, commandId: string): string {
  return `${DEVICE_COMMAND_RETRY_PREFIX}${deviceId}:${commandId}`;
}

function commandTtlSeconds(): number {
  return Math.max(1, Math.ceil(DEVICE_COMMAND_TTL_MS / 1000));
}

function retryDelayMs(attempts: number): number {
  return Math.min(
    DEVICE_COMMAND_RETRY_BASE_DELAY_MS * Math.pow(2, Math.max(0, attempts - 1)),
    DEVICE_COMMAND_RETRY_MAX_DELAY_MS
  );
}

function parseCommandMessage(deviceId: string, message: RedisStreamMessage): QueuedDeviceCommand | null {
  const commandId = message.fields.commandId;
  const commandType = message.fields.commandType;
  const ts = Number.parseInt(message.fields.ts ?? '', 10);
  const expiresAt = Number.parseInt(message.fields.expiresAt ?? '', 10);
  const payloadRaw = message.fields.payload;

  if (!commandId || !commandType || Number.isNaN(ts) || Number.isNaN(expiresAt) || !payloadRaw) {
    return null;
  }

  try {
    const payload = JSON.parse(payloadRaw) as Record<string, unknown>;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return null;
    }

    return {
      streamId: message.id,
      command: {
        deviceId,
        commandId,
        commandType,
        payload,
        ts,
        expiresAt,
      },
    };
  } catch {
    return null;
  }
}

async function ensureConsumerGroup(redisUrl: string, deviceId: string): Promise<boolean> {
  return redisFacade.xgroupCreateMkstream(redisUrl, streamKey(deviceId), DEVICE_COMMAND_CONSUMER_GROUP);
}

async function deleteStreamEntry(
  redisUrl: string,
  deviceId: string,
  streamId: string,
  commandId?: string
): Promise<void> {
  await ensureConsumerGroup(redisUrl, deviceId);
  await redisFacade.xack(redisUrl, streamKey(deviceId), DEVICE_COMMAND_CONSUMER_GROUP, [streamId]);
  await redisFacade.xdel(redisUrl, streamKey(deviceId), [streamId]);

  if (commandId) {
    await redisFacade.del(redisUrl, entryKey(deviceId, commandId));
    await redisFacade.del(redisUrl, retryKey(deviceId, commandId));
  }
}

async function getCommandEntry(
  redisUrl: string,
  deviceId: string,
  commandId: string
): Promise<{ streamId: string; command: DeviceCommandRecord } | null> {
  const raw = await redisFacade.get(redisUrl, entryKey(deviceId, commandId));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      streamId?: string;
      command?: DeviceCommandRecord;
    };

    if (
      typeof parsed?.streamId === 'string'
      && parsed.command
      && typeof parsed.command.commandType === 'string'
      && typeof parsed.command.commandId === 'string'
    ) {
      return {
        streamId: parsed.streamId,
        command: parsed.command,
      };
    }
  } catch {
    // ignore malformed entry cache
  }

  return null;
}

async function setTerminalAck(
  redisUrl: string,
  deviceId: string,
  commandId: string,
  value: Record<string, unknown>
): Promise<void> {
  await redisFacade.set(
    redisUrl,
    ackKey(deviceId, commandId),
    JSON.stringify({
      ...value,
      at: nowMs(),
    }),
    DEVICE_COMMAND_ACK_TTL_SECONDS
  );
}

async function readRetryState(redisUrl: string, deviceId: string, commandId: string): Promise<DeviceCommandRetryState | null> {
  const raw = await redisFacade.get(redisUrl, retryKey(deviceId, commandId));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as DeviceCommandRetryState;
    if (
      typeof parsed?.attempts === 'number'
      && typeof parsed?.availableAt === 'number'
      && !Number.isNaN(parsed.attempts)
      && !Number.isNaN(parsed.availableAt)
    ) {
      return parsed;
    }
  } catch {
    // ignore malformed retry state
  }

  return null;
}

async function writeRetryState(
  redisUrl: string,
  deviceId: string,
  commandId: string,
  retryState: DeviceCommandRetryState
): Promise<void> {
  await redisFacade.set(
    redisUrl,
    retryKey(deviceId, commandId),
    JSON.stringify(retryState),
    commandTtlSeconds()
  );
}

async function scheduleRetry(
  redisUrl: string,
  deviceId: string,
  commandId: string,
  errorCode?: string
): Promise<DeviceCommandRetryState> {
  const current = await readRetryState(redisUrl, deviceId, commandId);
  const attempts = (current?.attempts ?? 0) + 1;
  const availableAt = nowMs() + retryDelayMs(attempts);
  const retryState: DeviceCommandRetryState = {
    attempts,
    availableAt,
    lastErrorCode: errorCode,
  };

  await writeRetryState(redisUrl, deviceId, commandId, retryState);
  return retryState;
}

async function nextReadableCommands(
  backend: string,
  redisUrl: string,
  deviceId: string,
  consumerName: string,
  id: '0' | '>',
  blockMs = 0
): Promise<QueuedDeviceCommand[]> {
  if (!shouldUseRedis(backend)) {
    return [];
  }

  if (!(await ensureConsumerGroup(redisUrl, deviceId))) {
    return [];
  }

  await cleanupExpiredDeviceCommands(backend, redisUrl, deviceId);

  const streams = await redisFacade.xreadgroup(
    redisUrl,
    DEVICE_COMMAND_CONSUMER_GROUP,
    consumerName,
    streamKey(deviceId),
    id,
    1,
    blockMs
  );

  if (!streams?.length) {
    return [];
  }

  const messages = streams[0]?.messages ?? [];
  const readable: QueuedDeviceCommand[] = [];
  for (const message of messages) {
    const parsed = parseCommandMessage(deviceId, message);
    if (!parsed) {
      await deleteStreamEntry(redisUrl, deviceId, message.id);
      continue;
    }

    if (parsed.command.expiresAt <= nowMs()) {
      await deleteStreamEntry(redisUrl, deviceId, message.id, parsed.command.commandId);
      continue;
    }

    const retryState = await readRetryState(redisUrl, deviceId, parsed.command.commandId);
    if (retryState && retryState.availableAt > nowMs()) {
      return [];
    }

    readable.push(parsed);
  }

  return readable;
}

export async function enqueueDeviceCommand(
  backend: string,
  redisUrl: string,
  deviceId: string,
  commandType: string,
  payload: Record<string, unknown>
): Promise<{ commandId: string; queued: boolean; command: DeviceCommandRecord }> {
  const command: DeviceCommandRecord = {
    deviceId,
    commandId: randomUUID(),
    commandType,
    payload,
    ts: nowMs(),
    expiresAt: nowMs() + DEVICE_COMMAND_TTL_MS,
  };

  if (!shouldUseRedis(backend)) {
    warnQueueDisabledOnce();
    return {
      commandId: command.commandId,
      queued: false,
      command,
    };
  }

  if (!(await ensureConsumerGroup(redisUrl, deviceId))) {
    warnQueueDisabledOnce();
    return {
      commandId: command.commandId,
      queued: false,
      command,
    };
  }

  const streamId = await redisFacade.xadd(redisUrl, streamKey(deviceId), {
    commandId: command.commandId,
    commandType: command.commandType,
    ts: String(command.ts),
    expiresAt: String(command.expiresAt),
    payload: JSON.stringify(command.payload),
  });

  if (!streamId) {
    warnQueueDisabledOnce();
    return {
      commandId: command.commandId,
      queued: false,
      command,
    };
  }

  await redisFacade.set(
    redisUrl,
    entryKey(deviceId, command.commandId),
    JSON.stringify({
      streamId,
      command,
    }),
    commandTtlSeconds()
  );
  await cleanupExpiredDeviceCommands(backend, redisUrl, deviceId);

  return {
    commandId: command.commandId,
    queued: true,
    command,
  };
}

export function createServerCommandMessage(command: DeviceCommandRecord): ServerCommand {
  return createServerMessage('server.command', {
    deviceId: command.deviceId,
    commandId: command.commandId,
    commandType: command.commandType,
    payload: command.payload,
    ts: command.ts,
  });
}

export async function dispatchDeviceCommand(
  backend: string,
  redisUrl: string,
  deviceId: string,
  commandType: string,
  payload: Record<string, unknown>,
  sendDirect?: (message: ServerCommand) => boolean
): Promise<DeviceCommandDispatchResult> {
  const queuedCommand = await enqueueDeviceCommand(
    backend,
    redisUrl,
    deviceId,
    commandType,
    payload
  );
  const message = createServerCommandMessage(queuedCommand.command);

  if (queuedCommand.queued || !sendDirect) {
    return {
      commandId: queuedCommand.commandId,
      queued: queuedCommand.queued,
      delivered: false,
      command: queuedCommand.command,
      message,
    };
  }

  return {
    commandId: queuedCommand.commandId,
    queued: false,
    delivered: sendDirect(message),
    command: queuedCommand.command,
    message,
  };
}

export async function getQueueDepth(
  backend: string,
  redisUrl: string,
  deviceId: string
): Promise<number> {
  if (!shouldUseRedis(backend)) {
    return 0;
  }

  await cleanupExpiredDeviceCommands(backend, redisUrl, deviceId);
  return await redisFacade.xlen(redisUrl, streamKey(deviceId)) ?? 0;
}

export async function getPendingCount(
  backend: string,
  redisUrl: string,
  deviceId: string
): Promise<number> {
  return getQueueDepth(backend, redisUrl, deviceId);
}

export async function waitForEmptyQueue(
  backend: string,
  redisUrl: string,
  deviceId: string,
  timeoutMs = 5_000,
  pollIntervalMs = 50
): Promise<void> {
  const startedAt = nowMs();

  for (;;) {
    if ((await getQueueDepth(backend, redisUrl, deviceId)) === 0) {
      return;
    }

    if (nowMs() - startedAt >= timeoutMs) {
      throw new Error(`Timed out waiting for empty device queue: ${deviceId}`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}

export async function cleanupExpiredDeviceCommands(
  backend: string,
  redisUrl: string,
  deviceId: string
): Promise<number> {
  if (!shouldUseRedis(backend)) {
    return 0;
  }

  let removed = 0;

  for (;;) {
    const entries = await redisFacade.xrange(redisUrl, streamKey(deviceId), '-', '+', CLEANUP_BATCH_SIZE);
    if (entries.length === 0) {
      return removed;
    }

    let sawUnexpired = false;
    for (const entry of entries) {
      const parsed = parseCommandMessage(deviceId, entry);
      if (!parsed) {
        await deleteStreamEntry(redisUrl, deviceId, entry.id);
        removed += 1;
        continue;
      }

      if (parsed.command.expiresAt > nowMs()) {
        sawUnexpired = true;
        break;
      }

      await setTerminalAck(redisUrl, deviceId, parsed.command.commandId, {
        ok: false,
        errorCode: 'APPROVAL_EXPIRED',
        retryable: false,
      });
      await deleteStreamEntry(redisUrl, deviceId, entry.id, parsed.command.commandId);
      removed += 1;
    }

    if (sawUnexpired || entries.length < CLEANUP_BATCH_SIZE) {
      return removed;
    }
  }
}

export async function readPendingDeviceCommands(
  backend: string,
  redisUrl: string,
  deviceId: string,
  consumerName: string
): Promise<QueuedDeviceCommand[]> {
  return nextReadableCommands(backend, redisUrl, deviceId, consumerName, '0');
}

export async function readNewDeviceCommands(
  backend: string,
  redisUrl: string,
  deviceId: string,
  consumerName: string,
  blockMs = 0
): Promise<QueuedDeviceCommand[]> {
  return nextReadableCommands(backend, redisUrl, deviceId, consumerName, '>', blockMs);
}

export async function ackDeviceCommand(
  backend: string,
  redisUrl: string,
  ack: DeviceCommandAck['payload']
): Promise<DeviceCommandAckOutcome> {
  if (!shouldUseRedis(backend)) {
    return { status: 'ignored' };
  }

  const existingTerminalAck = await redisFacade.get(redisUrl, ackKey(ack.deviceId, ack.commandId));
  if (existingTerminalAck) {
    return { status: 'acked' };
  }

  const queuedCommand = await getCommandEntry(redisUrl, ack.deviceId, ack.commandId);
  if (!queuedCommand) {
    return { status: 'ignored' };
  }

  if (ack.ok) {
    await setTerminalAck(redisUrl, ack.deviceId, ack.commandId, { ok: true });
    await deleteStreamEntry(redisUrl, ack.deviceId, queuedCommand.streamId, ack.commandId);
    return { status: 'acked', command: queuedCommand.command };
  }

  const retryable = ack.retryable ?? isRetryableDeviceCommandAckErrorCode(ack.errorCode);
  if (retryable) {
    const retryState = await scheduleRetry(redisUrl, ack.deviceId, ack.commandId, ack.errorCode);
    return {
      status: 'retry',
      retryAt: retryState.availableAt,
      command: queuedCommand.command,
    };
  }

  await setTerminalAck(redisUrl, ack.deviceId, ack.commandId, {
    ok: false,
    errorCode: ack.errorCode,
    retryable: false,
  });
  await deleteStreamEntry(redisUrl, ack.deviceId, queuedCommand.streamId, ack.commandId);
  return { status: 'acked', command: queuedCommand.command };
}

export async function getDeviceCommandRetryState(
  backend: string,
  redisUrl: string,
  deviceId: string,
  commandId: string
): Promise<DeviceCommandRetryState | null> {
  if (!shouldUseRedis(backend)) {
    return null;
  }

  return readRetryState(redisUrl, deviceId, commandId);
}

export async function recordDeviceCommandSendFailure(
  backend: string,
  redisUrl: string,
  deviceId: string,
  commandId: string,
  errorCode = 'TEMP_UNAVAILABLE'
): Promise<DeviceCommandRetryState | null> {
  if (!shouldUseRedis(backend)) {
    return null;
  }

  return scheduleRetry(redisUrl, deviceId, commandId, errorCode);
}

export async function clearDeviceCommandRetryState(
  backend: string,
  redisUrl: string,
  deviceId: string,
  commandId: string
): Promise<void> {
  if (!shouldUseRedis(backend)) {
    return;
  }

  await redisFacade.del(redisUrl, retryKey(deviceId, commandId));
}

export function isDeviceCommandQueueEnabled(backend: string): boolean {
  return shouldUseRedis(backend);
}

export function __setRedisClientForTests(client: RedisClientLike) {
  redisFacade = client;
}

export function __restoreRedisClientForTests() {
  redisFacade = redisClient;
}

export function __setNowProviderForTests(provider: () => number) {
  nowProvider = provider;
}

export function __resetNowProviderForTests() {
  nowProvider = () => Date.now();
}

export function __resetDeviceCommandsForTests() {
  warnedQueueDisabled = false;
}
