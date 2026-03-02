import Fastify, { type FastifyReply } from 'fastify';
import websocket from '@fastify/websocket';
import { config } from './config.js';
import { setupWebSocket, sendToDevice, getDeviceSocket } from './lib/ws-handler.js';
import { deviceStore } from './store/devices.js';
import { runStore } from './store/runs.js';
import { screenStore } from './store/screen.js';
import { actionStore } from './store/actions.js';
import { setSSEBroadcast } from './engine/runEngine.js';
import { createServerMessage, redactActionForLog } from '@ai-operator/shared';
import type { InputAction } from '@ai-operator/shared';

const fastify = Fastify({
  logger: {
    level: config.LOG_LEVEL,
  },
});

// Register WebSocket plugin
await fastify.register(websocket);

// SSE clients
interface SSEClient {
  id: string;
  reply: FastifyReply;
}
const sseClients = new Map<string, SSEClient>();

// Set up SSE broadcast from run engine
setSSEBroadcast((event) => {
  const data = JSON.stringify(event);
  for (const [clientId, client] of sseClients) {
    try {
      client.reply.raw.write(`data: ${data}\n\n`);
    } catch (err) {
      fastify.log.warn({ clientId, err }, 'Failed to send SSE to client, removing');
      sseClients.delete(clientId);
    }
  }
});

// ============================================================================
// Health Check
// ============================================================================

fastify.get('/health', async () => {
  return {
    ok: true,
    timestamp: Date.now(),
    version: '0.0.5',
  };
});

// ============================================================================
// Device REST Endpoints
// ============================================================================

fastify.get('/devices', async () => {
  return {
    devices: deviceStore.getAll(),
  };
});

fastify.get('/devices/:deviceId', async (request, reply) => {
  const { deviceId } = request.params as { deviceId: string };
  const device = deviceStore.get(deviceId);

  if (!device) {
    reply.status(404);
    return { error: 'Device not found' };
  }

  return { device };
});

fastify.post('/devices/:deviceId/pair', async (request, reply) => {
  const { deviceId } = request.params as { deviceId: string };
  const { pairingCode } = request.body as { pairingCode: string };

  if (!pairingCode) {
    reply.status(400);
    return { error: 'pairingCode is required' };
  }

  const result = deviceStore.confirmPairing(deviceId, pairingCode.toUpperCase().trim());

  if (!result.success) {
    reply.status(400);
    const messages = {
      not_found: 'Device not found',
      invalid_code: 'Invalid pairing code',
      expired: 'Pairing code expired',
    };
    return { error: messages[result.reason] };
  }

  // Notify device that pairing is complete
  const socket = getDeviceSocket(deviceId);
  if (socket) {
    const notification = createServerMessage('server.chat.message', {
      deviceId,
      message: {
        role: 'agent' as const,
        text: '🎉 Device paired successfully! You can now receive commands.',
        createdAt: Date.now(),
      },
    });
    socket.send(JSON.stringify(notification));
  }

  return { ok: true, device: result.device };
});

// ============================================================================
// Screen Preview Endpoints (Iteration 4)
// ============================================================================

fastify.get('/devices/:deviceId/screen/meta', async (request, reply) => {
  const { deviceId } = request.params as { deviceId: string };
  
  const device = deviceStore.get(deviceId);
  if (!device) {
    reply.status(404);
    return { error: 'Device not found' };
  }

  const meta = screenStore.getMeta(deviceId);
  if (!meta) {
    reply.status(404);
    return { error: 'No screen frame available' };
  }

  return { ok: true, meta };
});

fastify.get('/devices/:deviceId/screen.png', async (request, reply) => {
  const { deviceId } = request.params as { deviceId: string };
  
  const device = deviceStore.get(deviceId);
  if (!device) {
    reply.status(404);
    return { error: 'Device not found' };
  }

  const frame = screenStore.getFrame(deviceId);
  if (!frame) {
    reply.status(404);
    return { error: 'No screen frame available' };
  }

  reply.header('Content-Type', 'image/png');
  reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  reply.header('Pragma', 'no-cache');
  reply.header('Expires', '0');
  
  return reply.send(frame.bytes);
});

// ============================================================================
// Remote Control Endpoints (Iteration 5)
// ============================================================================

// Create a new control action
fastify.post('/devices/:deviceId/actions', async (request, reply) => {
  const { deviceId } = request.params as { deviceId: string };
  const { action } = request.body as { action: InputAction };

  // Validate device exists
  const device = deviceStore.get(deviceId);
  if (!device) {
    reply.status(404);
    return { error: 'Device not found' };
  }

  // Check device is connected
  if (!device.connected) {
    reply.status(400);
    return { error: 'Device is not connected' };
  }

  // Check device is paired
  if (!device.paired) {
    reply.status(400);
    return { error: 'Device must be paired for remote control' };
  }

  // Check control is enabled
  const controlState = deviceStore.getControlState(deviceId);
  if (!controlState?.enabled) {
    reply.status(403);
    return { error: 'Remote control is not enabled on this device', code: 'CONTROL_NOT_ENABLED' };
  }

  // Check rate limit
  const rateLimit = actionStore.checkRateLimit(deviceId);
  if (!rateLimit.allowed) {
    reply.status(429);
    return { 
      error: 'Rate limit exceeded', 
      code: 'CONTROL_RATE_LIMITED',
      remaining: rateLimit.remaining,
      resetIn: rateLimit.resetIn,
    };
  }

  // Create action
  const deviceAction = actionStore.createAction(deviceId, action);
  
  // Log action (with redaction for sensitive data)
  fastify.log.info({ 
    actionId: deviceAction.actionId, 
    deviceId, 
    action: redactActionForLog(action),
    remaining: rateLimit.remaining,
  }, 'Control action created');

  // Send to device via WebSocket
  const actionMsg = createServerMessage('server.action.request', {
    deviceId,
    actionId: deviceAction.actionId,
    action,
    requestedAt: Date.now(),
  });

  const sent = sendToDevice(deviceId, actionMsg);
  if (!sent) {
    // Device disconnected between check and send
    actionStore.setResult(deviceAction.actionId, false, { code: 'DEVICE_DISCONNECTED', message: 'Device disconnected' });
    reply.status(503);
    return { error: 'Device disconnected' };
  }

  // Update status to awaiting_user
  actionStore.setStatus(deviceAction.actionId, 'awaiting_user');

  return { ok: true, actionId: deviceAction.actionId };
});

