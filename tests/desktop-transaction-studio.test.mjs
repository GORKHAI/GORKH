import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyTransactionStudioInput,
  assertTransactionStudioAllowedRpcMethod,
  createTransactionStudioContextSnapshot,
  createTransactionStudioInput,
  createTransactionStudioRiskReport,
  decodeTransactionStudioInput,
  extractBalanceChangesFromTransactionMeta,
  isTransactionStudioBlockedIntent,
  mapSimulationPreviewToStudio,
  redactTransactionStudioInput,
} from '../apps/desktop/src/features/solana-workstation/transaction-studio/index.js';
import {
  assertSafeTransactionStudioContext,
  TRANSACTION_STUDIO_CONTEXT_STORAGE_KEY,
} from '../apps/desktop/src/features/solana-workstation/transaction-studio/transactionStudioStorage.js';

function minimalBase64Transaction() {
  const bytes = [];
  bytes.push(1);
  for (let i = 0; i < 64; i += 1) bytes.push(0);
  bytes.push(1, 0, 0);
  bytes.push(2);
  for (let i = 0; i < 64; i += 1) bytes.push(0);
  for (let i = 0; i < 32; i += 1) bytes.push(0);
  bytes.push(1);
  bytes.push(0);
  bytes.push(1);
  bytes.push(0);
  bytes.push(4);
  bytes.push(1, 2, 3, 4);
  return btoa(String.fromCharCode(...bytes));
}

function shortU16(value) {
  if (value < 128) return [value];
  return [(value & 0x7f) | 0x80, value >> 7];
}

function pubkeyBytes(address) {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let value = BigInt(0);
  for (const char of address) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) throw new Error(`invalid base58 char ${char}`);
    value = value * BigInt(58) + BigInt(digit);
  }
  const bytes = [];
  while (value > BigInt(0)) {
    bytes.unshift(Number(value & BigInt(255)));
    value >>= BigInt(8);
  }
  for (const char of address) {
    if (char === '1') bytes.unshift(0);
    else break;
  }
  while (bytes.length < 32) bytes.unshift(0);
  return bytes.slice(-32);
}

function u32Le(value) {
  return [value & 255, (value >> 8) & 255, (value >> 16) & 255, (value >> 24) & 255];
}

function u64Le(value) {
  let v = BigInt(value);
  const bytes = [];
  for (let index = 0; index < 8; index += 1) {
    bytes.push(Number(v & BigInt(255)));
    v >>= BigInt(8);
  }
  return bytes;
}

function transactionWithInstruction(programId, instructionData, accountIndexes = [0, 1]) {
  const signer = '11111111111111111111111111111111';
  const second = '11111111111111111111111111111111';
  const keys = [signer, second, programId];
  const bytes = [];
  bytes.push(1);
  for (let i = 0; i < 64; i += 1) bytes.push(0);
  bytes.push(1, 0, 1);
  bytes.push(...shortU16(keys.length));
  for (const key of keys) bytes.push(...pubkeyBytes(key));
  for (let i = 0; i < 32; i += 1) bytes.push(0);
  bytes.push(1);
  bytes.push(2);
  bytes.push(...shortU16(accountIndexes.length));
  bytes.push(...accountIndexes);
  bytes.push(...shortU16(instructionData.length));
  bytes.push(...instructionData);
  return btoa(String.fromCharCode(...bytes));
}

test('Transaction Studio classifier detects signature, address, base64, base58, and unknown', () => {
  assert.equal(classifyTransactionStudioInput('1'.repeat(88)), 'signature');
  assert.equal(classifyTransactionStudioInput('11111111111111111111111111111111'), 'address');
  assert.equal(classifyTransactionStudioInput(minimalBase64Transaction()), 'serialized_transaction_base64');
  assert.equal(classifyTransactionStudioInput('2'.repeat(140)), 'serialized_transaction_base58');
  assert.equal(classifyTransactionStudioInput('hello world'), 'unknown');
});

