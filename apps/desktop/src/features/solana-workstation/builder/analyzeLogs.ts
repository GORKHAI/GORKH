import {
  SolanaBuilderLogSource,
  SolanaBuilderLogSeverity,
  SolanaBuilderKnownErrorKind,
  type SolanaBuilderLogAnalysis,
  type SolanaBuilderLogFinding,
  type SolanaBuilderIdlSummary,
} from '@gorkh/shared';
import { mapHexErrorToIdl, mapDecimalErrorToIdl } from './mapIdlErrors.js';

// ============================================================================
// Log Analyzer — Phase 5
// ============================================================================
// Parses pasted Anchor/Solana logs and extracts findings.
// ============================================================================

interface LogPattern {
  kind: SolanaBuilderKnownErrorKind;
  severity: SolanaBuilderLogSeverity;
  patterns: RegExp[];
  title: string;
  description: (match: RegExpMatchArray) => string;
  recommendation: (match: RegExpMatchArray) => string;
  extractCode?: (match: RegExpMatchArray) => number | undefined;
  extractHex?: (match: RegExpMatchArray) => string | undefined;
  extractInstruction?: (match: RegExpMatchArray) => string | undefined;
}

const LOG_PATTERNS: LogPattern[] = [
  {
    kind: SolanaBuilderKnownErrorKind.ANCHOR_ERROR,
    severity: SolanaBuilderLogSeverity.ERROR,
    patterns: [/Error Code:\s*(\w+)/i, /Error Number:\s*(\d+)/i, /Error Message:\s*(.+)/i],
    title: 'Anchor Error',
    description: (m) => `Anchor framework error detected: ${m[0]}`,
    recommendation: () => 'Check the Anchor error code against your IDL or the Anchor source for the exact meaning.',
    extractCode: (m) => {
      const num = /Error Number:\s*(\d+)/.exec(m[0]);
      return num ? parseInt(num[1], 10) : undefined;
    },
  },
  {
    kind: SolanaBuilderKnownErrorKind.ANCHOR_CONSTRAINT_ERROR,
    severity: SolanaBuilderLogSeverity.ERROR,
    patterns: [
      /A seeds constraint was violated/i,
      /A has_one constraint was violated/i,
      /A mut constraint was violated/i,
      /A signer constraint was violated/i,
      /A owner constraint was violated/i,
      /ConstraintSeeds/i,
      /ConstraintOwner/i,
      /ConstraintMut/i,
      /ConstraintSigner/i,
      /ConstraintHasOne/i,
      /AccountNotInitialized/i,
      /AccountOwnedByWrongProgram/i,
    ],
    title: 'Anchor Constraint Violation',
    description: (m) => `Anchor constraint failed: ${m[0].trim()}`,
    recommendation: (m) => {
      const text = m[0].toLowerCase();
      if (text.includes('seeds') || text.includes('constraintseeds')) {
        return 'Verify the PDA seeds match exactly between account creation and account usage. Check bump consistency.';
      }
      if (text.includes('has_one') || text.includes('constrainthasone')) {
        return 'Ensure the has_one target account matches the field value in the account struct.';
      }
      if (text.includes('signer') || text.includes('constraintsigner')) {
        return 'Ensure the transaction includes the required signer for this account.';
      }
      if (text.includes('mut') || text.includes('constraintmut')) {
        return 'Ensure the account is marked mutable where it needs to be written.';
      }
      if (text.includes('owner') || text.includes('constraintowner') || text.includes('accountownedbywrongprogram')) {
        return 'Verify the account is owned by the expected program. Check initialization order.';
      }
      if (text.includes('notinitialized')) {
        return 'Initialize the account before using it, or check if the address is a PDA that needs creation.';
      }
      return 'Review the constraint definition in your program and the client-side account preparation.';
    },
  },
  {
    kind: SolanaBuilderKnownErrorKind.CUSTOM_PROGRAM_ERROR,
    severity: SolanaBuilderLogSeverity.ERROR,
    patterns: [/custom program error:\s*(0x[0-9a-f]+)/i, /custom program error:\s*(\d+)/i],
    title: 'Custom Program Error',
    description: (m) => `Program returned a custom error: ${m[1]}`,
    recommendation: () => 'Look up the error code in your program IDL or source code.',
    extractHex: (m) => {
      const hex = /0x[0-9a-f]+/i.exec(m[0]);
      return hex ? hex[0] : undefined;
    },
    extractCode: (m) => {
      const dec = /custom program error:\s*(\d+)/i.exec(m[0]);
      return dec ? parseInt(dec[1], 10) : undefined;
    },
  },
  {
    kind: SolanaBuilderKnownErrorKind.INSTRUCTION_ERROR,
    severity: SolanaBuilderLogSeverity.ERROR,
    patterns: [/InstructionError/i, /Program failed to complete/i],
    title: 'Instruction Error',
    description: (m) => `Instruction execution failed: ${m[0].trim()}`,
    recommendation: () => 'Check the program logs for the specific failure point. Look for panics, unwrap failures, or constraint violations.',
  },
  {
    kind: SolanaBuilderKnownErrorKind.COMPUTE_BUDGET_EXCEEDED,
    severity: SolanaBuilderLogSeverity.ERROR,
    patterns: [
      /Computational budget exceeded/i,
      /exceeded maximum number of instructions allowed/i,
      /compute budget exceeded/i,
    ],
    title: 'Compute Budget Exceeded',
    description: (m) => `Transaction exceeded the Solana compute unit limit: ${m[0].trim()}`,
    recommendation: () => 'Optimize the instruction: reduce loops, use fewer accounts, batch operations, or add a ComputeBudget instruction to request more CUs.',
  },
  {
    kind: SolanaBuilderKnownErrorKind.INSUFFICIENT_FUNDS,
    severity: SolanaBuilderLogSeverity.ERROR,
    patterns: [/insufficient funds/i, /InsufficientFunds/i],
    title: 'Insufficient Funds',
    description: (m) => `Account does not have enough SOL: ${m[0].trim()}`,
    recommendation: () => 'Fund the paying account with more SOL. On devnet, use a faucet or the solana airdrop command (not available in GORKH).',
  },
  {
    kind: SolanaBuilderKnownErrorKind.BLOCKHASH_NOT_FOUND,
    severity: SolanaBuilderLogSeverity.ERROR,
    patterns: [/Blockhash not found/i],
    title: 'Blockhash Not Found',
    description: (m) => `The recent blockhash has expired: ${m[0].trim()}`,
    recommendation: () => 'Retry with a fresh blockhash. Increase the retry count or use a more recent blockhash.',
  },
  {
    kind: SolanaBuilderKnownErrorKind.SIGNATURE_MISSING,
    severity: SolanaBuilderLogSeverity.ERROR,
    patterns: [/Signature verification failed/i, /missing required signature/i],
    title: 'Signature Verification Failed',
    description: (m) => `Required signature is missing or invalid: ${m[0].trim()}`,
    recommendation: () => 'Ensure all required signers are included in the transaction and their keypairs are available.',
  },
  {
    kind: SolanaBuilderKnownErrorKind.ACCOUNT_NOT_FOUND,
    severity: SolanaBuilderLogSeverity.WARNING,
    patterns: [/AccountNotFound/i, /could not find account/i],
    title: 'Account Not Found',
    description: (m) => `Referenced account does not exist: ${m[0].trim()}`,
    recommendation: () => 'Create the account before use, or verify the address is correct. PDAs must be initialized first.',
  },
  {
    kind: SolanaBuilderKnownErrorKind.TOOLCHAIN_ERROR,
    severity: SolanaBuilderLogSeverity.ERROR,
    patterns: [
      /rustc.*error/i,
      /cargo.*error/i,
      /anchor.*error.*command/i,
      /failed to run/i,
    ],
    title: 'Toolchain Error',
    description: (m) => `Build tool reported an error: ${m[0].trim()}`,
    recommendation: () => 'Check your Rust/Anchor toolchain versions match the project requirements. Run cargo clean and retry.',
  },
];

