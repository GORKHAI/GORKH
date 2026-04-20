# GORKH Codebase Audit

Generated: 2026-04-20  
Scope: Full monorepo end-to-end read-only audit. No code was changed.  
Analyst method: Parallel subagent exploration of all apps, packages, infra, CI/CD, docs, and targeted file reads for line-range citations.

---

## 1. Repository map

```
.
├── .github/workflows/          # CI/CD pipelines (ci, desktop-ci, desktop-release, dependency-review)
├── .kimi/skills/               # Kimi Code skill library
├── apps/
│   ├── api/                    # Fastify backend (Node.js/TypeScript/Prisma)
│   ├── desktop/                # Tauri 2 + React + Vite desktop app (Rust + TypeScript)
│   ├── ios/                    # SwiftUI iOS companion app (Xcode project, no package manager)
│   └── web/                    # Next.js 14 App Router web portal (React/TypeScript)
├── docs/                       # Architecture docs, runbooks, iteration plans
│   └── plans/                  # Dated implementation/design plan pairs
├── infra/                      # Docker Compose, nginx, Prometheus, Grafana
├── packages/shared/            # Shared TypeScript types, Zod schemas, agent types, LLM error codes
├── scripts/release/            # Release verification scripts
├── scripts/smoke/              # HTTP and WebSocket smoke tests
└── tests/                      # Integration and e2e tests (Node.js test runner)
```

**Root workspace configuration**
- [`package.json`](package.json:1): name `ai-operator`, packageManager `pnpm@9.15.0`, node `>=20`, build via `turbo`
- [`pnpm-workspace.yaml`](pnpm-workspace.yaml:1): workspaces `apps/*`, `packages/*`
- [`turbo.json`](turbo.json:1): build depends on `^build`, dev is persistent, global env includes `NODE_ENV`, `PORT`, `NEXT_PUBLIC_API_BASE`, `VITE_API_HTTP_BASE`, `VITE_API_WS_URL`
- [`tsconfig.base.json`](tsconfig.base.json:1): `ES2022`, `NodeNext`, strict, `noUnusedLocals: true`, `noUnusedParameters: true`

---

## 2. Tech stack inventory

### apps/api
- **Language:** TypeScript (Node.js >=20)
- **Framework:** Fastify 5 + `@fastify/cookie` + `@fastify/cors` + `@fastify/websocket`
- **Major dependencies:** Prisma, argon2, jsonwebtoken, stripe, zod, `@ai-operator/shared`
- **Build tool:** `tsc` (no bundler)
- **Entry point:** [`apps/api/src/index.ts`](apps/api/src/index.ts:1)
- **Dev command:** `pnpm --filter @ai-operator/api dev` → `tsx watch src/index.ts`
- **Test runner:** Node.js built-in `--test`

### apps/desktop — React frontend
- **Language:** TypeScript
- **Framework:** React 19 + Vite 6
- **Major dependencies:** `@tauri-apps/api` 2.2.0, `@tauri-apps/plugin-updater`, `@ai-operator/shared`
- **Build tool:** Vite + `tsc --noEmit`
- **Entry point:** [`apps/desktop/src/main.tsx`](apps/desktop/src/main.tsx:1) → renders `App.tsx`
- **Dev command:** `pnpm --filter @ai-operator/desktop dev` → `vite`; `tauri:dev` → `tauri dev`

### apps/desktop — Rust backend
- **Language:** Rust (edition 2021)
- **Framework:** Tauri 2
- **Major dependencies:** `tauri` 2 (features `macos-private-api`, `tray-icon`), `tauri-plugin-updater` 2, `screenshots` 0.8, `enigo` 0.1, `keyring` 3, `reqwest` 0.12, `tokio` 1, `auto-launch` 0.5
- **Entry point:** [`apps/desktop/src-tauri/src/main.rs`](apps/desktop/src-tauri/src/main.rs:1) → `ai_operator_desktop_lib::run()`
- **Dev command:** `pnpm --filter @ai-operator/desktop tauri:dev`

### apps/web
- **Language:** TypeScript
- **Framework:** Next.js 15 (App Router), React 19
- **Major dependencies:** `next` 15, `react` 19, `lucide-react`
- **Build tool:** `next build`
- **Entry point:** [`apps/web/app/layout.tsx`](apps/web/app/layout.tsx:1) → [`apps/web/app/page.tsx`](apps/web/app/page.tsx:1)
- **Dev command:** `pnpm --filter @ai-operator/web dev`

### apps/ios
- **Language:** Swift 5.0
- **Framework:** SwiftUI, iOS SDK 17.0+
- **Major dependencies:** None (vanilla iOS; no SPM, CocoaPods, or Carthage)
- **Entry point:** [`apps/ios/AICompanion/App/AICompanionApp.swift`](apps/ios/AICompanion/App/AICompanionApp.swift:1)
- **Build tool:** Xcode (`AICompanion.xcodeproj`)

### packages/shared
- **Language:** TypeScript
- **Major dependencies:** `zod` 4.3.6
- **Build tool:** `tsup` (ESM + DTS)
- **Entry point:** [`packages/shared/src/index.ts`](packages/shared/src/index.ts:1)

### Version mismatches flagged
- **React 19** is used in both `apps/desktop` and `apps/web`, but `@types/react` 19 may still be stabilizing.
- **No Tauri 1 vs 2 mismatch** — all Tauri deps are version 2 across the board.
- **`apps/api` uses `@types/node` 20**, while root also uses `@types/node` 20. Consistent.

---

## 3. Shared types and contracts

### packages/shared/src/index.ts (1747 lines)
Primary barrel file. Exports 140+ symbols across protocol types, Zod schemas, sanitization utilities, and constants.

**Key exported constants**
| Symbol | Line | Purpose |
|--------|------|---------|
| `PROTOCOL_VERSION` | 4 | WS/WebRTC protocol version (`1`) |
| `API_VERSION` | 23 | REST API contract version (`'1.0'`) |
| `RunStatus` / `StepStatus` | 37–54 | Run/step lifecycle enums |
| `ApprovalDecision` / `ApprovalRisk` | 56–67 | Approval enums |
| `ToolName` | 312 | 9 tool name constants (`fs.list`, `fs.read_text`, `terminal.exec`, etc.) |
| `DEFAULT_RUN_CONSTRAINTS` | 679 | `{ maxActions: 20, maxRuntimeMinutes: 20 }` |

**Key exported types**
| Type | Line | Purpose |
|------|------|---------|
| `DeviceAction` | 228 | Full action descriptor |
| `Run` / `RunWithSteps` | 733–754 | Run descriptor with optional step/approval hydration |
| `AgentProposal` | 587 | Union: `ProposeActionProposal \| ProposeToolProposal \| AskUserProposal \| DoneProposal` |
| `ToolCall` / `ToolResult` | 382–446 | All tool calls and results |
| `ServerMessage` / `DeviceMessage` | 1327–1655 | Zod-inferred WS message unions |
| `ServerEventType` | 1728 | Server-side broadcast event union for SSE |

**Exported functions**
| Function | Line | Purpose |
|----------|------|---------|
| `parseDeviceMessage` | 1661 | Zod runtime validation of incoming WS messages |
| `parseServerMessage` | 1669 | Zod runtime validation of outgoing WS messages |
| `sanitizeToolCallForPersistence` | 505 | Redacts paths/content before DB write |
| `redactToolCallForLog` | 548 | Redacts tool calls for logging |

### packages/shared/src/agent/types.ts (333 lines)
Agent workflow types: `WorkflowPhase`, `AgentRole` (16 roles), `RalphConfig`, `CodeReview`, `CommandContext`, `CommandResult`.

### packages/shared/src/agent/agents.ts (386 lines)
`AGENTS` registry (`Record<AgentRole, Agent>`) and grouping constants.

### packages/shared/src/agent/workflow.ts (561 lines)
Workflow state machine with 5 phases (`research`, `specify`, `plan`, `work`, `review`). All phase executors (`executeResearchPhase`, `executeSpecifyPhase`, etc.) are async stubs that throw `new Error('Not implemented')` at lines 188, 237, 311, 389, 424.

### Consumers
- **API:** 17 files import from `@ai-operator/shared`
- **Desktop:** 24 files import from `@ai-operator/shared`
- **Web:** **Zero imports** from `@ai-operator/shared`. Web app duplicates or ignores shared types.

### Type drift
- [`apps/api/src/engine/runEngine.ts`](apps/api/src/engine/runEngine.ts:298–305): Local `SSEEvent` type uses `unknown` for `device_update` and `action_update`, and an inline object for `screen_update.meta` instead of `ScreenFrameMeta`. This weakens the shared `ServerEventType` contract.
- [`apps/api/src/repos/runs.ts`](apps/api/src/repos/runs.ts:31): `mapRun(row: any)` — Prisma row cast to `any`.
- [`apps/api/src/repos/actions.ts`](apps/api/src/repos/actions.ts:26): `rowToAction(row: any)`.
- [`apps/api/src/repos/tools.ts`](apps/api/src/repos/tools.ts:29): `mapTool(row: any)`.

---

## 4. API surface (apps/api)

### Routes
All routes registered directly in [`apps/api/src/index.ts`](apps/api/src/index.ts:1) (monolithic, no sub-routers).

| Method | Path | Lines | Description |
|--------|------|-------|-------------|
| GET | `/` | 15–26 (lib/root-route.ts) | Root info |
| GET | `/health` | 856–864 | Liveness |
| GET | `/ready` | 866–881 | Readiness (DB + schema checks) |
| GET | `/admin/health` | 883–906 | Admin health with version drift |
| GET | `/metrics` | 908–919 | Prometheus metrics |
| POST | `/auth/register` | 925–950 | Email/password registration |
| POST | `/auth/login` | 952–983 | Cookie + JWT login |
| POST | `/auth/refresh` | 985–1023 | Refresh token rotation |
| POST | `/auth/logout` | 1025–1039 | Cookie-based logout |
| POST | `/auth/logout_all` | 1041–1054 | Revoke all sessions |
| GET | `/auth/me` | 1056–1068 | Current user |
| GET | `/auth/sessions` | 1070–1087 | Active sessions |
| POST | `/desktop/auth/start` | 1089–1125 | Desktop OAuth loopback start |
| POST | `/desktop/auth/exchange` | 1127–1185 | Handoff token → device token |
| POST | `/desktop/auth/logout` | 1187–1219 | Revoke desktop session |
| POST | `/desktop/auth/complete` | 1221–1264 | Browser completes desktop auth |
| GET | `/desktop/me` | 1266–1306 | Desktop bootstrap (user, billing, device, runs) |
| GET | `/desktop/account` | 1308–1330 | Desktop account snapshot |
| GET | `/desktop/free-ai/v1/models` | 1332–1351 | Hosted Free AI model list proxy |
| POST | `/desktop/free-ai/v1/chat/completions` | 1353–1541 | Hosted Free AI chat proxy |
| POST | `/desktop/runs` | 1543–1616 | Create run for owned device |
| POST | `/desktop/devices/:deviceId/revoke` | 1618–1660 | Revoke a desktop device |
| GET | `/updates/desktop/:platform/:arch/:currentVersion.json` | 1666–1695 | Updater manifest feed |
| GET | `/billing/status` | 1697–1710 | Subscription status |
| GET | `/downloads/desktop` | 1712–1721 | Desktop download metadata |
| GET | `/downloads/desktop/artifacts/:artifactName` | 1723–1741 | Artifact redirect |
| POST | `/billing/checkout` | 1743–1790 | Stripe checkout session |
| POST | `/billing/portal` | 1792–1818 | Stripe billing portal |
| POST | `/billing/webhook` | 1820–1903 | Stripe webhook handler |
| GET | `/devices` | 1909–1918 | List devices |
| GET | `/devices/:deviceId` | 1920–1935 | Get device |
| POST | `/devices/:deviceId/pair` | 1937–1996 | Pair device via pairing code |
| GET | `/devices/:deviceId/screen/meta` | 2002–2024 | Screen stream metadata |
| GET | `/devices/:deviceId/screen.png` | 2026–2053 | Screen PNG snapshot |
| POST | `/devices/:deviceId/actions` | 2060–2160 | Create remote control action |
| GET | `/devices/:deviceId/actions` | 2163–2180 | List actions for device |
| POST | `/runs` | 2186–2249 | Create run |
| GET | `/runs/:runId` | 2251–2266 | Get run |
| GET | `/runs` | 2268–2277 | List runs |
| GET | `/devices/:deviceId/runs` | 2279–2293 | List runs for device |
| POST | `/runs/:runId/cancel` | 2295–2329 | Cancel run |
| GET | `/runs/:runId/tools` | 2336–2353 | List tool events for run |
| GET | `/devices/:deviceId/tools` | 2356–2373 | List tool events for device |
| GET | `/events` | 2379–2423 | SSE event stream |

