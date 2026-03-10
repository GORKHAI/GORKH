import {
  type DeviceMessage,
  type ServerMessage,
  parseServerMessage,
  createDeviceMessage,
  PROTOCOL_VERSION,
  type ErrorCode,
  type DeviceCommandAckErrorCode,
  type ServerRunDetails,
  type ServerRunStepUpdate,
  type ServerRunLog,
  type ServerApprovalRequest,
  type ServerRunCanceled,
  type ServerActionRequest,
  type ServerDeviceToken,
  type ServerCommand,
  type RunWithSteps,
  type RunStep,
  type LogLine,
  type ApprovalRequest,
  type InputAction,
  type AgentProposal,
  type ToolCall,
  type WorkspaceState,
} from '@ai-operator/shared';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

type CommandHandlingResult =
  | void
  | { ok: true }
  | { ok: false; errorCode: DeviceCommandAckErrorCode; retryable?: boolean };

const supportedCommandTypes = new Set([
  'action.request',
  'approval.request',
  'chat.message',
  'device.token',
  'run.canceled',
  'run.details',
  'run.log',
  'run.start',
  'run.status',
  'run.step_update',
]);

export interface WsClientOptions {
  deviceId: string;
  deviceName?: string;
  platform: 'macos' | 'windows' | 'linux' | 'unknown';
  appVersion?: string;
  deviceToken?: string;
  onStatusChange?: (status: ConnectionStatus) => void;
  onMessage?: (message: ServerMessage) => void;
  onError?: (error: { code: ErrorCode; message: string }) => void;
  onRunDetails?: (run: RunWithSteps) => void;
  onStepUpdate?: (runId: string, step: RunStep) => void;
  onRunLog?: (runId: string, stepId: string | undefined, log: LogLine) => void;
  onApprovalRequest?: (runId: string, approval: ApprovalRequest) => void;
  onRunCanceled?: (runId: string) => void;
  onDeviceToken?: (deviceToken: string) => CommandHandlingResult;
  onActionRequest?: (actionId: string, action: InputAction) => CommandHandlingResult;
  onAgentProposal?: (runId: string, proposal: AgentProposal) => void;
  onRunStart?: (runId: string, goal: string, mode?: 'manual' | 'ai_assist') => CommandHandlingResult;
}

export class WsClient {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectDelay = 10000;
  private manualDisconnect = false;
  private helloTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private pingIntervalMs = 30000;
  private handledCommandAcks = new Map<string, Extract<DeviceMessage, { type: 'device.command.ack' }>['payload']>();
  private readonly maxHandledCommandAcks = 200;

  constructor(private options: WsClientOptions) {}

  getDeviceId(): string { return this.options.deviceId; }
  getStatus(): ConnectionStatus { return this.status; }
  setDeviceToken(deviceToken?: string): void { this.options.deviceToken = deviceToken; }
  setPingIntervalMs(intervalMs: number): void {
    this.pingIntervalMs = intervalMs;
    if (this.status === 'connected') {
      this.startPingInterval();
    }
  }

