# GORKH — Kimi Code Skills

## Overview

Six production-grade skills for building the GORKH desktop AI assistant with Kimi Code. Each skill maps to a key engineering role and provides detailed architecture, code patterns, conventions, and rules that Kimi Code follows automatically.

## Skills Index

| Skill | Role | What It Covers |
|---|---|---|
| `desktop-tauri` | Senior Desktop Engineer | Tauri 2, Rust commands, IPC, tray, permissions, updater, keychain, local runtime, packaging, signing |
| `ai-agent-systems` | Senior AI/Agent Systems Engineer | LLM orchestration, tool calling, provider routing, local Qwen/Ollama, structured output, fallback logic, approval integration |
| `backend-platform` | Senior Backend/Platform Engineer | Fastify, Prisma/Postgres, Redis, JWT auth, sessions, WebSocket, SSE, Stripe billing, downloads, updater feed |
| `frontend-ui` | Frontend/Product UI Engineer | React components, Zustand state, chat UX, approval dialogs, runtime status, Next.js web portal, Tailwind, dark mode |
| `devops-release` | DevOps/Release/Security Engineer | GitHub Actions, macOS notarization, Windows signing, Tauri updater, Render/Vercel deploy, Docker, secrets management |
| `qa-testing` | QA/Test Automation Engineer | Vitest, Rust tests, API integration tests, packaged app smoke tests, regression strategy, test database setup |

## Installation

### Option A: Project-Specific (Recommended)

```bash
# From the root of your GORKH repo
mkdir -p .kimi/skills
cp -r /path/to/gorkh-skills/* .kimi/skills/
```

Your project should look like:
```
gorkh/
├── .kimi/skills/
│   ├── desktop-tauri/SKILL.md
│   ├── ai-agent-systems/SKILL.md
│   ├── backend-platform/SKILL.md
│   ├── frontend-ui/SKILL.md
│   ├── devops-release/SKILL.md
│   └── qa-testing/SKILL.md
├── apps/
│   ├── api/
│   ├── desktop/
│   └── web/
├── packages/
│   └── shared/
└── ...
```

### Option B: Global Installation

```bash
cp -r gorkh-skills/* ~/.kimi/skills/
```

### Option C: Custom Path

```bash
kimi --skills-dir /path/to/gorkh-skills
```

## Verification

```bash
cd ~/your-gorkh-repo
kimi
# Ask: "What skills do you have?"
# Should list all 6 GORKH skills
```

## How Skills Trigger

Kimi reads skill descriptions and automatically loads the relevant skill(s) based on your request. Multiple skills can trigger together.

| Prompt | Skills Triggered |
|---|---|
| "Set up a new Tauri command for screen capture" | desktop-tauri |
| "Add OpenAI provider with streaming support" | ai-agent-systems |
| "Create the auth login route with JWT" | backend-platform |
| "Build the chat input component with Enter to send" | frontend-ui |
| "Set up the GitHub Actions workflow for macOS release" | devops-release |
| "Write integration tests for the auth routes" | qa-testing |
| "Add tool calling with local approval and keychain key lookup" | desktop-tauri, ai-agent-systems, frontend-ui |
| "Deploy the API to Render and add health checks" | backend-platform, devops-release |
| "Build the provider settings page with API key input stored in keychain" | frontend-ui, desktop-tauri, ai-agent-systems |

## Cross-Platform Compatibility

These skills use the standard `SKILL.md` format and work with:

- **Kimi Code** (primary target)
- Claude Code
- Cursor (`.cursor/skills/`)
- VS Code Copilot
- Any tool supporting the SKILL.md convention

## Tech Stack Reference

| Layer | Technology |
|---|---|
| Desktop app | Tauri 2 + React + Vite |
| Desktop backend | Rust (Tauri commands) |
| API server | Fastify + TypeScript |
| Web portal | Next.js 14 (App Router) |
| Database | PostgreSQL + Prisma |
| Cache/Queue | Redis (optional) |
| State management | Zustand (desktop), React state (web) |
| Styling | Tailwind CSS |
| Testing | Vitest, cargo test, Playwright |
| CI/CD | GitHub Actions |
| Hosting | Render (API), Vercel (web), GitHub Releases (desktop) |
| Local AI | Ollama + Qwen |
| Auth | JWT (access + refresh tokens), keychain storage |
