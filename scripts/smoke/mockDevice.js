import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const API_WS_URL = process.env.API_WS_URL || 'ws://localhost:3001/ws';
const API_WS_URL_FALLBACK =
  process.env.API_WS_URL_FALLBACK ||
  (API_WS_URL === 'ws://localhost:3001/ws' ? 'ws://127.0.0.1:3001/ws' : '');
const DEVICE_ID = process.env.DEVICE_ID || `smoke-device-${Date.now()}`;
const DEVICE_TOKEN = process.env.DEVICE_TOKEN || '';
const SEND_SCREEN = process.env.SEND_SCREEN === '1';
const SEND_TOOL = process.env.SEND_TOOL === '1';
const CONTROL_ENABLED = process.env.CONTROL_ENABLED !== '0';
const STATE_PATH = process.env.SMOKE_DEVICE_STATE || '/tmp/ai-operator-smoke-device-state.json';
const TOKEN_PATH = process.env.SMOKE_DEVICE_TOKEN_PATH || '/tmp/ai-operator-smoke.device_token';

const ONE_BY_ONE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+nXioAAAAASUVORK5CYII=';
const ONE_BY_ONE_PNG_BYTES = Buffer.from(ONE_BY_ONE_PNG_BASE64, 'base64');

const state = {
  deviceId: DEVICE_ID,
  pairingCode: null,
  deviceTokenCaptured: false,
  latestRunId: null,
  latestRunMode: null,
};

let ws;
let pingTimer = null;
let hasConnected = false;
let attemptedFallback = false;
const acceptedRuns = new Set();

function persistState() {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function log(line) {
  process.stdout.write(`${line}\n`);
}

function redactToken(token) {
  if (!token) {
    return '';
  }
  return token.length <= 6 ? `${token}...` : `${token.slice(0, 6)}...`;
}

function send(type, payload, requestId = randomUUID()) {
  const message = {
    v: 1,
    type,
    requestId,
    ts: Date.now(),
    payload,
  };
  ws.send(JSON.stringify(message));
}

function sendHello() {
  send('device.hello', {
    deviceId: DEVICE_ID,
    deviceName: 'Smoke Mock Device',
    platform: 'linux',
    appVersion: 'smoke',
    ...(DEVICE_TOKEN ? { deviceToken: DEVICE_TOKEN } : {}),
  });
}

function sendInitialState() {
  if (CONTROL_ENABLED) {
    send('device.control.state', {
      deviceId: DEVICE_ID,
      state: {
        enabled: true,
        requestedBy: 'local_user',
        updatedAt: Date.now(),
      },
    });
  }

  send('device.workspace.state', {
    deviceId: DEVICE_ID,
    workspaceState: {
      configured: true,
      rootName: 'smoke-workspace',
    },
  });

  if (SEND_SCREEN) {
    send('device.screen.stream_state', {
      deviceId: DEVICE_ID,
      state: {
        enabled: true,
        fps: 1,
      },
    });

    setTimeout(() => {
      send('device.screen.frame', {
        deviceId: DEVICE_ID,
        meta: {
          frameId: `frame-${Date.now()}`,
          width: 1,
          height: 1,
          mime: 'image/png',
          at: Date.now(),
          byteLength: ONE_BY_ONE_PNG_BYTES.length,
        },
        dataBase64: ONE_BY_ONE_PNG_BASE64,
      });
    }, 250);
  }

  if (!DEVICE_TOKEN) {
    send('device.pairing.request_code', { deviceId: DEVICE_ID });
  }
}

function startPingLoop() {
  stopPingLoop();
  pingTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      send('device.ping', { deviceId: DEVICE_ID });
    }
  }, 15_000);
}

function stopPingLoop() {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
}

function maybeSendAiAssistFlow(runId) {
  if (acceptedRuns.has(`ai:${runId}`)) {
    return;
  }
  acceptedRuns.add(`ai:${runId}`);
  setTimeout(() => {
    send('device.run.log', {
      deviceId: DEVICE_ID,
      runId,
      line: 'Smoke AI assist loop started',
      level: 'info',
      at: Date.now(),
    });

    send('device.agent.proposal', {
      deviceId: DEVICE_ID,
      runId,
      proposal: {
        kind: 'ask_user',
        question: 'Smoke test proposal generated',
      },
    });

    if (SEND_TOOL) {
      const toolEventId = `tool-${randomUUID()}`;
      const toolCallId = `tool-call-${randomUUID()}`;
      const toolCall = {
        tool: 'terminal.exec',
        cmd: 'pnpm',
        args: [],
      };

      send('device.tool.request', {
        deviceId: DEVICE_ID,
        runId,
        toolEventId,
        toolCallId,
        toolCall,
        at: Date.now(),
      });

      setTimeout(() => {
        send('device.tool.result', {
          deviceId: DEVICE_ID,
          runId,
          toolEventId,
          toolCallId,
          toolCall,
          result: {
            ok: true,
            exitCode: 0,
          },
          at: Date.now(),
        });
      }, 150);
    }

    setTimeout(() => {
      send('device.run.update', {
        deviceId: DEVICE_ID,
        runId,
        status: 'done',
        note: 'Smoke AI assist run complete',
      });
    }, 300);
  }, 150);
}

