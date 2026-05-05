import type { SolanaBuilderIdlSummary, SolanaBuilderIdlError } from '@gorkh/shared';

// ============================================================================
// IDL Error Mapping — Phase 5
// ============================================================================
// Maps custom program error codes to IDL error definitions.
// ============================================================================

export interface IdlErrorMatch {
  idlName: string;
  error: SolanaBuilderIdlError;
}

/**
 * Convert a hex error code (e.g. "0x1770") to decimal.
 */
export function hexErrorToDecimal(hex: string): number | null {
  const cleaned = hex.trim().toLowerCase();
  if (!cleaned.startsWith('0x')) return null;
  const parsed = parseInt(cleaned, 16);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Search all workspace IDLs for an error with the given code.
 */
export function findIdlErrorByCode(
  code: number,
  idls: SolanaBuilderIdlSummary[]
): IdlErrorMatch | null {
  for (const idl of idls) {
    const match = idl.errors.find((e) => e.code === code);
    if (match) {
      return { idlName: idl.name, error: match };
    }
  }
  return null;
}

/**
 * Try to map a custom program error hex string to an IDL error.
 */
export function mapHexErrorToIdl(
  hexCode: string,
  idls: SolanaBuilderIdlSummary[]
): IdlErrorMatch | null {
  const decimal = hexErrorToDecimal(hexCode);
  if (decimal === null) return null;
  return findIdlErrorByCode(decimal, idls);
}

/**
 * Try to map a decimal error code to an IDL error.
 */
export function mapDecimalErrorToIdl(
  code: number,
  idls: SolanaBuilderIdlSummary[]
): IdlErrorMatch | null {
  return findIdlErrorByCode(code, idls);
}
