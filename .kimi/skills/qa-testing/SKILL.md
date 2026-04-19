---
name: qa-testing
description: >
  GORKH test strategy, test automation, real-device validation, packaging/install flow
  testing, regression testing, and smoke tests. Covers unit tests, integration tests,
  Tauri command tests, API route tests, frontend component tests, end-to-end flows,
  packaged app validation, and the critical "works in code, fails in packaged runtime"
  gap. Use this skill when writing tests, setting up test infrastructure, creating test
  fixtures, debugging test failures, writing smoke tests, validating packaged builds,
  or designing test strategies. Trigger for "test", "testing", "spec", "unit test",
  "integration test", "e2e", "smoke test", "regression", "QA", "validation",
  "packaged app", "install test", "Vitest", "Playwright", "test strategy", or "coverage".
---

# QA / Test Automation — GORKH

The biggest risk: "works in code, fails in packaged runtime." Desktop apps have an enormous
surface area that can't be fully tested in dev mode alone.

## Test Pyramid

```
         ┌───────────────┐
         │  Smoke Tests   │  Manual + automated on real machines
         │  (packaged)    │  Validates: install, launch, sign-in, Free AI
         ├───────────────┤
         │  E2E / Flow    │  Playwright (web), Tauri driver (desktop)
         │  Tests         │  Full user flows through the stack
         ├───────────────┤
         │  Integration   │  API routes + DB, Tauri commands + IPC
         │  Tests         │  Real database, real Solana, real Redis
         ├───────────────┤
         │  Unit Tests    │  Pure functions, services, stores, components
         │                │  Vitest, React Testing Library
         └───────────────┘
```

## Test Tools

| Layer | Tool | Location |
|---|---|---|
| Unit (TS) | Vitest | All packages + apps |
| Unit (Rust) | cargo test | apps/desktop/src-tauri |
| Component | Vitest + React Testing Library | apps/desktop/src, apps/web |
| API Integration | Vitest + supertest (or Fastify inject) | apps/api |
| E2E (web) | Playwright | tests/e2e/web/ |
| E2E (desktop) | Tauri WebDriver | tests/e2e/desktop/ |
| Smoke | Custom scripts + checklists | scripts/smoke/ |

## Unit Tests

### Vitest Configuration

```typescript
// vitest.config.ts (root)
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts", "**/*.spec.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: [
        "node_modules",
        "dist",
        "**/*.d.ts",
        "**/*.config.*",
        "**/types/**",
      ],
    },
  },
});
```

### Service Unit Test Example

```typescript
// packages/shared/src/agent/__tests__/orchestrator.test.ts
import { describe, it, expect, vi } from "vitest";
import { runAgent } from "../orchestrator";

describe("Agent Orchestrator", () => {
  it("returns content when LLM responds without tool calls", async () => {
    const mockProvider = {
      type: "openai" as const,
      complete: vi.fn().mockResolvedValue({
        content: "Hello! How can I help?",
        tool_calls: [],
        finish_reason: "stop",
      }),
      stream: vi.fn(),
      isAvailable: vi.fn().mockResolvedValue(true),
    };

    const result = await runAgent("Hello", {
      conversationHistory: [],
      provider: mockProvider,
      config: {
        maxIterations: 10,
        maxTokens: 4096,
        temperature: 0.7,
        systemPrompt: "You are a helpful assistant.",
        tools: [],
        approvalRequired: [],
      },
      toolExecutor: { execute: vi.fn() },
      approvalHandler: { requestApproval: vi.fn() },
    });

    expect(result.content).toBe("Hello! How can I help?");
    expect(result.iterations).toBe(1);
    expect(mockProvider.complete).toHaveBeenCalledOnce();
  });

  it("executes tool calls and feeds results back", async () => {
    const mockProvider = {
      type: "openai" as const,
      complete: vi.fn()
        .mockResolvedValueOnce({
          content: null,
          tool_calls: [{
            id: "call_1",
            type: "function",
            function: { name: "read_file", arguments: '{"path": "/tmp/test.txt"}' },
          }],
          finish_reason: "tool_calls",
        })
        .mockResolvedValueOnce({
          content: "The file contains: hello world",
          tool_calls: [],
          finish_reason: "stop",
        }),
      stream: vi.fn(),
      isAvailable: vi.fn().mockResolvedValue(true),
    };

    const mockToolExecutor = {
      execute: vi.fn().mockResolvedValue({
        success: true,
        data: "hello world",
      }),
    };

    const result = await runAgent("Read /tmp/test.txt", {
      conversationHistory: [],
      provider: mockProvider,
      config: {
        maxIterations: 10,
        maxTokens: 4096,
        temperature: 0.7,
        systemPrompt: "You are a helpful assistant.",
        tools: [{ type: "function", function: { name: "read_file", description: "Read a file", parameters: {} } }],
        approvalRequired: [],
      },
      toolExecutor: mockToolExecutor,
      approvalHandler: { requestApproval: vi.fn() },
    });

    expect(result.content).toBe("The file contains: hello world");
    expect(result.iterations).toBe(2);
    expect(mockToolExecutor.execute).toHaveBeenCalledWith("read_file", { path: "/tmp/test.txt" });
  });

  it("respects max iterations limit", async () => {
    const mockProvider = {
      type: "openai" as const,
      complete: vi.fn().mockResolvedValue({
        content: null,
        tool_calls: [{
          id: "call_loop",
          type: "function",
          function: { name: "noop", arguments: "{}" },
        }],
        finish_reason: "tool_calls",
      }),
      stream: vi.fn(),
      isAvailable: vi.fn().mockResolvedValue(true),
    };

    const result = await runAgent("Loop forever", {
      conversationHistory: [],
      provider: mockProvider,
      config: {
        maxIterations: 3,
        maxTokens: 4096,
        temperature: 0.7,
        systemPrompt: "",
        tools: [{ type: "function", function: { name: "noop", description: "No-op", parameters: {} } }],
        approvalRequired: [],
      },
      toolExecutor: { execute: vi.fn().mockResolvedValue({ success: true }) },
      approvalHandler: { requestApproval: vi.fn() },
    });

    expect(result.maxIterationsReached).toBe(true);
    expect(result.iterations).toBe(3);
  });
});
```

