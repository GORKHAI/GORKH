/**
 * Free tier rate limiter for GORKH AI
 *
 * Uses Redis sorted sets (ZSET) for fast rolling 24h window checks.
 * Falls back to in-memory tracking when Redis is unavailable.
 * Durable usage accounting is written to Postgres via recordCompletion().
 *
 * Safety caps:
 * - 5 user-initiated tasks per rolling 24-hour window
 * - Max 16,000 input tokens per task (enforced at proxy layer)
 * - Max 2,048 output tokens per task (enforced at proxy layer)
 * - Max 10 internal LLM iterations per task
 */

import { config } from '../config.js';
import { prisma } from '../db/prisma.js';
import { redisClient } from './redis.js';

// =============================================================================
// Constants
// =============================================================================

/** Maximum free tasks per user per rolling 24-hour window */
export const FREE_TIER_DAILY_LIMIT = 5;

/** Rolling window duration in seconds (24 hours) */
export const FREE_TIER_WINDOW_SECONDS = 24 * 60 * 60;

/** Maximum output tokens allowed per free task */
export const FREE_TIER_MAX_OUTPUT_TOKENS_PER_TASK = 2048;

/** Maximum input tokens allowed per free task */
export const FREE_TIER_MAX_INPUT_TOKENS_PER_TASK = 16000;

/** Maximum internal LLM iterations per free task */
export const FREE_TIER_MAX_INTERNAL_LLM_ITERATIONS = 10;

// DeepSeek pricing as of 2026-04-27
// https://api-docs.deepseek.com/quick_start/pricing
const DEEPSEEK_INPUT_TOKEN_COST_PER_1M = 0.27;
const DEEPSEEK_OUTPUT_TOKEN_COST_PER_1M = 1.10;

// =============================================================================
// Redis Key Builders
// =============================================================================

function freeTierUserKey(userId: string): string {
  return `freetier:user:${userId}:requests`;
}

// =============================================================================
// In-Memory Fallback
// =============================================================================

interface MemoryEntry {
  timestamps: number[];
}

const memoryBuckets = new Map<string, MemoryEntry>();

function pruneMemoryEntry(entry: MemoryEntry, now: number): void {
  const cutoff = now - FREE_TIER_WINDOW_SECONDS * 1000;
  entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);
}

function memoryCheckAndIncrement(userId: string): { allowed: boolean; remaining: number; resetAt: Date } {
  const now = Date.now();
  const entry = memoryBuckets.get(userId) ?? { timestamps: [] };
  pruneMemoryEntry(entry, now);

  const count = entry.timestamps.length;
  const resetAt = count > 0
    ? new Date(entry.timestamps[0] + FREE_TIER_WINDOW_SECONDS * 1000)
    : new Date(now + FREE_TIER_WINDOW_SECONDS * 1000);

  if (count >= FREE_TIER_DAILY_LIMIT) {
    memoryBuckets.set(userId, entry);
    return { allowed: false, remaining: 0, resetAt };
  }

  entry.timestamps.push(now);
  memoryBuckets.set(userId, entry);
  return { allowed: true, remaining: Math.max(0, FREE_TIER_DAILY_LIMIT - entry.timestamps.length), resetAt };
}

function memoryGetUsage(userId: string): { usedToday: number; remainingToday: number; resetAt: Date } {
  const now = Date.now();
  const entry = memoryBuckets.get(userId) ?? { timestamps: [] };
  pruneMemoryEntry(entry, now);
  const usedToday = entry.timestamps.length;
  const resetAt = usedToday > 0
    ? new Date(entry.timestamps[0] + FREE_TIER_WINDOW_SECONDS * 1000)
    : new Date(now + FREE_TIER_WINDOW_SECONDS * 1000);
  return { usedToday, remainingToday: Math.max(0, FREE_TIER_DAILY_LIMIT - usedToday), resetAt };
}

// =============================================================================
// Redis Implementation
// =============================================================================