test('Transaction Studio risk report handles signature, address, and invalid input states', () => {
  const signatureInput = createTransactionStudioInput({ rawInput: '1'.repeat(88) });
  const addressInput = createTransactionStudioInput({ rawInput: '11111111111111111111111111111111' });
  const invalidInput = createTransactionStudioInput({ rawInput: 'not a solana transaction' });

  assert.equal(signatureInput.kind, 'signature');
  assert.equal(addressInput.kind, 'address');
  assert.equal(invalidInput.kind, 'unknown');

  assert.ok(
    createTransactionStudioRiskReport({ studioInput: signatureInput }).findings.some(
      (finding) => finding.id === 'signature_detected'
    )
  );
  assert.ok(
    createTransactionStudioRiskReport({ studioInput: addressInput }).findings.some(
      (finding) => finding.id === 'address_detected'
    )
  );
  assert.ok(
    createTransactionStudioRiskReport({ studioInput: invalidInput }).findings.some(
      (finding) => finding.id === 'unknown_input'
    )
  );
});

test('Transaction Studio decodes base64 transaction and does not fake unsupported base58 decode', () => {
  const input = createTransactionStudioInput({ rawInput: minimalBase64Transaction() });
  const decoded = decodeTransactionStudioInput(input);
  assert.ok(decoded);
  assert.equal(decoded.instructionCount, 1);
  assert.equal(decoded.accountCount, 2);
  assert.equal(decoded.signerCount, 1);

  const base58 = createTransactionStudioInput({ rawInput: '2'.repeat(140) });
  assert.equal(base58.kind, 'serialized_transaction_base58');
  assert.equal(decodeTransactionStudioInput(base58), null);
});

test('Transaction Studio decodes System, Token, Token-2022, Compute Budget, and Memo instruction summaries', () => {
  const system = decodeTransactionStudioInput(createTransactionStudioInput({
    rawInput: transactionWithInstruction(
      '11111111111111111111111111111111',
      [...u32Le(2), ...u64Le(5000)]
    ),
  }));
  assert.equal(system?.instructions[0].decodedKind, 'system_transfer');
  assert.match(system?.instructions[0].summary ?? '', /Transfer 5000 lamports/);

  const token = decodeTransactionStudioInput(createTransactionStudioInput({
    rawInput: transactionWithInstruction(
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      [3, ...u64Le(42)]
    ),
  }));
  assert.equal(token?.instructions[0].decodedKind, 'spl_token_transfer');
  assert.match(token?.instructions[0].summary ?? '', /SPL Token transfer of 42/);

  const compute = decodeTransactionStudioInput(createTransactionStudioInput({
    rawInput: transactionWithInstruction(
      'ComputeBudget111111111111111111111111111111',
      [2, ...u32Le(140000)],
      []
    ),
  }));
  assert.equal(compute?.instructions[0].decodedKind, 'compute_budget_set_unit_limit');
  assert.match(compute?.instructions[0].summary ?? '', /140000/);

  const computePrice = decodeTransactionStudioInput(createTransactionStudioInput({
    rawInput: transactionWithInstruction(
      'ComputeBudget111111111111111111111111111111',
      [3, ...u64Le(2500)],
      []
    ),
  }));
  assert.equal(computePrice?.instructions[0].decodedKind, 'compute_budget_set_unit_price');
  assert.match(computePrice?.instructions[0].summary ?? '', /2500 micro-lamports/);

  const token2022 = decodeTransactionStudioInput(createTransactionStudioInput({
    rawInput: transactionWithInstruction(
      'TokenzQdBNbLqP5VEyqY7Yxk9yQv9mKqNfY9hL7tM6Q',
      [3, ...u64Le(99)]
    ),
  }));
  assert.equal(token2022?.instructions[0].decodedKind, 'token_2022_transfer');
  assert.match(token2022?.instructions[0].summary ?? '', /Token-2022 transfer of 99/);

  const memoText = 'review only';
  const memo = decodeTransactionStudioInput(createTransactionStudioInput({
    rawInput: transactionWithInstruction(
      'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
      Array.from(new TextEncoder().encode(memoText)),
      [0]
    ),
  }));
  assert.equal(memo?.instructions[0].decodedKind, 'memo');
  assert.match(memo?.instructions[0].summary ?? '', /review only/);

  const unknown = decodeTransactionStudioInput(createTransactionStudioInput({
    rawInput: transactionWithInstruction(
      'BPFLoaderUpgradeab1e11111111111111111111111',
      [1, 2, 3],
      [0]
    ),
  }));
  assert.equal(unknown?.instructions[0].decodedKind, undefined);
  assert.match(unknown?.instructions[0].summary ?? '', /instruction touching 1 account/);
});