### WebSocket events
Handler: [`apps/api/src/lib/ws-handler.ts`](apps/api/src/lib/ws-handler.ts:499–647) connection handling, (649–1488) message dispatch.

**Client → Server (`DeviceMessage`)**
| Event | Handler lines | Key payload fields |
|-------|---------------|-------------------|
| `device.hello` | 661–744 | `deviceId`, `deviceName`, `platform`, `appVersion`, `deviceToken?` |
| `device.pairing.request_code` | 747–774 | `deviceId` |
| `device.pairing.confirmed` | 777–780 | *ignored* |
| `device.chat.send` | 783–804 | `deviceId`, `runId?`, `message` |
| `device.run.update` | 807–837 | `deviceId`, `runId`, `status` |
| `device.ping` | 840–851 | `deviceId` |
| `device.run.accept` | 854–877 | `deviceId`, `runId` |
| `device.approval.decision` | 880–908 | `deviceId`, `runId`, `approvalId`, `decision` |
| `device.run.cancel` | 911–936 | `deviceId`, `runId` |
| `device.screen.stream_state` | 940–967 | `deviceId`, `state` |
| `device.screen.frame` | 970–1046 | `deviceId`, `meta`, `dataBase64` |
| `device.control.state` | 1050–1067 | `deviceId`, `state` |
| `device.action.ack` | 1070–1100 | `deviceId`, `actionId`, `status` |
| `device.action.result` | 1103–1133 | `deviceId`, `actionId`, `ok`, `error?` |
| `device.run.step_update` | 1137–1151 | `deviceId`, `runId`, `step` |
| `device.run.log` | 1154–1169 | `deviceId`, `runId`, `stepId`, `line`, `level`, `at` |
| `device.agent.proposal` | 1172–1185 | `deviceId`, `runId`, `proposal` |
| `device.action.create` | 1188–1258 | `deviceId`, `actionId`, `runId?`, `action`, `source` |
| `device.workspace.state` | 1262–1272 | `deviceId`, `workspaceState` |
| `device.device_token.ack` | 1275–1277 | `deviceId` |
| `device.command.ack` | 1280–1321 | `deviceId`, `commandId`, `ok`, `errorCode?`, `retryable?` |
| `device.tool.request` | 1325–1383 | `deviceId`, `runId`, `toolEventId`, `toolCall` |
| `device.tool.result` | 1386–1481 | `deviceId`, `runId`, `toolEventId`, `result` |

**Server → Client (`ServerMessage`)**
| Event | Sent from (lines) | Payload |
|-------|-------------------|---------|
| `server.hello_ack` | 737–742 | `serverTime` |
| `server.pairing.code` | 768–773 | `deviceId`, `pairingCode`, `expiresAt` |
| `server.chat.message` | 794–803, 1986–1993 | `deviceId`, `runId?`, `message` |
| `server.run.status` | 824–829 | `deviceId`, `runId`, `status` |
| `server.pong` | 845–850 | `deviceId` |
| `server.run.canceled` | 924–928 | `deviceId`, `runId` |
| `server.screen.ack` | 961–966, 976–1045 | `deviceId`, `ok`, `error?` |
| `server.command` | `device-commands.ts` 392–399 | `deviceId`, `commandId`, `commandType`, `payload`, `ts` |
| `server.run.details` | 728–733, `runEngine.ts` 221–230 | `deviceId`, `run` |
| `server.error` | ws-handler.ts (many lines) | `code`, `message` |

### SSE events
Endpoint: `GET /events` ([`index.ts:2379–2423`](apps/api/src/index.ts:2379–2423)).

Event union defined in [`apps/api/src/engine/runEngine.ts`](apps/api/src/engine/runEngine.ts:298–305):
| Type | Payload | Emitted from |
|------|---------|--------------|
| `device_update` | `{ device: unknown }` | `ws-handler.ts` 1066, 1270 |
| `run_update` | `{ run: RunWithSteps }` | `runEngine.ts` 100, 178; `ws-handler.ts` 326, 342, 1147, 1166, 1181, 1253, 1380, 1478 |
| `step_update` | `{ runId: string, step: RunStep }` | `runEngine.ts` 80; `ws-handler.ts` 1146 |
| `log_line` | `{ runId: string, stepId?: string, log: LogLine }` | `runEngine.ts` 41; `ws-handler.ts` 1164 |
| `screen_update` | `{ deviceId: string, meta: ScreenFrameMeta }` | `ws-handler.ts` 1035 |
| `action_update` | `{ action: unknown }` | `ws-handler.ts` 294, 1098, 1131, 1247 |
| `tool_update` | `{ tool: ToolSummary }` | `ws-handler.ts` 1375, 1473 |

Broadcast wiring: `setSSEBroadcast` called in [`index.ts:766–779`](apps/api/src/index.ts:766–779) with a function iterating `sseClients`.

### Database schema
Schema file: [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma:1)

**Tables**
| Table | Key columns | Notes |
|-------|-------------|-------|
| `User` | `id`, `email` (unique), `passwordHash`, `stripeCustomerId` (unique), `subscriptionStatus`, `subscriptionId` (unique), `planPriceId` | |
| `Device` | `id`, `ownerUserId`, `deviceName`, `platform`, `appVersion`, `deviceToken` (unique), `deviceTokenHash` (unique), `deviceTokenIssuedAt`, `deviceTokenExpiresAt`, `deviceTokenRevokedAt`, `pairingCode`, `pairedAt`, `lastSeenAt`, `controlEnabled`, `screenStreamEnabled`, `workspaceRootName` | FK to `User` (SetNull) |
| `Run` | `id`, `ownerUserId`, `deviceId`, `goal`, `mode`, `status`, `reason`, `constraintsJson`, `actionCount`, `latestProposalJson` | FK to `User` (Cascade), `Device` (Cascade) |
| `RunStep` | `id` (cuid), `runId`, `stepId`, `title`, `status`, `logsJson`, `startedAt`, `endedAt` | `@@unique([runId, stepId])` |
| `Action` | `id`, `ownerUserId`, `deviceId`, `runId`, `kind`, `status`, `source`, `errorCode`, `redactedSummaryJson` | |
| `ToolEvent` | `id`, `ownerUserId`, `deviceId`, `runId`, `tool`, `status`, `summaryJson` | |
| `Session` | `id` (cuid), `userId`, `refreshTokenHash` (unique), `createdAt`, `lastUsedAt`, `expiresAt`, `revokedAt`, `userAgent`, `ip` | |
| `AuditEvent` | `id` (cuid), `userId`, `deviceId`, `runId`, `actionId`, `toolName`, `eventType`, `createdAt`, `ip`, `userAgent`, `meta` | |
| `StripeEvent` | `id` (cuid), `stripeEventId` (unique), `type`, `createdAt` | |

**Migrations** (6 total)
1. `20260303_0001_init` — Initial tables
2. `20260303_0002_add_sessions` — Add `Session`
3. `20260303_0003_add_billing` — Add Stripe columns to `User`
4. `20260303_0004_add_audit_events` — Add `AuditEvent`
5. `20260306_0005_add_stripe_events` — Add `StripeEvent`
6. `20260317_0006_harden_desktop_device_tokens` — Add `deviceTokenHash`, `deviceTokenIssuedAt`, `deviceTokenExpiresAt`, `deviceTokenLastUsedAt`, `deviceTokenRevokedAt`

### Redis usage
Client: [`apps/api/src/lib/redis.ts`](apps/api/src/lib/redis.ts:1) — custom raw RESP parser over TCP/TLS; no `ioredis`.

**Key patterns**
| Pattern | Purpose | File |
|---------|---------|------|
| `ratelimit:{key}:{bucket}` | Sliding-window rate limit counters | `lib/ratelimit.ts:56` |
| `presence:device:{deviceId}` | Device online presence JSON (TTL 45s) | `lib/presence.ts:11,54` |
| `device:cmd:{deviceId}` | Redis Stream — queued commands per device | `lib/device-commands.ts:20,79` |
| `device:cmd:entry:{deviceId}:{commandId}` | Serialized command entry | `lib/device-commands.ts:21,83` |
| `device:cmd:ack:{deviceId}:{commandId}` | Terminal ack cache | `lib/device-commands.ts:22,87` |
| `device:cmd:retry:{deviceId}:{commandId}` | Retry state JSON | `lib/device-commands.ts:23,91` |

**Pub/Sub:** None. Only Redis Streams (device command queue) with consumer group `ws-gateway` per device stream (`lib/device-commands.ts:14,139`).

All Redis features silently fall back to in-memory if Redis is unavailable.

### Environment variables
Primary config: [`apps/api/src/config.ts`](apps/api/src/config.ts:70–127).

Notable variables actually read:
- `PORT`, `NODE_ENV`, `LOG_LEVEL`, `DEPLOYMENT_MODE`
- `DATABASE_URL` (required)
- `JWT_SECRET` (required), `JWT_KEY_ID`, `ACCESS_TOKEN_EXPIRES_IN`, `REFRESH_TOKEN_TTL_DAYS`
- `CSRF_COOKIE_NAME`, `ACCESS_COOKIE_NAME`, `REFRESH_COOKIE_NAME`
- `WEB_ORIGIN`, `APP_BASE_URL`, `API_PUBLIC_BASE_URL`, `ALLOW_INSECURE_DEV`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`
- `DESKTOP_UPDATE_FEED_DIR`, `DESKTOP_UPDATE_ENABLED`, `DESKTOP_RELEASE_SOURCE`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`, `GITHUB_TOKEN`
- `ADMIN_API_KEY`, `METRICS_PUBLIC`
- Rate limit buckets: `AUTH_LOGIN_PER_MIN`, `AUTH_REFRESH_PER_MIN`, `BILLING_PER_MIN`, `RUNS_CREATE_PER_MIN`, `CONTROL_ACTIONS_PER_10S`, `TOOL_EVENTS_PER_10S`, `SSE_CONNECT_PER_MIN`
- Retention: `AUDIT_RETENTION_DAYS`, `STRIPE_EVENT_RETENTION_DAYS`, `SESSION_RETENTION_DAYS`, `RUN_RETENTION_DAYS`
- `REDIS_URL`, `RATE_LIMIT_BACKEND`
- `BILLING_ENABLED`
- `FREE_AI_FALLBACK_ENABLED`, `FREE_AI_FALLBACK_BASE_URL`, `FREE_AI_FALLBACK_MODEL`, `FREE_AI_FALLBACK_VISION_MODEL`, `FREE_AI_FALLBACK_API_KEY`, `FREE_AI_FALLBACK_DAILY_LIMIT`
- `RUN_RECOVERY_POLICY`
- `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_SAMPLE_RATE`

Direct `process.env` reads outside `config.ts`:
- `NODE_ENV` — [`db/prisma.ts:32`](apps/api/src/db/prisma.ts:32)
- `APP_VERSION` — [`lib/version.ts:51`](apps/api/src/lib/version.ts:51)
- `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_SAMPLE_RATE` — [`lib/error-tracking.ts:70,87,88`](apps/api/src/lib/error-tracking.ts:70)

Cross-reference with `.env.example`:
- [`apps/api/.env.example`](apps/api/.env.example:1) covers most variables but **omits** `FREE_AI_FALLBACK_*` variables.
- [`.env.prod.example`](.env.prod.example:1) at root contains the same set plus deployment guidance, also **omits** `FREE_AI_FALLBACK_*`.

