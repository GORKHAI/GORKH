# GORKH — Agent Guidance

This document provides guidance for AI coding assistants working on the GORKH codebase.

## Skills Integration

This project uses Kimi Code skills for domain-specific expertise. All skills are located in `.kimi/skills/`:

| Skill | Path | Use For |
|-------|------|---------|
| `desktop-tauri` | `.kimi/skills/desktop-tauri/SKILL.md` | Tauri 2, Rust commands, IPC, tray, permissions, updater, keychain |
| `ai-agent-systems` | `.kimi/skills/ai-agent-systems/SKILL.md` | LLM orchestration, tool calling, providers, local AI runtime |
| `backend-platform` | `.kimi/skills/backend-platform/SKILL.md` | Fastify API, auth, database, WebSocket, SSE, billing |
| `frontend-ui` | `.kimi/skills/frontend-ui/SKILL.md` | React components, chat UX, approval dialogs, state management |
| `devops-release` | `.kimi/skills/devops-release/SKILL.md` | CI/CD, signing, notarization, deployment |
| `qa-testing` | `.kimi/skills/qa-testing/SKILL.md` | Testing strategy, unit tests, integration tests, smoke tests |

**Always consult the relevant SKILL.md before making changes.**

## Project Structure

```
apps/
  api/           # Fastify backend (Node.js/TypeScript)
  desktop/       # Tauri + React desktop app (Rust + TypeScript)
  web/           # Next.js web portal (React/TypeScript)
  ios/           # iOS companion app (Swift)
packages/
  shared/        # Shared TypeScript types and utilities
infra/           # Docker infrastructure (Postgres, Redis)
docs/            # Architecture and runbook documentation
.kimi/skills/    # Kimi Code skills for domain expertise
```

## Quick Reference

### Technology Stack

| Layer | Technology |
|-------|------------|
| Desktop app | Tauri 2 + React + Vite |
| Desktop backend | Rust (Tauri commands) |
| API server | Fastify + TypeScript + Prisma |
| Web portal | Next.js 14 (App Router) |
| Database | PostgreSQL + Prisma |
| Cache/Queue | Redis (optional) |
| State management | In-code state (desktop), React state (web) |
| Styling | Tailwind CSS |
| Testing | Node.js test runner, cargo test |
| CI/CD | GitHub Actions |
| Hosting | Render (API), Vercel (web), GitHub Releases (desktop) |
| Local AI | Ollama + Qwen |
| Auth | JWT (access + refresh tokens), keychain storage |

### Package Names

- Root: `ai-operator` (legacy, being migrated to GORKH)
- API: `@ai-operator/api`
- Desktop: `@ai-operator/desktop`
- Web: `@ai-operator/web`
- Shared: `@ai-operator/shared`

### Key Commands

```bash
# Install dependencies
pnpm install

# Run all apps in dev mode
pnpm dev

# Build everything
pnpm -w build

# Typecheck everything
pnpm -w typecheck

# Run all tests
pnpm -w test

# Desktop security checks
pnpm check:desktop:security

# Smoke tests
pnpm smoke:final
```

### Desktop App Commands

```bash
# Run desktop app
pnpm --filter @ai-operator/desktop dev

# Run with Tauri
pnpm --filter @ai-operator/desktop tauri:dev

# Build desktop app
pnpm --filter @ai-operator/desktop tauri:build

# Rust checks
pnpm --filter @ai-operator/desktop tauri:check
```

### API Commands

```bash
# Run API server
pnpm --filter @ai-operator/api dev

# Database migrations
pnpm --filter @ai-operator/api db:migrate

# Prisma generate
pnpm --filter @ai-operator/api prisma:generate
```

### Web Commands

```bash
# Run web app
pnpm --filter @ai-operator/web dev
```

## Coding Conventions

### TypeScript

- Use strict TypeScript configuration
- No `any` types — use `unknown` with type guards when needed
- Prefer explicit return types on public functions
- Use Zod for runtime validation

### Rust