// List actions for a device
fastify.get('/devices/:deviceId/actions', async (request, reply) => {
  const { deviceId } = request.params as { deviceId: string };
  const limit = Math.min(100, parseInt((request.query as { limit?: string }).limit || '50', 10));

  const device = deviceStore.get(deviceId);
  if (!device) {
    reply.status(404);
    return { error: 'Device not found' };
  }

  const actions = actionStore.getByDevice(deviceId, limit);
  return { actions };
});

// ============================================================================
// Run REST Endpoints
// ============================================================================

fastify.post('/runs', async (request, reply) => {
  const { deviceId, goal } = request.body as { deviceId: string; goal: string };

  if (!deviceId || !goal) {
    reply.status(400);
    return { error: 'deviceId and goal are required' };
  }

  const device = deviceStore.get(deviceId);
  if (!device) {
    reply.status(404);
    return { error: 'Device not found' };
  }

  if (!device.paired) {
    reply.status(400);
    return { error: 'Device must be paired before starting a run' };
  }

  // Create run
  const run = runStore.create({ deviceId, goal });
  fastify.log.info({ runId: run.runId, deviceId, goal }, 'Run created');

  // Send run.start to device if connected
  if (device.connected) {
    const startMsg = createServerMessage('server.run.start', {
      deviceId,
      runId: run.runId,
      goal,
    });
    const sent = sendToDevice(deviceId, startMsg);

    if (sent) {
      fastify.log.info({ runId: run.runId }, 'Run start sent to device');
    } else {
      fastify.log.warn({ runId: run.runId, deviceId }, 'Failed to send run.start to device');
    }
  }

  return { run };
});

fastify.get('/runs/:runId', async (request, reply) => {
  const { runId } = request.params as { runId: string };
  const run = runStore.get(runId);

  if (!run) {
    reply.status(404);
    return { error: 'Run not found' };
  }

  return { run };
});

fastify.get('/runs', async () => {
  return {
    runs: runStore.getAll(),
  };
});

fastify.get('/devices/:deviceId/runs', async (request) => {
  const { deviceId } = request.params as { deviceId: string };
  const runs = runStore.getByDevice(deviceId);
  return { runs };
});

fastify.post('/runs/:runId/cancel', async (request, reply) => {
  const { runId } = request.params as { runId: string };
  const { reason } = request.body as { reason?: string } || {};

  const run = runStore.get(runId);
  if (!run) {
    reply.status(404);
    return { error: 'Run not found' };
  }

  const canceled = runStore.cancel(runId, reason || 'Canceled by user');
  if (!canceled) {
    reply.status(400);
    return { error: 'Run cannot be canceled (may already be completed or failed)' };
  }

  // Notify device
  const socket = getDeviceSocket(run.deviceId);
  if (socket) {
    const msg = createServerMessage('server.run.canceled', {
      deviceId: run.deviceId,
      runId,
    });
    socket.send(JSON.stringify(msg));
  }

  fastify.log.info({ runId, reason }, 'Run canceled');
  return { run: canceled };
});

// ============================================================================
// SSE Endpoint for Real-time Updates
// ============================================================================

fastify.get('/events', async (request, reply) => {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const clientId = crypto.randomUUID();
  sseClients.set(clientId, { id: clientId, reply });

  fastify.log.info({ clientId }, 'SSE client connected');

  // Send initial connection message
  reply.raw.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

  // Handle client disconnect
  request.raw.on('close', () => {
    sseClients.delete(clientId);
    fastify.log.info({ clientId }, 'SSE client disconnected');
  });

  // Keep connection alive
  const keepAlive = setInterval(() => {
    try {
      reply.raw.write(': keepalive\n\n');
    } catch {
      clearInterval(keepAlive);
      sseClients.delete(clientId);
    }
  }, 30000);

  // Don't close the connection
  return reply;
});

// ============================================================================
// WebSocket Setup
// ============================================================================

setupWebSocket(fastify);

// ============================================================================
// Start Server
// ============================================================================

try {
  await fastify.listen({ port: config.PORT, host: '0.0.0.0' });
  fastify.log.info(`API server listening on port ${config.PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

// Graceful shutdown
process.on('SIGINT', async () => {
  fastify.log.info('Shutting down gracefully...');
  deviceStore.markAllDisconnected();
  
  for (const [, client] of sseClients) {
    try {
      client.reply.raw.end();
    } catch {
      // Ignore
    }
  }
  sseClients.clear();
  
  await fastify.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  fastify.log.info('Shutting down gracefully...');
  deviceStore.markAllDisconnected();
  
  for (const [, client] of sseClients) {
    try {
      client.reply.raw.end();
    } catch {
      // Ignore
    }
  }
  sseClients.clear();
  
  await fastify.close();
  process.exit(0);
});
