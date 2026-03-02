import { z } from 'zod';

// Protocol version
export const PROTOCOL_VERSION = 1;

// ============================================================================
// Enums
// ============================================================================

export const Platform = {
  MACOS: 'macos',
  WINDOWS: 'windows',
  LINUX: 'linux',
  UNKNOWN: 'unknown',
} as const;
export type Platform = (typeof Platform)[keyof typeof Platform];

export const RunStatus = {
  QUEUED: 'queued',
  RUNNING: 'running',
  WAITING_FOR_USER: 'waiting_for_user',
  DONE: 'done',
  FAILED: 'failed',
  CANCELED: 'canceled',
} as const;
export type RunStatus = (typeof RunStatus)[keyof typeof RunStatus];

export const StepStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  DONE: 'done',
  FAILED: 'failed',
  BLOCKED: 'blocked',
} as const;
export type StepStatus = (typeof StepStatus)[keyof typeof StepStatus];

export const ApprovalDecision = {
  APPROVED: 'approved',
  DENIED: 'denied',
} as const;
export type ApprovalDecision = (typeof ApprovalDecision)[keyof typeof ApprovalDecision];

export const ApprovalRisk = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;
export type ApprovalRisk = (typeof ApprovalRisk)[keyof typeof ApprovalRisk];

export const ScreenSource = {
  DISPLAY: 'display',
} as const;
export type ScreenSource = (typeof ScreenSource)[keyof typeof ScreenSource];

export const ErrorCode = {
  INVALID_MESSAGE: 'INVALID_MESSAGE',
  PROTOCOL_VERSION_MISMATCH: 'PROTOCOL_VERSION_MISMATCH',
  MISSING_HELLO: 'MISSING_HELLO',
  DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
  PAIRING_INVALID_CODE: 'PAIRING_INVALID_CODE',
  PAIRING_EXPIRED: 'PAIRING_EXPIRED',
  RUN_NOT_FOUND: 'RUN_NOT_FOUND',
  APPROVAL_NOT_FOUND: 'APPROVAL_NOT_FOUND',
  SCREEN_STREAM_DISABLED: 'SCREEN_STREAM_DISABLED',
  SCREEN_FRAME_TOO_LARGE: 'SCREEN_FRAME_TOO_LARGE',
  SCREEN_RATE_LIMITED: 'SCREEN_RATE_LIMITED',
  CONTROL_NOT_ENABLED: 'CONTROL_NOT_ENABLED',
  CONTROL_RATE_LIMITED: 'CONTROL_RATE_LIMITED',
  ACTION_NOT_FOUND: 'ACTION_NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// ============================================================================
// Remote Control Types (Iteration 5)
// ============================================================================

export const MouseButton = {
  LEFT: 'left',
  RIGHT: 'right',
  MIDDLE: 'middle',
} as const;
export type MouseButton = (typeof MouseButton)[keyof typeof MouseButton];

export const Key = {
  ENTER: 'enter',
  TAB: 'tab',
  ESCAPE: 'escape',
  BACKSPACE: 'backspace',
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
} as const;
export type Key = (typeof Key)[keyof typeof Key];

export const Modifier = {
  SHIFT: 'shift',
  CTRL: 'ctrl',
  ALT: 'alt',
  META: 'meta',
} as const;
export type Modifier = (typeof Modifier)[keyof typeof Modifier];

export const ActionStatus = {
  REQUESTED: 'requested',
  AWAITING_USER: 'awaiting_user',
  APPROVED: 'approved',
  DENIED: 'denied',
  EXECUTED: 'executed',
  FAILED: 'failed',
} as const;
export type ActionStatus = (typeof ActionStatus)[keyof typeof ActionStatus];

export interface ControlState {
  enabled: boolean;
  requestedBy?: 'local_user' | 'web';
  updatedAt: number;
}

// InputAction discriminated union
export interface ClickAction {
  kind: 'click';
  x: number;  // 0..1 normalized
  y: number;  // 0..1 normalized
  button: MouseButton;
}

export interface DoubleClickAction {
  kind: 'double_click';
  x: number;
  y: number;
  button: MouseButton;
}

export interface ScrollAction {
  kind: 'scroll';
  dx: number;  // pixel deltas, clamped to [-2000, 2000]
  dy: number;
}

export interface TypeAction {
  kind: 'type';
  text: string;  // max 500 chars
}

export interface HotkeyAction {
  kind: 'hotkey';
  key: Key;
  modifiers?: Modifier[];
}

export type InputAction = ClickAction | DoubleClickAction | ScrollAction | TypeAction | HotkeyAction;

export interface ActionError {
  code: string;
  message: string;
}

export interface DeviceAction {
  actionId: string;
  deviceId: string;
  action: InputAction;
  status: ActionStatus;
  createdAt: number;
  updatedAt: number;
  error?: ActionError;
}

// Helper to redact sensitive action data for logging
export function redactActionForLog(action: InputAction): string {
  switch (action.kind) {
    case 'type':
      return `type (${action.text.length} chars)`;
    case 'click':
      return `click (${action.x.toFixed(2)}, ${action.y.toFixed(2)})`;
    case 'double_click':
      return `double_click (${action.x.toFixed(2)}, ${action.y.toFixed(2)})`;
    case 'scroll':
      return `scroll (${action.dx}, ${action.dy})`;
    case 'hotkey':
      return `hotkey (${action.key}${action.modifiers?.length ? ' + ' + action.modifiers.join(',') : ''})`;
    default:
      return 'unknown';
  }
}

// ============================================================================
// Screen Preview Types (Iteration 4)
// ============================================================================

export interface ScreenStreamState {
  enabled: boolean;
  fps: 1 | 2;
  displayId?: string;
}

export interface ScreenFrameMeta {
  frameId: string;
  width: number;
  height: number;
  mime: 'image/png';
  at: number;
  byteLength: number;
}

export interface DisplayInfo {
  displayId: string;
  name?: string;
  width: number;
  height: number;
}

// ============================================================================
// Domain Types (for API/store usage)
// ============================================================================

export interface LogLine {
  line: string;
  level: 'info' | 'warn' | 'error';
  at: number;
}

export interface RunStep {
  stepId: string;
  title: string;
  status: StepStatus;
  startedAt?: number;
  endedAt?: number;
  logs: LogLine[];
}

export interface ApprovalRequest {
  approvalId: string;
  runId: string;
  title: string;
  description: string;
  risk: ApprovalRisk;
  expiresAt: number;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  decisionAt?: number;
}

export interface Device {
  deviceId: string;
  deviceName?: string;
  platform: Platform;
  appVersion?: string;
  connected: boolean;
  paired: boolean;
  pairingCode?: string;
  pairingExpiresAt?: number;
  lastSeenAt: number;
  // Iteration 4: screen streaming state
  screenStreamState?: ScreenStreamState;
  // Iteration 5: remote control state
  controlState?: ControlState;
  socket?: unknown;
}

export interface Run {
  runId: string;
  deviceId: string;
  goal: string;
  status: RunStatus;
  createdAt: number;
  updatedAt: number;
  reason?: string; // failure/cancellation reason
  messages?: Array<{
    role: 'user' | 'agent';
    text: string;
    createdAt: number;
  }>;
}

export interface RunWithSteps extends Run {
  steps: RunStep[];
  pendingApproval?: ApprovalRequest;
}

// ============================================================================
// Base Message Schema
// ============================================================================

export const baseMessageSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.string(),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.unknown(),
});

