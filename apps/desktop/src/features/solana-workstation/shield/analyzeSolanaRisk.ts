import {
  SolanaKnownProgramCategory,
  type SolanaDecodedTransaction,
  type SolanaShieldRiskFinding,
} from '@gorkh/shared';

/**
 * Perform static risk analysis on a decoded Solana transaction.
 * No RPC. No simulation. Pure offline heuristics.
 */
export function analyzeSolanaRisk(decoded: SolanaDecodedTransaction): SolanaShieldRiskFinding[] {
  const findings: SolanaShieldRiskFinding[] = [];

  // Unsigned or partially signed
  if (decoded.signatureCount === 0) {
    findings.push({
      id: 'no_signatures',
      level: 'high',
      title: 'No signatures present',
      description:
        'This transaction has no signatures. It cannot be submitted to the network until all required signers have signed.',
      recommendation: 'Review all required signers and ensure signatures are added before submission.',
    });
  } else if (decoded.signatureCount < decoded.requiredSignatureCount) {
    findings.push({
      id: 'partial_signatures',
      level: 'medium',
      title: 'Partially signed',
      description: `This transaction requires ${decoded.requiredSignatureCount} signatures but only has ${decoded.signatureCount}.`,
      recommendation: 'Ensure all required signers have signed before submitting.',
    });
  }

  // Unknown program IDs
  const unknownProgramInstructions = decoded.instructions.filter((ix) => !ix.isKnownProgram);
  if (unknownProgramInstructions.length > 0) {
    const uniqueUnknownPrograms = Array.from(
      new Set(unknownProgramInstructions.map((ix) => ix.programId))
    );
    findings.push({
      id: 'unknown_programs',
      level: 'medium',
      title: 'Unknown program IDs',
      description: `This transaction interacts with ${uniqueUnknownPrograms.length} unknown program(s): ${uniqueUnknownPrograms.join(', ')}.`,
      affectedInstructionIndexes: unknownProgramInstructions.map((ix) => ix.index),
      recommendation:
        'Verify program IDs on Solana explorers before approving. Unknown programs may carry unexpected risks.',
    });
  }

  // Many writable accounts
  const writableAccounts = decoded.accountKeys.filter((_, i) => {
    return decoded.instructions.some((ix) =>
      ix.accounts?.some((a) => a.index === i && a.isWritable)
    );
  });
  if (writableAccounts.length > 8) {
    findings.push({
      id: 'many_writable_accounts',
      level: 'medium',
      title: 'Many writable accounts',
      description: `This transaction references ${writableAccounts.length} writable accounts, which increases the surface area for state changes.`,
      recommendation: 'Review each writable account to ensure expected state mutations.',
    });
  }

  // Many instructions
  if (decoded.instructions.length > 5) {
    findings.push({
      id: 'many_instructions',
      level: 'low',
      title: 'Many instructions',
      description: `This transaction contains ${decoded.instructions.length} instructions. Complex transactions are harder to reason about.`,
      recommendation: 'Review each instruction step-by-step before approving.',
    });
  }

  // Address lookup tables
  if (decoded.addressTableLookups.length > 0) {
    findings.push({
      id: 'address_lookup_tables',
      level: 'low',
      title: 'Address lookup table references',
      description: `This versioned transaction references ${decoded.addressTableLookups.length} address lookup table(s). Accounts from lookup tables are not resolved in offline mode.`,
      recommendation: 'Verify lookup table contents on-chain before approving.',
    });
  }

  // Unclassified instruction data
  const unclassifiedDataInstructions = decoded.instructions.filter(
    (ix) => ix.dataLength > 0 && !ix.isKnownProgram
  );
  if (unclassifiedDataInstructions.length > 0) {
    findings.push({
      id: 'unclassified_instruction_data',
      level: 'low',
      title: 'Unclassified instruction data',
      description: `${unclassifiedDataInstructions.length} instruction(s) contain unparsed data from unknown programs.`,
      affectedInstructionIndexes: unclassifiedDataInstructions.map((ix) => ix.index),
      recommendation:
        'Use a Solana explorer or disassembler to inspect instruction data for unknown programs.',
    });
  }

  // High account count
  if (decoded.accountKeys.length > 15) {
    findings.push({
      id: 'high_account_count',
      level: 'low',
      title: 'High account count',
      description: `This transaction references ${decoded.accountKeys.length} accounts. Large account sets increase complexity.`,
      recommendation: 'Review all referenced accounts to ensure they are expected.',
    });
  }

  // Compute budget / fee warnings
  const computeBudgetIx = decoded.instructions.find(
    (ix) => ix.programCategory === SolanaKnownProgramCategory.COMPUTE
  );
  if (computeBudgetIx) {
    findings.push({
      id: 'compute_budget_set',
      level: 'low',
      title: 'Compute budget instruction present',
      description:
        'This transaction sets custom compute unit limits or priority fees. Review the values to ensure they are reasonable.',
      affectedInstructionIndexes: [computeBudgetIx.index],
      recommendation: 'Verify compute unit limits and priority fee values are not excessive.',
    });
  }

  return findings;
}
