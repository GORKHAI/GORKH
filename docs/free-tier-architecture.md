# GORKH AI Free Tier Architecture

**Date:** 2026-04-27  
**Status:** Implemented, pending production load testing  
**Owner:** Backend Platform + Desktop Tauri teams

---

## 1. Overview

GORKH AI Free Tier lets signed-in desktop users run up to **5 AI-assisted tasks per rolling 24-hour window** without configuring an API key. Tasks are powered by **DeepSeek** (`deepseek-chat`) and proxied through the GORKH Render API.

### Why this exists
- **Zero-friction onboarding**: New users can try GORKH immediately after signing in.
- **No key management**: API keys are never exposed client-side; the server holds the DeepSeek key.
- **Abuse-resistant**: Redis ZSET rolling windows + IP rate limits + anomaly logging protect the shared quota pool.

---

## 2. User Flow

```
1. User signs in on desktop → device token stored in OS keychain
2. Default LLM provider is "GORKH AI (Free)"
3. User sends a chat message
4. Desktop Rust layer POSTs to /llm/free/chat with device token as Bearer
5. API checks quota → forwards to DeepSeek → records usage → returns result + remaining count
6. Desktop UI shows a green pill: "X tasks remaining"
7. When exhausted, UI shows red pill + paywall card prompting API key setup
```

---

## 3. System Architecture

### 3.1 Components

| Layer | File | Responsibility |
|-------|------|----------------|
| **Database** | `prisma/schema.prisma` → `UserFreeTierUsage` | Durable usage accounting (audit trail) |
| **Rate Limiter** | `apps/api/src/lib/freeTierLimiter.ts` | Redis ZSET rolling window; in-memory fallback |
| **LLM Proxy** | `apps/api/src/routes/free.ts` | `POST /llm/free/chat`, `GET /llm/free/usage` |
| **Auth** | `requireAuth` (cookie/JWT) | Web auth for the free tier endpoints |
| **Desktop Provider** | `apps/desktop/src-tauri/src/llm/gorkh_free.rs` | Rust client that routes chat through Render API |
| **Desktop UI** | `ChatOverlay.tsx`, `SettingsPanel.tsx` | Usage pill, paywall card, empty-state copy |

### 3.2 Data Flow

```
┌─────────────┐     device token      ┌─────────────────┐
│   Desktop   │ ────────────────────→ │  Render API     │
│  (Tauri)    │   Authorization:      │  /llm/free/chat │
│             │   Bearer <token>      │                 │
└─────────────┘                       └────────┬────────┘
                                               │
                     ┌─────────────────────────┼─────────────────────────┐
                     ↓                         ↓                         ↓
              ┌─────────────┐           ┌─────────────┐           ┌─────────────┐
              │ Redis ZSET  │           │   DeepSeek  │           │  PostgreSQL │
              │  (quota)    │           │   API       │           │  (audit)    │
              └─────────────┘           └─────────────┘           └─────────────┘
```

---

## 4. Rate Limiter Design

### 4.1 User Quota (Redis ZSET)

- **Key**: `freetier:user:<userId>:requests`
- **Score**: Unix timestamp (seconds)
- **Member**: Unique request ID
- **Algorithm**:
  1. `ZREMRANGEBYSCORE` to prune entries older than 24h
  2. `ZCARD` to count remaining entries
  3. If count < 5, `ZADD` new entry and allow
  4. If count >= 5, reject with 429
- **TTL**: Key auto-expires after 48h to prevent Redis bloat

### 4.2 In-Memory Fallback

If Redis is unreachable, the limiter falls back to a module-level `Map<string, number[]>` that stores timestamps in milliseconds. The same pruning logic applies.

### 4.3 IP Rate Limit

- **Key**: `freetier:ip:<ip>:requests`
- **Limit**: 100 requests per hour per IP
- **Purpose**: Coarse abuse prevention (shared IPs, bot traffic)

### 4.4 Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `FREE_TIER_DAILY_LIMIT` | 5 | Tasks per user per 24h |
| `FREE_TIER_WINDOW_SECONDS` | 86,400 | Rolling window duration |
| `FREE_TIER_MAX_OUTPUT_TOKENS_PER_TASK` | 2,048 | Output token cap |
| `FREE_TIER_MAX_INPUT_TOKENS_PER_TASK` | 16,000 | Input token cap (character estimate) |
| `FREE_TIER_IP_HOURLY_LIMIT` | 100 | IP-level abuse throttle |

---

## 5. API Endpoints

### `POST /llm/free/chat`

**Auth**: `requireAuth` (web cookie/JWT)  
**Body**:
```json
{
  "messages": [{"role": "user", "content": "..."}],
  "tools": [],
  "tool_choice": "auto",
  "max_tokens": 1024,
  "temperature": 0.7
}
```

