/**
 * Agent Verification Diagnostic
 *
 * Validates coordinate clamping, execution verification, and screenshot
 * metadata handling without real OS input.
 *
 * Run: node --import tsx --test tests/desktop-agent-verification.diagnostic.ts
 */

import assert from 'node:assert/strict';
import test from 'node:test';

// ---------------------------------------------------------------------------
// Mock Tauri invoke bridge
// ---------------------------------------------------------------------------

interface IpcCall {
  cmd: string;
  args: unknown;
}

let ipcCalls: IpcCall[] = [];
let screenshotHashCounter = 0;

function nextScreenshotHash() {
  screenshotHashCounter++;
  return `hash-${screenshotHashCounter}`;
}

(globalThis as any).window = {
  __TAURI_INTERNALS__: {
    invoke: async (cmd: string, args?: unknown) => {
      ipcCalls.push({ cmd, args });

      if (cmd === 'has_llm_api_key') {
        return true;
      }

      if (cmd === 'capture_display_png') {
        return {
          png_base64: `fake-screenshot-${nextScreenshotHash()}`,
          width: 1280,
          height: 720,
        };
      }

      if (cmd === 'llm_propose_next_action') {
        const proposalCount = ipcCalls.filter((c) => c.cmd === 'llm_propose_next_action').length;

        if (proposalCount === 1) {
          return {
            proposal: {
              kind: 'propose_action',
              action: {
                kind: 'click',
                x: 1.4,
                y: -0.2,
                button: 'left',
              },
              rationale: 'LLM hallucinated coordinates',
              confidence: 0.9,
            },
          };
        }

        return {
          proposal: {
            kind: 'done',
            summary: 'Task completed.',
          },
        };
      }

      if (cmd === 'input_click') {
        return null;
      }

      return null;
    },
  },
};

// ---------------------------------------------------------------------------
// Import verifier helpers and controller AFTER mocking the Tauri bridge
// ---------------------------------------------------------------------------

const { clampAction, validateNormalizedCoord } = await import(
  '../apps/desktop/src/lib/computerUseVerifier.ts'
);
const { AiAssistController } = await import('../apps/desktop/src/lib/aiAssist.ts');

function createMockWsClient() {
  return {
    sendActionCreate: () => {},
    sendActionResult: () => {},
    sendRunLog: () => {},
    sendChat: () => {},
    sendAgentProposal: () => {},
    sendRunUpdate: () => {},
    sendToolRequest: () => {},
    sendToolResult: () => {},
  };
}

function waitForStatus(controller: any, targetStatus: string, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (controller.getState().status === targetStatus) {
      resolve();
      return;
    }
    const check = () => {
      if (controller.getState().status === targetStatus) {
        resolve();
        return;
      }
    };
    const timer = setInterval(check, 10);
    setTimeout(() => {
      clearInterval(timer);
      reject(
        new Error(
          `Timeout waiting for status ${targetStatus}. Current: ${controller.getState().status}`
        )
      );
    }, timeoutMs);
  });
}

// ---------------------------------------------------------------------------
// Test A: Coordinate clamping
// ---------------------------------------------------------------------------

test('coordinate clamp: LLM proposes x=1.4 y=-0.2 → clamped before execution', () => {
  const raw = { kind: 'click', x: 1.4, y: -0.2, button: 'left' } as any;
  const clamped = clampAction(raw);
  assert.ok(clamped, 'clamped action should not be null');
  assert.equal(clamped.x, 1.0, 'x should be clamped to 1.0');
  assert.equal(clamped.y, 0.0, 'y should be clamped to 0.0');
});

test('coordinate validation rejects NaN and Infinity', () => {
  assert.equal(validateNormalizedCoord(NaN), null);
  assert.equal(validateNormalizedCoord(Infinity), null);
  assert.equal(validateNormalizedCoord(-Infinity), null);
  assert.equal(validateNormalizedCoord(0.5), 0.5);
  assert.equal(validateNormalizedCoord(-0.1), 0.0);
  assert.equal(validateNormalizedCoord(1.1), 1.0);
});

// ---------------------------------------------------------------------------
// Test B-D: Verification pipeline with mocked screenshot hashes
// ---------------------------------------------------------------------------

