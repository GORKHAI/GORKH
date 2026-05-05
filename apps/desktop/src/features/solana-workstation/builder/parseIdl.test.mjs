import assert from 'node:assert/strict';
import test from 'node:test';
import { parseIdlJson } from './parseIdl.js';

const SAMPLE_IDL = JSON.stringify({
  name: 'my_program',
  version: '0.1.0',
  spec: '0.1.0',
  description: 'A sample program',
  instructions: [
    {
      name: 'initialize',
      docs: ['Initialize the program'],
      accounts: [
        { name: 'payer', isMut: true, isSigner: true, docs: ['The payer account'] },
        { name: 'config', isMut: true, isSigner: false },
      ],
      args: [
        { name: 'amount', type: 'u64' },
        { name: 'recipient', type: 'publicKey' },
      ],
      returns: 'u64',
    },
    {
      name: 'update',
      accounts: [{ name: 'authority', isMut: false, isSigner: true }],
      args: [{ name: 'newValue', type: 'u64' }],
    },
  ],
  accounts: [
    {
      name: 'Config',
      docs: ['The config account'],
      type: {
        kind: 'struct',
        fields: [
          { name: 'owner', type: 'publicKey', docs: ['The owner'] },
          { name: 'count', type: 'u64' },
        ],
      },
    },
  ],
  errors: [
    { code: 6000, name: 'InvalidAmount', msg: 'Amount must be greater than zero' },
    { code: 6001, name: 'Unauthorized', msg: 'You are not authorized' },
  ],
  events: [
    {
      name: 'ConfigUpdated',
      fields: [
        { name: 'oldValue', type: 'u64', index: false },
        { name: 'newValue', type: 'u64', index: false },
      ],
    },
  ],
  types: [
    { name: 'ConfigState', type: { kind: 'struct', fields: [] } },
  ],
  metadata: {
    address: 'Fg6PaFpoGXkYidMpUDBkeD3WfHpCuhD8VB2g9N1K2f1K',
  },
});

test('parseIdlJson extracts basic fields', () => {
  const result = parseIdlJson(SAMPLE_IDL);
  assert.ok(result);
  assert.equal(result.name, 'my_program');
  assert.equal(result.version, '0.1.0');
  assert.equal(result.spec, '0.1.0');
  assert.equal(result.description, 'A sample program');
});

test('parseIdlJson extracts instructions with accounts and args', () => {
  const result = parseIdlJson(SAMPLE_IDL);
  assert.ok(result);
  assert.equal(result.instructions.length, 2);

  const init = result.instructions[0];
  assert.equal(init.name, 'initialize');
  assert.equal(init.accounts.length, 2);
  assert.equal(init.accounts[0].name, 'payer');
  assert.equal(init.accounts[0].isMut, true);
  assert.equal(init.accounts[0].isSigner, true);
  assert.equal(init.args.length, 2);
  assert.equal(init.args[0].name, 'amount');
});

test('parseIdlJson extracts accounts', () => {
  const result = parseIdlJson(SAMPLE_IDL);
  assert.ok(result);
  assert.equal(result.accounts.length, 1);
  assert.equal(result.accounts[0].name, 'Config');
  assert.equal(result.accounts[0].type.fields?.length, 2);
});

test('parseIdlJson extracts errors', () => {
  const result = parseIdlJson(SAMPLE_IDL);
  assert.ok(result);
  assert.equal(result.errors.length, 2);
  assert.equal(result.errors[0].name, 'InvalidAmount');
  assert.equal(result.errors[0].code, 6000);
});

test('parseIdlJson extracts events', () => {
  const result = parseIdlJson(SAMPLE_IDL);
  assert.ok(result);
  assert.ok(result.events);
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].name, 'ConfigUpdated');
});

test('parseIdlJson extracts types', () => {
  const result = parseIdlJson(SAMPLE_IDL);
  assert.ok(result);
  assert.ok(result.types);
  assert.equal(result.types.length, 1);
});

test('parseIdlJson extracts metadata', () => {
  const result = parseIdlJson(SAMPLE_IDL);
  assert.ok(result);
  assert.ok(result.metadata);
  assert.equal(result.metadata.address, 'Fg6PaFpoGXkYidMpUDBkeD3WfHpCuhD8VB2g9N1K2f1K');
});

test('parseIdlJson returns null for invalid JSON', () => {
  const result = parseIdlJson('not valid json');
  assert.equal(result, null);
});

test('parseIdlJson returns null for non-object JSON', () => {
  const result = parseIdlJson('123');
  assert.equal(result, null);
});

test('parseIdlJson handles minimal IDL', () => {
  const minimal = JSON.stringify({
    name: 'minimal',
    instructions: [],
    accounts: [],
    errors: [],
  });
  const result = parseIdlJson(minimal);
  assert.ok(result);
  assert.equal(result.name, 'minimal');
  assert.equal(result.instructions.length, 0);
  assert.equal(result.accounts.length, 0);
  assert.equal(result.errors.length, 0);
});

test('parseIdlJson handles IDL without optional fields', () => {
  const noExtras = JSON.stringify({
    name: 'no_extras',
    instructions: [
      {
        name: 'init',
        accounts: [],
        args: [],
      },
    ],
    accounts: [],
    errors: [],
  });
  const result = parseIdlJson(noExtras);
  assert.ok(result);
  assert.equal(result.version, undefined);
  assert.equal(result.events, undefined);
  assert.equal(result.types, undefined);
});
