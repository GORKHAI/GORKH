---
name: backend-platform
description: >
  GORKH backend/API engineering with Fastify, PostgreSQL/Prisma, Redis, authentication,
  sessions, device coordination, WebSocket/SSE real-time, Stripe billing, desktop download
  metadata, updater manifest feed, and production deployment. Use this skill for ANY work
  in apps/api/ including routes, middleware, database schema, auth flows, WebSocket handlers,
  SSE streams, billing integration, download/updater endpoints, or health/metrics surfaces.
  Trigger for "API", "backend", "Fastify", "route", "endpoint", "auth", "login", "register",
  "JWT", "refresh token", "session", "device", "WebSocket", "SSE", "billing", "Stripe",
  "download", "updater", "health", "Prisma", "database", "migration", "Redis", or "real-time".
---

# Backend Platform — GORKH (Fastify API)

## Architecture

```
apps/api/
├── src/
│   ├── server.ts               # Fastify instance, plugin registration
│   ├── index.ts                # Entry point
│   │
│   ├── plugins/                # Fastify plugins (encapsulated)
│   │   ├── prisma.ts           # Database client
│   │   ├── redis.ts            # Redis client (rate limits, presence, commands)
│   │   ├── auth.ts             # JWT verification hooks
│   │   ├── ws.ts               # WebSocket plugin
│   │   ├── sse.ts              # SSE plugin
│   │   ├── rate-limit.ts       # Rate limiting (memory or Redis-backed)
│   │   └── stripe.ts           # Stripe client
│   │
│   ├── routes/
│   │   ├── auth/               # /auth/*
│   │   │   ├── register.ts
│   │   │   ├── login.ts
│   │   │   ├── refresh.ts
│   │   │   ├── logout.ts
│   │   │   ├── me.ts
│   │   │   └── sessions.ts
│   │   ├── billing/            # /billing/*
│   │   │   ├── status.ts
│   │   │   ├── checkout.ts
│   │   │   ├── portal.ts
│   │   │   └── webhook.ts
│   │   ├── devices/            # /devices/*
│   │   ├── runs/               # /runs/*
│   │   ├── downloads/          # /downloads/*
│   │   ├── updates/            # /updates/*
│   │   ├── events/             # /events (SSE)
│   │   ├── ws/                 # /ws (WebSocket)
│   │   └── health/             # /, /health, /ready, /metrics
│   │
│   ├── services/               # Business logic
│   │   ├── auth.service.ts
│   │   ├── session.service.ts
│   │   ├── device.service.ts
│   │   ├── run.service.ts
│   │   ├── billing.service.ts
│   │   └── download.service.ts
│   │
│   └── lib/
│       ├── errors.ts           # Typed error classes
│       ├── jwt.ts              # Token creation/verification
│       └── validation.ts       # Shared Zod schemas
│
├── package.json
└── tsconfig.json
```

## Server Bootstrap

```typescript
// apps/api/src/server.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import rateLimit from "@fastify/rate-limit";
import { prismaPlugin } from "./plugins/prisma";
import { redisPlugin } from "./plugins/redis";
import { authPlugin } from "./plugins/auth";

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
      transport: process.env.NODE_ENV === "development"
        ? { target: "pino-pretty" }
        : undefined,
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "body.password",
        "body.refreshToken",
      ],
    },
    trustProxy: true,
  });

  // Core plugins
  await app.register(cors, {
    origin: [
      process.env.WEB_ORIGIN || "http://localhost:3000",
    ],
    credentials: true,
  });

  await app.register(websocket);

  const rateLimitBackend = process.env.RATE_LIMIT_BACKEND || "memory";
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    ...(rateLimitBackend === "redis" && process.env.REDIS_URL
      ? { redis: await import("ioredis").then(m => new m.default(process.env.REDIS_URL!)) }
      : {}),
  });

  // App plugins
  await app.register(prismaPlugin);
  if (process.env.REDIS_URL) {
    await app.register(redisPlugin);
  }
  await app.register(authPlugin);

  // Routes
  await app.register(import("./routes/health"), { prefix: "/" });
  await app.register(import("./routes/auth"), { prefix: "/auth" });
  await app.register(import("./routes/billing"), { prefix: "/billing" });
  await app.register(import("./routes/devices"), { prefix: "/devices" });
  await app.register(import("./routes/runs"), { prefix: "/runs" });
  await app.register(import("./routes/downloads"), { prefix: "/downloads" });
  await app.register(import("./routes/updates"), { prefix: "/updates" });
  await app.register(import("./routes/events"), { prefix: "/events" });
  await app.register(import("./routes/ws"), { prefix: "/ws" });

  // Error handler
  app.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode || 500;

    if (statusCode >= 500) {
      app.log.error({ err: error, requestId: request.id }, "Server error");
    }

    reply.status(statusCode).send({
      error: {
        code: error.code || "INTERNAL_ERROR",
        message: statusCode >= 500 ? "Internal server error" : error.message,
      },
    });
  });

  return app;
}
```