export type BaseMessage = z.infer<typeof baseMessageSchema>;

// ============================================================================
// Device -> Server Messages
// ============================================================================

export const deviceHelloSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('device.hello'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.object({
    deviceId: z.string(),
    deviceName: z.string().optional(),
    platform: z.enum(['macos', 'windows', 'linux', 'unknown']),
    appVersion: z.string().optional(),
  }),
});

export const devicePairingRequestCodeSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('device.pairing.request_code'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.object({
    deviceId: z.string(),
  }),
});

export const devicePairingConfirmedSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('device.pairing.confirmed'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.object({
    deviceId: z.string(),
    pairingCode: z.string(),
  }),
});

export const deviceChatSendSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('device.chat.send'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.object({
    deviceId: z.string(),
    runId: z.string().optional(),
    message: z.object({
      role: z.enum(['user', 'agent']),
      text: z.string(),
      createdAt: z.number(),
    }),
  }),
});

export const deviceRunUpdateSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('device.run.update'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.object({
    deviceId: z.string(),
    runId: z.string(),
    status: z.enum(['queued', 'running', 'waiting_for_user', 'done', 'failed', 'canceled']),
    note: z.string().optional(),
  }),
});

export const devicePingSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('device.ping'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.object({
    deviceId: z.string(),
  }),
});

export const deviceRunAcceptSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('device.run.accept'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.object({
    deviceId: z.string(),
    runId: z.string(),
  }),
});

