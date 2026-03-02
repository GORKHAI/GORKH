# AI Operator

A TeamViewer-style AI operator product with desktop overlay UI, web portal, and API backend.

## Architecture

- `apps/desktop` - Tauri + Vite + React overlay UI (runs locally for system permissions)
- `apps/web` - Next.js web portal
- `apps/api` - Fastify API + WebSocket server
- `packages/shared` - Shared TypeScript types and protocol definitions

## Prerequisites

- Node.js >= 20
- pnpm (via Corepack)
- Rust (for Tauri desktop app)

## Quick Start

```bash
# Install dependencies
pnpm install

# Run dev mode (all apps in parallel)
pnpm dev

# Build everything
pnpm -w build

# Type check
pnpm -w typecheck

# Format code
pnpm format
```

## Development

### Starting Infrastructure

```bash
cd infra
docker-compose up -d   # Starts Postgres (5432) + Redis (6379)
```

### API Server

```bash
pnpm --filter api dev
# Runs on http://localhost:3001
# WebSocket endpoint: ws://localhost:3001/ws
# SSE endpoint: http://localhost:3001/events
```

REST endpoints:
- `GET /health` - Health check
- `GET /devices` - List all devices
- `GET /devices/:deviceId` - Get specific device
- `GET /devices/:deviceId/screen.png` - Get screen preview (Iteration 4)
- `POST /devices/:deviceId/pair` - Pair a device with code
- `GET /runs` - List all runs
- `GET /runs/:runId` - Get specific run
- `POST /runs` - Create a new run
- `POST /runs/:runId/cancel` - Cancel a run
- `GET /events` - SSE stream for real-time updates

### Web Portal

```bash
pnpm --filter web dev
# Runs on http://localhost:3000
```

Navigate to `/dashboard` to:
- See connected devices
- Pair devices using pairing codes
- Create and monitor runs in real-time (via SSE)
- Cancel active runs
- **View screen preview** (Iteration 4) - click "View Screen" on a device with streaming enabled

### Desktop App

**IMPORTANT:** The desktop application must be run locally on your machine, not in a remote container or Codespace, because it requires native system permissions.

```bash
# First, expose your Codespace or use local API
# Update apps/desktop/.env.local with your API URL:
# VITE_API_WS_URL=ws://localhost:3001/ws

pnpm --filter desktop dev
# Or for Tauri:
pnpm --filter desktop tauri:dev
```

## Iteration 5: Remote Control (Safety-First)

### Features Implemented

1. **Safe Remote Control**
   - **Opt-in only**: Control is OFF by default
   - Desktop toggle "Allow Remote Control" with kill switch
   - **Every action requires user approval** via desktop modal
   - No silent automation possible

2. **Control Primitives**
   - **Click** - Single mouse click at normalized coordinates
   - **Double-click** - Double mouse click
   - **Scroll** - Scroll wheel (dx, dy)
   - **Type** - Keyboard text entry (max 500 chars)
   - **Hotkey** - Key combinations (Enter, Tab, arrows, etc.)

3. **Safety Guardrails**
   - **Rate limiting**: Max 5 actions per 10 seconds per device
   - **Privacy**: Typed text is never logged or displayed
   - **Approval modal**: Shows action type without sensitive content
   - **Coordinates**: Normalized (0-1) mapped to display pixels

4. **Web Dashboard Controls**
   - Click on screen preview to send click actions
   - Type text with input field
   - Hotkey buttons (Enter, Tab, Esc, arrows)
   - Scroll on preview image
   - Action status tracking in real-time

5. **Permissions**
   - macOS: Requires **Accessibility** permission for input injection
   - Desktop shows guidance banner if permission denied

### Control Flow

```
1. User enables "Allow Control" on desktop
   ↓
2. Web dashboard shows "Remote Control Active" panel
   ↓
3. User clicks on screen preview or presses hotkey
   ↓
4. POST /devices/:id/actions { kind: "click", x, y }
   ↓
5. Server creates action (rate limit check), forwards via WS
   ↓
6. Desktop receives server.action.request
   ↓
7. Desktop shows approval modal (user must approve)
   ↓
8. On approve: Desktop invokes Tauri input injection command
   ↓
9. Desktop sends device.action.result with status
   ↓
10. Server broadcasts action_update SSE
   ↓
11. Web dashboard shows action status
```