function makeFinding(
  pattern: LogPattern,
  match: RegExpMatchArray,
  idls: SolanaBuilderIdlSummary[]
): SolanaBuilderLogFinding {
  const hexCode = pattern.extractHex?.(match);
  const decCode = pattern.extractCode?.(match);
  const matchedInstruction = pattern.extractInstruction?.(match);

  let matchedIdlErrorName: string | undefined;
  let matchedCode: number | undefined;
  let matchedHexCode: string | undefined;
  let finalKind = pattern.kind;

  // Try IDL mapping for custom errors
  if (hexCode && idls.length > 0) {
    const idlMatch = mapHexErrorToIdl(hexCode, idls);
    if (idlMatch) {
      matchedIdlErrorName = idlMatch.error.name;
      matchedCode = idlMatch.error.code;
      matchedHexCode = hexCode;
      finalKind = SolanaBuilderKnownErrorKind.IDL_ERROR_MATCH;
    } else {
      matchedHexCode = hexCode;
      const decimal = parseInt(hexCode, 16);
      if (!Number.isNaN(decimal)) matchedCode = decimal;
    }
  } else if (decCode !== undefined && idls.length > 0) {
    const idlMatch = mapDecimalErrorToIdl(decCode, idls);
    if (idlMatch) {
      matchedIdlErrorName = idlMatch.error.name;
      matchedCode = idlMatch.error.code;
      finalKind = SolanaBuilderKnownErrorKind.IDL_ERROR_MATCH;
    } else {
      matchedCode = decCode;
    }
  } else if (hexCode) {
    matchedHexCode = hexCode;
    const decimal = parseInt(hexCode, 16);
    if (!Number.isNaN(decimal)) matchedCode = decimal;
  } else if (decCode !== undefined) {
    matchedCode = decCode;
  }

  return {
    id: `${finalKind}_${Math.random().toString(36).slice(2, 8)}`,
    severity: pattern.severity,
    kind: finalKind,
    title: pattern.title,
    description: pattern.description(match),
    rawExcerpt: match[0].trim().slice(0, 300),
    matchedCode,
    matchedHexCode,
    matchedIdlErrorName,
    matchedInstructionName: matchedInstruction,
    recommendation: pattern.recommendation(match),
    confidence: matchedIdlErrorName ? 'high' : 'medium',
  };
}