## Authentication System

### Token Design

- **Access token**: short-lived JWT (30 min), carries user ID + device ID
- **Refresh token**: long-lived opaque token (14 days), stored hashed in DB
- Desktop stores both in OS keychain via Tauri
- Web stores refresh token in httpOnly cookie

### JWT Payload

```typescript
export interface AccessTokenPayload {
  sub: string;         // user ID
  email: string;
  deviceId?: string;   // present for desktop sessions
  type: "access";
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  type: "refresh";
}
```

### Auth Routes

```typescript
// apps/api/src/routes/auth/register.ts
import { z } from "zod";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).optional(),
});

export default async function (app: FastifyInstance) {
  app.post("/register", async (request, reply) => {
    const body = RegisterSchema.parse(request.body);

    const existing = await app.prisma.user.findUnique({
      where: { email: body.email },
    });
    if (existing) {
      return reply.status(409).send({
        error: { code: "EMAIL_EXISTS", message: "Email already registered" },
      });
    }

    const passwordHash = await argon2.hash(body.password);

    const user = await app.prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        name: body.name,
      },
    });

    const { accessToken, refreshToken, session } =
      await app.services.auth.createSession(user.id, {
        userAgent: request.headers["user-agent"],
        ip: request.ip,
      });

    reply.status(201).send({
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
      refreshToken,
    });
  });
}
```

### Desktop Auth Handoff

Browser-based sign-in for the desktop app:

1. Desktop opens browser to `{WEB_ORIGIN}/auth/desktop-login?callbackPort={port}`
2. User logs in on web
3. Web sends session tokens to desktop's local callback server
4. Desktop stores tokens in keychain
5. Desktop connects WebSocket with the access token

```typescript
// On desktop: temporary local HTTP server to receive the callback
// On web: POST tokens to http://localhost:{callbackPort}/auth/callback
```

### Session Management

```prisma
model Session {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  refreshHash   String   // argon2 hash of refresh token
  deviceId      String?  // for desktop sessions
  deviceName    String?
  userAgent     String?
  ipAddress     String?
  expiresAt     DateTime
  createdAt     DateTime @default(now())
  lastUsedAt    DateTime @default(now())
  revokedAt     DateTime?

  @@index([userId])
  @@index([deviceId])
  @@map("sessions")
}
```

## Database Schema (Prisma)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String
  name          String?
  plan          Plan      @default(FREE)
  stripeId      String?   @unique
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions      Session[]
  devices       Device[]
  runs          Run[]

  @@map("users")
}

enum Plan {
  FREE
  PRO
  TEAM
}

model Device {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  name        String
  platform    String   // "macos", "windows", "linux"
  arch        String   // "x64", "arm64"
  appVersion  String
  lastSeenAt  DateTime @default(now())
  createdAt   DateTime @default(now())

  @@index([userId])
  @@map("devices")
}

model Run {
  id          String    @id @default(uuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  deviceId    String?
  status      RunStatus @default(PENDING)
  title       String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  cancelledAt DateTime?

  @@index([userId])
  @@index([status])
  @@map("runs")
}

enum RunStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}
```

## WebSocket — Desktop Coordination

```typescript
// apps/api/src/routes/ws/index.ts
import { FastifyPluginAsync } from "fastify";