async function redisCheckAndIncrement(userId: string): Promise<{ allowed: boolean; remaining: number; resetAt: Date } | null> {
  const redisUrl = config.REDIS_URL;
  const key = freeTierUserKey(userId);
  const now = Date.now();
  const nowSec = Math.floor(now / 1000);
  const windowStart = nowSec - FREE_TIER_WINDOW_SECONDS;

  try {
    // Remove entries older than 24 hours
    await redisClient.zremrangebyscore(redisUrl, key, 0, windowStart);

    // Count remaining entries
    const count = await redisClient.zcard(redisUrl, key);
    if (count === null) {
      return null;
    }

    // Get oldest entry to compute resetAt
    const oldest = await redisClient.zrange(redisUrl, key, 0, 0);
    const resetAt = oldest.length > 0
      ? new Date((Number.parseInt(oldest[0], 10) + FREE_TIER_WINDOW_SECONDS) * 1000)
      : new Date(now + FREE_TIER_WINDOW_SECONDS * 1000);

    if (count >= FREE_TIER_DAILY_LIMIT) {
      return { allowed: false, remaining: 0, resetAt };
    }

    // Add current request
    const requestId = `${now}-${Math.random().toString(36).slice(2, 10)}`;
    await redisClient.zadd(redisUrl, key, nowSec, requestId);
    // Set TTL on the key so it auto-expires after the window
    await redisClient.expire(redisUrl, key, FREE_TIER_WINDOW_SECONDS * 2);

    return { allowed: true, remaining: Math.max(0, FREE_TIER_DAILY_LIMIT - count - 1), resetAt };
  } catch {
    return null;
  }
}

async function redisGetUsage(userId: string): Promise<{ usedToday: number; remainingToday: number; resetAt: Date } | null> {
  const redisUrl = config.REDIS_URL;
  const key = freeTierUserKey(userId);
  const now = Date.now();
  const nowSec = Math.floor(now / 1000);
  const windowStart = nowSec - FREE_TIER_WINDOW_SECONDS;

  try {
    await redisClient.zremrangebyscore(redisUrl, key, 0, windowStart);
    const count = await redisClient.zcard(redisUrl, key);
    if (count === null) {
      return null;
    }

    const oldest = await redisClient.zrange(redisUrl, key, 0, 0);
    const resetAt = oldest.length > 0
      ? new Date((Number.parseInt(oldest[0], 10) + FREE_TIER_WINDOW_SECONDS) * 1000)
      : new Date(now + FREE_TIER_WINDOW_SECONDS * 1000);

    return { usedToday: count, remainingToday: Math.max(0, FREE_TIER_DAILY_LIMIT - count), resetAt };
  } catch {
    return null;
  }
}

// =============================================================================
// Public API
// =============================================================================

export interface CheckResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export interface UsageResult {
  usedToday: number;
  remainingToday: number;
  resetAt: Date;
}

/**
 * Check if a user has free tier quota remaining and atomically consume one slot.
 *
 * Uses Redis ZSET for the fast path; falls back to in-memory if Redis is unavailable.
 * The ZSET stores timestamp → request_id entries. Entries older than 24h are pruned.
 */
export async function checkAndIncrement(userId: string): Promise<CheckResult> {
  const redisResult = await redisCheckAndIncrement(userId);
  if (redisResult !== null) {
    return redisResult;
  }
  return memoryCheckAndIncrement(userId);
}

/**
 * Get current free tier usage without consuming a slot.
 *
 * Returns the number of tasks used today, remaining, and when the oldest entry resets.
 */
export async function getUsage(userId: string): Promise<UsageResult> {
  const redisResult = await redisGetUsage(userId);
  if (redisResult !== null) {
    return redisResult;
  }
  return memoryGetUsage(userId);
}

/**
 * Calculate cost in USD for a DeepSeek request.
 *
 * Pricing: $0.27 per 1M input tokens, $1.10 per 1M output tokens.
 * Documented as of 2026-04-27.
 */
export function calculateDeepSeekCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * DEEPSEEK_INPUT_TOKEN_COST_PER_1M + outputTokens * DEEPSEEK_OUTPUT_TOKEN_COST_PER_1M) / 1_000_000;
}

/**
 * Record a completed free tier request to Postgres for durable accounting.
 *
 * This is called after the upstream LLM responds (success or error).
 * It does NOT affect the rate limit counter — that was consumed by checkAndIncrement.
 */
export async function recordCompletion(
  userId: string,
  requestId: string,
  inputTokens: number,
  outputTokens: number,
  cost: number,
  status: string,
  model: string
): Promise<void> {
  await prisma.userFreeTierUsage.create({
    data: {
      user_id: userId,
      request_id: requestId,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_cost_usd: cost,
      model,
      status,
    },
  });
}
