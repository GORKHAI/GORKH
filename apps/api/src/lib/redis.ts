import { Socket } from 'node:net';
import { connect as connectTls, type TLSSocket } from 'node:tls';
import { URL } from 'node:url';

interface RedisConnectionOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
  database?: number;
  tls: boolean;
  rejectUnauthorized: boolean;
}

export type RedisResponse = string | number | null | RedisResponse[];

export interface RedisStreamMessage {
  id: string;
  fields: Record<string, string>;
}

export interface RedisStreamReadResult {
  stream: string;
  messages: RedisStreamMessage[];
}

export interface RedisClientLike {
  ping(redisUrl: string): Promise<boolean>;
  incr(redisUrl: string, key: string): Promise<number | null>;
  expire(redisUrl: string, key: string, seconds: number): Promise<boolean>;
  pttl(redisUrl: string, key: string): Promise<number | null>;
  set(redisUrl: string, key: string, value: string, ttlSeconds: number): Promise<boolean>;
  get(redisUrl: string, key: string): Promise<string | null>;
  del(redisUrl: string, key: string): Promise<void>;
  xgroupCreateMkstream(redisUrl: string, streamKey: string, groupName: string): Promise<boolean>;
  xadd(redisUrl: string, streamKey: string, fields: Record<string, string>): Promise<string | null>;
  xreadgroup(
    redisUrl: string,
    groupName: string,
    consumerName: string,
    streamKey: string,
    id: string,
    count?: number,
    blockMs?: number
  ): Promise<RedisStreamReadResult[] | null>;
  xrange(
    redisUrl: string,
    streamKey: string,
    start: string,
    end: string,
    count?: number
  ): Promise<RedisStreamMessage[]>;
  xack(redisUrl: string, streamKey: string, groupName: string, ids: string[]): Promise<number>;
  xdel(redisUrl: string, streamKey: string, ids: string[]): Promise<number>;
  xlen(redisUrl: string, streamKey: string): Promise<number | null>;
}

let warnedUnavailable = false;

function warnOnce(message: string) {
  if (!warnedUnavailable) {
    warnedUnavailable = true;
    console.warn(`[redis] ${message}`);
  }
}

function parseRedisUrl(redisUrl: string): RedisConnectionOptions {
  const parsed = new URL(redisUrl);
  const rejectUnauthorized = parsed.searchParams.get('rejectUnauthorized');

  return {
    host: parsed.hostname,
    port: parsed.port ? Number.parseInt(parsed.port, 10) : 6379,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    database: parsed.pathname && parsed.pathname !== '/' ? Number.parseInt(parsed.pathname.slice(1), 10) : undefined,
    tls: parsed.protocol === 'rediss:',
    rejectUnauthorized: rejectUnauthorized == null
      ? true
      : !(rejectUnauthorized === 'false' || rejectUnauthorized === '0'),
  };
}

export function __parseRedisUrlForTests(redisUrl: string): RedisConnectionOptions {
  return parseRedisUrl(redisUrl);
}

function encodeCommand(parts: string[]): string {
  let payload = `*${parts.length}\r\n`;
  for (const part of parts) {
    payload += `$${Buffer.byteLength(part)}\r\n${part}\r\n`;
  }
  return payload;
}

class IncompleteRespError extends Error {}

function readLine(buffer: string, offset: number): { line: string; nextOffset: number } {
  const breakIndex = buffer.indexOf('\r\n', offset);
  if (breakIndex === -1) {
    throw new IncompleteRespError('RESP line incomplete');
  }

  return {
    line: buffer.slice(offset, breakIndex),
    nextOffset: breakIndex + 2,
  };
}