- Every Tauri command returns `Result<T, CommandError>`
- Never panic in commands — return proper errors
- All code must pass `cargo clippy --all-targets --all-features -- -D warnings`
- Use `?` operator for error propagation

### Security Principles

- **API keys never leave the machine** — store in OS keychain only
- **Screen data is never persisted** — in-memory only, 60s expiry
- **Local approvals gate all sensitive actions** — never auto-execute
- **No server-side LLM keys** — desktop calls LLMs directly

### File Naming

- TypeScript/React: `PascalCase.tsx` for components, `camelCase.ts` for utilities
- Rust: `snake_case.rs` for modules
- Test files: `*.test.ts` or `*.spec.ts`

## Common Tasks

### Adding a New Tauri Command

1. Define command in `apps/desktop/src-tauri/src/commands/{module}.rs`
2. Add to command module exports in `apps/desktop/src-tauri/src/commands/mod.rs`
3. Add to `lib.rs` command handlers
4. Create typed wrapper in `apps/desktop/src/lib/ipc.ts`
5. Use in React components

See: `desktop-tauri` skill for full patterns.

### Adding a New API Route

1. Create route handler in `apps/api/src/routes/{module}/{route}.ts`
2. Register in `apps/api/src/index.ts`
3. Add integration tests
4. Update API types in `packages/shared/src/`

See: `backend-platform` skill for full patterns.

### Adding a New AI Provider

1. Add provider type to `packages/shared/src/providers.ts`
2. Implement provider client in `packages/shared/src/llm-client.ts`
3. Add keychain storage support in desktop
4. Add provider UI in desktop settings
5. Update provider router with fallback logic

See: `ai-agent-systems` skill for full patterns.

### Adding a New Tool

1. Define tool schema in `packages/shared/src/agent/tools.ts`
2. Implement tool execution in `apps/desktop/src-tauri/src/commands/tools.rs`
3. Add approval requirement if sensitive
4. Add tool card UI for display
5. Update system prompt with tool description

See: `ai-agent-systems` and `desktop-tauri` skills.

## Environment Variables

### API

```
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_operator
JWT_SECRET=                      # min 32 chars
ACCESS_TOKEN_EXPIRES_IN=30m
REFRESH_TOKEN_TTL_DAYS=14
WEB_ORIGIN=http://localhost:3000
APP_BASE_URL=http://localhost:3000
API_PUBLIC_BASE_URL=http://localhost:3001
BILLING_ENABLED=false
RATE_LIMIT_BACKEND=memory        # or "redis"
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
VITE_DESKTOP_ALLOW_INSECURE_LOCALHOST=true  # dev only
```

## Testing Strategy

1. **Unit tests**: Pure functions, services, stores (Vitest where configured, Node.js test runner)
2. **Integration tests**: API routes with real database (Fastify inject)
3. **Rust tests**: `cargo test` for Tauri commands
4. **Smoke tests**: Packaged app validation on real machines

Run the full validation suite before committing:

```bash
pnpm -w typecheck
pnpm -w build
pnpm -w test
pnpm check:desktop:security
```

## Documentation

- Architecture decisions: `docs/*.md`
- Implementation plans: `docs/plans/*.md`
- Security: `docs/security.md`
- Deployment: `docs/deploying.md`, `docs/deploy-render-vercel.md`
- Release process: `docs/releasing.md`, `docs/runbook.md`

## Communication Style

- Be concise and direct
- Focus on working code over lengthy explanations
- Prefer code patterns from existing codebase
- When in doubt, check the relevant SKILL.md
- Make minimal changes to achieve the goal

## Critical Rules

1. Desktop app is the **primary product surface** — prioritize desktop UX
2. **Never commit secrets** — use env files and GitHub Secrets
3. **Never break the build** — typecheck and test before finishing
4. **Local approvals are mandatory** — no silent privileged actions
5. **Keychain only** — never store API keys in files or localStorage
6. **No server-side LLM keys** — desktop calls LLMs directly
7. **Screen data is ephemeral** — never persist or send to server
