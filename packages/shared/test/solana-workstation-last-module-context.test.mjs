import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SolanaWorkstationLastShieldContextSchema,
  SolanaWorkstationLastBuilderContextSchema,
  SolanaWorkstationLastModuleContextSchema,
} from '../dist/index.js';

test('last Shield context snapshot validates redacted summary shape', () => {
  const snapshot = {
    source: 'shield',
    inputKind: 'signature',
    inputPreview: 'abc…xyz',
    inputHash: 'fnv1a-12345678',
    network: 'mainnet-beta',
    summary: 'Signature detected. Fetch Transaction was run manually.',
    decodedAvailable: false,
    riskFindingCount: 1,
    highestRiskLevel: 'medium',
    simulationAvailable: false,
    accountLookupAvailable: false,
    signatureLookupAvailable: true,
    lookupTableResolutionCount: 0,
    warnings: ['Manual risk'],
    redactionsApplied: ['shield.inputPreview.truncated'],
    updatedAt: Date.now(),
    localOnly: true,
  };
  const result = SolanaWorkstationLastShieldContextSchema.safeParse(snapshot);
  assert.ok(result.success, result.error?.message);
});

test('last Builder context snapshot validates label-only workspace metadata', () => {
  const snapshot = {
    source: 'builder',
    projectKind: 'anchor',
    packageManager: 'pnpm',
    rootPathLabel: 'my-program',
    idlCount: 1,
    instructionCount: 2,
    idlErrorCount: 3,
    logFindingCount: 1,
    toolchainAvailable: ['anchor: 0.30.1'],
    warnings: ['No tests directory detected.'],
    recommendedNextChecks: ['Verify Anchor.toml cluster.'],
    markdown: '# Builder context\n[workspace path redacted]',
    redactionsApplied: ['builder.rootPath.labelOnly'],
    updatedAt: Date.now(),
    localOnly: true,
  };
  const result = SolanaWorkstationLastBuilderContextSchema.safeParse(snapshot);
  assert.ok(result.success, result.error?.message);
});

test('last module context aggregate validates Shield and Builder together', () => {
  const now = Date.now();
  const result = SolanaWorkstationLastModuleContextSchema.safeParse({
    shield: {
      source: 'shield',
      inputKind: 'address',
      inputPreview: '11111111111111111111111111111111',
      inputHash: 'fnv1a-aaaaaaaa',
      network: 'devnet',
      summary: 'Address detected.',
      decodedAvailable: false,
      riskFindingCount: 0,
      simulationAvailable: false,
      accountLookupAvailable: true,
      signatureLookupAvailable: false,
      lookupTableResolutionCount: 0,
      warnings: [],
      redactionsApplied: ['shield.inputHash.only'],
      updatedAt: now,
      localOnly: true,
    },
    builder: {
      source: 'builder',
      projectKind: 'unknown',
      idlCount: 0,
      instructionCount: 0,
      idlErrorCount: 0,
      logFindingCount: 0,
      toolchainAvailable: [],
      warnings: [],
      recommendedNextChecks: [],
      markdown: '# Builder context',
      redactionsApplied: ['builder.secretFiles.excluded'],
      updatedAt: now,
      localOnly: true,
    },
    updatedAt: now,
    localOnly: true,
  });
  assert.ok(result.success, result.error?.message);
});