export const deviceApprovalDecisionSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('device.approval.decision'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.object({
    deviceId: z.string(),
    runId: z.string(),
    approvalId: z.string(),
    decision: z.enum(['approved', 'denied']),
    comment: z.string().optional(),
  }),
});

export const deviceRunCancelSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('device.run.cancel'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.object({
    deviceId: z.string(),
    runId: z.string(),
  }),
});

// NEW: Iteration 4 screen streaming messages
export const deviceScreenStreamStateSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('device.screen.stream_state'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.object({
    deviceId: z.string(),
    state: z.object({
      enabled: z.boolean(),
      fps: z.union([z.literal(1), z.literal(2)]),
      displayId: z.string().optional(),
    }),
  }),
});

export const deviceScreenFrameSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('device.screen.frame'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.object({
    deviceId: z.string(),
    meta: z.object({
      frameId: z.string(),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      mime: z.literal('image/png'),
      at: z.number(),
      byteLength: z.number().int().positive(),
    }),
    dataBase64: z.string().max(2_000_000), // ~1.5MB base64 max
  }),
});

// Iteration 5: Remote control schemas
export const deviceControlStateSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('device.control.state'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.object({
    deviceId: z.string(),
    state: z.object({
      enabled: z.boolean(),
      requestedBy: z.enum(['local_user', 'web']).optional(),
      updatedAt: z.number(),
    }),
  }),
});

export const deviceActionAckSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('device.action.ack'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.object({
    deviceId: z.string(),
    actionId: z.string(),
    status: z.enum(['awaiting_user', 'approved', 'denied']),
  }),
});

export const deviceActionResultSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('device.action.result'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.object({
    deviceId: z.string(),
    actionId: z.string(),
    ok: z.boolean(),
    error: z.object({
      code: z.string(),
      message: z.string(),
    }).optional(),
  }),
});

export const deviceMessageSchema = z.union([
  deviceHelloSchema,
  devicePairingRequestCodeSchema,
  devicePairingConfirmedSchema,
  deviceChatSendSchema,
  deviceRunUpdateSchema,
  devicePingSchema,
  deviceRunAcceptSchema,
  deviceApprovalDecisionSchema,
  deviceRunCancelSchema,
  deviceScreenStreamStateSchema,
  deviceScreenFrameSchema,
  deviceControlStateSchema,
  deviceActionAckSchema,
  deviceActionResultSchema,
]);

export type DeviceHello = z.infer<typeof deviceHelloSchema>;
export type DevicePairingRequestCode = z.infer<typeof devicePairingRequestCodeSchema>;
export type DevicePairingConfirmed = z.infer<typeof devicePairingConfirmedSchema>;
export type DeviceChatSend = z.infer<typeof deviceChatSendSchema>;
export type DeviceRunUpdate = z.infer<typeof deviceRunUpdateSchema>;
export type DevicePing = z.infer<typeof devicePingSchema>;
export type DeviceRunAccept = z.infer<typeof deviceRunAcceptSchema>;
export type DeviceApprovalDecision = z.infer<typeof deviceApprovalDecisionSchema>;
export type DeviceRunCancel = z.infer<typeof deviceRunCancelSchema>;
export type DeviceScreenStreamState = z.infer<typeof deviceScreenStreamStateSchema>;
export type DeviceScreenFrame = z.infer<typeof deviceScreenFrameSchema>;
export type DeviceControlState = z.infer<typeof deviceControlStateSchema>;
export type DeviceActionAck = z.infer<typeof deviceActionAckSchema>;
export type DeviceActionResult = z.infer<typeof deviceActionResultSchema>;
export type DeviceMessage = z.infer<typeof deviceMessageSchema>;

// ============================================================================
// Server -> Device Messages
// ============================================================================

export const serverHelloAckSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('server.hello_ack'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.object({
    serverTime: z.number(),
  }),
});

export const serverPairingCodeSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('server.pairing.code'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.object({
    deviceId: z.string(),
    pairingCode: z.string(),
    expiresAt: z.number(),
  }),
});

export const serverChatMessageSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('server.chat.message'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.object({
    deviceId: z.string(),
    runId: z.string().optional(),
    message: z.object({
      role: z.enum(['user', 'agent']),
      text: z.string(),
      createdAt: z.number(),
    }),
  }),
});

export const serverRunStartSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('server.run.start'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.object({
    deviceId: z.string(),
    runId: z.string(),
    goal: z.string(),
  }),
});

export const serverRunStatusSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('server.run.status'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.object({
    deviceId: z.string(),
    runId: z.string(),
    status: z.enum(['queued', 'running', 'waiting_for_user', 'done', 'failed', 'canceled']),
  }),
});

