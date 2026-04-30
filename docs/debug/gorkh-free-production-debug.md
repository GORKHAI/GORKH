# GORKH Free Production Debug Guide

## Quick Checks

### 1. Verify Render API health

```bash
curl -s https://api.gorkh.com/ready | jq .
```

Expected:
```json
{ "status": "ready", "db": true, "version": "x.y.z" }
```

### 2. Verify desktop auth endpoint (models list)

Replace `<DEVICE_TOKEN>` with the desktop device token from keychain.

```bash
curl -s -H "Authorization: Bearer <DEVICE_TOKEN>" \
  https://api.gorkh.com/desktop/free-ai/v1/models | jq .
```

Expected:
- `200` — authenticated, returns model list
- `401` — missing or invalid desktop auth
- `429` — quota exceeded (rare for `/models`)

### 3. Verify free-tier chat endpoint

```bash
curl -s -X POST \
  -H "Authorization: Bearer <DEVICE_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "x-request-id: debug-$(date +%s)" \
  -d '{"messages":[{"role":"user","content":"Hello"}],"max_tokens":100}' \
  https://api.gorkh.com/llm/free/chat | jq .
```

Expected:
- `200` — successful inference
- `401` — missing/invalid desktop auth
- `429` — daily quota exhausted (5 jobs/day)
- `503` — free tier disabled or upstream error

### 4. Verify free-tier usage endpoint

```bash
curl -s -H "Authorization: Bearer <DEVICE_TOKEN>" \
  https://api.gorkh.com/llm/free/usage | jq .
```

Expected:
```json
{
  "remaining_today": 3,
  "used_today": 2,
  "reset_at": "2026-05-01T00:00:00.000Z",
  "daily_limit": 5,
  "lifetime_used": 42
}
```

## Render Environment Variables (names only)

Verify these are set in the Render dashboard (do not print values):

| Variable | Purpose |
|----------|---------|
| `FREE_TIER_ENABLED` | Master kill-switch for `/llm/free/chat` |
| `DEEPSEEK_FREE_TIER_API_KEY` | Server-side DeepSeek API key |
| `FREE_AI_FALLBACK_ENABLED` | Toggle for `/desktop/free-ai/v1/*` endpoints |
| `FREE_AI_FALLBACK_BASE_URL` | Upstream for hosted fallback |
| `FREE_AI_FALLBACK_MODEL` | Model name for fallback |
| `FREE_AI_FALLBACK_API_KEY` | Auth key for fallback upstream |
| `API_PUBLIC_BASE_URL` | Public API URL used in desktop builds |

## Desktop Build Environment Variables

Production DMG builds must have:

| Variable | Expected Value |
|----------|----------------|
| `VITE_API_HTTP_BASE` | `https://api.gorkh.com` |
| `VITE_API_WS_URL` | `wss://api.gorkh.com/ws` |
| `VITE_DESKTOP_UPDATER_ENABLED` | `true` (for releases) |
| `VITE_DESKTOP_ALLOW_INSECURE_LOCALHOST` | `false` (production) |

**Important:** `VITE_FREE_AI_ENABLED` is no longer used to gate GORKH Free functionality. The feature is always available to signed-in users; backend enforces availability and quota.

## Desktop Log Inspection

Enable Tauri devtools or check Console.app for logs. Look for:

```
[App] Connection status: connected
[LLM_USAGE] {"event":"llm_request_complete","provider":"gorkh_free","path":"hosted_fallback",...}
```

If you see **no** `llm_request_complete` with `provider: "gorkh_free"` after sending a message, the frontend is blocking before the network call. Check:
1. `providerStatusState.activeConfigured` is `true`
2. `sessionDeviceToken` is non-null
3. `llmSettings.provider` is `"gorkh_free"`

## Expected Render Request Log Pattern

When a signed-in desktop user sends a message with GORKH Free selected:

```
GET  /ready                     200  (health check on startup)
GET  /desktop/free-ai/v1/models 200  (optional: Settings test)
POST /llm/free/chat             200  (inference request)
GET  /llm/free/usage            200  (usage refresh)
```

If you see `GET /ready` but **no** `POST /llm/free/chat`, the desktop app is blocked at the frontend readiness gate. This was the bug fixed by removing the `FREE_AI_ENABLED` build-time gate from `providerStatus.ts`.

## Sign-In vs API-Key Error Mapping

| State | Expected Message |
|-------|-----------------|
| Not signed in, provider = gorkh_free | "Sign in to use GORKH AI (Free). No API key needed." |
| Not signed in, provider = openai | "I'm not connected to OpenAI yet. Add an API key in Settings to get started, or switch to GORKH AI." |
| Signed in, provider = gorkh_free, quota exhausted | "You have used your 5 free tasks today. Try again tomorrow, or add your own API key in Settings." |
| Signed in, provider = gorkh_free, backend 503 | "GORKH AI (Free) is temporarily unavailable. Please try again in a moment." |
| Signed in, provider = openai, no key | "Add an API key in Settings to get started." |