function parseRespValue(buffer: string, offset = 0): { value: RedisResponse; nextOffset: number } {
  if (offset >= buffer.length) {
    throw new IncompleteRespError('RESP prefix missing');
  }

  const prefix = buffer[offset];

  switch (prefix) {
    case '+': {
      const { line, nextOffset } = readLine(buffer, offset + 1);
      return { value: line, nextOffset };
    }

    case '-': {
      const { line } = readLine(buffer, offset + 1);
      throw new Error(line);
    }

    case ':': {
      const { line, nextOffset } = readLine(buffer, offset + 1);
      return { value: Number.parseInt(line, 10), nextOffset };
    }

    case '$': {
      const { line, nextOffset } = readLine(buffer, offset + 1);
      const length = Number.parseInt(line, 10);
      if (length === -1) {
        return { value: null, nextOffset };
      }

      const contentEnd = nextOffset + length;
      const terminatorEnd = contentEnd + 2;
      if (terminatorEnd > buffer.length) {
        throw new IncompleteRespError('RESP bulk string incomplete');
      }

      return {
        value: buffer.slice(nextOffset, contentEnd),
        nextOffset: terminatorEnd,
      };
    }

    case '*': {
      const { line, nextOffset } = readLine(buffer, offset + 1);
      const count = Number.parseInt(line, 10);
      if (count === -1) {
        return { value: null, nextOffset };
      }

      let currentOffset = nextOffset;
      const values: RedisResponse[] = [];
      for (let index = 0; index < count; index += 1) {
        const parsed = parseRespValue(buffer, currentOffset);
        values.push(parsed.value);
        currentOffset = parsed.nextOffset;
      }

      return {
        value: values,
        nextOffset: currentOffset,
      };
    }

    default:
      throw new Error(`Unsupported RESP prefix: ${prefix}`);
  }
}

async function runRawCommand(redisUrl: string, parts: string[]): Promise<RedisResponse> {
  const options = parseRedisUrl(redisUrl);
  const socket: Socket | TLSSocket = options.tls
    ? connectTls({
        host: options.host,
        port: options.port,
        servername: options.host,
        rejectUnauthorized: options.rejectUnauthorized,
      })
    : new Socket();

  return new Promise<RedisResponse>((resolve, reject) => {
    const commands: string[][] = [];
    if (options.password) {
      commands.push(
        options.username
          ? ['AUTH', options.username, options.password]
          : ['AUTH', options.password]
      );
    }
    if (typeof options.database === 'number' && !Number.isNaN(options.database)) {
      commands.push(['SELECT', String(options.database)]);
    }
    commands.push(parts);

    const expectedResponses = commands.length;
    let parsedResponses = 0;
    let accumulated = '';
    let offset = 0;
    let lastValue: RedisResponse = null;

    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };

    socket.setTimeout(2500, () => {
      cleanup();
      reject(new Error('Redis timeout'));
    });

    socket.on('error', (err) => {
      cleanup();
      reject(err);
    });

    socket.on('data', (chunk) => {
      accumulated += chunk.toString('utf8');

      try {
        while (parsedResponses < expectedResponses) {
          const parsed = parseRespValue(accumulated, offset);
          offset = parsed.nextOffset;
          parsedResponses += 1;
          lastValue = parsed.value;
        }

        cleanup();
        resolve(lastValue);
      } catch (error) {
        if (error instanceof IncompleteRespError) {
          return;
        }

        cleanup();
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });

    const sendCommands = () => {
      for (const command of commands) {
        socket.write(encodeCommand(command));
      }
    };

    if (options.tls) {
      socket.once('secureConnect', sendCommands);
    } else {
      socket.connect(options.port, options.host, sendCommands);
    }
  });
}

function asString(value: RedisResponse): string | null {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: RedisResponse): number | null {
  return typeof value === 'number' ? value : typeof value === 'string' ? Number.parseInt(value, 10) : null;
}

function asArray(value: RedisResponse): RedisResponse[] | null {
  return Array.isArray(value) ? value : null;
}

function parseStreamFields(raw: RedisResponse): Record<string, string> | null {
  const pairs = asArray(raw);
  if (!pairs || pairs.length % 2 !== 0) {
    return null;
  }

  const fields: Record<string, string> = {};
  for (let index = 0; index < pairs.length; index += 2) {
    const key = asString(pairs[index]);
    const value = asString(pairs[index + 1]);
    if (key === null || value === null) {
      return null;
    }
    fields[key] = value;
  }

  return fields;
}

function parseStreamMessages(raw: RedisResponse): RedisStreamMessage[] {
  const entries = asArray(raw);
  if (!entries) {
    return [];
  }

  const messages: RedisStreamMessage[] = [];
  for (const entry of entries) {
    const parts = asArray(entry);
    if (!parts || parts.length < 2) {
      continue;
    }

    const id = asString(parts[0]);
    const fields = parseStreamFields(parts[1]);
    if (!id || !fields) {
      continue;
    }

    messages.push({ id, fields });
  }

  return messages;
}

function parseXreadgroupResponse(raw: RedisResponse): RedisStreamReadResult[] | null {
  if (raw === null) {
    return null;
  }

  const streams = asArray(raw);
  if (!streams) {
    return null;
  }

  const result: RedisStreamReadResult[] = [];
  for (const streamEntry of streams) {
    const parts = asArray(streamEntry);
    if (!parts || parts.length < 2) {
      continue;
    }

    const stream = asString(parts[0]);
    if (!stream) {
      continue;
    }

    result.push({
      stream,
      messages: parseStreamMessages(parts[1]),
    });
  }

  return result.length > 0 ? result : null;
}