test('Transaction Studio extracts richer balance data from transaction metadata and simulation accounts', () => {
  const raw = {
    meta: {
      preBalances: [100, 25],
      postBalances: [80, 45],
      preTokenBalances: [
        { accountIndex: 1, mint: 'MintA', owner: 'OwnerA', uiTokenAmount: { amount: '10', decimals: 0, uiAmountString: '10' } },
        { accountIndex: 2, mint: 'MintClosed', owner: 'OwnerB', uiTokenAmount: { amount: '7', decimals: 0, uiAmountString: '7' } },
      ],
      postTokenBalances: [
        { accountIndex: 1, mint: 'MintA', owner: 'OwnerA', uiTokenAmount: { amount: '15', decimals: 0, uiAmountString: '15' } },
      ],
    },
    transaction: { message: { accountKeys: ['AccountA', 'AccountB', 'AccountC'] } },
  };
  const changes = extractBalanceChangesFromTransactionMeta(raw);
  assert.equal(changes.sol.length, 2);
  assert.equal(changes.token.length, 2);
  assert.equal(changes.token[0].delta, '5');
  assert.equal(changes.token[1].postAmount, '0');
  assert.equal(changes.token[1].delta, '-7');

  const simulation = mapSimulationPreviewToStudio(
    createTransactionStudioInput({ rawInput: minimalBase64Transaction() }),
    {
      network: 'devnet',
      success: true,
      logs: [],
      accounts: [{ lamports: 123, owner: 'OwnerA' }],
      simulatedAt: Date.now(),
      warning: 'Simulation uses current RPC state.',
    },
    null,
    ['AccountA']
  );
  assert.equal(simulation.balanceChanges[0].account, 'AccountA');
  assert.equal(simulation.balanceChanges[0].postAmount, '123');
  assert.equal(simulation.balanceChanges[0].delta, undefined);
  assert.ok(
    simulation.warnings.some((warning) => /post-simulation snapshots/.test(warning)),
    'post-simulation snapshots must be labeled honestly'
  );
});

test('Transaction Studio blocks broadcast and redacts secret-shaped material', () => {
  assert.equal(isTransactionStudioBlockedIntent('broadcast this raw transaction'), true);
  assert.equal(isTransactionStudioBlockedIntent('submit bundle to jito'), true);
  assert.doesNotThrow(() => assertTransactionStudioAllowedRpcMethod('simulateTransaction'));
  assert.doesNotThrow(() => assertTransactionStudioAllowedRpcMethod('getTransaction'));
  assert.doesNotThrow(() => assertTransactionStudioAllowedRpcMethod('getAccountInfo'));
  assert.throws(() => assertTransactionStudioAllowedRpcMethod('sendTransaction'), /blocks RPC method/);
  assert.throws(() => assertTransactionStudioAllowedRpcMethod('sendRawTransaction'), /blocks RPC method/);
  assert.throws(() => assertTransactionStudioAllowedRpcMethod('requestAirdrop'), /blocks RPC method/);
  const redacted = redactTransactionStudioInput('privateKey=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]');
  assert.match(redacted.value, /redacted secret material/);
  assert.ok(redacted.redactionsApplied.length > 0);
});

test('Transaction Studio context snapshot excludes raw transaction payloads and secrets', () => {
  const rawTx = minimalBase64Transaction();
  const activeInput = createTransactionStudioInput({
    rawInput: `${rawTx} privateKey=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]`,
  });
  const snapshot = createTransactionStudioContextSnapshot({
    id: 'workspace-1',
    selectedNetwork: 'devnet',
    activeInput,
    activeDecodedTransaction: undefined,
    activeSimulation: undefined,
    activeRiskReport: undefined,
    activeExplanation: undefined,
    lastUpdatedAt: Date.now(),
    localOnly: true,
  });
  const serialized = JSON.stringify(snapshot);
  assert.doesNotMatch(serialized, new RegExp(rawTx.slice(0, 18)));
  assert.doesNotMatch(serialized, /privateKey|secretKey|seed phrase|walletJson|viewingKey|apiKey|token/i);
  assert.match(serialized, /transactionStudio.rawInput.excluded/);
  assert.equal(TRANSACTION_STUDIO_CONTEXT_STORAGE_KEY, 'gorkh.solana.transactionStudio.lastContext.v1');
  assert.doesNotThrow(() => assertSafeTransactionStudioContext(snapshot));
  assert.throws(
    () => assertSafeTransactionStudioContext({ rawTransactionPayload: rawTx, privateKey: [1, 2, 3] }),
    /forbidden secret or raw payload/
  );
});