export const serverErrorSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('server.error'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.object({
    code: z.enum([
      'INVALID_MESSAGE',
      'PROTOCOL_VERSION_MISMATCH',
      'MISSING_HELLO',
      'DEVICE_NOT_FOUND',
      'PAIRING_INVALID_CODE',
      'PAIRING_EXPIRED',
      'RUN_NOT_FOUND',
      'APPROVAL_NOT_FOUND',
      'SCREEN_STREAM_DISABLED',
      'SCREEN_FRAME_TOO_LARGE',
      'SCREEN_RATE_LIMITED',
      'INTERNAL_ERROR',
    ]),
    message: z.string(),
  }),
});

export const serverPongSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('server.pong'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.object({
    deviceId: z.string(),
  }),
});

// Iteration 3 messages
export const serverRunDetailsSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('server.run.details'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.object({
    deviceId: z.string(),
    run: z.object({
      runId: z.string(),
      deviceId: z.string(),
      goal: z.string(),
      status: z.enum(['queued', 'running', 'waiting_for_user', 'done', 'failed', 'canceled']),
      createdAt: z.number(),
      updatedAt: z.number(),
      reason: z.string().optional(),
      steps: z.array(z.object({
        stepId: z.string(),
        title: z.string(),
        status: z.enum(['pending', 'running', 'done', 'failed', 'blocked']),
        startedAt: z.number().optional(),
        endedAt: z.number().optional(),
        logs: z.array(z.object({
          line: z.string(),
          level: z.enum(['info', 'warn', 'error']),
          at: z.number(),
        })),
      })),
      pendingApproval: z.object({
        approvalId: z.string(),
        runId: z.string(),
        title: z.string(),
        description: z.string(),
        risk: z.enum(['low', 'medium', 'high']),
        expiresAt: z.number(),
        status: z.enum(['pending', 'approved', 'denied', 'expired']),
        decisionAt: z.number().optional(),
      }).optional(),
    }),
  }),
});

export const serverRunStepUpdateSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('server.run.step_update'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.object({
    deviceId: z.string(),
    runId: z.string(),
    step: z.object({
      stepId: z.string(),
      title: z.string(),
      status: z.enum(['pending', 'running', 'done', 'failed', 'blocked']),
      startedAt: z.number().optional(),
      endedAt: z.number().optional(),
      logs: z.array(z.object({
        line: z.string(),
        level: z.enum(['info', 'warn', 'error']),
        at: z.number(),
      })),
    }),
  }),
});

export const serverRunLogSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('server.run.log'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.object({
    deviceId: z.string(),
    runId: z.string(),
    stepId: z.string().optional(),
    line: z.string(),
    level: z.enum(['info', 'warn', 'error']),
    at: z.number(),
  }),
});

export const serverApprovalRequestSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('server.approval.request'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.object({
    deviceId: z.string(),
    runId: z.string(),
    approval: z.object({
      approvalId: z.string(),
      runId: z.string(),
      title: z.string(),
      description: z.string(),
      risk: z.enum(['low', 'medium', 'high']),
      expiresAt: z.number(),
      status: z.enum(['pending', 'approved', 'denied', 'expired']),
      decisionAt: z.number().optional(),
    }),
  }),
});

export const serverRunCanceledSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('server.run.canceled'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.object({
    deviceId: z.string(),
    runId: z.string(),
  }),
});

// NEW: Iteration 4 screen messages
export const serverScreenAckSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('server.screen.ack'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.union([
    z.object({
      deviceId: z.string(),
      ok: z.literal(true),
    }),
    z.object({
      deviceId: z.string(),
      ok: z.literal(false),
      error: z.object({
        code: z.enum(['DEVICE_NOT_FOUND', 'SCREEN_STREAM_DISABLED', 'SCREEN_FRAME_TOO_LARGE', 'SCREEN_RATE_LIMITED', 'INTERNAL_ERROR']),
        message: z.string(),
      }),
    }),
  ]),
});

// Iteration 5: InputAction schema for validation
const clickActionSchema = z.object({
  kind: z.literal('click'),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  button: z.enum(['left', 'right', 'middle']),
});

const doubleClickActionSchema = z.object({
  kind: z.literal('double_click'),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  button: z.enum(['left', 'right', 'middle']),
});

const scrollActionSchema = z.object({
  kind: z.literal('scroll'),
  dx: z.number().int().min(-2000).max(2000),
  dy: z.number().int().min(-2000).max(2000),
});

const typeActionSchema = z.object({
  kind: z.literal('type'),
  text: z.string().max(500),
});

