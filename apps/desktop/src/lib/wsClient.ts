import {
  type DeviceMessage,
  type ServerMessage,
  parseServerMessage,
  createDeviceMessage,
  PROTOCOL_VERSION,
  type ErrorCode,
  type ServerRunDetails,
  type ServerRunStepUpdate,
  type ServerRunLog,
  type ServerApprovalRequest,
  type ServerRunCanceled,
  type ServerActionRequest,
  type RunWithSteps,
  type RunStep,
  type LogLine,
  type ApprovalRequest,
  type InputAction,
} from '@ai-operator/shared';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WsClientOptions {
  deviceId: string;
  deviceName?: string;
  platform: 'macos' | 'windows' | 'linux' | 'unknown';
  appVersion?: string;
  onStatusChange?: (status: ConnectionStatus) => void;
  onMessage?: (message: ServerMessage) => void;
  onError?: (error: { code: ErrorCode; message: string }) => void;
  // Run-specific callbacks
  onRunDetails?: (run: RunWithSteps) => void;
  onStepUpdate?: (runId: string, step: RunStep) => void;
  onRunLog?: (runId: string, stepId: string | undefined, log: LogLine) => void;
  onApprovalRequest?: (runId: string, approval: ApprovalRequest) => void;
  onRunCanceled?: (runId: string) => void;
  // Control callbacks
  onActionRequest?: (actionId: string, action: InputAction) => void;
}