### Auth flow

**Web auth (cookie + JWT)**
1. **Registration** — `POST /auth/register` [`index.ts:925–950`](apps/api/src/index.ts:925–950). Validates email/password (min 8 chars). Hashes with `argon2` ([`lib/auth.ts:90–92`](apps/api/src/lib/auth.ts:90–92)). Creates user via `usersRepo.create`. Audit `auth.register`.
2. **Login** — `POST /auth/login` [`index.ts:952–983`](apps/api/src/index.ts:952–983). Rate-limited by IP. Verifies password with `argon2` ([`lib/auth.ts:94–96`](apps/api/src/lib/auth.ts:94–96)). Calls `startSession(reply, authUser, request)` [`index.ts:424–438`](apps/api/src/index.ts:424–438):
   - Issues access token (`issueAccessToken`) [`lib/auth.ts:98–106`](apps/api/src/lib/auth.ts:98–106): JWT signed with `JWT_SECRET`, `expiresIn: ACCESS_TOKEN_EXPIRES_IN`, `kid: JWT_KEY_ID`.
   - Issues refresh token (`issueRefreshToken`) [`lib/auth.ts:144–146`](apps/api/src/lib/auth.ts:144–146): 48 random bytes, base64url.
   - Issues CSRF token (`issueCsrfToken`) [`lib/auth.ts:156–158`](apps/api/src/lib/auth.ts:156–158): 24 random bytes.
   - Hashes refresh token (`hashRefreshToken`) [`lib/auth.ts:148–154`](apps/api/src/lib/auth.ts:148–154): SHA-256 of `JWT_SECRET + ":" + token`.
   - Persists session to DB (`sessionsRepo.create`) with `refreshTokenHash`, `expiresAt`, IP, user-agent.
   - Sets three cookies (`access_token`, `refresh_token`, `csrf_token`) [`lib/auth.ts:202–218`](apps/api/src/lib/auth.ts:202–218).
3. **Token refresh** — `POST /auth/refresh` [`index.ts:985–1023`](apps/api/src/index.ts:985–1023). Reads refresh cookie (`getRefreshCookieToken`) [`lib/auth.ts:186–188`](apps/api/src/lib/auth.ts:186–188). Looks up session by `refreshTokenHash`. Validates not revoked/expired. Rotates refresh token (`sessionsRepo.rotate`). Issues new access + CSRF token, sets cookies.
4. **Logout** — `POST /auth/logout` [`index.ts:1025–1039`](apps/api/src/index.ts:1025–1039). Revokes session by hash. Clears cookies (`clearAuthCookies`) [`lib/auth.ts:220–234`](apps/api/src/lib/auth.ts:220–234).
5. **Logout all** — `POST /auth/logout_all` [`index.ts:1041–1054`](apps/api/src/index.ts:1041–1054). Requires auth (`requireAuth`) [`lib/auth.ts:266–275`](apps/api/src/lib/auth.ts:266–275). Revokes all sessions for user.
6. **Auth middleware** — `requireAuth` [`lib/auth.ts:266–275`](apps/api/src/lib/auth.ts:266–275): extracts Bearer header or access cookie, verifies JWT (`verifyAccessToken`) [`lib/auth.ts:128–142`](apps/api/src/lib/auth.ts:128–142), attaches `request.user`.
7. **CSRF** — `shouldCheckCsrf` / `isValidCsrf` [`lib/auth.ts:236–264`](apps/api/src/lib/auth.ts:236–264): skipped for GET/HEAD/OPTIONS, `/auth/login`, `/auth/register`, `/billing/webhook`, and Bearer-auth requests.

**Desktop auth (device token + OAuth-style handoff)**
1. **Start attempt** — `POST /desktop/auth/start` [`index.ts:1089–1125`](apps/api/src/index.ts:1089–1125). Desktop sends `deviceId`, `callbackUrl` (loopback), `state`, `nonce`. `callbackUrl` validated to `http://127.0.0.1:{port}/{path}` ([`lib/desktop-auth.ts:122–177`](apps/api/src/lib/desktop-auth.ts:122–177)). Creates in-memory attempt record (`desktopAuth.startAttempt`) [`lib/desktop-auth.ts:212–232`](apps/api/src/lib/desktop-auth.ts:212–232). Returns `attemptId`, `authUrl`.
2. **Complete (browser)** — `POST /desktop/auth/complete` [`index.ts:1221–1264`](apps/api/src/index.ts:1221–1264). Web user sends `attemptId`. Issues handoff token (`desktopAuth.issueHandoff`) [`lib/desktop-auth.ts:234–278`](apps/api/src/lib/desktop-auth.ts:234–278) (short-lived, max 2 min). Returns `handoffToken`, `callbackUrl`, `state`.
3. **Exchange (desktop)** — `POST /desktop/auth/exchange` [`index.ts:1127–1185`](apps/api/src/index.ts:1127–1185). Desktop sends `handoffToken`, `deviceId`, `state`, `nonce`. Consumes handoff (`desktopAuth.consumeHandoff`) [`lib/desktop-auth.ts:280–337`](apps/api/src/lib/desktop-auth.ts:280–337). Validates device, state hash, nonce hash, not expired, not already used. Generates `deviceToken` (36 random bytes). Claims device in DB (`devicesRepo.claimDevice`). Returns `deviceToken`.
4. **Desktop session validation** — `requireDesktopDeviceSession` [`index.ts:388–412`](apps/api/src/index.ts:388–412). Extracts Bearer token, calls `authenticateDesktopDeviceSession` [`lib/desktop-session.ts:68–102`](apps/api/src/lib/desktop-session.ts:68–102). Looks up device by token (or token hash), checks `ownerUserId`, `deviceTokenRevokedAt`, `deviceTokenExpiresAt`. Touches `lastUsedAt`.
5. **Desktop logout** — `POST /desktop/auth/logout` [`index.ts:1187–1219`](apps/api/src/index.ts:1187–1219). Validates session, calls `revokeDesktopSession` [`lib/desktop-session.ts:104–140`](apps/api/src/lib/desktop-session.ts:104–140). Sets `deviceTokenRevokedAt` in DB.

---

## 5. Web app (apps/web)

### Page routes (Next.js App Router)
All pages are `'use client'` with data fetched in `useEffect`.

| Route | File | Purpose |
|-------|------|---------|
| `/` | [`app/page.tsx`](apps/web/app/page.tsx:1) | Marketing landing page |
| `/login` | [`app/login/page.tsx`](apps/web/app/login/page.tsx:1) | Browser login form |
| `/register` | [`app/register/page.tsx`](apps/web/app/register/page.tsx:1) | Account creation |
| `/dashboard` | [`app/dashboard/page.tsx`](apps/web/app/dashboard/page.tsx:1) | Main dashboard (account, billing, devices, downloads) |
| `/dashboard/legacy` | [`app/dashboard/legacy/page.tsx`](apps/web/app/dashboard/legacy/page.tsx:1) | Legacy admin surface: device fleet, pairing, run creation, screen preview, remote control, SSE live updates (1604 lines) |
| `/billing` | [`app/billing/page.tsx`](apps/web/app/billing/page.tsx:1) | Subscription management |
| `/download` | [`app/download/page.tsx`](apps/web/app/download/page.tsx:1) | Desktop app download page |
| `/desktop/sign-in` | [`app/desktop/sign-in/page.tsx`](apps/web/app/desktop/sign-in/page.tsx:1) | Desktop auth handoff relay |

### Auth flow (browser side)
Module: [`apps/web/lib/auth.ts`](apps/web/lib/auth.ts:1)

1. **Login form submission** — [`app/login/page.tsx:18–31`](apps/web/app/login/page.tsx:18–31): `handleSubmit` calls `login(email, password)` from `lib/auth.ts`.
2. **Token storage** — [`lib/auth.ts:245–260`](apps/web/lib/auth.ts:245–260): POSTs `/auth/login`. On success, stores `data.token` in `localStorage` under key `ai_operator_access_token` ([`lib/auth.ts:257`](apps/web/lib/auth.ts:257) via `storeAccessToken`).
3. **Session validation** — `getMe()` [`lib/auth.ts:230–243`](apps/web/lib/auth.ts:230–243): GET `/auth/me` with Bearer token. On 401, clears token and returns `null`.
4. **Automatic refresh on 401** — `apiFetch` [`lib/auth.ts:175–228`](apps/web/lib/auth.ts:175–228): if 401 and `retryOnAuthFailure`, calls `refreshSession()` ([`lib/auth.ts:127–140`](apps/web/lib/auth.ts:127–140)) which POSTs `/auth/refresh` with `x-csrf-token` header and `credentials: 'include'`. If refresh fails, clears token and redirects to `/login` ([`lib/auth.ts:208–213`](apps/web/lib/auth.ts:208–213)).
5. **CSRF** — [`lib/auth.ts:98–112`](apps/web/lib/auth.ts:98–112): reads `csrf_token` from `document.cookie` and injects as `x-csrf-token` on mutation requests ([`lib/auth.ts:188–193`](apps/web/lib/auth.ts:188–193)).
6. **Logout** — [`lib/auth.ts:263–276`](apps/web/lib/auth.ts:263–276): POST `/auth/logout`, then unconditionally `clearStoredAccessToken()`.

### Desktop handoff
Entry page: [`app/desktop/sign-in/page.tsx`](apps/web/app/desktop/sign-in/page.tsx:1)

1. Desktop opens browser with URL `/desktop/sign-in?attemptId=<id>` (the desktop app handles the custom URL scheme / loopback; the web app receives a normal HTTP query param).
2. Web checks session — [`app/desktop/sign-in/page.tsx:29–36`](apps/web/app/desktop/sign-in/page.tsx:29–36): calls `getMe()`. If not authenticated, redirects to `/login?next=/desktop/sign-in?attemptId=…`.
3. Completes desktop auth — [`app/desktop/sign-in/page.tsx:44`](apps/web/app/desktop/sign-in/page.tsx:44): calls `completeDesktopAuth(attemptId)` from `lib/auth.ts`.
4. `completeDesktopAuth` — [`lib/auth.ts:355–367`](apps/web/lib/auth.ts:355–367): POST `/desktop/auth/complete` → returns `handoffToken`, `callbackUrl`, `state`, `expiresAt`.
5. Redirects back to desktop — [`app/desktop/sign-in/page.tsx:45–48`](apps/web/app/desktop/sign-in/page.tsx:45–48):
   ```tsx
   const redirectUrl = new URL(completion.callbackUrl);
   redirectUrl.searchParams.set('handoffToken', completion.handoffToken);
   redirectUrl.searchParams.set('state', completion.state);
   window.location.replace(redirectUrl.toString());
   ```

**No custom URL scheme registration in the web codebase.** The web app constructs the redirect URL provided by the API and navigates to it. The desktop app must register its own scheme or loopback listener to catch that navigation.

### Environment variables
| Variable | File | Line | Usage |
|----------|------|------|-------|
| `NEXT_PUBLIC_API_BASE` | `lib/auth.ts` | 1 | `API_BASE` fallback `http://localhost:3001` |
| `NEXT_PUBLIC_API_BASE` | `.env.example` | 1 | Example `http://localhost:3001` |

No other `process.env` or `NEXT_PUBLIC_*` reads exist in components/pages.

### API communication
- **Base URL:** `API_BASE` from `NEXT_PUBLIC_API_BASE` or fallback `http://localhost:3001`
- **HTTP client:** `apiFetch` in [`lib/auth.ts:175–228`](apps/web/lib/auth.ts:175–228). Injects `Authorization: Bearer <token>`, `credentials: 'include'`, auto-sets `Content-Type: application/json`, CSRF header on mutations.
- **URL builder:** `buildApiUrl` [`lib/auth.ts:162–173`](apps/web/lib/auth.ts:162–173) appends `?token=<accessToken>` for SSE/image URLs that cannot send headers.
- **No WebSocket client** in the web app.
- **No SSE client** in the main pages; the legacy dashboard uses `EventSource` to `/events`.

---

## 6. Desktop app (apps/desktop)

### Rust side (src-tauri/)