### API Integration Test Example

```typescript
// apps/api/src/routes/__tests__/auth.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../../server";
import { FastifyInstance } from "fastify";

describe("Auth Routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer();
    // Run migrations on test database
  });

  afterAll(async () => {
    await app.close();
  });

  it("registers a new user", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "test@example.com",
        password: "securepassword123",
        name: "Test User",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.user.email).toBe("test@example.com");
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    // Password hash should never be in the response
    expect(body.user.passwordHash).toBeUndefined();
  });

  it("rejects duplicate email", async () => {
    // Register first
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "dupe@test.com", password: "password123" },
    });

    // Try again
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "dupe@test.com", password: "password123" },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("EMAIL_EXISTS");
  });

  it("logs in with correct credentials", async () => {
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "login@test.com", password: "password123" },
    });

    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "login@test.com", password: "password123" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().accessToken).toBeDefined();
  });

  it("rejects wrong password", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "login@test.com", password: "wrong" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("refreshes tokens", async () => {
    const registerRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "refresh@test.com", password: "password123" },
    });

    const { refreshToken } = registerRes.json();

    const refreshRes = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken },
    });

    expect(refreshRes.statusCode).toBe(200);
    expect(refreshRes.json().accessToken).toBeDefined();
    // New refresh token (rotation)
    expect(refreshRes.json().refreshToken).toBeDefined();
    expect(refreshRes.json().refreshToken).not.toBe(refreshToken);
  });
});
```

### Rust Unit Tests

```rust
// apps/desktop/src-tauri/src/runtime/detect.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_probe_api_returns_false_when_nothing_running() {
        let result = RuntimeManager::probe_runtime_api(19999);
        assert!(result.is_ok());
        assert!(!result.unwrap());
    }

    #[test]
    fn test_runtime_status_initial_state() {
        let mgr = RuntimeManager::new();
        let status = mgr.detect();
        // On CI, Ollama is not installed
        // This test verifies the detection doesn't panic
        assert!(status.error.is_none());
    }
}
```

## Smoke Test Checklist (Packaged App)

Run these on real machines after every release build:

```bash
#!/bin/bash
# scripts/smoke/desktop-smoke.sh
echo "=== GORKH Desktop Smoke Test ==="
echo ""
echo "Manual checklist — run on a REAL machine with the packaged app:"
echo ""
echo "[ ] Install: App installs cleanly (no errors)"
echo "[ ] Launch: App opens to welcome/sign-in screen"
echo "[ ] Tray: System tray icon appears"
echo "[ ] Close → Hide: Closing window hides to tray (does not quit)"
echo "[ ] Tray → Show: Clicking tray icon shows window"
echo "[ ] Tray → Quit: Quit from tray menu exits the app"
echo ""
echo "[ ] Sign-in: Desktop auth handoff works (opens browser, returns tokens)"
echo "[ ] Session persist: Restart app → still signed in"
echo ""
echo "[ ] Permissions (macOS): Screen Recording permission prompt appears"
echo "[ ] Permissions (macOS): Accessibility permission prompt appears"
echo "[ ] Permission guidance: Settings link opens correct System Preferences pane"
echo ""
echo "[ ] Free AI: Runtime status shows correctly (installed/not installed)"
echo "[ ] Free AI: If installed, Start button works"
echo "[ ] Free AI: Model loads and chat produces responses"
echo ""
echo "[ ] Provider setup: Can enter OpenAI API key"
echo "[ ] Provider setup: Can enter Claude API key"
echo "[ ] Provider switch: Switching provider works mid-session"
echo ""
echo "[ ] Chat: Send message → get streaming response"
echo "[ ] Tool call: Agent proposes an action (e.g., read file)"
echo "[ ] Approval: Approval dialog appears for sensitive actions"
echo "[ ] Approval deny: Denying stops the action"
echo "[ ] Approval approve: Approving executes the action"
echo ""
echo "[ ] Updater (if enabled): Check for updates works"
echo "[ ] Dark mode: Respects system preference"
echo "[ ] Sign-out: Signs out and clears keychain"
echo ""
echo "[ ] SECURITY: API keys never appear in network traffic to gorkh.com"
echo "[ ] SECURITY: Screen data not persisted to disk"
echo "[ ] SECURITY: Support export contains no secrets"
```

## Automated Smoke Script

```typescript
// scripts/smoke/api-smoke.ts
// Runs against a live API endpoint

const API_BASE = process.env.API_URL || "http://localhost:3001";

async function smoke() {
  const results: { name: string; pass: boolean; error?: string }[] = [];

  // Health check
  results.push(await check("GET /health", async () => {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const body = await res.json();
    if (body.status !== "healthy") throw new Error(`Status: ${body.status}`);
  }));

  // Ready check
  results.push(await check("GET /ready", async () => {
    const res = await fetch(`${API_BASE}/ready`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  }));

  // Register + Login flow
  const email = `smoke-${Date.now()}@test.com`;
  let accessToken: string;

  results.push(await check("POST /auth/register", async () => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "smoketest123" }),
    });
    if (res.status !== 201) throw new Error(`Status ${res.status}`);
    const body = await res.json();
    accessToken = body.accessToken;
  }));

  results.push(await check("GET /auth/me", async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const body = await res.json();
    if (body.email !== email) throw new Error("Email mismatch");
  }));

  // Downloads endpoint
  results.push(await check("GET /downloads/desktop", async () => {
    const res = await fetch(`${API_BASE}/downloads/desktop`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  }));

  // Print results
  console.log("\n=== Smoke Test Results ===\n");
  const failed = results.filter(r => !r.pass);
  for (const r of results) {
    console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.error ? ` — ${r.error}` : ""}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length > 0 ? 1 : 0);
}

async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    return { name, pass: true };
  } catch (err) {
    return { name, pass: false, error: err instanceof Error ? err.message : String(err) };
  }
}

smoke();
```

## Test Database

```typescript
// tests/helpers/test-db.ts
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL
  || "postgresql://postgres:postgres@localhost:5432/ai_operator_test";

export async function setupTestDb(): Promise<PrismaClient> {
  process.env.DATABASE_URL = TEST_DATABASE_URL;

  // Push schema (faster than migrate for tests)
  execSync("pnpm exec prisma db push --force-reset --skip-generate", {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });

  return new PrismaClient({ datasources: { db: { url: TEST_DATABASE_URL } } });
}

export async function teardownTestDb(prisma: PrismaClient) {
  await prisma.$disconnect();
}
```

## Package.json Test Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:api": "vitest run --project api",
    "test:desktop": "vitest run --project desktop",
    "smoke:api": "tsx scripts/smoke/api-smoke.ts",
    "smoke:final": "tsx scripts/smoke/api-smoke.ts && echo 'Run desktop smoke checklist manually'",
    "check:desktop:security": "cd apps/desktop/src-tauri && cargo audit && cargo clippy -- -D warnings"
  }
}
```

## Rules

- Every PR must pass: typecheck + build + unit tests + Rust clippy.
- API integration tests use Fastify's `.inject()` method — no real HTTP server needed.
- Test database is separate from dev database (`_test` suffix).
- Mocks are for unit tests only. Integration tests use real database and real services.
- Packaged app smoke tests must run on **real machines**, not CI containers.
- Desktop smoke tests cover the full path: install → launch → sign-in → chat → tool → approval.
- Security-specific smoke checks verify that API keys and screen data don't leak.
- Test coverage target: 80% for services/utilities, 60% for routes, components are tested by behavior not coverage.
- All tests must be deterministic — no time-dependent or network-dependent unit tests.
- CI runs tests on every PR. Smoke tests run on release branches before tagging.
