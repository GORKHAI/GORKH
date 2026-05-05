export class SolanaRpcError extends Error {
  constructor(
    message: string,
    public readonly code?: number | string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'SolanaRpcError';
  }
}

export class SolanaRpcDeniedError extends Error {
  constructor(public readonly method: string) {
    super(`RPC method "${method}" is denied for safety.`);
    this.name = 'SolanaRpcDeniedError';
  }
}

export class SolanaRpcTimeoutError extends Error {
  constructor(public readonly method: string, public readonly timeoutMs: number) {
    super(`RPC method "${method}" timed out after ${timeoutMs}ms.`);
    this.name = 'SolanaRpcTimeoutError';
  }
}