export const wsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", { websocket: true }, async (socket, request) => {
    // Authenticate via token in query param or first message
    const token = new URL(request.url, "http://localhost").searchParams.get("token");
    if (!token) {
      socket.close(4001, "Missing token");
      return;
    }

    let payload: AccessTokenPayload;
    try {
      payload = app.jwt.verify<AccessTokenPayload>(token);
    } catch {
      socket.close(4003, "Invalid token");
      return;
    }

    const userId = payload.sub;
    const deviceId = payload.deviceId;

    app.log.info({ userId, deviceId }, "WebSocket connected");

    // Register presence
    if (app.redis && deviceId) {
      await app.redis.hset(`presence:${userId}`, deviceId, Date.now().toString());
    }

    // Message handler
    socket.on("message", async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        await handleWsMessage(app, socket, userId, deviceId, msg);
      } catch (err) {
        socket.send(JSON.stringify({ type: "error", message: "Invalid message" }));
      }
    });

    // Cleanup on close
    socket.on("close", async () => {
      if (app.redis && deviceId) {
        await app.redis.hdel(`presence:${userId}`, deviceId);
      }
      app.log.info({ userId, deviceId }, "WebSocket disconnected");
    });
  });
};
```

## SSE — Browser Updates

```typescript
// apps/api/src/routes/events/index.ts
export const sseRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (request, reply) => {
    const user = await app.authenticate(request);

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const sendEvent = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // Send keepalive every 30s
    const keepalive = setInterval(() => {
      reply.raw.write(": keepalive\n\n");
    }, 30_000);

    // Subscribe to user events (via Redis pub/sub or in-memory)
    const unsubscribe = app.events.subscribe(user.id, sendEvent);

    request.raw.on("close", () => {
      clearInterval(keepalive);
      unsubscribe();
    });
  });
};
```

## Downloads & Updater

### Desktop Download Metadata

```typescript
// GET /downloads/desktop
// Returns installer metadata based on configured mode (file or github)
app.get("/desktop", async (request, reply) => {
  const userAgent = request.headers["user-agent"] || "";
  const platform = detectPlatform(userAgent); // "macos" | "windows" | "linux"

  if (process.env.DOWNLOAD_MODE === "github") {
    const release = await fetchLatestGithubRelease();
    return { url: release.assets[platform], version: release.tag };
  }

  // File mode: return configured URLs
  return {
    url: process.env[`DOWNLOAD_URL_${platform.toUpperCase()}`],
    version: process.env.CURRENT_VERSION,
  };
});
```

### Updater Feed

```typescript
// GET /updates/desktop/:platform/:arch/:currentVersion.json
// Returns Tauri updater manifest
app.get("/:platform/:arch/:currentVersion.json", async (request, reply) => {
  const { platform, arch, currentVersion } = request.params;
  const latest = await getLatestVersion(platform, arch);

  if (!latest || latest.version === currentVersion) {
    return reply.status(204).send();
  }

  return {
    version: latest.version,
    pub_date: latest.pubDate,
    url: latest.downloadUrl,
    signature: latest.signature, // required for Tauri updater
    notes: latest.releaseNotes,
  };
});
```

## Billing (Stripe)

```typescript
// POST /billing/checkout
app.post("/checkout", { preHandler: [requireAuth] }, async (request) => {
  if (!process.env.BILLING_ENABLED || process.env.BILLING_ENABLED === "false") {
    throw new AppError("BILLING_DISABLED", "Billing is not enabled", 503);
  }

  const user = request.user;
  let stripeCustomerId = user.stripeId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({ email: user.email });
    stripeCustomerId = customer.id;
    await app.prisma.user.update({
      where: { id: user.id },
      data: { stripeId: stripeCustomerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
    success_url: `${process.env.APP_BASE_URL}/billing?success=true`,
    cancel_url: `${process.env.APP_BASE_URL}/billing?cancelled=true`,
  });

  return { url: session.url };
});
```

## Device Command Queue (Redis)

For at-least-once command delivery to desktop clients:

```typescript
// Push command for a device
export async function pushDeviceCommand(
  redis: Redis,
  deviceId: string,
  command: DeviceCommand,
): Promise<void> {
  await redis.rpush(
    `device:commands:${deviceId}`,
    JSON.stringify({ ...command, timestamp: Date.now() }),
  );
}

// Desktop polls or receives via WebSocket
export async function popDeviceCommands(
  redis: Redis,
  deviceId: string,
): Promise<DeviceCommand[]> {
  const commands: DeviceCommand[] = [];
  while (true) {
    const raw = await redis.lpop(`device:commands:${deviceId}`);
    if (!raw) break;
    commands.push(JSON.parse(raw));
  }
  return commands;
}
```

## Environment Variables

```bash
PORT=3001
NODE_ENV=development
LOG_LEVEL=info
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_operator
JWT_SECRET=                          # min 32 chars, cryptographically random
ACCESS_TOKEN_EXPIRES_IN=30m
REFRESH_TOKEN_TTL_DAYS=14
WEB_ORIGIN=http://localhost:3000
APP_BASE_URL=http://localhost:3000
API_PUBLIC_BASE_URL=http://localhost:3001
BILLING_ENABLED=false
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=
RATE_LIMIT_BACKEND=memory            # "memory" or "redis"
REDIS_URL=redis://localhost:6379
DOWNLOAD_MODE=file                   # "file" or "github"
GITHUB_REPO=
GITHUB_TOKEN=
```

## Rules

- Never log sensitive data (tokens, passwords, API keys). Use Pino redact config.
- Access tokens are short-lived (30 min). Refresh tokens handle session persistence.
- All auth routes must be rate-limited aggressively (login: 5/min, register: 3/min).
- WebSocket connections are authenticated on connect, not per-message.
- SSE keepalives every 30s to prevent proxy timeout.
- Stripe webhook signature verification is mandatory — never skip it.
- Redis is optional at startup. If REDIS_URL is not set, fall back to in-memory for rate limits and presence.
- Database connection uses SSL in production (`?sslmode=require` in DATABASE_URL).
- All routes return consistent error shape: `{ error: { code: string, message: string } }`.
- No server-side LLM keys. The backend never makes LLM calls.
- Device session tokens include the `deviceId` claim — this ties the session to a specific device.
- Refresh token rotation: issue a new refresh token on every refresh, invalidate the old one.