/**
 * Analyze pasted Solana/Anchor logs and extract findings.
 */
export function analyzeSolanaBuilderLogs(
  input: string,
  idls: SolanaBuilderIdlSummary[] = []
): SolanaBuilderLogAnalysis {
  const findings: SolanaBuilderLogFinding[] = [];
  const referencedPrograms = new Set<string>();
  const referencedInstructions = new Set<string>();

  for (const pattern of LOG_PATTERNS) {
    for (const regex of pattern.patterns) {
      const matches = input.matchAll(new RegExp(regex, 'gi'));
      for (const match of matches) {
        // Avoid duplicate findings for the same line
        const finding = makeFinding(pattern, match, idls);
        const isDuplicate = findings.some(
          (f) => f.rawExcerpt === finding.rawExcerpt && f.kind === finding.kind
        );
        if (!isDuplicate) {
          findings.push(finding);
          if (finding.matchedInstructionName) {
            referencedInstructions.add(finding.matchedInstructionName);
          }
        }
      }
    }
  }

  // Extract program references from "Program <address>" log lines
  const programMatches = input.matchAll(/Program\s+([A-Za-z0-9]{32,44})/g);
  for (const m of programMatches) {
    referencedPrograms.add(m[1]);
  }

  // Extract instruction names from "Instruction: <Name>" log lines
  const instructionMatches = input.matchAll(/Instruction:\s*(\w+)/g);
  for (const m of instructionMatches) {
    referencedInstructions.add(m[1]);
  }

  const severityOrder = { critical: 3, error: 2, warning: 1, info: 0 };
  findings.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);

  const errorCount = findings.filter((f) => f.severity === 'error' || f.severity === 'critical').length;
  const warningCount = findings.filter((f) => f.severity === 'warning').length;

  let summary: string;
  if (errorCount > 0) {
    summary = `${errorCount} error(s) and ${warningCount} warning(s) detected in logs.`;
  } else if (warningCount > 0) {
    summary = `${warningCount} warning(s) detected. No critical errors found.`;
  } else {
    summary = 'No known error patterns detected in the provided logs.';
  }

  return {
    source: SolanaBuilderLogSource.PASTED,
    analyzedAt: new Date().toISOString(),
    summary,
    findings,
    referencedPrograms: Array.from(referencedPrograms),
    referencedInstructions: Array.from(referencedInstructions),
    safetyNotes: [
      'Log analysis is heuristic-based and may miss errors or produce false positives.',
      'Always verify findings against your program source code and IDL.',
      'GORKH does not execute transactions or modify files based on log analysis.',
    ],
  };
}