**Response (success)**:
```json
{
  "request_id": "uuid",
  "message": {"role": "assistant", "content": "..."},
  "usage": {"prompt_tokens": 100, "completion_tokens": 50},
  "free_tier": {"remaining_today": 3, "reset_at": "2026-04-28T12:00:00Z"}
}
```

**Response (exhausted)**:
```json
{"error": "free_tier_exhausted", "message": "Daily limit reached"}
```

**Safeguards**:
1. Kill switch (`FREE_TIER_ENABLED=false` → 503)
2. IP rate limit → 429 with `Retry-After`
3. Input size check (>16k char estimate → 400)
4. `max_tokens` capped at 2048
5. User quota check → 429 if exhausted

### `GET /llm/free/usage`

**Auth**: `requireAuth`  
**Response**:
```json
{
  "remaining_today": 3,
  "used_today": 2,
  "reset_at": "2026-04-28T12:00:00Z",
  "daily_limit": 5,
  "lifetime_used": 47
}
```

---

## 6. Desktop Integration

### 6.1 Rust Provider

`GorkhFreeProvider` in `llm/gorkh_free.rs`:
- Builds URL: `{api_base_url}/llm/free/chat`
- Sends device token as `Authorization: Bearer {token}`
- On 429 with `error: "free_tier_exhausted"`, returns `LlmErrorCode::FreeTierExhausted`

### 6.2 TypeScript UI

**Default provider**: `gorkh_free` (since v0.0.39)  
**Settings**: No API key field shown for GORKH AI Free  
**Chat header**: Green pill shows remaining tasks; red pill when exhausted  
**Paywall card**: Appears in input area when `remaining_today === 0`, prompting API key setup  
**Empty state**: Mentions free task limit in welcome copy

### 6.3 Error Handling

When `FREE_TIER_EXHAUSTED` is received:
- Fallback to hosted Free AI is **not** attempted (the user is already on the hosted path)
- A friendly message is shown: "You have used all your free tasks for today..."
- The user can open Settings to switch to a paid provider

---

## 7. Cost Model

DeepSeek pricing (as of 2026-04-27):
- Input: $0.27 per 1M tokens
- Output: $1.10 per 1M tokens

```
cost_usd = (input_tokens * 0.27 + output_tokens * 1.10) / 1_000_000
```

At 5 tasks/day averaging 2k input + 1k output tokens:
- ~$0.0038 per user per day
- ~$0.115 per user per month

---

## 8. Safeguards & Kill Switches

| Safeguard | Implementation | Response |
|-----------|---------------|----------|
| **Kill switch** | `FREE_TIER_ENABLED` env var | 503 Service Unavailable |
| **IP rate limit** | Redis ZSET 100/hour | 429 + `Retry-After` header |
| **Anomaly detection** | Log warning if >4 tasks within 30min of signup | Log only (does not block) |
| **Input size cap** | 16,000 char estimate | 400 Bad Request |
| **Output token cap** | `max_tokens` clamped to 2048 | Silently capped |

---

## 9. Operational Runbook

### 9.1 Disabling Free Tier

```bash
# Emergency: disable immediately
heroku config:set FREE_TIER_ENABLED=false  # or Render equivalent
```

Existing in-flight requests will complete; new requests get 503.

### 9.2 Investigating Abuse

1. Check Redis for hot keys: `KEYS freetier:ip:*`
2. Look for anomaly logs: `"Anomaly: high free tier usage for new user"`
3. Inspect Postgres `UserFreeTierUsage` table for suspicious patterns

### 9.3 Adjusting Limits

Edit `apps/api/src/lib/freeTierLimiter.ts`:
```ts
export const FREE_TIER_DAILY_LIMIT = 5;  // change this
```

Redeploy. Existing ZSET entries are not affected; the new limit applies to new requests.

---

## 10. Future Work

- **Email notification** when user hits 80% of daily quota
- **Streak bonuses** for daily active users (e.g., +1 task after 7-day streak)
- **Referral program** to earn additional free tasks
- **Graduated limits** based on account age or verification status
- **Web dashboard** showing usage history and reset timer

---

## 11. Related Files

```
apps/api/prisma/migrations/20260427_0007_user_free_tier_usage/migration.sql
apps/api/src/lib/freeTierLimiter.ts
apps/api/src/routes/free.ts
apps/api/src/index.ts
apps/desktop/src-tauri/src/llm/gorkh_free.rs
apps/desktop/src-tauri/src/llm/error.rs
apps/desktop/src/lib/freeTier.ts
apps/desktop/src/components/ChatOverlay.tsx
apps/desktop/src/App.tsx
docs/free-tier-architecture.md
```
