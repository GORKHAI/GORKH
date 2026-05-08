import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import test from 'node:test';

const hubDir = fileURLToPath(new URL('../apps/desktop/src/features/solana-workstation/wallet/hub', import.meta.url));

function readAll(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files.push(...collectFiles(path));
    else files.push(path);
  }
  return files.map((file) => readFileSync(file, 'utf8')).join('\n');
}

function collectFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files.push(...collectFiles(path));
    else files.push(path);
  }
  return files;
}

test('Wallet Hub does not introduce forbidden execution or secret access paths', () => {
  const source = readAll(hubDir);
  assert.doesNotMatch(source, /sendTransaction|sendRawTransaction|requestAirdrop|signTransaction|signAllTransactions|signMessage/);
  assert.doesNotMatch(source, /Command::new|shell|terminal command/i);
  assert.doesNotMatch(source, /Drift|jito|submitBundle|swap|stake|bridge/i);
  assert.doesNotMatch(source, /cloakNoteSecret|viewingKey|zerionToken|walletJson|seedPhrase/i);
});
