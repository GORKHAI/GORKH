/**
 * GORKH AI Free tier LLM proxy endpoint
 *
 * Routes desktop/web free-tier requests to DeepSeek with usage limits.
 */

import { z } from 'zod';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config.js';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../lib/auth.js';
import { authenticateDesktopDeviceSession } from '../lib/desktop-session.js';
import { devicesRepo } from '../repos/devices.js';
import {
  checkAndIncrement,
  getUsage,
  recordCompletion,
  calculateDeepSeekCost,
  FREE_TIER_MAX_INPUT_TOKENS_PER_TASK,
  FREE_TIER_MAX_OUTPUT_TOKENS_PER_TASK,
  FREE_TIER_DAILY_LIMIT,
} from '../lib/freeTierLimiter.js';
import { incCounter, observeDuration } from '../lib/metrics.js';
import { reportError } from '../lib/error-tracking.js';
import { randomUUID } from 'node:crypto';

// =============================================================================
// Request Validation
// =============================================================================

const freeChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.union([z.string(), z.record(z.unknown())]),
});

const freeChatToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  input_schema: z.record(z.unknown()),
});

const freeChatRequestSchema = z.object({
  messages: z.array(freeChatMessageSchema).min(1).max(100),
  tools: z.array(freeChatToolSchema).optional(),
  tool_choice: z.union([z.enum(['auto', 'none']), z.object({ type: z.literal('tool'), name: z.string() })]).optional(),
  max_tokens: z.number().int().min(1).max(FREE_TIER_MAX_OUTPUT_TOKENS_PER_TASK).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

// =============================================================================
// Auth Helper
// =============================================================================

interface FreeTierUser {
  userId: string;
  authType: 'desktop' | 'web';
}

async function resolveFreeTierUser(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FreeTierUser | null> {
  // Try desktop device token first (Bearer opaque token)
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const deviceToken = authHeader.slice('Bearer '.length).trim();
    const session = await authenticateDesktopDeviceSession({ deviceToken, devicesRepo });
    if (session.ok) {
      return { userId: session.userId, authType: 'desktop' };
    }
  }

  // Fall back to web JWT auth (cookie or Bearer JWT)
  const webUser = await requireAuth(request, reply);
  if (webUser) {
    return { userId: webUser.id, authType: 'web' };
  }

  return null;
}

// =============================================================================
// DeepSeek Integration
// =============================================================================

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_FREE_TIER_MODEL = 'deepseek-chat';

/** Rough input token estimate (1 token ≈ 4 chars for English) */
function estimateInputTokens(messages: Array<{ role: string; content: string | object }>): number {
  let chars = 0;
  for (const msg of messages) {
    const text = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
    chars += text.length;
  }
  return Math.ceil(chars / 4);
}

interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
      tool_calls?: Array<{
        id: string;
        type: string;
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// =============================================================================
// Route Registration
// =============================================================================

export async function registerFreeTierRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /llm/free/chat
  fastify.post('/llm/free/chat', async (request, reply) => {
    const startTime = Date.now();
    const correlationId = (request.headers['x-request-id'] as string | undefined) ?? request.id;
    const requestId = randomUUID();

    // Kill switch
    if (!config.FREE_TIER_ENABLED) {
      reply.status(503);
      return {
        error: 'free_tier_disabled',
        message: 'Free tier temporarily disabled. Use your own API key in Settings.',
      };
    }

    // Auth
    const user = await resolveFreeTierUser(request, reply);
    if (!user) {
      reply.status(401);
      return { error: 'Unauthorized' };
    }

    // Validate body
    const parseResult = freeChatRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      reply.status(400);
      return {
        error: 'invalid_request',
        message: parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      };
    }
    const body = parseResult.data;

    // Input size check
    const estimatedInputTokens = estimateInputTokens(body.messages);
    if (estimatedInputTokens > FREE_TIER_MAX_INPUT_TOKENS_PER_TASK) {
      reply.status(400);
      return {
        error: 'input_too_large',
        message: `Input too large: estimated ${estimatedInputTokens} tokens exceeds limit of ${FREE_TIER_MAX_INPUT_TOKENS_PER_TASK}.`,
      };
    }

    // Rate limit check
    const limitResult = await checkAndIncrement(user.userId);
    if (!limitResult.allowed) {
      incCounter('free_tier_rate_limited_total', { userId: user.userId });
      reply.status(429);
      return {
        error: 'free_tier_exhausted',
        message: `You've used your ${FREE_TIER_DAILY_LIMIT} free tasks for today. Resets at ${limitResult.resetAt.toISOString()}, or bring your own API key for unlimited use.`,
        reset_at: limitResult.resetAt.toISOString(),
      };
    }

    // Cap max_tokens
    const cappedMaxTokens = Math.min(
      body.max_tokens ?? FREE_TIER_MAX_OUTPUT_TOKENS_PER_TASK,
      FREE_TIER_MAX_OUTPUT_TOKENS_PER_TASK
    );

    // Build DeepSeek payload
    const deepseekPayload: Record<string, unknown> = {
      model: DEEPSEEK_FREE_TIER_MODEL,
      messages: body.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: cappedMaxTokens,
      stream: false,
    };

    if (body.tools && body.tools.length > 0) {
      deepseekPayload.tools = body.tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema,
        },
      }));
    }
    if (body.tool_choice) {
      deepseekPayload.tool_choice = body.tool_choice;
    }
    if (body.temperature !== undefined) {
      deepseekPayload.temperature = body.temperature;
    }

    // Call DeepSeek
    const apiKey = config.DEEPSEEK_FREE_TIER_API_KEY;
    if (!apiKey) {
      reply.status(503);
      return {
        error: 'free_tier_misconfigured',
        message: 'Free tier is not available right now. Please try again later or use your own API key.',
      };
    }

    let deepseekResponse: Response;
    let deepseekJson: DeepSeekResponse | null = null;

    try {
      deepseekResponse = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(deepseekPayload),
      });
    } catch (err) {
      const durationMs = Date.now() - startTime;
      observeDuration('free_tier_upstream_duration_ms', durationMs, { userId: user.userId, result: 'network_error' });
      reportError(err instanceof Error ? err : new Error(String(err)), {
        correlationId,
        userId: user.userId,
        path: 'hosted_fallback',
        errorCode: 'FREE_TIER_UPSTREAM_ERROR',
        tags: { phase: 'free_tier_upstream', durationMs },
      });

      // Record failure without consuming a slot — network errors don't count as usage
      await recordCompletion(
        user.userId,
        requestId,
        0,
        0,
        0,
        'error',
        DEEPSEEK_FREE_TIER_MODEL
      );

      reply.status(503);
      return {
        error: 'upstream_unavailable',
        message: 'Service temporarily busy. Please retry in a moment.',
      };
    }

    const responseText = await deepseekResponse.text();

    try {
      deepseekJson = JSON.parse(responseText) as DeepSeekResponse;
    } catch {
      deepseekJson = null;
    }

    // Handle DeepSeek HTTP errors
    if (!deepseekResponse.ok) {
      const durationMs = Date.now() - startTime;
      observeDuration('free_tier_upstream_duration_ms', durationMs, { userId: user.userId, result: `upstream_${deepseekResponse.status}` });

      if (deepseekResponse.status === 429) {
        // DeepSeek's rate limit — don't consume our slot
        reply.status(503);
        return {
          error: 'upstream_rate_limited',
          message: 'Service temporarily busy. Please retry in a moment.',
        };
      }

      if (deepseekResponse.status >= 500) {
        reply.status(503);
        return {
          error: 'upstream_error',
          message: 'Service temporarily busy. Please retry in a moment.',
        };
      }

      // 4xx errors from DeepSeek — consume slot because it was a bad request
      const inputTokens = deepseekJson?.usage?.prompt_tokens ?? estimatedInputTokens;
      const outputTokens = deepseekJson?.usage?.completion_tokens ?? 0;
      const cost = calculateDeepSeekCost(inputTokens, outputTokens);

      await recordCompletion(
        user.userId,
        requestId,
        inputTokens,
        outputTokens,
        cost,
        'error',
        DEEPSEEK_FREE_TIER_MODEL
      );

      reply.status(400);
      return {
        error: 'upstream_bad_request',
        message: 'The request could not be processed. Please check your input and try again.',
      };
    }

    // Success
    const durationMs = Date.now() - startTime;
    observeDuration('free_tier_upstream_duration_ms', durationMs, { userId: user.userId, result: 'success' });
    incCounter('free_tier_requests_total', { userId: user.userId });

    const usage = deepseekJson?.usage;
    const inputTokens = usage?.prompt_tokens ?? estimatedInputTokens;
    const outputTokens = usage?.completion_tokens ?? 0;
    const cost = calculateDeepSeekCost(inputTokens, outputTokens);

    await recordCompletion(
      user.userId,
      requestId,
      inputTokens,
      outputTokens,
      cost,
      'success',
      DEEPSEEK_FREE_TIER_MODEL
    );

    const message = deepseekJson?.choices?.[0]?.message ?? { role: 'assistant', content: '' };

    reply.status(200);
    return {
      request_id: requestId,
      message: {
        role: 'assistant',
        content: message.content,
        ...(message.tool_calls ? { tool_calls: message.tool_calls } : {}),
      },
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      },
      free_tier: {
        remaining_today: limitResult.remaining,
        reset_at: limitResult.resetAt.toISOString(),
      },
    };
  });

  // GET /llm/free/usage
  fastify.get('/llm/free/usage', async (request, reply) => {
    const user = await resolveFreeTierUser(request, reply);
    if (!user) {
      reply.status(401);
      return { error: 'Unauthorized' };
    }

    const usage = await getUsage(user.userId);

    // Lifetime used from Postgres
    const lifetimeResult = await prisma.userFreeTierUsage.aggregate({
      where: { user_id: user.userId },
      _sum: { input_tokens: true, output_tokens: true },
      _count: { _all: true },
    });

    return {
      remaining_today: usage.remainingToday,
      used_today: usage.usedToday,
      reset_at: usage.resetAt.toISOString(),
      daily_limit: FREE_TIER_DAILY_LIMIT,
      lifetime_used: lifetimeResult._count._all,
    };
  });
}