#### Cargo.toml
[`apps/desktop/src-tauri/Cargo.toml`](apps/desktop/src-tauri/Cargo.toml:1)
- Package: `ai-operator-desktop`, version `0.0.33`
- `tauri` 2 with features `macos-private-api`, `tray-icon`
- `tauri-plugin-updater` 2
- `screenshots` 0.8, `enigo` 0.1, `keyring` 3, `reqwest` 0.12, `tokio` 1, `auto-launch` 0.5

#### tauri.conf.json
[`apps/desktop/src-tauri/tauri.conf.json`](apps/desktop/src-tauri/tauri.conf.json:1)
- Product name `GORKH`, identifier `com.ai-operator.desktop`, version `0.0.33`
- Window `main`: `create: false`, `transparent: true`, `titleBarStyle: "Overlay"`, `trafficLightPosition: {x:18,y:20}`
- CSP: restrictive production CSP; dev CSP relaxes `unsafe-inline`/`unsafe-eval` for localhost
- Updater block: `active: true`, `dialog: true`, endpoint `{{env:VITE_API_HTTP_BASE}}/updates/desktop/{{platform}}/{{arch}}/{{current_version}}.json`, pubkey `{{env:VITE_DESKTOP_UPDATER_PUBLIC_KEY}}`

Capabilities: [`capabilities/default.json`](apps/desktop/src-tauri/capabilities/default.json:1) allows `core:app:allow-version`, `core:event:allow-listen`, `core:event:allow-unlisten`, `desktop-ipc`, `updater:default`. Custom permission file [`permissions/desktop-ipc.toml`](apps/desktop/src-tauri/permissions/desktop-ipc.toml:1) defines 64 allowed commands.

#### Every Tauri command
All commands defined in [`lib.rs`](apps/desktop/src-tauri/src/lib.rs:1) and [`workspace.rs`](apps/desktop/src-tauri/src/workspace.rs:1), registered in `generate_handler!` at [`lib.rs:2429–2492`](apps/desktop/src-tauri/src/lib.rs:2429–2492).

| # | Command | File | Lines | Description |
|---|---------|------|-------|-------------|
| 1 | `list_displays` | lib.rs | 291–316 | Lists displays via `screenshots::Screen::all()` |
| 2 | `capture_display_png` | lib.rs | 319–368 | Captures display, encodes PNG base64 |
| 3 | `input_click` | lib.rs | 412–443 | Mouse click via `enigo` |
| 4 | `input_double_click` | lib.rs | 445–477 | Double click via `enigo` |
| 5 | `input_scroll` | lib.rs | 479–485 | Scroll via `enigo` |
| 6 | `input_type` | lib.rs | 487–492 | Text typing via `enigo` |
| 7 | `input_hotkey` | lib.rs | 494–542 | Hotkey via `enigo` |
| 8 | `main_window_enter_overlay_mode` | lib.rs | 1188–1203 | Fullscreen overlay |
| 9 | `main_window_exit_overlay_mode` | lib.rs | 1205–1220 | Restore from overlay |
| 10 | `main_window_overlay_status` | lib.rs | 1222–1232 | Query overlay state |
| 11 | `tray_update_state` | lib.rs | 1234–1261 | Update tray labels |
| 12 | `main_window_show` | lib.rs | 1263–1289 | Show main window |
| 13 | `main_window_hide` | lib.rs | 1291–1309 | Hide to tray |
| 14 | `permissions_get_status` | lib.rs | 1311–1317 | Screen recording + accessibility status |
| 15 | `permissions_open_settings` | lib.rs | 1319–1331 | Open OS settings |
| 16 | `open_external_url` | lib.rs | 1333–1362 | Open URL after allowlist check |
| 17 | `open_application` | lib.rs | 1436–1448 | Launch app by name |
| 18 | `desktop_auth_listen_start` | lib.rs | 1450–1494 | TCP loopback listener for OAuth callback |
| 19 | `desktop_auth_listen_finish` | lib.rs | 1496–1530 | Await OAuth callback with timeout |
| 20 | `desktop_auth_listen_cancel` | lib.rs | 1532–1548 | Cancel pending listener |
| 21 | `autostart_supported` | lib.rs | 1550–1553 | Auto-launch support check |
| 22 | `autostart_is_enabled` | lib.rs | 1555–1564 | Read auto-launch state |
| 23 | `autostart_set_enabled` | lib.rs | 1566–1599 | Enable/disable auto-launch |
| 24 | `device_token_set` | lib.rs | 1601–1613 | Store device token in keychain |
| 25 | `device_token_get` | lib.rs | 1615–1617 | Retrieve device token from keychain |
| 26 | `device_token_clear` | lib.rs | 1619–1632 | Delete device token from keychain |
| 27 | `set_llm_api_key` | lib.rs | 1634–1646 | Store LLM API key in keychain |
| 28 | `has_llm_api_key` | lib.rs | 1648–1651 | Check LLM API key in keychain |
| 29 | `clear_llm_api_key` | lib.rs | 1653–1665 | Delete LLM API key from keychain |
| 30 | `llm_propose_next_action` | lib.rs | 1736–1836 | Propose next AI action via active LLM provider |
| 31 | `assistant_conversation_turn` | lib.rs | 1860–1950 | Conversation/intake turn via active LLM provider |
| 32 | `local_ai_status` | lib.rs | 1952–1957 | Managed Ollama runtime status |
| 33 | `local_ai_install_start` | lib.rs | 1959–1969 | Start managed Ollama install/download |
| 34 | `local_ai_enable_vision_boost` | lib.rs | 1971–1976 | Install vision model |
| 35 | `local_ai_install_progress` | lib.rs | 1978–1983 | Current install progress |
| 36 | `local_ai_start` | lib.rs | 1985–1990 | Start managed Ollama service |
| 37 | `local_ai_stop` | lib.rs | 1992–1997 | Stop managed Ollama service |
| 38 | `local_ai_hardware_profile` | lib.rs | 1999–2002 | Hardware detection results |
| 39 | `local_ai_recommended_tier` | lib.rs | 2004–2007 | Recommended model tier |
| 40 | `local_ai_reset_to_managed` | lib.rs | 2009–2014 | Clear metadata and reset runtime |
| 41 | `list_agent_providers` | lib.rs | 2174–2199 | List advanced agent providers |
| 42 | `test_provider` | lib.rs | 2201–2205 | Test provider connection |
| 43 | `set_provider_api_key` | lib.rs | 2207–2211 | Store provider API key in keychain |
| 44 | `has_provider_api_key` | lib.rs | 2213–2217 | Check provider API key in keychain |
| 45 | `start_agent_task` | lib.rs | 2219–2276 | Start advanced agent task (EXPERIMENTAL) |
| 46 | `get_agent_task_status` | lib.rs | 2278–2290 | Get current advanced agent task |
| 47 | `cancel_agent_task` | lib.rs | 2292–2300 | Cancel current advanced agent task |
| 48 | `approve_agent_proposal` | lib.rs | 2302–2312 | Approve pending agent proposal |
| 49 | `deny_agent_proposal` | lib.rs | 2314–2327 | Deny pending agent proposal |
| 50 | `submit_agent_user_response` | lib.rs | 2329–2342 | Submit user response to agent question |
| 51 | `start_recording` | lib.rs | 2397–2408 | **Stub** — returns fake demo ID |
| 52 | `gorkh_app_snapshot` | lib.rs | 2361–2383 | Aggregate safe app state for assistant |
| 53 | `gorkh_settings_set` | lib.rs | 2386–2395 | Set safe settings (only `autostart` today) |
| 54 | `workspace_configure` | workspace.rs | 176–204 | Set workspace root path, persist to disk |
| 55 | `workspace_get_state` | workspace.rs | 206–210 | Return workspace state |
| 56 | `workspace_select_directory` | workspace.rs | 212–226 | Native folder picker dialog |
| 57 | `workspace_clear` | workspace.rs | 228–235 | Clear workspace root |
| 58 | `tool_execute` | workspace.rs | 460–472 | Dispatch workspace tool calls (fs, terminal) |

#### Tauri events emitted
| Event | Payload | When | File | Lines |
|-------|---------|------|------|-------|
| `tray.hide` | `()` | Window hidden to tray | lib.rs | 1045 |
| `tray.tip` | `()` | First time window hidden to tray | lib.rs | 1052 |
| `tray.show` | `()` | Window shown from tray | lib.rs | 1279, 2514 |
| `agent:event` | `agent::AgentEvent` | Advanced agent runtime events | lib.rs | 2260 |
| `tray.toggle_screen_preview` | `()` | Tray menu clicked | lib.rs | 2522 |
| `tray.toggle_allow_control` | `()` | Tray menu clicked | lib.rs | 2525 |
| `tray.toggle_ai_pause` | `()` | Tray menu clicked | lib.rs | 2528 |

#### OS-integration surfaces

**File access**
- Reads: `/proc/cpuinfo`, `/proc/meminfo` (Linux hardware detection) — [`local_ai.rs`](apps/desktop/src-tauri/src/local_ai.rs:2064,2104)
- Reads/writes `managed-install.json`, `pending-managed-takeover` marker — [`local_ai.rs`](apps/desktop/src-tauri/src/local_ai.rs:1157,1139,1163,1143)
- Reads/writes `workspace.json` in local data dir — [`workspace.rs`](apps/desktop/src-tauri/src/workspace.rs:139,136)
- Directory listings, file read/write, create/delete — [`workspace.rs`](apps/desktop/src-tauri/src/workspace.rs:513,600,699,666,739,653,786–788)
- Reads demonstration JSON files from `~/.ai-operator/demonstrations/` — [`agent/recorder.rs`](apps/desktop/src-tauri/src/agent/recorder.rs:168)
- Downloads Ollama runtime archive to `managed-runtime.{tgz,zip}` and extracts — [`local_ai.rs`](apps/desktop/src-tauri/src/local_ai.rs:1285–1358,1399–1427)

**Process spawn**
- `open` (macOS), `cmd /C start` (Windows), `gtk-launch` (Linux) — [`lib.rs:1372–1433`](apps/desktop/src-tauri/src/lib.rs:1372–1433)
- `ollama serve`, `ollama pull` — [`local_ai.rs:1712–1725,1744–1751`](apps/desktop/src-tauri/src/local_ai.rs:1712–1725)
- `sysctl`, `system_profiler`, `lspci`, `powershell`, `df` — [`local_ai.rs:2055–2067`](apps/desktop/src-tauri/src/local_ai.rs:2055–2067)
- `std::process::Command` for `terminal.exec` tool — [`workspace.rs:825`](apps/desktop/src-tauri/src/workspace.rs:825)
- `open -a` / `cmd /C start` for `OpenApp` action — [`agent/executor.rs:150–159`](apps/desktop/src-tauri/src/agent/executor.rs:150–159)

**Keychain**
- Service names: `"gorkh"` (primary), `"ai-operator"` (legacy)
- Functions: `keyring_entry`, `legacy_keyring_entry`, `keyring_set_secret`, `keyring_get_secret`, `keyring_delete_secret` — [`lib.rs:655–698`](apps/desktop/src-tauri/src/lib.rs:655–698)
- Stores: device tokens (`device_token::<device_id>`), LLM API keys (`llm_api_key:<provider>`), provider API keys (`llm_api_key:<provider_type>`)
- Legacy migration: reads old `"ai-operator"` entries, migrates to `"gorkh"`, deletes legacy — [`lib.rs:669–693`](apps/desktop/src-tauri/src/lib.rs:669–693)

**Screen capture**
- `screenshots` crate 0.8
- `list_displays()` — [`lib.rs:291–316`](apps/desktop/src-tauri/src/lib.rs:291–316)
- `capture_display_png()` — [`lib.rs:319–368`](apps/desktop/src-tauri/src/lib.rs:319–368)
- Returns `CaptureError { needs_permission: true }` on permission failure

**Input control / accessibility**
- `enigo` crate 0.1
- Commands: `input_click`, `input_double_click`, `input_scroll`, `input_type`, `input_hotkey` — [`lib.rs:412–542`](apps/desktop/src-tauri/src/lib.rs:412–542)
- No explicit accessibility permission gating before enigo calls (separate `permissions_get_status` command exists)

