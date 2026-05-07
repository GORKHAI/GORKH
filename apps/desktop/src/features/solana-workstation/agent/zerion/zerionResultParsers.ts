const API_KEY_RE = /zk_[A-Za-z0-9_-]+/g;
const TOKEN_FIELD_RE = /("(?:apiKey|agentToken|token|privateKey|seed|mnemonic)"\s*:\s*")([^"]+)(")/gi;

export function redactZerionText(value: string): string {
  return value
    .replace(API_KEY_RE, '[redacted_zerion_api_key]')
    .replace(TOKEN_FIELD_RE, '$1[redacted]$3');
}

export function parseZerionJsonOutput(value: string): unknown | undefined {
  const redacted = redactZerionText(value.trim());
  if (!redacted) return undefined;
  try {
    return JSON.parse(redacted);
  } catch {
    return undefined;
  }
}

export function extractZerionError(input: {
  stderrText?: string;
  stderrJson?: unknown;
  timedOut?: boolean;
  exitCode?: number | null;
}): { errorCode?: string; errorMessage?: string } {
  if (input.timedOut) {
    return { errorCode: 'TIMEOUT', errorMessage: 'Zerion CLI command timed out.' };
  }
  const json = input.stderrJson;
  if (json && typeof json === 'object') {
    const record = json as Record<string, unknown>;
    const code = typeof record.code === 'string' ? record.code : undefined;
    const message = typeof record.message === 'string' ? record.message : undefined;
    if (code === '401') return { errorCode: 'UNAUTHORIZED', errorMessage: message ?? 'Zerion API key is missing or invalid.' };
    if (code === '429') return { errorCode: 'RATE_LIMITED', errorMessage: message ?? 'Zerion API rate limit reached.' };
    return { errorCode: code, errorMessage: message };
  }
  const stderrText = input.stderrText ? redactZerionText(input.stderrText) : undefined;
  if (stderrText?.includes('401')) {
    return { errorCode: 'UNAUTHORIZED', errorMessage: 'Zerion API key is missing or invalid.' };
  }
  if (stderrText?.includes('429')) {
    return { errorCode: 'RATE_LIMITED', errorMessage: 'Zerion API rate limit reached.' };
  }
  return {
    errorCode: input.exitCode == null ? undefined : `EXIT_${input.exitCode}`,
    errorMessage: stderrText,
  };
}

export function extractZerionTxHash(stdoutJson: unknown): string | undefined {
  if (!stdoutJson || typeof stdoutJson !== 'object') return undefined;
  const record = stdoutJson as Record<string, unknown>;
  for (const key of ['txHash', 'transactionHash', 'signature', 'hash']) {
    const value = record[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return undefined;
}