function handleMessage(message) {
  const type = typeof message?.type === 'string' ? message.type : 'unknown';
  log(`WS_RX=${type}`);

  switch (type) {
    case 'server.hello_ack':
      sendInitialState();
      startPingLoop();
      return;

    case 'server.pairing.code': {
      const pairingCode = message?.payload?.pairingCode || '';
      state.pairingCode = pairingCode;
      persistState();
      log(`PAIRING_CODE=${pairingCode}`);
      return;
    }

    case 'server.device.token': {
      const token = message?.payload?.deviceToken || '';
      if (token) {
        writeFileSync(TOKEN_PATH, token);
        state.deviceTokenCaptured = true;
        persistState();
        log(`DEVICE_TOKEN=${redactToken(token)}`);
      }
      send('device.device_token.ack', {
        deviceId: DEVICE_ID,
      });
      return;
    }

    case 'server.run.start': {
      const runId = message?.payload?.runId;
      const mode = message?.payload?.mode || 'manual';
      state.latestRunId = runId;
      state.latestRunMode = mode;
      persistState();
      log(`RUN_START=${runId}`);
      send('device.run.accept', {
        deviceId: DEVICE_ID,
        runId,
      });
      acceptedRuns.add(runId);
      if (mode === 'ai_assist') {
        maybeSendAiAssistFlow(runId);
      }
      return;
    }

    case 'server.run.details': {
      const run = message?.payload?.run;
      const runId = run?.runId;
      const mode = run?.mode || 'manual';
      const approvalId = run?.pendingApproval?.approvalId;
      if (
        runId &&
        (run?.status === 'queued' || run?.status === 'running' || run?.status === 'waiting_for_user') &&
        !acceptedRuns.has(runId)
      ) {
        state.latestRunId = runId;
        state.latestRunMode = mode;
        persistState();
        log(`RUN_START=${runId}`);
        send('device.run.accept', {
          deviceId: DEVICE_ID,
          runId,
        });
        acceptedRuns.add(runId);
        if (mode === 'ai_assist') {
          maybeSendAiAssistFlow(runId);
        }
      }
      if (runId && approvalId) {
        send('device.approval.decision', {
          deviceId: DEVICE_ID,
          runId,
          approvalId,
          decision: 'approved',
        });
      }
      return;
    }

    case 'server.approval.request': {
      const runId = message?.payload?.runId;
      const approvalId = message?.payload?.approval?.approvalId;
      if (runId && approvalId) {
        send('device.approval.decision', {
          deviceId: DEVICE_ID,
          runId,
          approvalId,
          decision: 'approved',
        });
      }
      return;
    }

    case 'server.action.request': {
      const actionId = message?.payload?.actionId;
      if (!actionId) {
        return;
      }
      send('device.action.ack', {
        deviceId: DEVICE_ID,
        actionId,
        status: 'awaiting_user',
      });
      setTimeout(() => {
        send('device.action.ack', {
          deviceId: DEVICE_ID,
          actionId,
          status: 'approved',
        });
        send('device.action.result', {
          deviceId: DEVICE_ID,
          actionId,
          ok: true,
        });
      }, 100);
      return;
    }

    default:
      return;
  }
}

function shutdown(code = 0) {
  stopPingLoop();
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    ws.close();
  }
  setTimeout(() => process.exit(code), 50);
}

function attachWebSocket(targetUrl) {
  ws = new WebSocket(targetUrl);

  ws.addEventListener('open', () => {
    hasConnected = true;
    log('WS_OPEN=1');
    sendHello();
  });

  ws.addEventListener('message', (event) => {
    try {
      const parsed = JSON.parse(String(event.data));
      handleMessage(parsed);
    } catch (error) {
      log(`WS_PARSE_ERROR=${error instanceof Error ? error.message : 'unknown'}`);
    }
  });

  ws.addEventListener('close', () => {
    log('WS_CLOSE=1');
    stopPingLoop();
  });

  ws.addEventListener('error', (event) => {
    const errorText = event?.message || 'connection failed';
    log(`WS_ERROR=${errorText}`);
    if (!hasConnected && !attemptedFallback && API_WS_URL_FALLBACK) {
      attemptedFallback = true;
      log(`WS_RETRY=${API_WS_URL_FALLBACK}`);
      attachWebSocket(API_WS_URL_FALLBACK);
    }
  });
}

persistState();
log(`DEVICE_ID=${DEVICE_ID}`);
attachWebSocket(API_WS_URL);

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