**Custom URL scheme handling**
- **None implemented.** Desktop auth uses TCP loopback on `127.0.0.1:0` (random port) — [`lib.rs:1450–1494`](apps/desktop/src-tauri/src/lib.rs:1450–1494)
- Callback path hardcoded to `/desktop-auth/callback`
- No `tauri-plugin-deep-link` or `register_uri_scheme` usage

**Tray menu**
- Tray ID: `"main-tray"`
- Items: `toggle_window`, `toggle_screen_preview`, `toggle_allow_control`, `toggle_ai_pause`, `quit`
- Built dynamically in `build_tray_menu()` — [`lib.rs:974–1041`](apps/desktop/src-tauri/src/lib.rs:974–1041)
- Click handlers: [`lib.rs:2504–2534`](apps/desktop/src-tauri/src/lib.rs:2504–2534)

**Window management**
- Only label `"main"` is used
- `create_main_window()` — [`lib.rs:941–958`](apps/desktop/src-tauri/src/lib.rs:941–958): builds from `tauri.conf.json`, denies new windows, validates navigation URLs
- Show/hide: `main_window_show()` / `main_window_hide()` / `hide_window_to_tray()`
- Overlay mode: `main_window_enter_overlay_mode_impl()` [`lib.rs:1100–1149`](apps/desktop/src-tauri/src/lib.rs:1100–1149), `main_window_exit_overlay_mode_impl()` [`lib.rs:1151–1186`](apps/desktop/src-tauri/src/lib.rs:1151–1186)
- Close-requested → hide to tray (or exit overlay) — [`lib.rs:2545–2561`](apps/desktop/src-tauri/src/lib.rs:2545–2561)

**Permissions checks**
- `detect_screen_recording_status()` — macOS only: probes `screenshots::Screen::capture()` — [`lib.rs:83–169`](apps/desktop/src-tauri/src/lib.rs:83–169)
- `detect_accessibility_status()` — macOS only: unsafe `AXIsProcessTrusted()` from `ApplicationServices` — [`lib.rs:83–169`](apps/desktop/src-tauri/src/lib.rs:83–169)
- `permissions_open_settings()` — opens macOS System Preferences or Windows Settings — [`lib.rs:1319–1331`](apps/desktop/src-tauri/src/lib.rs:1319–1331)

#### Updater configuration
- **Cargo feature flags:** Updater is provided by plugin, not Tauri core feature: `tauri-plugin-updater = "2"` in [`Cargo.toml:20`](apps/desktop/src-tauri/Cargo.toml:20)
- **tauri.conf.json updater block:** [`tauri.conf.json:50–59`](apps/desktop/src-tauri/tauri.conf.json:50–59)
  - `active: true`, `dialog: true`
  - Endpoint: `{{env:VITE_API_HTTP_BASE}}/updates/desktop/{{platform}}/{{arch}}/{{current_version}}.json`
  - Pubkey: `{{env:VITE_DESKTOP_UPDATER_PUBLIC_KEY}}`
- **Endpoint URL pattern:** `$VITE_API_HTTP_BASE/updates/desktop/$platform/$arch/$current_version.json`
- **Pubkey handling:** Build-time env var interpolation into `tauri.conf.json`; verification delegated entirely to `tauri-plugin-updater` — [`lib.rs:2426`](apps/desktop/src-tauri/src/lib.rs:2426)
- **Signature verification code path:** No custom verification code exists in this repo. The plugin handles it using the configured pubkey.
- **Compile-time flag:** `desktop_updater_enabled()` [`lib.rs:30–32`](apps/desktop/src-tauri/src/lib.rs:30–32) reads `VITE_DESKTOP_UPDATER_ENABLED` via `option_env!`, but this function is **never called**.

#### Env vars / build-time config read by Rust
| Var | File | Lines | Purpose |
|-----|------|-------|---------|
| `VITE_DESKTOP_UPDATER_ENABLED` | lib.rs | 31 | Unused compile-time flag |
| `APP_BASE_URL` | lib.rs | 738 | Allowed external origin for `open_external_url` |
| `VITE_API_HTTP_BASE` | tauri.conf.json | 55 | Updater endpoint base URL |
| `VITE_DESKTOP_UPDATER_PUBLIC_KEY` | tauri.conf.json | 57 | Updater Ed25519 public key |
| `PATH` | local_ai.rs | 1636 | Find system Ollama binary |
| `ProgramFiles` | local_ai.rs | 1650 | Windows Ollama path |
| `LocalAppData` | local_ai.rs | 1657 | Windows Ollama path |

---

### React side (src/)

#### Route structure
**No React Router.** The entire UI is a single monolithic `App` component ([`App.tsx`](apps/desktop/src/App.tsx:1), 4274 lines) that conditionally renders surfaces based on local state (`settingsOpen`, `isOverlayActive`, `isSignedIn`). Navigation is state-driven, not URL-driven.

#### State management
**No external state library** (no Redux, Zustand, Jotai, Context API).

**Module-level singleton stores**
| File | Pattern | State held |
|------|---------|------------|
| `lib/localSettings.ts` | Module singleton + `localStorage` + pub/sub (`Set<listener>`) | `startMinimizedToTray`, `autostartEnabled`, `screenPreviewEnabled`, `allowControlEnabled` |
| `lib/approvals.ts` | Module singleton + `localStorage` + interval timer | Approval queue, expiry logic |

**App.tsx main component state** (~40+ `useState` hooks, lines 339–426)
Key state: `client`/`status` (WS), `messages` (chat), `authState`/`sessionDeviceToken`, `desktopBootstrap`/`desktopAccount`/`recentRuns`/`activeRun`, `localSettings`, `llmSettings`/`providerConfigured`, `assistantEngine`/`aiState`/`currentProposal`, `approvalItems`, `permissionStatus`, `localAiStatus`/`localAiInstallProgress`, `overlayModeStatus`, `desktopUpdaterState`.

**Refs for mutable non-rendering state** (lines 416–426)
`controlEnabledRef`, `workspaceConfiguredRef`, `assistantEngineRef`, `clientRef`, `assistantStartingRunIdRef`, `assistantConversationRequestIdRef`, `desktopUpdateRef`, `desktopUpdaterActionBusyRef`, `controlApprovalPayloadsRef`, `proposalApprovalPayloadsRef`.

**No custom hooks** defined in `src/`. Only standard React hooks used.

#### Frontend ↔ Rust IPC

**`invoke()` calls** (selected critical paths)
| Command | File | Line | Purpose |
|---------|------|------|---------|
| `main_window_hide` | `App.tsx` | 1212 | Hide window on launch if `startMinimizedToTray` |
| `tray_update_state` | `App.tsx` | 1388 | Sync tray menu badges |
| `device_token_get` | `App.tsx` | 154 | Read device token from keychain |
| `device_token_set` | `App.tsx` | 158 | Store device token in keychain |
| `device_token_clear` | `App.tsx` | 165 | Clear token from keychain |
| `autostart_supported` | `App.tsx` | 905 | Check autostart support |
| `autostart_is_enabled` | `App.tsx` | 912 | Read autostart state |
| `autostart_set_enabled` | `App.tsx` | 2596 | Toggle autostart |
| `open_external_url` | `lib/desktopAuth.ts` | 54 | Open browser for sign-in |
| `desktop_auth_listen_start` | `lib/desktopAuth.ts` | 77 | Start native OAuth loopback |
| `desktop_auth_listen_finish` | `lib/desktopAuth.ts` | 103 | Await OAuth callback |
| `desktop_auth_listen_cancel` | `lib/desktopAuth.ts` | 62 | Cancel loopback listener |
| `permissions_get_status` | `lib/permissions.ts` | 17 | Read macOS permissions |
| `permissions_open_settings` | `lib/permissions.ts` | 21 | Open System Settings |
| `main_window_enter_overlay_mode` | `lib/overlayMode.ts` | 26 | Enter overlay mode |
| `main_window_exit_overlay_mode` | `lib/overlayMode.ts` | 30 | Exit overlay mode |
| `main_window_overlay_status` | `lib/overlayMode.ts` | 22 | Query overlay support |
| `input_click` | `lib/actionExecutor.ts` | 13 | Execute remote control click |
| `input_double_click` | `lib/actionExecutor.ts` | 22 | Execute remote control double-click |
| `input_scroll` | `lib/actionExecutor.ts` | 31 | Execute scroll |
| `input_type` | `lib/actionExecutor.ts` | 38 | Execute type |
| `input_hotkey` | `lib/actionExecutor.ts` | 44 | Execute hotkey |
| `open_application` | `lib/actionExecutor.ts` | 51 | Execute app open |
| `capture_display_png` | `lib/screenStreamer.ts` | 142 | Capture frame for screen preview |
| `list_displays` | `lib/screenStreamer.ts` | 52 | Enumerate monitors |
| `workspace_configure` | `lib/workspace.ts` | 42 | Set workspace folder |
| `workspace_get_state` | `lib/workspace.ts` | 58 | Read workspace state |
| `workspace_select_directory` | `lib/workspace.ts` | 66 | Native folder picker |
| `workspace_clear` | `lib/workspace.ts` | 73 | Unset workspace |
| `tool_execute` | `lib/workspace.ts` | 81 | Execute tool wrapper |
| `llm_propose_next_action` | `lib/aiAssist.ts` | 779 | Get next AI proposal |
| `assistant_conversation_turn` | `lib/assistantConversation.ts` | 34 | LLM chat turn |
| `has_llm_api_key` | `lib/aiAssist.ts` | 116 | Check cloud provider key |
| `local_ai_status` | `lib/localAi.ts` | 220 | Get Free AI runtime status |
| `local_ai_install_start` | `lib/localAi.ts` | 224 | Start Free AI install |
| `local_ai_install_progress` | `lib/localAi.ts` | 230 | Poll install progress |
| `local_ai_enable_vision_boost` | `lib/localAi.ts` | 234 | Enable vision model |
| `local_ai_start` | `lib/localAi.ts` | 238 | Start local runtime |
| `local_ai_stop` | `lib/localAi.ts` | 242 | Stop local runtime |
| `local_ai_hardware_profile` | `lib/localAi.ts` | 250 | Get hardware specs |
| `local_ai_recommended_tier` | `lib/localAi.ts` | 254 | Get recommended tier |
| `gorkh_app_snapshot` | `lib/gorkhTools.ts` | 49 | Read app state for LLM grounding |
| `gorkh_settings_set` | `lib/gorkhTools.ts` | 87 | Update app setting from tool |

**`listen()` event listeners**
| Event | File | Line | Purpose |
|-------|------|------|---------|
| `tray.toggle_screen_preview` | `App.tsx` | 935 | Toggle screen preview from tray |
| `tray.toggle_allow_control` | `App.tsx` | 938 | Toggle remote control from tray |
| `tray.toggle_ai_pause` | `App.tsx` | 941 | Pause/resume AI Assist from tray |
| `tray.show` | `App.tsx` | 954 | Show main window from tray |
| `tray.hide` | `App.tsx` | 957 | Hide main window from tray |
| `tray.tip` | `App.tsx` | 960 | Show tray notice tooltip |
| `agent:event` | `lib/advancedAgent.ts` | 142 | Subscribe to advanced agent events |

#### API communication
- **HTTP client:** `lib/desktopApi.ts` ([`desktopApi.ts:16–48`](apps/desktop/src/lib/desktopApi.ts:16–48)) — native `fetch()`, injects `Authorization: Bearer ${deviceToken}`, custom network-failure detection.
- **WebSocket client:** `lib/wsClient.ts` ([`wsClient.ts:1–345`](apps/desktop/src/lib/wsClient.ts:1–345)) — native `WebSocket`, auto-reconnect with exponential backoff (max 10s), 30s ping interval, protocol version handshake (`PROTOCOL_VERSION`). Base URL from `VITE_API_WS_URL`.
- **SSE client:** **Not present.** No `EventSource` usage in desktop frontend.
- **Base URLs:** `lib/desktopRuntimeConfig.ts` ([`desktopRuntimeConfig.ts:38–115`](apps/desktop/src/lib/desktopRuntimeConfig.ts:38–115))
  - `VITE_API_HTTP_BASE` → default `http://localhost:3001`
  - `VITE_API_WS_URL` → default `ws://localhost:3001/ws`
  - `VITE_DESKTOP_ALLOW_INSECURE_LOCALHOST` → allows localhost in production

