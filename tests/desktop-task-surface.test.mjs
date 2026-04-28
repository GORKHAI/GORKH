import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appPath = 'apps/desktop/src/App.tsx';
const helperPath = 'apps/desktop/src/lib/desktopTasks.ts';
const accountHelperPath = 'apps/desktop/src/lib/desktopAccount.ts';
const screenPanelPath = 'apps/desktop/src/components/ScreenPanel.tsx';
const assistantEnginePath = 'apps/desktop/src/lib/assistantEngine.ts';
const advancedAgentPath = 'apps/desktop/src/lib/advancedAgent.ts';
const actionExecutorPath = 'apps/desktop/src/lib/actionExecutor.ts';

test('desktop primary surface exposes an assistant-first shell instead of a run-first task composer', () => {
  const source = readFileSync(appPath, 'utf8');

  assert.match(source, /GORKH AI|Free tier/i, 'desktop retail shell should make the GORKH Free tier visible');
  assert.match(source, /Settings & details|Debug view|Diagnostics/i, 'desktop should demote technical run details to a secondary view');
  assert.match(source, /ensureAssistantRunForMessage/, 'desktop chat entry should create or resume a hidden run');
  assert.doesNotMatch(source, /Create Task|Start Task|Manual launch/i, 'desktop retail surface should not lead with explicit task creation');
  assert.doesNotMatch(source, /Recent Tasks|Task history/i, 'desktop retail surface should not lead with run history language');
});


test('desktop task helper still uses desktop-authenticated bootstrap and run creation endpoints', () => {
  const source = readFileSync(helperPath, 'utf8');

  assert.match(source, /\/desktop\/me/, 'desktop should bootstrap the signed-in task surface from the desktop API');
  assert.match(source, /\/desktop\/runs/, 'desktop should create runs directly through the desktop API');
});

test('desktop retains desktop account and device session management helpers while retail UX is simplified', () => {
  const helperSource = readFileSync(accountHelperPath, 'utf8');

  assert.match(helperSource, /\/desktop\/account/, 'desktop should load desktop account/device state from the desktop API');
  assert.match(helperSource, /\/desktop\/devices\/\$\{deviceId\}\/revoke/, 'desktop should support remote desktop session revoke');
});

test('desktop overview can retry account and readiness loading after transient API failures', () => {
  const appSource = readFileSync(appPath, 'utf8');

  assert.match(
    appSource,
    /const \[desktopOverviewRefreshNonce, setDesktopOverviewRefreshNonce\] = useState\(0\);/,
    'desktop should track an explicit refresh nonce for overview API retries'
  );
  assert.match(
    appSource,
    /const handleRefreshDesktopOverview = useCallback\(\(\) => \{\s*setDesktopOverviewRefreshNonce\(\(current\) => current \+ 1\);\s*\}, \[\]\);/,
    'desktop should expose a dedicated overview refresh handler'
  );
  assert.match(
    appSource,
    /\[authState, runtimeConfig, sessionDeviceToken, status, desktopOverviewRefreshNonce\]/,
    'desktop readiness/account loaders should rerun when connectivity changes or the user retries'
  );
  assert.match(
    appSource,
    />\s*Retry now\s*</,
    'desktop overview errors should offer a direct retry action instead of staying stale'
  );
});

test('desktop routes the selected display through preview and assistant execution paths', () => {
  const appSource = readFileSync(appPath, 'utf8');
  const screenPanelSource = readFileSync(screenPanelPath, 'utf8');
  const assistantEngineSource = readFileSync(assistantEnginePath, 'utf8');
  const advancedAgentSource = readFileSync(advancedAgentPath, 'utf8');
  const actionExecutorSource = readFileSync(actionExecutorPath, 'utf8');

  assert.match(appSource, /const \[primaryDisplayId, setPrimaryDisplayId\] = useState<string>\('display-0'\)/);
  assert.match(appSource, /onDisplayChange=\{setPrimaryDisplayId\}/);
  assert.match(appSource, /displayId: primaryDisplayId/);
  assert.match(appSource, /executeAction\(payload\.action,\s*primaryDisplayId\)/);
  assert.match(screenPanelSource, /streamer\.start\(\{ displayId: selectedDisplay, fps \}\)/);
  assert.match(assistantEngineSource, /displayId:\s*options\.displayId/);
  assert.match(actionExecutorSource, /export async function executeAction\(action: InputAction,\s*displayId: string = 'display-0'\)/);
  assert.match(actionExecutorSource, /displayId,/);
  assert.match(advancedAgentSource, /displayId\?: string/);
  assert.match(advancedAgentSource, /displayId:\s*options\?\.displayId/);
});