export const redisClient: RedisClientLike = {
  async ping(redisUrl: string): Promise<boolean> {
    try {
      const result = await runRawCommand(redisUrl, ['PING']);
      return result === 'PONG';
    } catch (err) {
      warnOnce(`unavailable (${err instanceof Error ? err.message : String(err)}); falling back to memory backend`);
      return false;
    }
  },

  async incr(redisUrl: string, key: string): Promise<number | null> {
    try {
      return asNumber(await runRawCommand(redisUrl, ['INCR', key]));
    } catch {
      return null;
    }
  },

  async expire(redisUrl: string, key: string, seconds: number): Promise<boolean> {
    try {
      return asNumber(await runRawCommand(redisUrl, ['EXPIRE', key, String(seconds)])) === 1;
    } catch {
      return false;
    }
  },

  async pttl(redisUrl: string, key: string): Promise<number | null> {
    try {
      return asNumber(await runRawCommand(redisUrl, ['PTTL', key]));
    } catch {
      return null;
    }
  },

  async set(redisUrl: string, key: string, value: string, ttlSeconds: number): Promise<boolean> {
    try {
      return asString(await runRawCommand(redisUrl, ['SET', key, value, 'EX', String(ttlSeconds)])) === 'OK';
    } catch {
      return false;
    }
  },

  async get(redisUrl: string, key: string): Promise<string | null> {
    try {
      return asString(await runRawCommand(redisUrl, ['GET', key]));
    } catch {
      return null;
    }
  },

  async del(redisUrl: string, key: string): Promise<void> {
    try {
      await runRawCommand(redisUrl, ['DEL', key]);
    } catch {
      // no-op on cleanup
    }
  },

  async xgroupCreateMkstream(redisUrl: string, streamKey: string, groupName: string): Promise<boolean> {
    try {
      return asString(await runRawCommand(redisUrl, ['XGROUP', 'CREATE', streamKey, groupName, '0', 'MKSTREAM'])) === 'OK';
    } catch (error) {
      if (error instanceof Error && error.message.includes('BUSYGROUP')) {
        return true;
      }
      return false;
    }
  },

  async xadd(redisUrl: string, streamKey: string, fields: Record<string, string>): Promise<string | null> {
    try {
      const parts = ['XADD', streamKey, '*'];
      for (const [key, value] of Object.entries(fields)) {
        parts.push(key, value);
      }
      return asString(await runRawCommand(redisUrl, parts));
    } catch {
      return null;
    }
  },

  async xreadgroup(
    redisUrl: string,
    groupName: string,
    consumerName: string,
    streamKey: string,
    id: string,
    count = 1,
    blockMs = 0
  ): Promise<RedisStreamReadResult[] | null> {
    try {
      const parts = ['XREADGROUP', 'GROUP', groupName, consumerName, 'COUNT', String(count)];
      if (blockMs > 0) {
        parts.push('BLOCK', String(blockMs));
      }
      parts.push('STREAMS', streamKey, id);
      return parseXreadgroupResponse(await runRawCommand(redisUrl, parts));
    } catch {
      return null;
    }
  },

  async xrange(
    redisUrl: string,
    streamKey: string,
    start: string,
    end: string,
    count = 100
  ): Promise<RedisStreamMessage[]> {
    try {
      return parseStreamMessages(await runRawCommand(redisUrl, ['XRANGE', streamKey, start, end, 'COUNT', String(count)]));
    } catch {
      return [];
    }
  },

  async xack(redisUrl: string, streamKey: string, groupName: string, ids: string[]): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    try {
      return asNumber(await runRawCommand(redisUrl, ['XACK', streamKey, groupName, ...ids])) ?? 0;
    } catch {
      return 0;
    }
  },

  async xdel(redisUrl: string, streamKey: string, ids: string[]): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    try {
      return asNumber(await runRawCommand(redisUrl, ['XDEL', streamKey, ...ids])) ?? 0;
    } catch {
      return 0;
    }
  },

  async xlen(redisUrl: string, streamKey: string): Promise<number | null> {
    try {
      return asNumber(await runRawCommand(redisUrl, ['XLEN', streamKey]));
    } catch {
      return null;
    }
  },
};
