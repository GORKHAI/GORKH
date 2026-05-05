import assert from 'node:assert/strict';
import test from 'node:test';
import {
  WORKSTATION_NAV_ITEMS,
  getNavItemById,
  getModuleStatusLabel,
  getSafetyLevelLabel,
  getSafetyLevelColors,
} from '../apps/desktop/src/features/solana-workstation/layout/workstationNavigation.js';

// ---------------------------------------------------------------------------
// Navigation model
// ---------------------------------------------------------------------------

test('WORKSTATION_NAV_ITEMS includes all 6 modules', () => {
  const ids = WORKSTATION_NAV_ITEMS.map((i) => i.id);
  assert.ok(ids.includes('wallet'));
  assert.ok(ids.includes('markets'));
  assert.ok(ids.includes('agent'));
  assert.ok(ids.includes('builder'));
  assert.ok(ids.includes('shield'));
  assert.ok(ids.includes('context'));
  assert.equal(WORKSTATION_NAV_ITEMS.length, 6);
});

test('Wallet module is planner_only and draft_only', () => {
  const wallet = getNavItemById('wallet');
  assert.ok(wallet);
  assert.equal(wallet!.status, 'planner_only');
  assert.equal(wallet!.safetyLevel, 'draft_only');
  assert.equal(wallet!.label, 'Wallet');
});

test('Markets module is read_only and safe_read_only', () => {
  const markets = getNavItemById('markets');
  assert.ok(markets);
  assert.equal(markets!.status, 'read_only');
  assert.equal(markets!.safetyLevel, 'safe_read_only');
});

test('Shield module is read_only and safe_read_only', () => {
  const shield = getNavItemById('shield');
  assert.ok(shield);
  assert.equal(shield!.status, 'read_only');
  assert.equal(shield!.safetyLevel, 'safe_read_only');
});

test('Agent module is preview_only and local_only', () => {
  const agent = getNavItemById('agent');
  assert.ok(agent);
  assert.equal(agent!.status, 'preview_only');
  assert.equal(agent!.safetyLevel, 'local_only');
});

test('Builder module is live_local and local_only', () => {
  const builder = getNavItemById('builder');
  assert.ok(builder);
  assert.equal(builder!.status, 'live_local');
  assert.equal(builder!.safetyLevel, 'local_only');
});

test('Context module is live_local and local_only', () => {
  const context = getNavItemById('context');
  assert.ok(context);
  assert.equal(context!.status, 'live_local');
  assert.equal(context!.safetyLevel, 'local_only');
});

test('Navigation items have distinct icon colors', () => {
  const colors = new Set(WORKSTATION_NAV_ITEMS.map((i) => i.iconColor));
  assert.equal(colors.size, WORKSTATION_NAV_ITEMS.length);
});

test('Navigation items have badges', () => {
  for (const item of WORKSTATION_NAV_ITEMS) {
    assert.ok(item.badge, `${item.id} should have a badge`);
  }
});

test('getNavItemById returns undefined for unknown module', () => {
  // @ts-expect-error testing invalid id
  assert.equal(getNavItemById('not_a_module'), undefined);
});

test('getModuleStatusLabel returns human-readable labels', () => {
  assert.equal(getModuleStatusLabel('live_local'), 'Live Local');
  assert.equal(getModuleStatusLabel('read_only'), 'Read-Only');
  assert.equal(getModuleStatusLabel('planner_only'), 'Planner Only');
  assert.equal(getModuleStatusLabel('preview_only'), 'Preview Only');
  assert.equal(getModuleStatusLabel('blocked_execution'), 'Execution Disabled');
});

test('getSafetyLevelLabel returns human-readable labels', () => {
  assert.equal(getSafetyLevelLabel('safe_read_only'), 'Safe Read-Only');
  assert.equal(getSafetyLevelLabel('local_only'), 'Local Only');
  assert.equal(getSafetyLevelLabel('draft_only'), 'Draft Only');
  assert.equal(getSafetyLevelLabel('execution_disabled'), 'Execution Disabled');
});

test('getSafetyLevelColors returns color objects', () => {
  const colors = getSafetyLevelColors('safe_read_only');
  assert.ok(colors.bg);
  assert.ok(colors.text);
  assert.ok(colors.border);
});

// ---------------------------------------------------------------------------
// Safety: no forbidden references
// ---------------------------------------------------------------------------

test('No navigation item includes HumanRail', () => {
  const allText = WORKSTATION_NAV_ITEMS.map((i) => `${i.label} ${i.description}`).join(' ').toLowerCase();
  assert.ok(!allText.includes('humanrail'));
});

test('No navigation item includes White Protocol', () => {
  const allText = WORKSTATION_NAV_ITEMS.map((i) => `${i.label} ${i.description}`).join(' ').toLowerCase();
  assert.ok(!allText.includes('white protocol'));
});

test('No navigation item includes Drift', () => {
  const allText = WORKSTATION_NAV_ITEMS.map((i) => `${i.label} ${i.description}`).join(' ').toLowerCase();
  assert.ok(!allText.includes('drift'));
});

test('Sidebar labels do not mention payroll or invoice', () => {
  const allText = WORKSTATION_NAV_ITEMS.map((i) => i.label).join(' ').toLowerCase();
  assert.ok(!allText.includes('payroll'));
  assert.ok(!allText.includes('invoice'));
});

// ---------------------------------------------------------------------------
// Safety badges render correct labels
// ---------------------------------------------------------------------------

test('Safety badges cover all expected levels', () => {
  const levels: Array<ReturnType<typeof getSafetyLevelColors>> = [
    getSafetyLevelColors('safe_read_only'),
    getSafetyLevelColors('local_only'),
    getSafetyLevelColors('draft_only'),
    getSafetyLevelColors('execution_disabled'),
  ];
  for (const c of levels) {
    assert.ok(c.bg.startsWith('#'));
    assert.ok(c.text.startsWith('#'));
    assert.ok(c.border.startsWith('#'));
  }
});