#### Vite env vars read
| Variable | Read in | Line | Purpose |
|----------|---------|------|---------|
| `VITE_DESKTOP_UPDATER_ENABLED` | `App.tsx` | 151 | Enable/disable in-app updater |
| `VITE_DESKTOP_UPDATER_ENABLED` | `SettingsPanel.tsx` | 42 | Same, for settings UI |
| `VITE_API_HTTP_BASE` | `desktopRuntimeConfig.ts` | 43 | API HTTP base URL |
| `VITE_API_WS_URL` | `desktopRuntimeConfig.ts` | 44 | API WebSocket URL |
| `VITE_DESKTOP_ALLOW_INSECURE_LOCALHOST` | `desktopRuntimeConfig.ts` | 42 | Allow localhost in prod |
| `import.meta.env.PROD` | `desktopRuntimeConfig.ts` | 41 | Production mode detection |

**Declared but NOT read anywhere in `src/`:**
- `VITE_DESKTOP_CSP_MODE`
- `VITE_DESKTOP_UPDATER_PUBLIC_KEY`

**Build-time define:** `__GORKH_DESKTOP_VERSION__` — used in `App.tsx:150`.

---

## 7. iOS app (apps/ios)

- **Language:** Swift 5.0
- **Framework:** SwiftUI, iOS 17.0+, no external package manager dependencies
- **Project:** `AICompanion.xcodeproj`, bundle ID `com.aioperator.companion`, version `1.0.0`
- **Entry point:** [`AICompanionApp.swift`](apps/ios/AICompanion/App/AICompanionApp.swift:1) → `ContentView.swift`

**API endpoints called** (all in [`Services/APIClient.swift`](apps/ios/AICompanion/Services/APIClient.swift:1))
| Method | Endpoint | Lines |
|--------|----------|-------|
| POST | `/auth/login` | 59–61 |
| GET | `/devices` | 72–74 |
| GET | `/devices/{deviceId}` | 78–80 |
| GET | `/runs` | 86–88 |
| GET | `/devices/{deviceId}/runs` | 92–94 |
| GET | `/runs/{runId}` | 98–100 |

Base URL: hardcoded `http://localhost:3000` (debug) / `https://api.aioperator.com` (release) — [`APIClient.swift:39–43`](apps/ios/AICompanion/Services/APIClient.swift:39–43).

**Auth model:** JWT Bearer token stored in iOS Keychain (`Security` framework), service key `com.aioperator.companion`, accessibility `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` — [`KeychainManager.swift:24,74`](apps/ios/AICompanion/Services/KeychainManager.swift:24). On HTTP 401, token is cleared and `APIError.unauthorized` thrown — [`APIClient.swift:159–162`](apps/ios/AICompanion/Services/APIClient.swift:159–162).

**Shared types usage:** **None.** All models (`User`, `Device`, `Run`, `RunStep`, `ControlState`) are manually duplicated in Swift structs conforming to `Codable`. No link to `@ai-operator/shared`.

**TODO/FIXME:** Zero found.

---

## 8. Infra and deployment

### infra/ contents
| File | Purpose |
|------|---------|
| [`infra/docker-compose.yml`](infra/docker-compose.yml:1) | Local dev stack: Postgres 16 + Redis 7 |
| [`infra/.env.example`](infra/.env.example:1) | Local infra env template (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `REDIS_URL`) |
| [`infra/nginx/nginx.conf`](infra/nginx/nginx.conf:1) | Reverse proxy for local Docker Compose stack (`/ws` → API with upgrade, `/events` → SSE with buffering disabled, `/api/` → API, `/` → web) |
| [`infra/monitoring/prometheus.yml`](infra/monitoring/prometheus.yml:1) | Prometheus scrape config: target `api:3001/metrics`, interval 15s |
| [`infra/monitoring/alert.rules.yml`](infra/monitoring/alert.rules.yml:1) | Alerts: `ApiHigh5xxRate`, `ApiReadinessFailing`, `WsConnectionsDropped`, `StripeWebhookFailures` |
| [`infra/grafana/dashboards/api-overview.json`](infra/grafana/dashboards/api-overview.json:1) | Grafana dashboard JSON: HTTP RPS, p95 latency, 5xx rate, WS+SSE connections |

### GitHub Actions workflows

**`.github/workflows/ci.yml`** (158 lines)
- **Triggers:** `pull_request`, `push` to `main`
- **Job 1:** `build-typecheck-lint` (ubuntu-latest, Redis service). Steps: checkout, setup Node 20 + pnpm 9.15.0, install, `pnpm -w typecheck`, `pnpm -w build`, `pnpm audit`, `pnpm -w lint:ci`, `pnpm -w test`, `pnpm version:check`.
- **Job 2:** `smoke-e2e` (ubuntu-latest, Postgres + Redis services). Steps: install, wait for DB/Redis, run `scripts/smoke/httpSmoke.sh`, run `scripts/smoke/wsSmoke.sh`.

**`.github/workflows/dependency-review.yml`** (36 lines)
- **Triggers:** `pull_request`
- **Job:** `dependency-review` (ubuntu-latest). Uses `actions/dependency-review-action@v4` with `fail-on-severity: moderate`, `comment-summary-in-pr: always`.

**`.github/workflows/desktop-ci.yml`** (121 lines)
- **Triggers:** `pull_request`, `push` to `main`
- **Job 1:** `desktop-macos` (macos-latest). Steps: checkout, Node 20, pnpm 9.15.0, Rust stable + rustfmt/clippy, `cargo-audit`, install, build shared, `pnpm check:desktop:security`, `pnpm --filter @ai-operator/desktop tauri:check`, `cargo audit`.
- **Job 2:** `desktop-windows` (windows-latest). Same steps as macOS but Windows paths and `shell: pwsh`.

**`.github/workflows/desktop-release.yml`** (741 lines)
- **Triggers:** `push` to tags `v*`, `workflow_dispatch` with `channel` choice (`beta`|`stable`)
- **Job 1:** `prepare` (ubuntu-latest). Validates version sync, resolves release context (stable vs beta), validates desktop API runtime variables (must be HTTPS), validates signing secrets, generates packaged desktop validation report template.
- **Job 2:** `build-windows` (windows-latest, needs `prepare`). **Skipped entirely for stable channel** (lines 329–335). For beta: builds MSI with `active:false` updater config, normalizes asset name, asserts no `.sig` files, uploads artifact.
- **Job 3:** `build-macos` (macos-15-intel / macos-14 aarch64, needs `prepare`). Imports Developer ID cert into temp keychain, writes Tauri release config with signing identity, builds `app,dmg`, verifies signature with `codesign`, normalizes DMG, notarizes with `xcrun notarytool submit` (API key or Apple ID mode), staples, verifies with `spctl`. For stable: generates `.sig` with `tauri signer sign`. For beta: asserts no `.sig` files. Uploads artifact.
- **Job 4:** `publish-release` (ubuntu-latest, needs `prepare`, `build-windows`, `build-macos`, conditional on tag push). Downloads artifacts, writes release notes, publishes via `softprops/action-gh-release@v2` with `prerelease` flag for beta.

### Release and signing setup
- **macOS code signing:** Developer ID Application certificate imported from `secrets.MACOS_CERT_P12_BASE64` into temp keychain. Signing identity injected into Tauri build config.
- **macOS notarization:** `xcrun notarytool submit` with either App Store Connect API key mode (`APPLE_API_KEY_ID` + `APPLE_API_ISSUER_ID` + `APPLE_API_KEY_P8_BASE64`) or Apple ID mode (`APPLE_ID` + `APPLE_TEAM_ID` + `APPLE_APP_SPECIFIC_PASSWORD`). Stapling with `xcrun stapler staple`. Gatekeeper validation with `spctl -a -vv`.
- **Windows signing:** **None.** Windows builds are unsigned. Stable channel skips Windows entirely.
- **DMG generation:** Tauri bundler `--bundles app,dmg`. Normalized to `ai-operator-desktop_${VERSION}_macos_${ARCH}.dmg`.
- **Windows MSI generation:** Tauri bundler `--bundles msi`. Normalized to `ai-operator-desktop_${VERSION}_windows_x86_64.msi`.

### Updater feed
- **Hosted by:** API server (`GET /updates/desktop/:platform/:arch/:currentVersion.json`) — [`apps/api/src/index.ts:1666–1695`](apps/api/src/index.ts:1666–1695)
- **Source:** GitHub Releases (`DESKTOP_RELEASE_SOURCE=github`) or local files (`file` mode)
- **GitHub mode:** [`apps/api/src/lib/releases/resolveDesktopAssets.ts`](apps/api/src/lib/releases/resolveDesktopAssets.ts:137–148) fetches configured release, resolves assets by name pattern (`ai-operator-desktop_${VERSION}_macos_aarch64.dmg`, etc.), fetches companion `.sig` file.
- **File mode:** Reads `desktop-${platform}-${arch}.json` from `config.DESKTOP_UPDATE_FEED_DIR`.
- **Response format:** `DesktopUpdateManifest` — [`apps/api/src/lib/releases/validation.ts:8–10`](apps/api/src/lib/releases/validation.ts:8–10)
  ```ts
  { version: string; notes?: string; pub_date?: string; platforms?: { [target]: { url: string; signature: string } } }
  ```
