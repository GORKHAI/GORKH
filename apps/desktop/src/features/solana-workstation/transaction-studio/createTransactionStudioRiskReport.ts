import {
  SolanaRpcNetwork,
  TransactionStudioInputKind,
  TransactionStudioRiskLevel,
  type TransactionStudioDecodedTransaction,
  type TransactionStudioInput,
  type TransactionStudioRiskFinding,
  type TransactionStudioRiskLevel as TransactionStudioRiskLevelType,
  type TransactionStudioRiskReport,
  type TransactionStudioSimulationResult,
} from '@gorkh/shared';
import { isTransactionStudioBlockedIntent } from './transactionStudioGuards.js';

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const LEVEL_ORDER: TransactionStudioRiskLevelType[] = [
  TransactionStudioRiskLevel.INFO,
  TransactionStudioRiskLevel.LOW,
  TransactionStudioRiskLevel.MEDIUM,
  TransactionStudioRiskLevel.HIGH,
  TransactionStudioRiskLevel.CRITICAL,
];

function highest(findings: TransactionStudioRiskFinding[]): TransactionStudioRiskLevelType {
  return findings.reduce<TransactionStudioRiskLevelType>((current, finding) => {
    return LEVEL_ORDER.indexOf(finding.level) > LEVEL_ORDER.indexOf(current)
      ? finding.level
      : current;
  }, TransactionStudioRiskLevel.INFO);
}

function addFinding(
  findings: TransactionStudioRiskFinding[],
  finding: TransactionStudioRiskFinding
): void {
  if (!findings.some((existing) => existing.id === finding.id)) findings.push(finding);
}