export class WsClient {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectDelay = 10000; // 10 seconds max
  private helloTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private options: WsClientOptions) {}

  getDeviceId(): string {
    return this.options.deviceId;
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  connect(url: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WsClient] Already connected');
      return;
    }

    this.setStatus('connecting');
    console.log(`[WsClient] Connecting to ${url}`);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[WsClient] WebSocket opened');
        this.reconnectAttempts = 0;
        this.sendHello();

        // Wait for hello_ack before marking as connected
        this.helloTimeout = setTimeout(() => {
          console.error('[WsClient] Hello timeout - no hello_ack received');
          this.ws?.close();
          this.setStatus('error');
        }, 10000);
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data as string);
          this.handleMessage(parsed);
        } catch (err) {
          console.error('[WsClient] Failed to parse message:', err);
        }
      };

      this.ws.onclose = () => {
        console.log('[WsClient] WebSocket closed');
        this.cleanup();
        this.setStatus('disconnected');
        this.scheduleReconnect(url);
      };

      this.ws.onerror = (err) => {
        console.error('[WsClient] WebSocket error:', err);
        this.setStatus('error');
      };
    } catch (err) {
      console.error('[WsClient] Failed to connect:', err);
      this.setStatus('error');
      this.scheduleReconnect(url);
    }
  }

  disconnect(): void {
    console.log('[WsClient] Disconnecting...');
    this.cleanup();
    this.ws?.close();
    this.ws = null;
    this.setStatus('disconnected');
  }

  send(message: DeviceMessage): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn('[WsClient] Cannot send - not connected');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (err) {
      console.error('[WsClient] Failed to send message:', err);
      return false;
    }
  }

  sendPing(): boolean {
    return this.send(
      createDeviceMessage('device.ping', {
        deviceId: this.options.deviceId,
      })
    );
  }

  requestPairingCode(): boolean {
    return this.send(
      createDeviceMessage('device.pairing.request_code', {
        deviceId: this.options.deviceId,
      })
    );
  }

  sendChat(text: string, runId?: string): boolean {
    return this.send(
      createDeviceMessage('device.chat.send', {
        deviceId: this.options.deviceId,
        runId,
        message: {
          role: 'user',
          text,
          createdAt: Date.now(),
        },
      })
    );
  }

  sendRunAccept(runId: string): boolean {
    return this.send(
      createDeviceMessage('device.run.accept', {
        deviceId: this.options.deviceId,
        runId,
      })
    );
  }

  sendApprovalDecision(runId: string, approvalId: string, decision: 'approved' | 'denied', comment?: string): boolean {
    return this.send(
      createDeviceMessage('device.approval.decision', {
        deviceId: this.options.deviceId,
        runId,
        approvalId,
        decision,
        comment,
      })
    );
  }

  sendRunCancel(runId: string): boolean {
    return this.send(
      createDeviceMessage('device.run.cancel', {
        deviceId: this.options.deviceId,
        runId,
      })
    );
  }

  sendControlState(enabled: boolean, requestedBy?: 'local_user' | 'web'): boolean {
    return this.send(
      createDeviceMessage('device.control.state', {
        deviceId: this.options.deviceId,
        state: {
          enabled,
          requestedBy,
          updatedAt: Date.now(),
        },
      })
    );
  }

  sendActionAck(actionId: string, status: 'awaiting_user' | 'approved' | 'denied'): boolean {
    return this.send(
      createDeviceMessage('device.action.ack', {
        deviceId: this.options.deviceId,
        actionId,
        status,
      })
    );
  }

  sendActionResult(actionId: string, ok: boolean, error?: { code: string; message: string }): boolean {
    return this.send(
      createDeviceMessage('device.action.result', {
        deviceId: this.options.deviceId,
        actionId,
        ok,
        error,
      })
    );
  }

  private sendHello(): void {
    const hello = createDeviceMessage('device.hello', {
      deviceId: this.options.deviceId,
      deviceName: this.options.deviceName,
      platform: this.options.platform,
      appVersion: this.options.appVersion,
    });
    this.send(hello);
  }

  private handleMessage(raw: unknown): void {
    // Check protocol version
    if (typeof raw === 'object' && raw !== null && 'v' in raw) {
      const msg = raw as { v: number };
      if (msg.v !== PROTOCOL_VERSION) {
        console.error(`[WsClient] Protocol version mismatch: expected ${PROTOCOL_VERSION}, got ${msg.v}`);
        return;
      }
    }

    const result = parseServerMessage(raw);
    if (!result.success) {
      console.error('[WsClient] Invalid server message:', result.error);
      return;
    }

    const message = result.data;
    console.log(`[WsClient] Received ${message.type}`);

    switch (message.type) {
      case 'server.hello_ack':
        if (this.helloTimeout) {
          clearTimeout(this.helloTimeout);
          this.helloTimeout = null;
        }
        this.setStatus('connected');
        this.startPingInterval();
        break;

      case 'server.error':
        console.error('[WsClient] Server error:', message.payload);
        this.options.onError?.(message.payload);
        break;

      case 'server.pong':
        // Ping acknowledged
        break;

      // Run-specific messages
      case 'server.run.start': {
        // Acknowledge by sending accept
        this.sendRunAccept(message.payload.runId);
        break;
      }

      case 'server.run.details': {
        const run = (message as ServerRunDetails).payload.run;
        this.options.onRunDetails?.(run);
        break;
      }

      case 'server.run.step_update': {
        const payload = (message as ServerRunStepUpdate).payload;
        this.options.onStepUpdate?.(payload.runId, payload.step);
        break;
      }

      case 'server.run.log': {
        const payload = (message as ServerRunLog).payload;
        this.options.onRunLog?.(payload.runId, payload.stepId, {
          line: payload.line,
          level: payload.level,
          at: payload.at,
        });
        break;
      }

      case 'server.approval.request': {
        const payload = (message as ServerApprovalRequest).payload;
        this.options.onApprovalRequest?.(payload.runId, payload.approval);
        break;
      }

      case 'server.run.canceled': {
        const payload = (message as ServerRunCanceled).payload;
        this.options.onRunCanceled?.(payload.runId);
        break;
      }

      case 'server.action.request': {
        const payload = (message as ServerActionRequest).payload;
        console.log('[WsClient] Action request:', payload.actionId, payload.action.kind);
        this.options.onActionRequest?.(payload.actionId, payload.action);
        break;
      }

      default:
        // Pass to generic handler
        this.options.onMessage?.(message);
    }
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.options.onStatusChange?.(status);
    }
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, 30000); // Ping every 30 seconds
  }

  private scheduleReconnect(url: string): void {
    if (this.reconnectTimer) return;

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay);
    this.reconnectAttempts++;

    console.log(`[WsClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(url);
    }, delay);
  }

  private cleanup(): void {
    if (this.helloTimeout) {
      clearTimeout(this.helloTimeout);
      this.helloTimeout = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