### macOS Permission

On macOS, input injection requires **Accessibility** permission:

1. First attempt will fail with permission error
2. Desktop shows: "Accessibility permission required"
3. User goes to: System Settings → Privacy & Security → Accessibility
4. Enable for AI Operator app
5. Restart remote control

## Iteration 4: Screen Preview (Privacy-First)

### Features Implemented

1. **Safe Screen Streaming**
   - **Opt-in only**: Screen sharing is OFF by default
   - Toggle in desktop overlay to enable/disable
   - FPS selector (1 or 2 FPS)
   - Display selector for multi-monitor setups

2. **Privacy Protections**
   - Only **latest frame** stored in memory (no history)
   - Auto-expires after **60 seconds**
   - **Max 1MB** per frame
   - **Max 1280px width** (downscaled with aspect ratio preserved)
   - **No persistence**: Frames never written to disk/DB
   - **No recording**: Live preview only

3. **Tauri Screen Capture**
   - Cross-platform using `screenshots` crate
   - macOS: Requires Screen Recording permission
   - Windows: Works out of the box
   - Permission error handling with user guidance

4. **Web Dashboard Preview**
   - Click "View Screen" on a paired device
   - Real-time updates via SSE
   - Shows resolution, file size, last update time

### Screen Streaming Flow

```
1. User enables "Share Screen Preview" in desktop overlay
   ↓
2. Desktop sends device.screen.stream_state { enabled: true, fps: 1 }
   ↓
3. Desktop captures PNG periodically via Tauri Rust command
   ↓
4. Desktop sends device.screen.frame { meta, dataBase64 }
   ↓
5. Server validates, stores latest frame, broadcasts SSE screen_update
   ↓
6. Web dashboard receives SSE, updates image src
   ↓
7. User sees live screen preview
```

### macOS Permission

On macOS, screen capture requires **Screen Recording** permission:

1. First attempt will fail with permission error
2. Desktop shows: "Screen Recording permission required"
3. User goes to: System Settings → Privacy & Security → Screen Recording
4. Enable for AI Operator app
5. Restart screen sharing

## Iteration 3: Run Execution with Steps & Approvals

### Features

1. **Structured Run Execution**
   - 4-step deterministic plan: Understand → Propose → Approve → Execute
   - Step statuses: pending → running → done/failed/blocked
   - Live log streaming per step

2. **Approval Workflow**
   - Server requests approval at any step
   - Desktop shows modal with title, description, risk level
   - User can approve/deny with comment
   - 10-minute timeout on approval requests

3. **Real-time Updates** (Web SSE)
   - Dashboard connects to `/events` SSE endpoint
   - Live run updates without polling

## Iteration 2: Device Pairing & Run Management

- Versioned WebSocket Protocol (v1)
- Device pairing with 8-character codes (10-min expiry)
- In-memory device and run storage

## Environment Variables

Copy `.env.example` to `.env.local` in each app directory:

### apps/api/.env.example
```
PORT=3001
NODE_ENV=development
LOG_LEVEL=info
```

### apps/web/.env.example
```
NEXT_PUBLIC_API_BASE=http://localhost:3001
```

### apps/desktop/.env.example
```
VITE_API_WS_URL=ws://localhost:3001/ws
```

## Protocol Documentation

See [docs/protocol.md](docs/protocol.md) for detailed WebSocket message specifications.

## Important Notes

1. **Desktop runs locally**: The desktop app must run on your local machine, not in a remote container, because it requires system permissions for screen capture (and future input injection).

2. **In-memory storage**: Devices, runs, and screen frames are stored in memory only. Data is lost on server restart.

3. **No authentication**: Current implementation assumes a single "dev user". Production should add proper auth.

4. **Deterministic agent**: The current "AI" is a deterministic stub that follows a fixed 4-step plan.

## Demo: Screen Preview

1. Start API server: `pnpm --filter api dev`
2. Start web dashboard: `pnpm --filter web dev`
3. Start desktop app locally: `pnpm --filter desktop dev`
4. In desktop: Click "Request Pairing Code"
5. In web dashboard: Enter the code to pair the device
6. In desktop: Enable "Share Screen Preview" toggle
7. In web dashboard: Click "View Screen" on the device
8. See live screen preview updating in real-time!

**macOS users**: Grant Screen Recording permission when prompted.