- **Target keys:** `windows-x86_64`, `macos-x86_64`, `macos-aarch64`, `darwin-x86_64`, `darwin-aarch64` — [`apps/api/src/index.ts:653–659`](apps/api/src/index.ts:653–659)
- **Signatures:** Produced in CI by `pnpm exec tauri signer sign` using `TAURI_SIGNING_PRIVATE_KEY` + `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — [`.github/workflows/desktop-release.yml:648–657`](.github/workflows/desktop-release.yml:648–657). Validated by API with regex `/^[A-Za-z0-9+/=_-]{40,}$/` — [`apps/api/src/lib/releases/validation.ts:80–96`](apps/api/src/lib/releases/validation.ts:80–96).
- **Beta restriction:** Beta artifacts must NOT contain `.sig` files; workflow asserts this.

### render.yaml
[`render.yaml`](render.yaml:1): Render.com deployment blueprint. Service `ai-operator-api`, runtime docker, build context `.`, dockerfile `apps/api/Dockerfile`, health check `/ready`. Key env vars: `NODE_ENV=production`, `DEPLOYMENT_MODE=single_instance`, `RATE_LIMIT_BACKEND=redis`, `METRICS_PUBLIC=false`, `BILLING_ENABLED=false`, `DESKTOP_RELEASE_SOURCE=github`, `DESKTOP_RELEASE_TAG=latest`.

### docker-compose.prod.yml
[`docker-compose.prod.yml`](docker-compose.prod.yml:1): Full production stack.
- Services: `postgres` (16-alpine), `redis` (7-alpine, AOF), `migrate` (one-off Prisma deploy), `api` (port 3001), `web` (port 3000), `nginx` (port 8080, profile `edge`), `prometheus` (port 9090, profile `monitoring`).

---

## 9. Documentation cross-reference

For every doc in `docs/`, one line summarizing it and flagging contradictions.

| Doc | Summary | Contradiction flagged |
|-----|---------|----------------------|
| [`ADVANCED_AGENT.md`](docs/ADVANCED_AGENT.md) | Iteration 31 advanced agent system architecture | Claims multi-provider routing; actual [`agent/providers/mod.rs`](apps/desktop/src-tauri/src/agent/providers/mod.rs:307–311) returns `NOT_IMPLEMENTED` for all providers |
| [`MULTI_LLM_PROVIDER_SUMMARY.md`](docs/MULTI_LLM_PROVIDER_SUMMARY.md) | Multi-provider LLM architecture overview | Describes functional provider router; code is stubbed |
| [`QWEN_AGENT_SUMMARY.md`](docs/QWEN_AGENT_SUMMARY.md) | Qwen agent integration summary | Describes working Qwen integration; agent workflow executors are all `throw new Error('Not implemented')` |
| [`ai-engineering-system.md`](docs/ai-engineering-system.md) | AI engineering methodology | No contradictions |
| [`deploy-render-vercel.md`](docs/deploy-render-vercel.md) | Render + Vercel deployment guide | No contradictions |
| [`deploying.md`](docs/deploying.md) | MVP production deployment blueprint | Claims WS gateway requires Redis for multi-instance; code does fallback to in-memory silently |
| [`desktop-signin-flow.md`](docs/desktop-signin-flow.md) | Desktop sign-in security model | Accurate; no contradictions |
| [`error-tracking.md`](docs/error-tracking.md) | Sentry integration guide | No contradictions |
| [`ios-packaging.md`](docs/ios-packaging.md) | iOS app packaging instructions | No contradictions |
| [`local-llm.md`](docs/local-llm.md) | Local LLM setup guide | No contradictions |
| [`migration-pairing-to-signin.md`](docs/migration-pairing-to-signin.md) | Pairing → sign-in migration | No contradictions |
| [`multi-llm-provider-architecture.md`](docs/multi-llm-provider-architecture.md) | Detailed multi-provider architecture | Claims functional provider selection UI and routing; actual provider router is stubbed |
| [`native-model-training.md`](docs/native-model-training.md) | Native model training architecture | No contradictions |
| [`production-readiness.md`](docs/production-readiness.md) | Production readiness checklist | No contradictions |
| [`protocol.md`](docs/protocol.md) | WebSocket protocol specification | Accurate; matches [`packages/shared/src/index.ts`](packages/shared/src/index.ts:1) |
| [`provider-selection-ui.md`](docs/provider-selection-ui.md) | Provider selection UI design | No contradictions |
| [`qwen-agent-implementation.md`](docs/qwen-agent-implementation.md) | Qwen agent implementation | Claims working 5-phase workflow; all phase executors in [`packages/shared/src/agent/workflow.ts`](packages/shared/src/agent/workflow.ts:188–424) are stubs |
| [`qwen-agent-integration.md`](docs/qwen-agent-integration.md) | Qwen agent integration details | Same contradiction as above |
| [`qwen-frontend-integration.md`](docs/qwen-frontend-integration.md) | Qwen frontend integration | No contradictions |
| [`qwen-planner-executor.md`](docs/qwen-planner-executor.md) | Qwen planner/executor design | No contradictions |
| [`qwen-vision-engine.md`](docs/qwen-vision-engine.md) | Qwen vision engine design | No contradictions |
| [`release-acceptance.md`](docs/release-acceptance.md) | Release acceptance criteria | No contradictions |
| [`release-rehearsal.md`](docs/release-rehearsal.md) | Release rehearsal process | No contradictions |
| [`releasing.md`](docs/releasing.md) | Desktop release process | Accurate; matches workflow file exactly |
| [`render-backend.md`](docs/render-backend.md) | Render backend deployment | No contradictions |
| [`runbook.md`](docs/runbook.md) | Operational runbook | No contradictions |
| [`security.md`](docs/security.md) | Security posture and threat model | Claims JWT key rotation support; [`lib/auth.ts:117–119`](apps/api/src/lib/auth.ts:117–119) has rotation logic commented out |
| [`vercel-frontend.md`](docs/vercel-frontend.md) | Vercel frontend deployment | No contradictions |

**Docs in `docs/plans/`** (dated design/implementation plan pairs): All are historical iteration plans. No contradictions with code were found in the sampled plans, though many describe features that are partially implemented (e.g., advanced agent system, Qwen workflow phases).

---

## 10. Broken, incomplete, or suspicious code — prioritized

### P0 (blocks core flows)

1. **`start_recording` command registered but unimplemented**  
   [`apps/desktop/src-tauri/src/lib.rs:2397–2408`](apps/desktop/src-tauri/src/lib.rs:2397–2408)  
   Returns a fake demo ID string. Registered in `generate_handler!` at line 2488. Callable from frontend but does nothing useful. Contains an `unwrap()` on `duration_since` that could panic.

2. **Advanced Agent LLM provider router returns `NOT_IMPLEMENTED` for all routing**  
   [`apps/desktop/src-tauri/src/agent/providers/mod.rs:307–311,327–331`](apps/desktop/src-tauri/src/agent/providers/mod.rs:307–311)  
   `ProviderRouter::route()` unconditionally returns `NOT_IMPLEMENTED` for every provider. The entire Iteration 31 "Advanced Agent System" cannot execute LLM calls despite all 7 Tauri commands (`start_agent_task`, `get_agent_task_status`, `cancel_agent_task`, `approve_agent_proposal`, `deny_agent_proposal`, `submit_agent_user_response`, `list_agent_providers`) being registered and exposed to the frontend.

3. **Agent provider module explicitly documented as experimental/incomplete**  
   [`apps/desktop/src-tauri/src/agent/providers/mod.rs:1–31`](apps/desktop/src-tauri/src/agent/providers/mod.rs:1–31)  
   Module doc comment admits: "Provider trait methods are largely stubbed/not implemented" and "Router returns `NOT_IMPLEMENTED` errors for most operations." Yet commands are registered in the main handler block.

4. **Agent workflow phase executors are all stubs**  
   [`packages/shared/src/agent/workflow.ts:188,237,311,389,424`](packages/shared/src/agent/workflow.ts:188)  
   `executeResearchPhase`, `executeSpecifyPhase`, `executePlanPhase`, `executeWorkPhase`, `executeReviewPhase` all throw `new Error('Not implemented')`. The `runCompleteWorkflow` dispatcher at line 516 will always fail.

### P1 (degraded experience)

5. **`any` type workaround in API repo layer — `mapRun`**  
   [`apps/api/src/repos/runs.ts:31,45`](apps/api/src/repos/runs.ts:31)  
   `function mapRun(row: any): RunWithSteps` — Prisma row mapping bypasses generated types.

6. **`any` type workaround in API repo layer — `mapTool`**  
   [`apps/api/src/repos/tools.ts:29`](apps/api/src/repos/tools.ts:29)  
   `function mapTool(row: any): ToolSummary`.

7. **`any` type workaround in API repo layer — `rowToAction`**  
   [`apps/api/src/repos/actions.ts:26`](apps/api/src/repos/actions.ts:26)  
   `function rowToAction(row: any): DeviceAction`.

8. **`any` type workaround in Stripe webhook handler — subscription object**  
   [`apps/api/src/index.ts:1866`](apps/api/src/index.ts:1866)  
   `const subscription = event.data.object as any;`

9. **`any` type workaround in Stripe webhook handler — session object**  
   [`apps/api/src/index.ts:1878`](apps/api/src/index.ts:1878)  
   `const session = event.data.object as any;`

10. **`any` type workaround in error-tracking Sentry lazy-loader**  
    [`apps/api/src/lib/error-tracking.ts:81,92,229`](apps/api/src/lib/error-tracking.ts:81)  
    `const sentryModule: any = await import(...)`, `beforeSend(event: any)`, `redactEvent(event: any): any | null`. Privacy-sensitive event redaction pipeline has no compile-time guarantees.

11. **`any` type workaround in GitHub release normalizer**  
    [`apps/api/src/lib/releases/github.ts:85,91`](apps/api/src/lib/releases/github.ts:85)  
    `function normalizeRelease(data: any): GitHubRelease` — external API response without schema validation.

12. **Commented-out JWT key rotation code**  
    [`apps/api/src/lib/auth.ts:117–119`](apps/api/src/lib/auth.ts:117–119)  
    `verifyAccessTokenWithRotation` is named as if it supports rotation, but the rotation logic is entirely commented out. Misleading for operators.

13. **Hardcoded test credentials in release verification script**  
    [`scripts/release/verify-api-feed.mjs:21–22`](scripts/release/verify-api-feed.mjs:21–22)  
    `const USER_PASSWORD = env.USER_PASSWORD || 'testpassword123';` — falls back to weak hardcoded password.

14. **Permanently skipped E2E test**  
    [`tests/e2e-device-commands-redis.test.mjs:58`](tests/e2e-device-commands-redis.test.mjs:58)  
    `test('redis device command e2e requires REDIS_URL', { skip: true }, () => {});` — never runs.

### P2 (paper cuts / tech debt)

15. **`#[allow(dead_code)]` annotations masking unused Rust code**  
    Found in: [`workspace.rs:445,881,894`](apps/desktop/src-tauri/src/workspace.rs:445), [`agent/executor.rs:37,73,88`](apps/desktop/src-tauri/src/agent/executor.rs:37), [`agent/mod.rs:8,10`](apps/desktop/src-tauri/src/agent/mod.rs:8), [`agent/planner.rs:82,136`](apps/desktop/src-tauri/src/agent/planner.rs:82), [`agent/providers/mod.rs:132`](apps/desktop/src-tauri/src/agent/providers/mod.rs:132), [`llm/mod.rs:193,207`](apps/desktop/src-tauri/src/llm/mod.rs:193), [`llm/openai_compat.rs:397`](apps/desktop/src-tauri/src/llm/openai_compat.rs:397), [`local_ai/model_compatibility.rs:13,120`](apps/desktop/src-tauri/src/local_ai/model_compatibility.rs:13). Total: 13 suppressions across 8 files.

16. **localhost defaults in API production config**  
    [`apps/api/src/config.ts:20,25,26`](apps/api/src/config.ts:20)  
    `WEB_ORIGIN`, `APP_BASE_URL`, `API_PUBLIC_BASE_URL` default to `http://localhost:3000`/`http://localhost:3001`.

17. **localhost fallback in web auth client**  
    [`apps/web/lib/auth.ts:1`](apps/web/lib/auth.ts:1)  
    `const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';`

18. **localhost defaults in desktop runtime config**  
    [`apps/desktop/src/lib/desktopRuntimeConfig.ts:1–2`](apps/desktop/src/lib/desktopRuntimeConfig.ts:1)  
    `DEFAULT_DEV_HTTP_BASE = 'http://localhost:3001'`, `DEFAULT_DEV_WS_URL = 'ws://localhost:3001/ws'`.

19. **Placeholder host/signature validation patterns**  
    [`apps/api/src/lib/releases/validation.ts:20–21,63–64,87–88`](apps/api/src/lib/releases/validation.ts:20)  
    Explicitly checks for `example.com` and placeholder signatures. Defensive but indicates historical placeholder issues.

20. **Empty function body in test helper**  
    [`tests/desktop-ws-client-signout.test.ts:38`](tests/desktop-ws-client-signout.test.ts:38)  
    `globalThis.clearTimeout = (() => {}) as typeof clearTimeout;` — patches `clearTimeout` to no-op.

21. **Empty function bodies in readiness test mocks**  
    [`tests/api-readiness.test.mjs:18–19,79–80`](tests/api-readiness.test.mjs:18)  
    `checkDatabase: async () => {}, checkSchema: async () => {}` — readiness checks mocked to empty functions.

22. **Unused import `providerRequiresApiKey` in desktop**  
    [`apps/desktop/src/lib/aiAssist.ts:4`](apps/desktop/src/lib/aiAssist.ts:4)  
    Imported but never used in file.

23. **Undefined variable references in SettingsPanel**  
    [`apps/desktop/src/components/SettingsPanel.tsx:270–295`](apps/desktop/src/components/SettingsPanel.tsx:270)  
    `runtimeConfig` and `sessionDeviceToken` referenced in `handleTest` but not declared in component props or scope. Will throw `ReferenceError` at runtime when Free AI fallback path is hit.

24. **Dead code: AgentWorkflow component and agent sub-components**  
    [`apps/desktop/src/components/AgentWorkflow.tsx`](apps/desktop/src/components/AgentWorkflow.tsx:1), [`components/agent/AgentTaskDialog.tsx`](apps/desktop/src/components/agent/AgentTaskDialog.tsx:1), [`components/agent/AgentTaskMonitor.tsx`](apps/desktop/src/components/agent/AgentTaskMonitor.tsx:1), [`components/agent/AgentProviderSelector.tsx`](apps/desktop/src/components/agent/AgentProviderSelector.tsx:1), [`components/agent/index.ts`](apps/desktop/src/components/agent/index.ts:1). Never imported by `App.tsx`.

