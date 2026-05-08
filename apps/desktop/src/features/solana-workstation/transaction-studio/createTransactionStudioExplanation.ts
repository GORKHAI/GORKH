import {
  TRANSACTION_STUDIO_PHASE_1_SAFETY_NOTES,
  type TransactionStudioDecodedTransaction,
  type TransactionStudioExplanation,
  type TransactionStudioInput,
  type TransactionStudioRiskReport,
  type TransactionStudioSimulationResult,
} from '@gorkh/shared';

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createTransactionStudioExplanation(input: {
  studioInput: TransactionStudioInput;
  decoded?: TransactionStudioDecodedTransaction | null;
  simulation?: TransactionStudioSimulationResult | null;
  riskReport?: TransactionStudioRiskReport | null;
}): TransactionStudioExplanation {
  const decoded = input.decoded;
  const programsInvolved = decoded
    ? decoded.instructions.map((ix) => ix.programName ?? ix.programId).filter((v, i, a) => a.indexOf(v) === i)
    : [];

  const summary = decoded
    ? `This transaction contains ${decoded.instructionCount} instruction(s), touches ${programsInvolved.join(', ') || 'unknown programs'}, requires ${decoded.requiredSignatureCount} signer(s), and writes to ${decoded.writableAccountCount} account(s).`
    : `GORKH classified this input as ${input.studioInput.kind}. Full transaction decode is not available for this source yet.`;

  const plainEnglishSteps = decoded
    ? decoded.instructions.map(
        (ix) =>
          `Step ${ix.index + 1}: ${ix.programName ?? 'Unknown Program'} receives ${ix.accountAddresses.length} account(s) and ${ix.dataLength} byte(s) of instruction data.`
      )
    : [
        input.studioInput.kind === 'signature'
          ? 'Fetch the transaction from read-only RPC to inspect metadata and logs.'
          : 'Paste a base64 serialized transaction to decode instruction details offline.',
      ];

  const possibleUserImpact = decoded
    ? [
        `${decoded.writableAccountCount} account(s) may change if this transaction is eventually signed and executed elsewhere.`,
        `${decoded.signerCount} account(s) are signer positions in the transaction message.`,
        decoded.unknownProgramCount > 0
          ? `${decoded.unknownProgramCount} unknown program(s) prevent complete local interpretation.`
          : 'All program IDs in the decoded transaction matched known GORKH program labels.',
      ]
    : ['No account or balance impact can be determined until a transaction is decoded.'];

  const safetyNotes = [
    ...TRANSACTION_STUDIO_PHASE_1_SAFETY_NOTES,
    ...(input.simulation
      ? ['Signature verification is disabled for preview simulation when supported by RPC.']
      : []),
    ...(input.riskReport?.findings
      .filter((finding) => finding.level === 'high' || finding.level === 'critical')
      .map((finding) => finding.title) ?? []),
  ];

  return {
    id: id('txs-explanation'),
    inputId: input.studioInput.id,
    summary,
    plainEnglishSteps,
    programsInvolved,
    possibleUserImpact,
    safetyNotes,
    createdAt: Date.now(),
    localOnly: true,
  };
}
