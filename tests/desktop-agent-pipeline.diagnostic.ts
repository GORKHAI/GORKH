/**
 * Agent Action Pipeline Diagnostic
 *
 * Validates the legacy AiAssistController observe→propose→approve→execute→re-observe
 * loop without real OS input by mocking the Tauri invoke bridge.
 *
 * Run: node --import tsx --test tests/desktop-agent-pipeline.diagnostic.ts
 *
 * This diagnostic will FAIL if:
 * - The loop never reaches awaiting_approval after the first proposal
 * - approveAction() does not trigger input_click execution
 * - The loop does not capture a second screenshot (re-observation)
 * - The loop halts after a single proposal when it should continue
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

const ipcCalls: IpcCall[] = [];

(globalThis as any).window = {
  __TAURI_INTERNALS__: {
    invoke: async (cmd: string, args?: unknown) => {
      ipcCalls.push({ cmd, args });

      if (cmd === 'has_llm_api_key') {
        return true;
      }

      if (cmd === 'capture_display_png') {
        return {
          png_base64: 'fake-screenshot-base64==',
          width: 1280,
          height: 720,
        };
      }

      if (cmd === 'llm_propose_next_action') {
        const proposalCount = ipcCalls.filter((c) => c.cmd === 'llm_propose_next_action').length;

        if (proposalCount === 1) {
          // First proposal: click the blue button
          return {
            proposal: {
              kind: 'propose_action',
              action: {
                kind: 'click',
                x: 0.5,
                y: 0.5,
                button: 'left',
              },
              rationale: 'The blue button is in the center of the screen',
              confidence: 0.9,
            },
          };
        }

        // Second proposal: task is done
        return {
          proposal: {
            kind: 'done',
            summary: 'Successfully clicked the blue button.',
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
// Import controller AFTER mocking the Tauri bridge
// ---------------------------------------------------------------------------

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

function waitForStatus(
  controller: any,
  targetStatus: string,
  timeoutMs = 5000
): Promise<void> {
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
// Diagnostic tests
// ---------------------------------------------------------------------------

test('agent pipeline: observe → propose → approve → execute → re-observe', async () => {
  ipcCalls.length = 0;

  const stateHistory: string[] = [];
  let doneResolver: (() => void) | undefined;
  const donePromise = new Promise<void>((resolve) => {
    doneResolver = resolve;
  });

  const controller = new AiAssistController({
    wsClient: createMockWsClient() as any,
    deviceId: 'diag-dev',
    runId: 'diag-run',
    goal: 'click the blue button',
    displayId: 'display-0',
    constraints: { maxActions: 5, maxRuntimeMinutes: 10 },
    onStateChange: (s: any) => {
      stateHistory.push(s.status);
      if (s.status === 'done' && doneResolver) {
        doneResolver();
        doneResolver = undefined;
      }
    },
  });

  // Start the agent loop
  const started = await controller.start({ provider: 'openai', model: 'gpt-4o' } as any);
  assert.equal(started, true, 'controller.start() should return true when provider is configured');

  // Wait for first awaiting_approval
  await waitForStatus(controller, 'awaiting_approval');

  // ── 1. OBSERVE ──
  const captureCalls = ipcCalls.filter((c) => c.cmd === 'capture_display_png');
  assert.equal(captureCalls.length, 1, 'Expected initial screenshot capture');

  // ── 2. PROPOSE ──
  assert.equal(controller.getState().status, 'awaiting_approval');
  assert.equal(
    controller.getState().currentProposal?.kind,
    'propose_action',
    'First proposal should be an action'
  );
  assert.equal(
    (controller.getState().currentProposal as any).action?.kind,
    'click',
    'Proposed action should be click'
  );

  // ── 3. APPROVE ──
  await controller.approveAction();

  // ── 4. EXECUTE ──
  const clickCalls = ipcCalls.filter((c) => c.cmd === 'input_click');
  assert.equal(clickCalls.length, 1, 'Expected input_click to be executed after approval');
  const clickArgs = clickCalls[0].args as any;
  assert.equal(clickArgs.xNorm, 0.5, 'click xNorm should be 0.5');
  assert.equal(clickArgs.yNorm, 0.5, 'click yNorm should be 0.5');
  assert.equal(clickArgs.button, 'left', 'click button should be left');

  // ── 5. Wait for loop to finish ──
  await donePromise;

  // ── 6. RE-OBSERVE ──
  // With verification, we expect 3 captures:
  // 1. initial (before first proposal)
  // 2. after execution (verification)
  // 3. before second proposal (re-observe)
  const captureCallsAfter = ipcCalls.filter((c) => c.cmd === 'capture_display_png');
  assert.equal(
    captureCallsAfter.length,
    3,
    'Expected THREE screenshot captures (initial + verification after execution + re-observation). ' +
      'If fewer, the loop halted or skipped verification.'
  );

  // ── 7. Verify dimensions passed to Rust ──
  const proposalCalls = ipcCalls.filter((c) => c.cmd === 'llm_propose_next_action');
  assert.equal(proposalCalls.length, 2, 'Expected two LLM proposals');
  const firstProposalArgs = proposalCalls[0].args as any;
  assert.equal(firstProposalArgs.params.screenshotWidth, 1280, 'screenshotWidth should be passed');
  assert.equal(firstProposalArgs.params.screenshotHeight, 720, 'screenshotHeight should be passed');
  assert.equal(firstProposalArgs.params.displayId, 'display-0', 'displayId should be passed');

  // ── 8. Final state ──
  assert.equal(controller.getState().status, 'done');

  // Log the state sequence for forensic analysis
  console.log('State sequence:', stateHistory.join(' → '));
});

test('agent pipeline should fail diagnostic if loop stops after single proposal (maxActions=1)', async () => {
  // With maxActions=1, after the first approval the controller converts to ask_user.
  // Verification still captures an after-execution screenshot, so total = 2 captures.
  ipcCalls.length = 0;

  const stateHistory: string[] = [];
  let askUserResolver: (() => void) | undefined;
  const askUserPromise = new Promise<void>((resolve) => {
    askUserResolver = resolve;
  });

  const controller = new AiAssistController({
    wsClient: createMockWsClient() as any,
    deviceId: 'diag-dev',
    runId: 'diag-run-2',
    goal: 'click the blue button',
    displayId: 'display-0',
    constraints: { maxActions: 1, maxRuntimeMinutes: 10 },
    onStateChange: (s: any) => {
      stateHistory.push(s.status);
      if (s.status === 'asking_user' && askUserResolver) {
        askUserResolver();
        askUserResolver = undefined;
      }
    },
  });

  await controller.start({ provider: 'openai', model: 'gpt-4o' } as any);
  await waitForStatus(controller, 'awaiting_approval');

  // Approve the single allowed action
  await controller.approveAction();

  // With maxActions:1, the controller asks the user instead of re-observing
  await askUserPromise;
  assert.equal(controller.getState().status, 'asking_user');

  // Two captures: initial + verification (no re-observe because loop stops)
  const captureCalls = ipcCalls.filter((c) => c.cmd === 'capture_display_png');
  assert.equal(captureCalls.length, 2);

  console.log('Constraint state sequence:', stateHistory.join(' → '));
});