  connect(url: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.manualDisconnect = false;
    this.setStatus('connecting');
    try {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.sendHello();
        this.helloTimeout = setTimeout(() => {
          this.ws?.close();
          this.setStatus('error');
        }, 10000);
      };
      this.ws.onmessage = (event) => {
        try { this.handleMessage(JSON.parse(event.data as string)); }
        catch (err) { console.error('[WsClient] Parse error:', err); }
      };
      this.ws.onclose = () => {
        this.cleanup();
        this.setStatus('disconnected');
        if (!this.manualDisconnect) {
          this.scheduleReconnect(url);
        }
      };
      this.ws.onerror = () => { this.setStatus('error'); };
    } catch (err) { this.setStatus('error'); this.scheduleReconnect(url); }
  }

  disconnect(): void {
    this.manualDisconnect = true;
    this.cleanup();
    this.ws?.close();
    this.ws = null;
    this.setStatus('disconnected');
  }

  send(message: DeviceMessage): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    try { this.ws.send(JSON.stringify(message)); return true; }
    catch { return false; }
  }

  sendPing(): boolean { return this.send(createDeviceMessage('device.ping', { deviceId: this.options.deviceId })); }
  requestPairingCode(): boolean { return this.send(createDeviceMessage('device.pairing.request_code', { deviceId: this.options.deviceId })); }
  sendChat(text: string, runId?: string): boolean { return this.send(createDeviceMessage('device.chat.send', { deviceId: this.options.deviceId, runId, message: { role: 'user', text, createdAt: Date.now() } })); }
  sendRunAccept(runId: string): boolean { return this.send(createDeviceMessage('device.run.accept', { deviceId: this.options.deviceId, runId })); }
  sendApprovalDecision(runId: string, approvalId: string, decision: 'approved' | 'denied', comment?: string): boolean { return this.send(createDeviceMessage('device.approval.decision', { deviceId: this.options.deviceId, runId, approvalId, decision, comment })); }
  sendRunCancel(runId: string): boolean { return this.send(createDeviceMessage('device.run.cancel', { deviceId: this.options.deviceId, runId })); }
  sendControlState(enabled: boolean, requestedBy?: 'local_user' | 'web'): boolean { return this.send(createDeviceMessage('device.control.state', { deviceId: this.options.deviceId, state: { enabled, requestedBy, updatedAt: Date.now() } })); }
  sendActionAck(actionId: string, status: 'awaiting_user' | 'approved' | 'denied'): boolean { return this.send(createDeviceMessage('device.action.ack', { deviceId: this.options.deviceId, actionId, status })); }
  sendActionResult(actionId: string, ok: boolean, error?: { code: string; message: string }): boolean { return this.send(createDeviceMessage('device.action.result', { deviceId: this.options.deviceId, actionId, ok, error })); }
  sendRunStepUpdate(runId: string, step: RunStep): boolean { return this.send(createDeviceMessage('device.run.step_update', { deviceId: this.options.deviceId, runId, step })); }
  sendRunLog(runId: string, line: string, level: 'info' | 'warn' | 'error' = 'info', stepId?: string): boolean { return this.send(createDeviceMessage('device.run.log', { deviceId: this.options.deviceId, runId, stepId, line, level, at: Date.now() })); }
  sendAgentProposal(runId: string, proposal: AgentProposal): boolean { return this.send(createDeviceMessage('device.agent.proposal', { deviceId: this.options.deviceId, runId, proposal })); }
  sendActionCreate(actionId: string, action: InputAction, createdAt: number, runId?: string): boolean { return this.send(createDeviceMessage('device.action.create', { deviceId: this.options.deviceId, actionId, runId, action, source: 'agent', createdAt })); }
  sendRunUpdate(runId: string, status: 'queued' | 'running' | 'waiting_for_user' | 'done' | 'failed' | 'canceled', note?: string): boolean { return this.send(createDeviceMessage('device.run.update', { deviceId: this.options.deviceId, runId, status, note })); }
  sendWorkspaceState(workspaceState: WorkspaceState): boolean { return this.send(createDeviceMessage('device.workspace.state', { deviceId: this.options.deviceId, workspaceState })); }
  sendDeviceTokenAck(): boolean { return this.send(createDeviceMessage('device.device_token.ack', { deviceId: this.options.deviceId })); }
  sendCommandAck(
    commandId: string,
    ok: boolean,
    errorCode?: DeviceCommandAckErrorCode,
    retryable?: boolean
  ): boolean {
    const payload = ok
      ? { deviceId: this.options.deviceId, commandId, ok: true as const }
      : { deviceId: this.options.deviceId, commandId, ok: false as const, errorCode: errorCode!, retryable };
    return this.send(createDeviceMessage('device.command.ack', payload));
  }

  sendToolRequest(runId: string, toolCallId: string, toolCall: ToolCall): string {
    const toolEventId = crypto.randomUUID();
    this.send(createDeviceMessage('device.tool.request', {
      deviceId: this.options.deviceId,
      runId,
      toolEventId,
      toolCallId,
      toolCall,
      at: Date.now(),
    }));
    return toolEventId;
  }

  sendToolResult(
    runId: string,
    toolEventId: string,
    toolCallId: string,
    toolCall: ToolCall,
    result: {
      ok: boolean;
      error?: { code: string; message: string };
      exitCode?: number;
      truncated?: boolean;
      bytesWritten?: number;
      hunksApplied?: number;
    }
  ): boolean {
    return this.send(createDeviceMessage('device.tool.result', {
      deviceId: this.options.deviceId,
      runId,
      toolEventId,
      toolCallId,
      toolCall,
      result,
      at: Date.now(),
    }));
  }

  private sendHello(): void {
    this.send(createDeviceMessage('device.hello', {
      deviceId: this.options.deviceId,
      deviceName: this.options.deviceName,
      platform: this.options.platform,
      appVersion: this.options.appVersion,
      deviceToken: this.options.deviceToken,
    }));
  }

  private handleMessage(raw: unknown): void {
    if (typeof raw === 'object' && raw !== null && 'v' in raw) {
      const msg = raw as { v: number };
      if (msg.v !== PROTOCOL_VERSION) { console.error(`[WsClient] Protocol version mismatch`); return; }
    }
    const result = parseServerMessage(raw);
    if (!result.success) { console.error('[WsClient] Invalid message:', result.error); return; }
    const message = result.data;
    if (message.type === 'server.command') {
      this.handleServerCommand(message as ServerCommand);
      return;
    }

    this.routeServerMessage(message);
  }

  private routeServerMessage(message: ServerMessage): CommandHandlingResult {
    switch (message.type) {
      case 'server.hello_ack': if (this.helloTimeout) { clearTimeout(this.helloTimeout); this.helloTimeout = null; } this.setStatus('connected'); this.startPingInterval(); break;
      case 'server.error': this.options.onError?.(message.payload); break;
      case 'server.pong': break;
      case 'server.run.start': this.sendRunAccept(message.payload.runId); return this.options.onRunStart?.(message.payload.runId, message.payload.goal, message.payload.mode);
      case 'server.run.details': this.options.onRunDetails?.((message as ServerRunDetails).payload.run); break;
      case 'server.run.step_update': { const p = (message as ServerRunStepUpdate).payload; this.options.onStepUpdate?.(p.runId, p.step); break; }
      case 'server.run.log': { const p = (message as ServerRunLog).payload; this.options.onRunLog?.(p.runId, p.stepId, { line: p.line, level: p.level, at: p.at }); break; }
      case 'server.approval.request': { const p = (message as ServerApprovalRequest).payload; this.options.onApprovalRequest?.(p.runId, p.approval); break; }
      case 'server.run.canceled': this.options.onRunCanceled?.((message as ServerRunCanceled).payload.runId); break;
      case 'server.device.token': return this.options.onDeviceToken?.((message as ServerDeviceToken).payload.deviceToken);
      case 'server.action.request': { const p = (message as ServerActionRequest).payload; return this.options.onActionRequest?.(p.actionId, p.action); }
      default: this.options.onMessage?.(message);
    }
  }

  private handleServerCommand(message: ServerCommand): void {
    const existingAck = this.handledCommandAcks.get(message.payload.commandId);
    if (existingAck) {
      this.send(createDeviceMessage('device.command.ack', existingAck));
      return;
    }

    const legacyMessage = this.parseLegacyServerMessage(message);
    if (legacyMessage.status === 'unknown') {
      this.rememberAndSendCommandAck({
        deviceId: this.options.deviceId,
        commandId: message.payload.commandId,
        ok: false,
        errorCode: 'UNKNOWN_COMMAND',
        retryable: false,
      });
      return;
    }
    if (legacyMessage.status === 'invalid') {
      this.rememberAndSendCommandAck({
        deviceId: this.options.deviceId,
        commandId: message.payload.commandId,
        ok: false,
        errorCode: 'INVALID_PAYLOAD',
        retryable: false,
      });
      return;
    }

    try {
      const result = this.routeServerMessage(legacyMessage.message);
      if (result && result.ok === false) {
        this.rememberAndSendCommandAck({
          deviceId: this.options.deviceId,
          commandId: message.payload.commandId,
          ok: false,
          errorCode: result.errorCode,
          retryable: result.retryable,
        });
        return;
      }

      this.rememberAndSendCommandAck({
        deviceId: this.options.deviceId,
        commandId: message.payload.commandId,
        ok: true,
      });
    } catch (error) {
      console.error('[WsClient] Failed to handle server.command:', error);
      this.rememberAndSendCommandAck({
        deviceId: this.options.deviceId,
        commandId: message.payload.commandId,
        ok: false,
        errorCode: 'INTERNAL_ERROR',
        retryable: true,
      });
    }
  }

  private parseLegacyServerMessage(message: ServerCommand):
    | { status: 'unknown' }
    | { status: 'invalid' }
    | { status: 'ok'; message: ServerMessage } {
    if (!supportedCommandTypes.has(message.payload.commandType)) {
      return { status: 'unknown' };
    }

    const raw = {
      v: PROTOCOL_VERSION,
      type: `server.${message.payload.commandType}`,
      ts: message.ts,
      payload: {
        deviceId: message.payload.deviceId,
        ...message.payload.payload,
      },
    };

    const parsed = parseServerMessage(raw);
    return parsed.success ? { status: 'ok', message: parsed.data } : { status: 'invalid' };
  }

  private rememberAndSendCommandAck(payload: Extract<DeviceMessage, { type: 'device.command.ack' }>['payload']): void {
    this.handledCommandAcks.set(payload.commandId, payload);
    if (this.handledCommandAcks.size > this.maxHandledCommandAcks) {
      const oldest = this.handledCommandAcks.keys().next().value;
      if (oldest) {
        this.handledCommandAcks.delete(oldest);
      }
    }
    this.send(createDeviceMessage('device.command.ack', payload));
  }

  private setStatus(status: ConnectionStatus): void { if (this.status !== status) { this.status = status; this.options.onStatusChange?.(status); } }
  private startPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    this.pingInterval = setInterval(() => this.sendPing(), this.pingIntervalMs);
  }
  private scheduleReconnect(url: string): void { if (this.reconnectTimer) return; const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay); this.reconnectAttempts++; this.reconnectTimer = setTimeout(() => { this.reconnectTimer = null; this.connect(url); }, delay); }
  private cleanup(): void { if (this.helloTimeout) { clearTimeout(this.helloTimeout); this.helloTimeout = null; } if (this.pingInterval) { clearInterval(this.pingInterval); this.pingInterval = null; } if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; } }
}