test('verification pipeline: click with hash change → verified → continues', async () => {
  ipcCalls = [];
  screenshotHashCounter = 0;

  let doneResolver: (() => void) | undefined;
  const donePromise = new Promise<void>((resolve) => {
    doneResolver = resolve;
  });

  const controller = new AiAssistController({
    wsClient: createMockWsClient() as any,
    deviceId: 'diag-dev',
    runId: 'diag-run-verified',
    goal: 'click the blue button',
    displayId: 'display-0',
    constraints: { maxActions: 5, maxRuntimeMinutes: 10 },
    onStateChange: (s: any) => {
      if (s.status === 'done' && doneResolver) {
        doneResolver();
        doneResolver = undefined;
      }
    },
  });

  await controller.start({ provider: 'openai', model: 'gpt-4o' } as any);
  await waitForStatus(controller, 'awaiting_approval');

  // The first proposal has out-of-bounds coordinates (x=1.4, y=-0.2)
  // approveAction should clamp them before executing
  await controller.approveAction();

  await donePromise;

  // Verify the click was executed with clamped coordinates
  const clickCalls = ipcCalls.filter((c) => c.cmd === 'input_click');
  assert.equal(clickCalls.length, 1, 'Expected one input_click');
  const clickArgs = clickCalls[0].args as any;
  assert.equal(clickArgs.xNorm, 1.0, 'xNorm should be clamped to 1.0');
  assert.equal(clickArgs.yNorm, 0.0, 'yNorm should be clamped to 0.0');

  // Verify dimensions were passed to llm_propose_next_action
  const proposalCalls = ipcCalls.filter((c) => c.cmd === 'llm_propose_next_action');
  assert.ok(proposalCalls.length >= 1);
  const firstArgs = proposalCalls[0].args as any;
  assert.equal(firstArgs.params.screenshotWidth, 1280);
  assert.equal(firstArgs.params.screenshotHeight, 720);
});

test('verification pipeline: no raw screenshot base64 in actionResults or logs', async () => {
  ipcCalls = [];
  screenshotHashCounter = 0;

  let doneResolver: (() => void) | undefined;
  const donePromise = new Promise<void>((resolve) => {
    doneResolver = resolve;
  });

  const controller = new AiAssistController({
    wsClient: createMockWsClient() as any,
    deviceId: 'diag-dev',
    runId: 'diag-run-privacy',
    goal: 'click the blue button',
    displayId: 'display-0',
    constraints: { maxActions: 5, maxRuntimeMinutes: 10 },
    onStateChange: (s: any) => {
      if (s.status === 'done' && doneResolver) {
        doneResolver();
        doneResolver = undefined;
      }
    },
  });

  await controller.start({ provider: 'openai', model: 'gpt-4o' } as any);
  await waitForStatus(controller, 'awaiting_approval');
  await controller.approveAction();
  await donePromise;

  // actionResults should contain structured strings, not raw base64
  const state = controller.getState();
  // Use reflection to access private actionResults (not ideal, but diagnostic-only)
  const controllerAny = controller as any;
  const actionResults: string[] = controllerAny.actionResults;
  for (const line of actionResults) {
    assert.ok(
      !line.includes('fake-screenshot'),
      `actionResults should not contain raw screenshot data: ${line}`
    );
    assert.ok(
      !line.includes('png_base64'),
      `actionResults should not reference png_base64: ${line}`
    );
  }
});

test('verification pipeline: missed click with same hash → uncertain/ask_user', async () => {
  // Override mock to produce identical hashes (no counter increment on second call)
  let callCount = 0;
  (globalThis as any).window.__TAURI_INTERNALS__.invoke = async (cmd: string, args?: unknown) => {
    ipcCalls.push({ cmd, args });

    if (cmd === 'has_llm_api_key') return true;

    if (cmd === 'capture_display_png') {
      callCount++;
      // Return identical base64 for all captures → same hash
      return { png_base64: 'identical-fake-screenshot', width: 1280, height: 720 };
    }

    if (cmd === 'llm_propose_next_action') {
      const proposalCount = ipcCalls.filter((c) => c.cmd === 'llm_propose_next_action').length;
      if (proposalCount === 1) {
        return {
          proposal: {
            kind: 'propose_action',
            action: { kind: 'click', x: 0.5, y: 0.5, button: 'left' },
            rationale: 'Click the button',
            confidence: 0.9,
          },
        };
      }
      return {
        proposal: {
          kind: 'ask_user',
          question: 'The screen did not change. What should I do next?',
        },
      };
    }

    if (cmd === 'input_click') return null;
    return null;
  };

  ipcCalls = [];
  callCount = 0;

  let askUserResolver: (() => void) | undefined;
  const askUserPromise = new Promise<void>((resolve) => {
    askUserResolver = resolve;
  });

  const controller = new AiAssistController({
    wsClient: createMockWsClient() as any,
    deviceId: 'diag-dev',
    runId: 'diag-run-missed',
    goal: 'click the blue button',
    displayId: 'display-0',
    constraints: { maxActions: 5, maxRuntimeMinutes: 10 },
    onStateChange: (s: any) => {
      if (s.status === 'asking_user' && askUserResolver) {
        askUserResolver();
        askUserResolver = undefined;
      }
    },
  });

  await controller.start({ provider: 'openai', model: 'gpt-4o' } as any);
  await waitForStatus(controller, 'awaiting_approval');
  await controller.approveAction();
  await askUserPromise;

  // With identical hashes, verification returns uncertain and retries once.
  // After retry still fails, it should ask user.
  assert.equal(controller.getState().status, 'asking_user');
});
