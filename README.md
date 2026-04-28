# GORKH

GORKH is a desktop-first AI assistant that can understand natural-language tasks, operate on your machine with local approvals, and coordinate optional cloud providers through a secure local runtime.

The product is built around four surfaces:

- **Desktop app** — the primary product experience, built with Tauri + React
- **Web app** — sign-in, billing, downloads, account, and admin/debug surfaces
- **API** — auth, device/session coordination, downloads, updater feed, billing, and real-time backend services
- **iOS companion app** — read-only monitoring and account access (companion to the desktop experience)

---

## What GORKH does

GORKH is designed to feel like a consumer desktop assistant, not an ops console.

Users should be able to:

- sign in from the desktop app
- use **GORKH Free** (5 hosted jobs/day, no setup required)
- optionally connect **OpenAI**, **Claude**, or a **custom OpenAI-compatible** endpoint
- approve sensitive actions locally
- let GORKH help with desktop work, file operations, coding workflows, and guided automation

Key product principles:

- **desktop-first**
- **local approvals for privileged actions**
- **no server-side LLM keys**
- **screen data is not persisted**
- **retail-friendly Free AI setup**
- **web app is secondary after sign-in**

---

## Repository structure

```text
apps/
  api/        Fastify API, WebSocket gateway, SSE, billing, downloads, updater feed
  desktop/    Tauri + React desktop app
  web/        Next.js web portal
  ios/        iOS companion app (read-only)
packages/
  shared/     Shared TypeScript types and protocol definitions
infra/        Local Docker infrastructure and deployment support files
docs/         Architecture, deployment, release, and runbook documentation
```

## Architecture overview

### Desktop app

The desktop app is the main product surface.

It is responsible for:

- desktop sign-in handoff
- provider settings and keychain-backed credential storage
- local approvals
- task/chat UX
- screen capture and input-control permissions
- keychain-backed credential storage
- workspace access
- local tool execution

### Web app

The web app is used for:

- registration and login
- billing and subscription management
- desktop download page
- account/device information
- admin/debug views

### API

The API provides:

- browser auth and sessions
- desktop auth handoff
- device/session coordination
- run/task persistence
- WebSocket and SSE real-time flows
- Stripe billing integration
- desktop installer metadata
- updater manifest feed
- health/readiness/metrics surfaces

## Core capabilities

### Free AI

GORKH Free is a hosted fallback tier for users without a BYO API key.

- 5 free tasks per day, powered by DeepSeek
- No local installation or model management required
- Device-token auth; no API keys sent to the server
- Upgrade anytime by adding your own OpenAI, Claude, DeepSeek, Kimi, MiniMax, or compatible key

### Paid providers

GORKH supports optional paid providers in the desktop app.

Current launch-facing provider model:

- GORKH Free (hosted, 5 tasks/day)
- OpenAI
- Claude
- DeepSeek
- Kimi
- MiniMax
- Custom OpenAI-compatible (advanced use)

API keys stay in the local OS keychain and are never sent to the server.

### Local approvals

Sensitive actions remain approval-gated locally.

Examples include:

- control actions
- tool execution
- AI-generated proposals

### Real-time backend coordination

The platform uses:

- WebSocket for desktop coordination
- SSE for browser updates
- Redis-backed device command queue for at-least-once command delivery when configured

## Prerequisites

- Node.js 20+
- pnpm (via Corepack recommended)
- Rust stable for the desktop app
- Docker for local Postgres/Redis if running the full stack locally

Enable pnpm with Corepack:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

## Quick start

Install dependencies:

```bash
pnpm install
```

Run all apps in development mode:

```bash
pnpm dev
```

Build everything:

```bash
pnpm -w build
```

Typecheck everything:

```bash
pnpm -w typecheck
```

Run tests:

```bash
pnpm -w test
```

Desktop security checks:

```bash
pnpm check:desktop:security
```

## Local development

### Start infrastructure

```bash
cd infra
docker-compose up -d
```

This starts local:

- Postgres on 5432
- Redis on 6379

### Run the API

```bash
pnpm --filter @ai-operator/api dev
```

Default local endpoints:

- API: http://localhost:3001
- WebSocket: ws://localhost:3001/ws
- SSE: http://localhost:3001/events

### Run the web app

```bash
pnpm --filter @ai-operator/web dev
```

Default local web app:

- http://localhost:3000

### Run the desktop app

The desktop app must run on your machine, not inside a Codespace or remote container, because it needs local OS permissions and local runtime access.

```bash
pnpm --filter @ai-operator/desktop dev
```

Or run Tauri directly:

```bash
pnpm --filter @ai-operator/desktop tauri:dev
```

## Environment variables

### API

Example local values:

```
PORT=3001
NODE_ENV=development
LOG_LEVEL=info
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_operator
JWT_SECRET=dev_secret_change_me
ACCESS_TOKEN_EXPIRES_IN=30m
REFRESH_TOKEN_TTL_DAYS=14
WEB_ORIGIN=http://localhost:3000
APP_BASE_URL=http://localhost:3000
API_PUBLIC_BASE_URL=http://localhost:3001
BILLING_ENABLED=false
RATE_LIMIT_BACKEND=memory
REDIS_URL=redis://localhost:6379
```

### Web

```
NEXT_PUBLIC_API_BASE=http://localhost:3001
```

### Desktop

```
VITE_API_WS_URL=ws://localhost:3001/ws
VITE_API_HTTP_BASE=http://localhost:3001
VITE_DESKTOP_UPDATER_ENABLED=false
VITE_DESKTOP_ALLOW_INSECURE_LOCALHOST=true
```

## Key routes

### Auth and account

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/logout_all`
- `GET /auth/me`
- `GET /auth/sessions`

### Billing

- `GET /billing/status`
- `POST /billing/checkout`
- `POST /billing/portal`
- `POST /billing/webhook`

### Desktop downloads and updates

- `GET /downloads/desktop`
- `GET /updates/desktop/:platform/:arch/:currentVersion.json`

### Operational endpoints

- `GET /`
- `GET /health`
- `GET /ready`
- `GET /admin/health`
- `GET /metrics`

### Real-time and orchestration

- `GET /events`
- `GET /devices`
- `GET /devices/:deviceId`
- `GET /runs`
- `GET /runs/:runId`
- `POST /runs`
- `POST /runs/:runId/cancel`

## Desktop behavior

### Sign-in

Desktop sign-in uses browser-based auth handoff. After sign-in, the desktop stores its device session locally and reconnects automatically.

### Tray behavior

The desktop app behaves like a tray agent. Closing the window hides it instead of exiting. Use the tray to reopen or quit.

### Permissions

On macOS, GORKH may require:

- Screen Recording
- Accessibility

The app includes permission status guidance and shortcuts to the relevant system settings.

### Free AI setup

GORKH can manage the local Free AI runtime for the user. The UI surfaces install progress, runtime status, model availability, and troubleshooting guidance.

## Testing and validation

Recommended validation commands:

```bash
pnpm -w typecheck
pnpm -w build
pnpm -w test
pnpm check:desktop:security
pnpm smoke:final
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml --quiet
```

For desktop Rust/Tauri validation:

```bash
pnpm --filter @ai-operator/desktop tauri:check
```

This runs:

- `cargo fmt --check`
- `cargo clippy --all-targets --all-features -- -D warnings`
- debug Tauri build validation

## Deployment

Primary deployment topology:

- Backend/API → Render
- Frontend/Web → Vercel
- Database → Postgres
- Redis → shared Redis for rate limits, presence, and device command delivery

Key docs:

- [docs/deploying.md](docs/deploying.md)
- [docs/deploy-render-vercel.md](docs/deploy-render-vercel.md)
- [docs/security.md](docs/security.md)
- [docs/releasing.md](docs/releasing.md)

## Desktop downloads and updater modes

GORKH supports two download/update modes:

### File mode

Best for direct website downloads and early beta distribution.

The API serves installer metadata using configured public URLs.

### GitHub mode

Best for release-driven distribution once GitHub Releases are the source of truth.

The API resolves installer metadata from GitHub Release assets. Stable updater feeds require signed artifacts and `.sig` files.

## Security model

GORKH is built around local trust boundaries:

- LLM API keys remain local
- screen frames are not persisted
- desktop approvals gate privileged actions
- diagnostics are redacted
- typed text, file contents, terminal args, tokens, and raw LLM keys are excluded from support exports where intended

See:

- [docs/security.md](docs/security.md)

## Current product truth

GORKH is evolving toward a more retail-friendly desktop assistant experience. The desktop app is the main product surface, while the web app remains the account/billing/download companion.

At launch, the most stable user path is:

1. desktop sign-in
2. Free AI setup or paid-provider setup
3. local approvals for sensitive actions
4. website downloads through the public /download flow

## Release notes

For release and signing/notarization flows, see:

- [docs/releasing.md](docs/releasing.md)

For production operations and rollout guidance, see:

- [docs/runbook.md](docs/runbook.md)
- [docs/release-rehearsal.md](docs/release-rehearsal.md)
