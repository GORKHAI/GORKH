import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const stationRoot = 'apps/desktop/src/features/solana-workstation/agent/station';
const workbenchPath = 'apps/desktop/src/features/solana-workstation/agent/components/AgentWorkbench.tsx';

function listFiles(root) {
  if (!existsSync(root)) return [];
  const out = [];
  for (const entry of readdirSync(root)) {
    const full = join(root, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...listFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

test('agent station directory exists with expected files', () => {
  for (const expected of [
    'index.ts',
    'agentStationStorage.ts',
    'agentRuntime.ts',
    'agentPolicyEngine.ts',
    'agentToolRegistry.ts',
    'agentTaskPlanner.ts',
    'agentApprovalQueue.ts',
    'agentMemory.ts',
    'agentAudit.ts',
    'agentRoadmapTemplates.ts',
    'createAgentContextSummary.ts',
    'createDefaultGorkhAgent.ts',
    'createDefaultAgentPolicy.ts',
    'components/GorkhAgentStationPanel.tsx',
  ]) {
    assert.ok(existsSync(join(stationRoot, expected)), `missing ${expected}`);
  }
});

test('AgentWorkbench mounts GorkhAgentStationPanel as the primary tab', () => {
  const source = readFileSync(workbenchPath, 'utf8');
  assert.match(source, /GorkhAgentStationPanel/);
  assert.match(source, /id:\s*'station'/);
  assert.match(source, /label:\s*'GORKH Agent'/);
  // Default active tab should be 'station'
  assert.match(source, /useState<AgentTab>\(\s*'station'\s*\)/);
});

test('GORKH Agent Station panel exposes runtime controls and natural language input', () => {
  const panel = readFileSync(
    join(stationRoot, 'components/GorkhAgentStationPanel.tsx'),
    'utf8'
  );
  assert.match(panel, /Start Agent/);
  assert.match(panel, /Pause/);
  assert.match(panel, /Resume/);
  assert.match(panel, /Kill Switch/);
  assert.match(panel, /Manual Run/);
  assert.match(panel, /gorkh-agent-intent-input/);
  assert.match(panel, /Approval queue/);
  assert.match(panel, /Audit timeline/);
  assert.match(panel, /Agent templates/);
  assert.match(panel, /Coming Soon/);
  assert.match(panel, /Blocked/);
});

test('Station UI does not claim Telegram/WhatsApp/Discord control surfaces', () => {
  const allSources = listFiles(stationRoot)
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
  assert.doesNotMatch(allSources, /telegram/i);
  assert.doesNotMatch(allSources, /whatsapp/i);
  assert.doesNotMatch(allSources, /discord bot/i);
});

test('Station does not claim to run after the desktop app quits', () => {
  const allSources = listFiles(stationRoot)
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
  // Must not assert always-on or daemon behavior
  assert.doesNotMatch(allSources, /always[-\s]?on\s+daemon/i);
  assert.doesNotMatch(allSources, /runs\s+after\s+the\s+app\s+is\s+(fully\s+)?quit/i);
  // Should surface the imported background-copy constant in the panel
  assert.match(allSources, /GORKH_AGENT_BACKGROUND_COPY/);
});

test('Station does not import Cloak note secrets or viewing keys (excluding redaction definitions)', () => {
  // Storage and memory modules intentionally list forbidden tokens for redaction detection;
  // checking those for substring presence is meaningless. We assert no actual property
  // assignments / imports introduce the secret material instead.
  const allSources = listFiles(stationRoot)
    .filter((f) => !/agentStationStorage\.ts$|agentMemory\.ts$/.test(f))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
  assert.doesNotMatch(allSources, /cloakNoteSecret\s*[:=]/);
  assert.doesNotMatch(allSources, /viewingKey\s*[:=]/);
  assert.doesNotMatch(allSources, /privateKey\s*[:=]\s*['"]/);
  assert.doesNotMatch(allSources, /seedPhrase\s*[:=]/);
  // No imports from cloak internals
  assert.doesNotMatch(allSources, /from\s+['"][^'"]*cloak\/cloakClient[^'"]*['"]/);
});

test('Station does not introduce arbitrary shell or terminal execution', () => {
  const allSources = listFiles(stationRoot)
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
  assert.doesNotMatch(allSources, /child_process/);
  assert.doesNotMatch(allSources, /\bspawn\s*\(/);
  assert.doesNotMatch(allSources, /\bexecSync\s*\(/);
});

test('Station does not bypass Zerion approval gate', () => {
  const allSources = listFiles(stationRoot)
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
  assert.doesNotMatch(allSources, /zerion[._]execute_without_approval\s*\(/);
  // Must explicitly route to the Zerion Executor approval flow
  assert.match(allSources, /Zerion Executor/);
});

test('Station preserves Cloak module ownership in Wallet', () => {
  const allSources = listFiles(stationRoot)
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
  assert.match(allSources, /Wallet\s*[→>-]\s*Cloak/i);
});

test('Storage key is namespaced and v1', () => {
  const storage = readFileSync(join(stationRoot, 'agentStationStorage.ts'), 'utf8');
  assert.match(storage, /gorkh\.solana\.agentStation\.v1/);
});