const hotkeyActionSchema = z.object({
  kind: z.literal('hotkey'),
  key: z.enum(['enter', 'tab', 'escape', 'backspace', 'up', 'down', 'left', 'right']),
  modifiers: z.array(z.enum(['shift', 'ctrl', 'alt', 'meta'])).optional(),
});

export const inputActionSchema = z.union([
  clickActionSchema,
  doubleClickActionSchema,
  scrollActionSchema,
  typeActionSchema,
  hotkeyActionSchema,
]);

// Iteration 5: server.action.request schema
export const serverActionRequestSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('server.action.request'),
  requestId: z.string().optional(),
  ts: z.number(),
  payload: z.object({
    deviceId: z.string(),
    actionId: z.string(),
    action: inputActionSchema,
    requestedAt: z.number(),
  }),
});

export const serverMessageSchema = z.union([
  serverHelloAckSchema,
  serverPairingCodeSchema,
  serverChatMessageSchema,
  serverRunStartSchema,
  serverRunStatusSchema,
  serverErrorSchema,
  serverPongSchema,
  serverRunDetailsSchema,
  serverRunStepUpdateSchema,
  serverRunLogSchema,
  serverApprovalRequestSchema,
  serverRunCanceledSchema,
  serverScreenAckSchema,
  serverActionRequestSchema,
]);

export type ServerHelloAck = z.infer<typeof serverHelloAckSchema>;
export type ServerPairingCode = z.infer<typeof serverPairingCodeSchema>;
export type ServerChatMessage = z.infer<typeof serverChatMessageSchema>;
export type ServerRunStart = z.infer<typeof serverRunStartSchema>;
export type ServerRunStatus = z.infer<typeof serverRunStatusSchema>;
export type ServerError = z.infer<typeof serverErrorSchema>;
export type ServerPong = z.infer<typeof serverPongSchema>;
export type ServerRunDetails = z.infer<typeof serverRunDetailsSchema>;
export type ServerRunStepUpdate = z.infer<typeof serverRunStepUpdateSchema>;
export type ServerRunLog = z.infer<typeof serverRunLogSchema>;
export type ServerApprovalRequest = z.infer<typeof serverApprovalRequestSchema>;
export type ServerRunCanceled = z.infer<typeof serverRunCanceledSchema>;
export type ServerScreenAck = z.infer<typeof serverScreenAckSchema>;
export type ServerActionRequest = z.infer<typeof serverActionRequestSchema>;
export type ServerMessage = z.infer<typeof serverMessageSchema>;

// ============================================================================
// Runtime Validation
// ============================================================================

export function parseDeviceMessage(raw: unknown): { success: true; data: DeviceMessage } | { success: false; error: string } {
  const result = deviceMessageSchema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.message };
}

export function parseServerMessage(raw: unknown): { success: true; data: ServerMessage } | { success: false; error: string } {
  const result = serverMessageSchema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.message };
}

export function createServerMessage<T extends ServerMessage['type']>(
  type: T,
  payload: Extract<ServerMessage, { type: T }>['payload'],
  requestId?: string
): Extract<ServerMessage, { type: T }> {
  return {
    v: PROTOCOL_VERSION,
    type,
    requestId,
    ts: Date.now(),
    payload,
  } as Extract<ServerMessage, { type: T }>;
}

export function createDeviceMessage<T extends DeviceMessage['type']>(
  type: T,
  payload: Extract<DeviceMessage, { type: T }>['payload'],
  requestId?: string
): Extract<DeviceMessage, { type: T }> {
  return {
    v: PROTOCOL_VERSION,
    type,
    requestId,
    ts: Date.now(),
    payload,
  } as Extract<DeviceMessage, { type: T }>;
}

// ============================================================================
// Helper Functions
// ============================================================================

export function createScreenFrameMeta(
  width: number,
  height: number,
  byteLength: number
): ScreenFrameMeta {
  return {
    frameId: crypto.randomUUID(),
    width,
    height,
    mime: 'image/png',
    at: Date.now(),
    byteLength,
  };
}

// ============================================================================
// Helper Types for Events
// ============================================================================

export type ServerEventType = 
  | { type: 'device_update'; device: Device }
  | { type: 'run_update'; run: RunWithSteps }
  | { type: 'step_update'; runId: string; step: RunStep }
  | { type: 'log_line'; runId: string; stepId?: string; log: LogLine }
  | { type: 'screen_update'; deviceId: string; meta: ScreenFrameMeta }
  | { type: 'action_update'; action: DeviceAction };
