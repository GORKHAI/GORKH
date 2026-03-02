import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import type {
  DeviceMessage,
  ServerMessage,
  Platform,
  ApprovalDecision,
  ScreenStreamState,
  ControlState,
  ActionStatus,
} from '@ai-operator/shared';
import {
  PROTOCOL_VERSION,
  parseDeviceMessage,
  createServerMessage,
  ErrorCode,
} from '@ai-operator/shared';
import { deviceStore } from '../store/devices.js';
import { runStore } from '../store/runs.js';
import { screenStore } from '../store/screen.js';
import { actionStore } from '../store/actions.js';
import { createRunEngine } from '../engine/runEngine.js';

// Track connected sockets and their device IDs
interface SocketState {
  deviceId: string;
  helloReceived: boolean;
}
const socketToDevice = new Map<WebSocket, SocketState>();

// HELLO timeout in ms
const HELLO_TIMEOUT_MS = 10_000;

export function generatePairingCode(): string {
  // Generate 8 character uppercase alphanumeric code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar looking characters
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function setupWebSocket(fastify: FastifyInstance) {
  fastify.get('/ws', { websocket: true }, (socket: WebSocket, req: FastifyRequest) => {
    const clientIp = req.ip;
    fastify.log.info({ clientIp }, 'WebSocket client connected');

    // Set hello timeout
    const helloTimeout = setTimeout(() => {
      const state = socketToDevice.get(socket);
      if (!state?.helloReceived) {
        fastify.log.warn({ clientIp }, 'Client failed to send hello in time, closing connection');
        const errorMsg = createServerMessage('server.error', {
          code: ErrorCode.MISSING_HELLO,
          message: 'Hello message not received within timeout period',
        });
        socket.send(JSON.stringify(errorMsg));
        socket.close();
      }
    }, HELLO_TIMEOUT_MS);

    socket.on('message', (raw: Buffer) => {
      try {
        const parsed = JSON.parse(raw.toString());
        fastify.log.debug({ msg: parsed }, 'Received WebSocket message');

        // Check protocol version first
        if (parsed.v !== PROTOCOL_VERSION) {
          const errorMsg = createServerMessage('server.error', {
            code: ErrorCode.PROTOCOL_VERSION_MISMATCH,
            message: `Expected protocol version ${PROTOCOL_VERSION}, got ${parsed.v}`,
          });
          socket.send(JSON.stringify(errorMsg));
          return;
        }

        // Validate message
        const validation = parseDeviceMessage(parsed);
        if (!validation.success) {
          fastify.log.warn({ error: validation.error, raw: parsed }, 'Invalid device message');
          const errorMsg = createServerMessage('server.error', {
            code: ErrorCode.INVALID_MESSAGE,
            message: `Invalid message: ${validation.error}`,
          });
          socket.send(JSON.stringify(errorMsg));
          return;
        }

        const message = validation.data;
        const state = socketToDevice.get(socket);

        // Require hello as first message
        if (!state?.helloReceived && message.type !== 'device.hello') {
          const errorMsg = createServerMessage('server.error', {
            code: ErrorCode.MISSING_HELLO,
            message: 'Expected device.hello as first message',
          });
          socket.send(JSON.stringify(errorMsg));
          return;
        }

        handleDeviceMessage(socket, message, fastify);
      } catch (err) {
        fastify.log.error({ err }, 'Failed to process WebSocket message');
        const errorMsg = createServerMessage('server.error', {
          code: ErrorCode.INVALID_MESSAGE,
          message: 'Failed to parse message',
        });
        socket.send(JSON.stringify(errorMsg));
      }
    });

    socket.on('close', () => {
      clearTimeout(helloTimeout);
      const state = socketToDevice.get(socket);
      if (state) {
        deviceStore.setConnected(state.deviceId, false);
        socketToDevice.delete(socket);
        fastify.log.info({ deviceId: state.deviceId }, 'Device disconnected');
      } else {
        fastify.log.info({ clientIp }, 'Client disconnected (never sent hello)');
      }
    });

    socket.on('error', (err: Error) => {
      fastify.log.error({ err, clientIp }, 'WebSocket error');
    });
  });
}

function handleDeviceMessage(
  socket: WebSocket,
  message: DeviceMessage,
  fastify: FastifyInstance
): void {
  const { type, payload, requestId } = message;

  switch (type) {
    case 'device.hello': {
      const { deviceId, deviceName, platform, appVersion } = payload;

      // Mark hello received
      socketToDevice.set(socket, { deviceId, helloReceived: true });

      // Register/update device
      deviceStore.upsert({
        deviceId,
        deviceName,
        platform: platform as Platform,
        appVersion,
        connected: true,
        socket,
      });

      fastify.log.info({ deviceId, deviceName, platform }, 'Device registered');

      // Check if device has any active runs and send details
      const activeRuns = runStore.getByDevice(deviceId).filter(
        (r) => r.status === 'queued' || r.status === 'running' || r.status === 'waiting_for_user'
      );
      for (const run of activeRuns) {
        const detailsMsg = createServerMessage('server.run.details', {
          deviceId,
          run,
        });
        socket.send(JSON.stringify(detailsMsg));
      }

      // Send hello_ack
      const response = createServerMessage(
        'server.hello_ack',
        { serverTime: Date.now() },
        requestId
      );
      socket.send(JSON.stringify(response));
      break;
    }

    case 'device.pairing.request_code': {
      const { deviceId } = payload;
      const state = socketToDevice.get(socket);

      if (!state || state.deviceId !== deviceId) {
        const errorMsg = createServerMessage('server.error', {
          code: ErrorCode.DEVICE_NOT_FOUND,
          message: 'Device not found or mismatch',
        });
        socket.send(JSON.stringify(errorMsg));
        return;
      }

      const pairingCode = generatePairingCode();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      deviceStore.setPairingCode(deviceId, pairingCode, expiresAt);

      fastify.log.info({ deviceId, pairingCode }, 'Generated pairing code');

      const response = createServerMessage(
        'server.pairing.code',
        { deviceId, pairingCode, expiresAt },
        requestId
      );
      socket.send(JSON.stringify(response));
      break;
    }

    case 'device.pairing.confirmed': {
      // This is handled via REST API, but acknowledge receipt
      fastify.log.debug({ deviceId: payload.deviceId }, 'Received pairing.confirmed (ignored - use REST)');
      break;
    }

    case 'device.chat.send': {
      const { deviceId, runId, message: chatMsg } = payload;

      fastify.log.info({ deviceId, runId, text: chatMsg.text.substring(0, 100) }, 'Chat message received');

      // Add to run if specified
      if (runId) {
        runStore.addMessage(runId, 'user', chatMsg.text);
      }

      // Echo back as server message
      const response = createServerMessage(
        'server.chat.message',
        {
          deviceId,
          runId,
          message: chatMsg,
        },
        requestId
      );
      socket.send(JSON.stringify(response));
      break;
    }

    case 'device.run.update': {
      const { deviceId, runId, status, note } = payload;

      fastify.log.info({ deviceId, runId, status, note }, 'Run status update');

      const run = runStore.updateStatus(runId, status, note);
      if (run) {
        const response = createServerMessage(
          'server.run.status',
          { deviceId, runId, status },
          requestId
        );
        socket.send(JSON.stringify(response));
      } else {
        const errorMsg = createServerMessage('server.error', {
          code: ErrorCode.RUN_NOT_FOUND,
          message: `Run ${runId} not found`,
        });
        socket.send(JSON.stringify(errorMsg));
      }
      break;
    }

    case 'device.ping': {
      const { deviceId } = payload;
      deviceStore.updateLastSeen(deviceId);

      const response = createServerMessage(
        'server.pong',
        { deviceId },
        requestId
      );
      socket.send(JSON.stringify(response));
      break;
    }

    case 'device.run.accept': {
      const { deviceId, runId } = payload;
      fastify.log.info({ deviceId, runId }, 'Run accepted by device');
      // Acknowledge receipt
      const run = runStore.get(runId);
      if (run) {
        // Start the run engine if not already running
        let engine = runStore.getEngine(runId);
        if (!engine && (run.status === 'queued' || run.status === 'running')) {
          engine = createRunEngine(runId, fastify);
          runStore.setEngine(runId, engine);
          engine.start();
        }
      }
      break;
    }

    case 'device.approval.decision': {
      const { deviceId, runId, approvalId, decision, comment } = payload;
      fastify.log.info({ deviceId, runId, approvalId, decision, comment }, 'Approval decision received');

      const run = runStore.get(runId);
      if (!run) {
        const errorMsg = createServerMessage('server.error', {
          code: ErrorCode.RUN_NOT_FOUND,
          message: `Run ${runId} not found`,
        });
        socket.send(JSON.stringify(errorMsg));
        return;
      }

      if (!run.pendingApproval || run.pendingApproval.approvalId !== approvalId) {
        const errorMsg = createServerMessage('server.error', {
          code: ErrorCode.APPROVAL_NOT_FOUND,
          message: `Approval ${approvalId} not found or already resolved`,
        });
        socket.send(JSON.stringify(errorMsg));
        return;
      }

      // Pass decision to run engine
      const engine = runStore.getEngine(runId);
      if (engine) {
        engine.handleApproval(decision as ApprovalDecision, comment);
      }
      break;
    }

    case 'device.run.cancel': {
      const { deviceId, runId } = payload;
      fastify.log.info({ deviceId, runId }, 'Run cancel request received');

      const run = runStore.cancel(runId, 'Canceled by device');
      if (run) {
        const response = createServerMessage('server.run.canceled', {
          deviceId,
          runId,
        });
        socket.send(JSON.stringify(response));
      } else {
        const errorMsg = createServerMessage('server.error', {
          code: ErrorCode.RUN_NOT_FOUND,
          message: `Run ${runId} not found or cannot be canceled`,
        });
        socket.send(JSON.stringify(errorMsg));
      }
      break;
    }

    // Iteration 4: Screen streaming
    case 'device.screen.stream_state': {
      const { deviceId, state } = payload;
      fastify.log.info({ deviceId, enabled: state.enabled, fps: state.fps }, 'Screen stream state update');

      const device = deviceStore.setScreenStreamState(deviceId, state as ScreenStreamState);
      if (!device) {
        const errorMsg = createServerMessage('server.error', {
          code: ErrorCode.DEVICE_NOT_FOUND,
          message: `Device ${deviceId} not found`,
        });
        socket.send(JSON.stringify(errorMsg));
        return;
      }

      // If disabling, clear any stored frame
      if (!state.enabled) {
        screenStore.clearFrame(deviceId);
      }

      // Acknowledge
      const response = createServerMessage(
        'server.screen.ack',
        { deviceId, ok: true },
        requestId
      );
      socket.send(JSON.stringify(response));
      break;
    }

    case 'device.screen.frame': {
      const { deviceId, meta, dataBase64 } = payload;

      // Validate device exists and is connected
      const state = socketToDevice.get(socket);
      if (!state || state.deviceId !== deviceId) {
        const errorMsg = createServerMessage('server.screen.ack', {
          deviceId,
          ok: false,
          error: { code: ErrorCode.DEVICE_NOT_FOUND, message: 'Device not found or mismatch' },
        });
        socket.send(JSON.stringify(errorMsg));
        return;
      }

      // Check if streaming is enabled
      const streamState = deviceStore.getScreenStreamState(deviceId);
      if (!streamState?.enabled) {
        const errorMsg = createServerMessage('server.screen.ack', {
          deviceId,
          ok: false,
          error: { code: ErrorCode.SCREEN_STREAM_DISABLED, message: 'Screen streaming is disabled' },
        });
        socket.send(JSON.stringify(errorMsg));
        return;
      }

      // Check rate limit
      if (screenStore.isRateLimited(deviceId)) {
        const errorMsg = createServerMessage('server.screen.ack', {
          deviceId,
          ok: false,
          error: { code: ErrorCode.SCREEN_RATE_LIMITED, message: 'Frame rate limited (max 2 FPS)' },
        });
        socket.send(JSON.stringify(errorMsg));
        return;
      }

      // Decode base64
      let bytes: Buffer;
      try {
        bytes = Buffer.from(dataBase64, 'base64');
      } catch {
        const errorMsg = createServerMessage('server.screen.ack', {
          deviceId,
          ok: false,
          error: { code: ErrorCode.INTERNAL_ERROR, message: 'Failed to decode frame data' },
        });
        socket.send(JSON.stringify(errorMsg));
        return;
      }

      // Store frame (with size check inside)
      const stored = screenStore.setFrame(deviceId, meta, bytes);
      if (!stored) {
        const errorMsg = createServerMessage('server.screen.ack', {
          deviceId,
          ok: false,
          error: { code: ErrorCode.SCREEN_FRAME_TOO_LARGE, message: 'Frame too large (max 1MB)' },
        });
        socket.send(JSON.stringify(errorMsg));
        return;
      }

      // Broadcast screen update via SSE (metadata only, not bytes)
      sseBroadcast({ type: 'screen_update', deviceId, meta });

      fastify.log.debug({ deviceId, frameId: meta.frameId, bytes: meta.byteLength }, 'Screen frame received');

      // Acknowledge
      const response = createServerMessage(
        'server.screen.ack',
        { deviceId, ok: true },
        requestId
      );
      socket.send(JSON.stringify(response));
      break;
    }

    // Iteration 5: Remote control
    case 'device.control.state': {
      const { deviceId, state } = payload;
      fastify.log.info({ deviceId, enabled: state.enabled }, 'Control state update');

      const device = deviceStore.setControlState(deviceId, state as ControlState);
      if (!device) {
        const errorMsg = createServerMessage('server.error', {
          code: ErrorCode.DEVICE_NOT_FOUND,
          message: `Device ${deviceId} not found`,
        });
        socket.send(JSON.stringify(errorMsg));
        return;
      }

      // Broadcast device update via SSE
      sseBroadcast({ type: 'device_update', device: deviceStore.get(deviceId)! });
      break;
    }

    case 'device.action.ack': {
      const { deviceId, actionId, status } = payload;
      fastify.log.info({ deviceId, actionId, status }, 'Action ack received');

      const action = actionStore.setStatus(actionId, status as ActionStatus);
      if (action) {
        sseBroadcast({ type: 'action_update', action });
      }
      break;
    }

    case 'device.action.result': {
      const { deviceId, actionId, ok, error } = payload;
      fastify.log.info({ deviceId, actionId, ok }, 'Action result received');

      const action = actionStore.setResult(actionId, ok, error);
      if (action) {
        sseBroadcast({ type: 'action_update', action });
      }
      break;
    }

    default: {
      fastify.log.warn({ type }, 'Unhandled device message type');
    }
  }
}

// Helper to send message to a specific device
export function sendToDevice(deviceId: string, message: ServerMessage): boolean {
  for (const [socket, state] of socketToDevice) {
    if (state.deviceId === deviceId) {
      socket.send(JSON.stringify(message));
      return true;
    }
  }
  return false;
}

// Get device socket for sending messages
export function getDeviceSocket(deviceId: string): WebSocket | undefined {
  for (const [socket, state] of socketToDevice) {
    if (state.deviceId === deviceId) {
      return socket;
    }
  }
  return undefined;
}

// Get all connected device IDs
export function getConnectedDeviceIds(): string[] {
  return Array.from(socketToDevice.values()).map((s) => s.deviceId);
}

// SSE Broadcast functionality
import { sseBroadcast } from '../engine/runEngine.js';
export { sseBroadcast };