25. **Compiled artifacts in source tree**  
    `apps/desktop/src/` contains `.js`, `.d.ts`, `.js.map`, `.d.ts.map` files alongside source (e.g., `App.js`, `lib/aiAssist.js`). Generated outputs committed to git.

26. **Web app does not import `@ai-operator/shared`**  
    No imports from shared package found in `apps/web/`. All types are duplicated inline or not typed.

---

## 11. First-run flow reconstruction

Trace from double-clicking the installed app through chat-ready state.

1. **App launch**  
   `main.rs` [`apps/desktop/src-tauri/src/main.rs:1–6`](apps/desktop/src-tauri/src/main.rs:1) calls `ai_operator_desktop_lib::run()`.

2. **Builder setup**  
   `lib.rs` [`apps/desktop/src-tauri/src/lib.rs:2411–2563`](apps/desktop/src-tauri/src/lib.rs:2411) initializes 5 state objects (`TrayRuntimeState`, `OverlayModeRuntimeState`, `DesktopAuthRuntimeState`, `LocalAiRuntimeState`, `AgentState`), plugins (`opener`, `dialog`, `process`, `updater`), and 58 commands via `generate_handler!`.

3. **Tray registration**  
   `setup()` closure [`lib.rs:2493–2543`](apps/desktop/src-tauri/src/lib.rs:2493): creates main window, builds tray icon with menu (`build_tray_menu` at [`lib.rs:974–1041`](apps/desktop/src-tauri/src/lib.rs:974)), registers click handlers (`toggle_window`, `toggle_screen_preview`, `toggle_allow_control`, `toggle_ai_pause`, `quit`). In debug builds, opens devtools.

4. **Window show**  
   `create_main_window()` [`lib.rs:941–958`](apps/desktop/src-tauri/src/lib.rs:941) builds the `"main"` window from `tauri.conf.json`. If `startMinimizedToTray` is set, frontend calls `main_window_hide` via invoke at [`App.tsx:1212`](apps/desktop/src/App.tsx:1212).

5. **Frontend bootstrap**  
   `App.tsx` [`apps/desktop/src/App.tsx:339–427`](apps/desktop/src/App.tsx:339) initializes ~40 state variables. `getOrCreateDeviceId()` at line 138 reads/creates stable device ID from `localStorage` (`ai-operator-device-id`).

6. **Auth check**  
   `App.tsx` useEffect at ~line 900: calls `getStoredDeviceToken(deviceId)` → `invoke('device_token_get')` [`lib.rs:1615–1617`](apps/desktop/src-tauri/src/lib.rs:1615). If no token, also attempts `migrateLegacyDeviceToken()` [`App.tsx:172–186`](apps/desktop/src/App.tsx:172) which reads old `localStorage` key `ai-operator-device-token` and migrates to keychain.

7. **Runtime config validation**  
   `desktopRuntimeConfig.ts` [`apps/desktop/src/lib/desktopRuntimeConfig.ts:38–115`](apps/desktop/src/lib/desktopRuntimeConfig.ts:38) validates `VITE_API_HTTP_BASE` and `VITE_API_WS_URL` at module load time. If invalid, `App.tsx` sets `runtimeConfigError` and shows error UI.

8. **WebSocket connect (unsigned-in)**  
   `App.tsx` creates `WsClient` and calls `connect(runtimeConfig.wsUrl)` [`wsClient.ts:92–119`](apps/desktop/src/lib/wsClient.ts:92). Sends `device.hello` without `deviceToken`. Server responds `server.hello_ack`.

9. **Sign-in button click**  
   User clicks "Sign in". `handleDesktopSignIn()` [`App.tsx:2380–2410`](apps/desktop/src/App.tsx:2380) runs.

10. **Native loopback start**  
    `startDesktopSignIn()` [`lib/desktopAuth.ts:70–136`](apps/desktop/src/lib/desktopAuth.ts:70) calls `invoke('desktop_auth_listen_start', { state, timeoutMs: 125_000 })` [`lib.rs:1450–1494`](apps/desktop/src-tauri/src/lib.rs:1450). Rust binds TCP to `127.0.0.1:0`, returns `callbackUrl`.

11. **API start**  
    `startDesktopSignIn()` POSTs `/desktop/auth/start` with `deviceId`, `callbackUrl`, `state`, `nonce`.

12. **Browser open**  
    `openExternalBrowser()` [`lib/desktopAuth.ts:53–58`](apps/desktop/src/lib/desktopAuth.ts:53) calls `invoke('open_external_url', { url: authUrl })` [`lib.rs:1333–1362`](apps/desktop/src-tauri/src/lib.rs:1333). URL allowlist check: only `https://` origins matching Stripe, GitHub, or `APP_BASE_URL` are permitted.

13. **Web auth**  
    Browser loads `/desktop/sign-in?attemptId=<id>`. If not authenticated, redirects to `/login`. User logs in. Web calls `completeDesktopAuth(attemptId)` → POST `/desktop/auth/complete` → receives `handoffToken`, `callbackUrl`, `state`.

14. **Redirect to desktop loopback**  
    Browser navigates to `http://127.0.0.1:<port>/desktop-auth/callback?handoffToken=...&state=...`.

15. **Loopback finish**  
    Rust `handle_desktop_auth_connection()` [`lib.rs:930–939`](apps/desktop/src-tauri/src/lib.rs:930) accepts socket, reads GET request, extracts query params, validates `state`. `desktop_auth_listen_finish` returns `{ handoffToken, state }`.

16. **State validation**  
    `lib/desktopAuth.ts:107–109` compares callback `state` with original. Mismatch throws error.

17. **Token exchange**  
    POST `/desktop/auth/exchange` with `handoffToken`, `deviceId`, `state`, `nonce`. API consumes handoff, generates `deviceToken`, claims device.

18. **Token storage**  
    `setStoredDeviceToken()` [`App.tsx:158–163`](apps/desktop/src/App.tsx:158) calls `invoke('device_token_set', { deviceId, token })` [`lib.rs:1601–1613`](apps/desktop/src-tauri/src/lib.rs:1601). Stored in OS keychain under service `"gorkh"`, account `device_token::<device_id>`.

19. **WS reconnect with token**  
    `App.tsx:2403–2405`: `client.setDeviceToken(result.deviceToken)`, `client.disconnect()`, `client.connect(runtimeConfig.wsUrl)`. New `device.hello` includes `deviceToken`.

20. **API bootstrap load**  
    `App.tsx` useEffect at ~line 1256: `getDesktopTaskBootstrap(runtimeConfig, sessionDeviceToken)` → GET `/desktop/me`. Returns `user`, `billing`, `device`, `runs`, `activeRun`, `readiness`.

21. **Account load**  
    `App.tsx` useEffect at ~line 1286: `getDesktopAccount(runtimeConfig, sessionDeviceToken)` → GET `/desktop/account`. Returns account snapshot with signed-in devices.

22. **Free AI detection**  
    `App.tsx` useEffect at ~line 900: `getLocalAiStatus()` → `invoke('local_ai_status')` [`lib.rs:1952–1957`](apps/desktop/src-tauri/src/lib.rs:1952). Checks if `runtimeRunning && targetModelAvailable`. If not configured, greeting shows `GORKH_ONBOARDING.freeAiNotReady` or `GORKH_ONBOARDING.providerNotConfigured`.

23. **Provider configured check**  
    `hasLlMProviderConfigured()` [`lib/aiAssist.ts:97–120`](apps/desktop/src/lib/aiAssist.ts:97) checks keychain for cloud provider keys, or local Ollama status for `native_qwen_ollama`.

24. **Chat-ready state**  
    If provider is ready, `getAssistantConversationGreeting()` [`App.tsx:282–290`](apps/desktop/src/App.tsx:282) returns `GORKH_ONBOARDING.firstGreeting`. Chat input is enabled. User can send messages.

**Silent failure points at each step:**
- Step 6: Keychain read failure → user appears signed out with no error message.
- Step 7: Invalid runtime config → app shows generic error, no retry mechanism.
- Step 8: WS connect failure → `status` becomes `error`, but UI may still show signed-out state without clear guidance.
- Step 10: Loopback bind failure (port conflict) → sign-in fails with opaque error.
- Step 12: `open_external_url` blocks non-allowlisted URL → if `APP_BASE_URL` is misconfigured, browser never opens with no clear error.
- Step 16: State mismatch → generic "state mismatch" error; user must restart sign-in.
- Step 18: Keychain write failure → token lost on next launch; user must sign in again.
- Step 20: `/desktop/me` 401 → bootstrap fails, app shows error but may not redirect to sign-in.
- Step 22: Local AI detection failure → app silently falls back to "not ready" greeting even if Ollama is installed externally.

---

## 12. Open questions for the architect

1. **Advanced Agent System — keep or cut?** The `ProviderRouter::route()` returns `NOT_IMPLEMENTED` for every provider, and all 7 Tauri commands are registered but non-functional. Is this Iteration 31 work-in-progress that should be gated behind a feature flag, or should the commands be removed from `generate_handler!` until ready?

2. **Agent workflow phases — real or aspirational?** `packages/shared/src/agent/workflow.ts` has a complete 5-phase workflow dispatcher, but every phase executor throws `new Error('Not implemented')`. Is this scaffolding for a future release, or should it be removed to avoid confusing future maintainers?

3. **Windows signing and stable channel.** The desktop release workflow skips Windows entirely for stable channel (`build-windows` job has `if: needs.prepare.outputs.channel == 'beta'`). Is Windows support intentionally macOS-only for stable releases? If so, should the Windows CI job and Windows-related docs be updated to reflect this?

4. **Updater pubkey storage.** `VITE_DESKTOP_UPDATER_PUBLIC_KEY` is interpolated into `tauri.conf.json` at build time, but `desktop_updater_enabled()` in Rust reads `VITE_DESKTOP_UPDATER_ENABLED` via `option_env!` and is **never called**. Is updater enablement meant to be build-time only, or should the Rust function be wired into runtime logic?

5. **Web app shared types.** `apps/web` does not import `@ai-operator/shared` at all. Is this intentional (web app maintains its own types), or should the web app be migrated to use shared types for consistency?

6. **iOS app shared types.** The iOS app manually duplicates all models in Swift. Is there a plan to generate Swift types from the shared package, or will the iOS app continue to be maintained independently?

7. **JWT key rotation.** `verifyAccessTokenWithRotation` in `apps/api/src/lib/auth.ts` has rotation logic commented out. Is key rotation on the roadmap, or should the function be renamed to remove the misleading implication?

8. **FREE_AI_FALLBACK_* env vars.** These are read by `config.ts` but are **missing from both `.env.example` and `.env.prod.example`**. Are they intentionally omitted from documentation, or should they be added?

9. **Custom URL scheme vs loopback.** The desktop auth uses TCP loopback (`127.0.0.1:0`). Docs mention "custom URL scheme" in places, but no `tauri-plugin-deep-link` is used. Is loopback the final architecture, or will a custom scheme (e.g., `gorkh://`) be added later?

10. **Redis Streams consumer group.** The device command queue uses Redis Streams with consumer group `ws-gateway`. If the API restarts, does the consumer group re-create automatically? The code in `lib/device-commands.ts` creates the group with `MKSTREAM`, but what happens if the stream already exists with a different group?

11. **Release asset naming mismatch.** The workflow normalizes assets to `ai-operator-desktop_...` but the product name in `tauri.conf.json` is `GORKH` and the bundle identifier is `com.ai-operator.desktop`. Is the `ai-operator-desktop` prefix the canonical artifact name, or should it be migrated to `gorkh-desktop`?

12. **SettingsPanel undefined variables.** `SettingsPanel.tsx` references `runtimeConfig` and `sessionDeviceToken` in `handleTest` (lines 270–295) that are not in scope. Was this code path ever tested, or is it dead code that should be removed?

---

AUDIT COMPLETE — 496 files analyzed, 4 P0 issues flagged, 12 open questions for architect.
