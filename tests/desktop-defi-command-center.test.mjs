import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const portfolio = readFileSync(
  'apps/desktop/src/features/solana-workstation/wallet/defi/defiPortfolio.ts',
  'utf8'
);
const adapters = readFileSync(
  'apps/desktop/src/features/solana-workstation/wallet/defi/defiAdapters.ts',
  'utf8'
);
const quote = readFileSync(
  'apps/desktop/src/features/solana-workstation/wallet/defi/defiQuote.ts',
  'utf8'
);
const backendClient = readFileSync(
  'apps/desktop/src/features/solana-workstation/wallet/defi/defiBackendClient.ts',
  'utf8'
);
const storage = readFileSync(
  'apps/desktop/src/features/solana-workstation/wallet/defi/defiStorage.ts',
  'utf8'
);

test('DeFi portfolio aggregation is read-only and avoids double-counting', () => {
  assert.match(portfolio, /valueDisplayedSeparately:\s*true/);
  assert.match(portfolio, /avoid double-counting wallet token balances/);
  assert.match(portfolio, /Protocol positions are not inferred from wallet token balances/);
  assert.match(portfolio, /all_wallets|active_wallet|watch_only|local_vault/);
});

test('DeFi adapters return honest unavailable placeholders instead of fake protocol data', () => {
  for (const protocol of ['Raydium', 'Orca', 'Meteora', 'Kamino', 'MarginFi', 'JitoSOL', 'mSOL', 'bSOL', 'bbSOL']) {
    assert.match(adapters, new RegExp(protocol));
  }
  assert.match(adapters, /not connected in v0\.1/);
  assert.match(adapters, /No funds are touched/);
  assert.match(adapters, /No live LST data is inferred or faked/);
  assert.doesNotMatch(adapters, /Drift/);
});

test('Jupiter integration is quote-only and strips executable payloads', () => {
  assert.match(quote, /\/api\/defi\/jupiter\/quote/);
  assert.match(backendClient, /fetchDeFiBackendQuote/);
  assert.match(quote, /Quote only\. Swap execution is locked/);
  assert.match(quote, /jupiter\.executablePayloadExcluded/);
  assert.match(backendClient, /assertNoExecutablePayload/);
  assert.doesNotMatch(quote, /sendTransaction|sendRawTransaction|signTransaction|signAllTransactions|requestAirdrop/);
  assert.doesNotMatch(quote, /swapTransaction\s*:/);
});

test('DeFi context storage rejects secrets and executable payload markers', () => {
  assert.match(storage, /gorkh\.solana\.defiCommandCenter\.lastContext\.v1/);
  for (const text of [
    'privateKey',
    'seed\\s+phrase',
    'wallet\\s+json',
    'serialized.*transaction',
    'swapTransaction',
    'api\\s+key',
    'auth\\s+header',
    'cloak\\s+note',
    'viewing\\s+key',
    'zerion.*token',
  ]) {
    assert.equal(storage.includes(text), true, `${text} should be covered by redaction guard`);
  }
});
