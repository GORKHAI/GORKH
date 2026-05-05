import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GORKH_SOLANA_PROTOCOL_REGISTRY,
  GORKH_PRODUCTION_PROTOCOL_IDS,
  GORKH_PRIVACY_PROTOCOL_IDS,
  GORKH_AGENT_PROTOCOL_IDS,
  GORKH_MARKETS_PROTOCOL_IDS,
  GORKH_DENIED_PROTOCOL_IDS,
  getProtocolDefinition,
  isProtocolInRegistry,
  isDeniedProtocol,
  isMainnetFacingProtocol,
  SolanaProtocolRegistryId,
} from '../dist/index.js';

test('GORKH_SOLANA_PROTOCOL_REGISTRY contains all expected protocols', () => {
  const ids = GORKH_SOLANA_PROTOCOL_REGISTRY.map((p) => p.id);
  assert.ok(ids.includes('solflare'));
  assert.ok(ids.includes('kamino'));
  assert.ok(ids.includes('dflow'));
  assert.ok(ids.includes('quicknode'));
  assert.ok(ids.includes('birdeye'));
  assert.ok(ids.includes('umbra'));
  assert.ok(ids.includes('cloak'));
  assert.ok(ids.includes('sns'));
  assert.ok(ids.includes('zerion_cli'));
  assert.ok(ids.includes('ika'));
  assert.ok(ids.includes('token_2022_confidential_transfers'));
  assert.ok(ids.includes('light_protocol'));
  assert.ok(ids.includes('squads'));
  assert.ok(ids.includes('turnkey'));
  assert.ok(ids.includes('blowfish'));
  assert.ok(ids.includes('pyth'));
  assert.ok(ids.includes('jupiter'));
  assert.ok(ids.includes('meteora'));
  assert.ok(ids.includes('orca'));
  assert.ok(ids.includes('jito'));
  assert.ok(ids.includes('solana_actions_blinks'));
});

test('GORKH_SOLANA_PROTOCOL_REGISTRY does not contain HumanRail or White Protocol', () => {
  const ids = GORKH_SOLANA_PROTOCOL_REGISTRY.map((p) => p.id);
  assert.ok(!ids.includes('humanrail'), 'HumanRail must not be in registry');
  assert.ok(!ids.includes('white_protocol'), 'White Protocol must not be in registry');
});

test('GORKH_DENIED_PROTOCOL_IDS contains Drift', () => {
  assert.ok(GORKH_DENIED_PROTOCOL_IDS.includes('drift'));
});

test('GORKH_PRIVACY_PROTOCOL_IDS includes Umbra, Cloak, Token-2022 Confidential Transfers, Light Protocol', () => {
  assert.ok(GORKH_PRIVACY_PROTOCOL_IDS.includes('umbra'));
  assert.ok(GORKH_PRIVACY_PROTOCOL_IDS.includes('cloak'));
  assert.ok(GORKH_PRIVACY_PROTOCOL_IDS.includes('token_2022_confidential_transfers'));
  assert.ok(GORKH_PRIVACY_PROTOCOL_IDS.includes('light_protocol'));
});

test('GORKH_AGENT_PROTOCOL_IDS includes SNS, Zerion CLI, Ika, Squads, Turnkey, Blowfish', () => {
  assert.ok(GORKH_AGENT_PROTOCOL_IDS.includes('sns'));
  assert.ok(GORKH_AGENT_PROTOCOL_IDS.includes('zerion_cli'));
  assert.ok(GORKH_AGENT_PROTOCOL_IDS.includes('ika'));
  assert.ok(GORKH_AGENT_PROTOCOL_IDS.includes('squads'));
  assert.ok(GORKH_AGENT_PROTOCOL_IDS.includes('turnkey'));
  assert.ok(GORKH_AGENT_PROTOCOL_IDS.includes('blowfish'));
});

test('GORKH_MARKETS_PROTOCOL_IDS includes QuickNode, Birdeye, Kamino, Pyth, Jupiter, Meteora, Orca, Jito', () => {
  assert.ok(GORKH_MARKETS_PROTOCOL_IDS.includes('quicknode'));
  assert.ok(GORKH_MARKETS_PROTOCOL_IDS.includes('birdeye'));
  assert.ok(GORKH_MARKETS_PROTOCOL_IDS.includes('kamino'));
  assert.ok(GORKH_MARKETS_PROTOCOL_IDS.includes('pyth'));
  assert.ok(GORKH_MARKETS_PROTOCOL_IDS.includes('jupiter'));
  assert.ok(GORKH_MARKETS_PROTOCOL_IDS.includes('meteora'));
  assert.ok(GORKH_MARKETS_PROTOCOL_IDS.includes('orca'));
  assert.ok(GORKH_MARKETS_PROTOCOL_IDS.includes('jito'));
});

test('getProtocolDefinition returns correct definitions', () => {
  const jupiter = getProtocolDefinition('jupiter');
  assert.ok(jupiter);
  assert.equal(jupiter.name, 'Jupiter');
  assert.equal(jupiter.category, 'swap');

  const blowfish = getProtocolDefinition('blowfish');
  assert.ok(blowfish);
  assert.equal(blowfish.category, 'transaction_security');
});

test('isProtocolInRegistry matches registered IDs', () => {
  assert.ok(isProtocolInRegistry('squads'));
  assert.ok(isProtocolInRegistry('turnkey'));
  assert.ok(!isProtocolInRegistry('humanrail'));
  assert.ok(!isProtocolInRegistry('unknown'));
});

test('isDeniedProtocol rejects Drift', () => {
  assert.ok(isDeniedProtocol('drift'));
  assert.ok(!isDeniedProtocol('jupiter'));
});

test('isMainnetFacingProtocol returns true for mainnet-facing protocols', () => {
  assert.ok(isMainnetFacingProtocol('jupiter'));
  assert.ok(isMainnetFacingProtocol('squads'));
  assert.ok(!isMainnetFacingProtocol('unknown'));
});

test('All registry protocols have safety notes', () => {
  for (const protocol of GORKH_SOLANA_PROTOCOL_REGISTRY) {
    assert.ok(protocol.safetyNote.length > 0, `${protocol.id} should have a safety note`);
  }
});

test('All registry protocols have valid categories and statuses', () => {
  const validCategories = new Set([
    'wallet', 'lending', 'orderflow', 'rpc_infra', 'market_data',
    'privacy', 'identity', 'agent', 'confidential_token', 'zk_infra',
    'multisig', 'wallet_infra', 'transaction_security', 'oracle',
    'swap', 'liquidity', 'staking', 'transaction_delivery',
  ]);
  const validStatuses = new Set([
    'available_mainnet', 'available_api', 'available_wallet',
    'planned_read_only', 'planned_draft_only', 'planned_security_check',
    'planned_confidential_workflow', 'planned_agent_workflow',
    'research', 'disabled',
  ]);

  for (const protocol of GORKH_SOLANA_PROTOCOL_REGISTRY) {
    assert.ok(validCategories.has(protocol.category), `${protocol.id} has valid category`);
    assert.ok(validStatuses.has(protocol.status), `${protocol.id} has valid status`);
  }
});