export function createTransactionStudioRiskReport(input: {
  studioInput: TransactionStudioInput;
  decoded?: TransactionStudioDecodedTransaction | null;
  simulation?: TransactionStudioSimulationResult | null;
  selectedNetwork?: string;
  customEndpoint?: boolean;
}): TransactionStudioRiskReport {
  const findings: TransactionStudioRiskFinding[] = [];
  const signerWarnings: string[] = [];
  const writableAccountWarnings: string[] = [];
  const unknownProgramWarnings: string[] = [];
  const simulationWarnings: string[] = [];

  if (input.studioInput.kind === TransactionStudioInputKind.UNKNOWN) {
    addFinding(findings, {
      id: 'unknown_input',
      level: TransactionStudioRiskLevel.LOW,
      title: 'Invalid or unsupported input',
      description:
        'The input does not match a supported Solana signature, address, or serialized transaction format.',
      recommendation:
        'Paste a Solana signature, public address, or base64 serialized transaction for review.',
    });
  }

  if (
    input.studioInput.kind === TransactionStudioInputKind.SIGNATURE ||
    input.studioInput.kind === TransactionStudioInputKind.ADDRESS
  ) {
    addFinding(findings, {
      id: `${input.studioInput.kind}_detected`,
      level: TransactionStudioRiskLevel.INFO,
      title:
        input.studioInput.kind === TransactionStudioInputKind.SIGNATURE
          ? 'Signature detected'
          : 'Address detected',
      description:
        input.studioInput.kind === TransactionStudioInputKind.SIGNATURE
          ? 'Transaction Studio can fetch public transaction metadata through read-only RPC.'
          : 'Transaction Studio can fetch public account metadata through read-only RPC.',
      recommendation: 'Use read-only lookup actions only. No signing or execution is available.',
    });
  }

  if (isTransactionStudioBlockedIntent(input.studioInput.rawInput)) {
    addFinding(findings, {
      id: 'direct_execution_request_blocked',
      level: TransactionStudioRiskLevel.CRITICAL,
      title: 'Execution request blocked',
      description:
        'The input appears to request signing, broadcasting, raw submission, or bundle execution.',
      recommendation:
        'Use Transaction Studio for decode and simulation review only. Signing and broadcast are locked in v0.1.',
    });
  }

  if (
    input.studioInput.kind === TransactionStudioInputKind.SERIALIZED_TRANSACTION_BASE64 ||
    input.studioInput.kind === TransactionStudioInputKind.SERIALIZED_TRANSACTION_BASE58
  ) {
    addFinding(findings, {
      id: 'raw_transaction_input',
      level: TransactionStudioRiskLevel.LOW,
      title: 'Raw transaction input',
      description: 'Raw serialized transactions can hide account and instruction intent.',
      recommendation: 'Decode every instruction and verify all writable accounts before approval.',
    });
  }

  if (input.studioInput.kind === TransactionStudioInputKind.SERIALIZED_TRANSACTION_BASE58) {
    addFinding(findings, {
      id: 'base58_decode_coming_soon',
      level: TransactionStudioRiskLevel.MEDIUM,
      title: 'Base58 transaction decode unavailable',
      description: 'GORKH detected a base58-looking raw transaction but v0.1 only decodes base64 safely.',
      recommendation: 'Convert to base64 or inspect in a trusted explorer. GORKH will not fake decode.',
    });
  }

  if (input.selectedNetwork === SolanaRpcNetwork.MAINNET_BETA) {
    addFinding(findings, {
      id: 'mainnet_caution',
      level: TransactionStudioRiskLevel.LOW,
      title: 'Mainnet review context',
      description: 'This review is pointed at mainnet-beta RPC state.',
      recommendation: 'Treat results as production-chain advisory data and verify before any external approval.',
    });
  }

  if (input.customEndpoint) {
    addFinding(findings, {
      id: 'custom_rpc_endpoint',
      level: TransactionStudioRiskLevel.LOW,
      title: 'Custom RPC endpoint',
      description: 'Custom RPC providers can observe lookup and simulation requests.',
      recommendation: 'Use trusted RPC endpoints for sensitive transaction review.',
    });
  }

  const decoded = input.decoded;
  if (decoded) {
    if (decoded.signatureCount === 0) {
      signerWarnings.push('No signatures are present.');
      addFinding(findings, {
        id: 'no_signatures',
        level: TransactionStudioRiskLevel.HIGH,
        title: 'No signatures present',
        description: 'The transaction has no signatures and cannot execute until signed.',
        recommendation: 'Verify every required signer before any future signing flow.',
      });
    } else if (decoded.signatureCount < decoded.requiredSignatureCount) {
      signerWarnings.push(
        `Partial signatures: ${decoded.signatureCount}/${decoded.requiredSignatureCount}.`
      );
      addFinding(findings, {
        id: 'partial_signatures',
        level: TransactionStudioRiskLevel.MEDIUM,
        title: 'Partial signatures',
        description: 'The transaction does not include all required signatures.',
        recommendation: 'Do not rely on simulation success as proof that execution will succeed.',
      });
    }

    for (const account of decoded.accounts) {
      if (account.signer && account.writable) {
        signerWarnings.push(`Signer is writable: ${account.address}`);
      }
      if (account.writable && decoded.programIds.includes(account.address)) {
        writableAccountWarnings.push(`Program account appears writable: ${account.address}`);
      }
    }

    if (decoded.unknownProgramCount > 0) {
      const unknownInstructions = decoded.instructions.filter((ix) => !ix.knownProgram);
      unknownProgramWarnings.push(`${decoded.unknownProgramCount} unknown program(s) involved.`);
      addFinding(findings, {
        id: 'unknown_programs',
        level:
          decoded.writableAccountCount > 0 || decoded.signerCount > 0
            ? TransactionStudioRiskLevel.HIGH
            : TransactionStudioRiskLevel.MEDIUM,
        title: 'Unknown programs',
        description: 'One or more instructions target programs not known by GORKH.',
        recommendation: 'Verify each unknown program ID independently before approval.',
        relatedProgramId: unknownInstructions[0]?.programId,
        relatedInstructionIndex: unknownInstructions[0]?.index,
      });
    }

    if (decoded.writableAccountCount > 8) {
      writableAccountWarnings.push(`${decoded.writableAccountCount} writable accounts.`);
      addFinding(findings, {
        id: 'many_writable_accounts',
        level: TransactionStudioRiskLevel.MEDIUM,
        title: 'Many writable accounts',
        description: 'The transaction can mutate many accounts.',
        recommendation: 'Review every writable account and expected state change.',
      });
    }

    if (decoded.accountCount > 15) {
      addFinding(findings, {
        id: 'high_account_count',
        level: TransactionStudioRiskLevel.LOW,
        title: 'High account count',
        description: `This transaction references ${decoded.accountCount} accounts.`,
        recommendation: 'Large account sets increase review complexity.',
      });
    }

    if (decoded.instructionCount > 5) {
      addFinding(findings, {
        id: 'many_instructions',
        level: TransactionStudioRiskLevel.LOW,
        title: 'Many instructions',
        description: `This transaction contains ${decoded.instructionCount} instructions.`,
        recommendation: 'Review the timeline step by step.',
      });
    }

    if (decoded.usesAddressLookupTables) {
      addFinding(findings, {
        id: 'address_lookup_tables_unresolved',
        level: TransactionStudioRiskLevel.MEDIUM,
        title: 'Address lookup tables referenced',
        description: 'Some accounts may come from lookup tables and need RPC resolution.',
        recommendation: 'Resolve lookup table contents before approval.',
      });
    }

    const computeIx = decoded.instructions.find((ix) => ix.decodedKind?.startsWith('compute_budget'));
    if (computeIx) {
      addFinding(findings, {
        id: 'compute_budget_instruction',
        level: TransactionStudioRiskLevel.LOW,
        title: 'Compute budget instruction',
        description: 'The transaction adjusts compute limits or priority fee behavior.',
        recommendation: 'Verify priority fee and compute settings are expected.',
        relatedInstructionIndex: computeIx.index,
        relatedProgramId: computeIx.programId,
      });
    }

    for (const ix of decoded.instructions) {
      if (ix.decodedKind?.startsWith('system_')) {
        addFinding(findings, {
          id: `system_instruction_${ix.index}`,
          level: TransactionStudioRiskLevel.INFO,
          title: 'System Program instruction',
          description: 'This may create, assign, or transfer lamports between accounts.',
          recommendation: 'Verify involved accounts and lamport movement in balance diffs.',
          relatedInstructionIndex: ix.index,
          relatedProgramId: ix.programId,
        });
      }
      if (ix.decodedKind?.startsWith('spl_token_') || ix.decodedKind?.startsWith('token_2022_')) {
        addFinding(findings, {
          id: `token_instruction_${ix.index}`,
          level: TransactionStudioRiskLevel.INFO,
          title: 'SPL Token instruction',
          description: 'This may transfer tokens or change token account authority/state.',
          recommendation: 'Verify token accounts, mint, owner, and authority changes.',
          relatedInstructionIndex: ix.index,
          relatedProgramId: ix.programId,
        });
      }
      if (ix.decodedKind?.includes('set_authority')) {
        addFinding(findings, {
          id: `token_authority_change_${ix.index}`,
          level: TransactionStudioRiskLevel.HIGH,
          title: 'Token authority change',
          description: 'This instruction appears to change token authority.',
          recommendation: 'Verify the current authority, new authority, mint/account, and signer before approval.',
          relatedInstructionIndex: ix.index,
          relatedProgramId: ix.programId,
        });
      }
    }
  }

  if (input.simulation) {
    simulationWarnings.push(...input.simulation.warnings);
    if (input.simulation.status === 'failed') {
      addFinding(findings, {
        id: 'simulation_failed',
        level: TransactionStudioRiskLevel.HIGH,
        title: 'Simulation failed',
        description: 'RPC simulation returned an error.',
        recommendation: 'Inspect logs and do not treat this transaction as ready for approval.',
      });
    }
  }

  if (findings.length === 0 && decoded) {
    addFinding(findings, {
      id: 'decoded_successfully',
      level: TransactionStudioRiskLevel.INFO,
      title: 'Decoded successfully',
      description: 'GORKH decoded the transaction without major static warnings.',
      recommendation: 'Still verify programs, signers, writable accounts, and simulation logs.',
    });
  }

  return {
    id: id('txs-risk'),
    inputId: input.studioInput.id,
    highestLevel: highest(findings),
    findings,
    signerWarnings,
    writableAccountWarnings,
    unknownProgramWarnings,
    simulationWarnings,
    createdAt: Date.now(),
  };
}
