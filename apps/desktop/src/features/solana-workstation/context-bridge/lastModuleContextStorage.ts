import {
  SolanaWorkstationContextSource,
  SolanaWorkstationLastModuleContextSchema,
  type SolanaWorkstationLastBuilderContext,
  type SolanaWorkstationLastModuleContext,
  type SolanaWorkstationLastShieldContext,
} from '@gorkh/shared';

const STORAGE_KEY = 'gorkh.solana.contextBridge.lastModuleContext.v1';

const FORBIDDEN_PATTERNS = [
  /privateKey/i,
  /seedPhrase/i,
  /walletJson/i,
  /cloakNoteSecret/i,
  /viewingKey/i,
  /apiKey/i,
  /agentToken/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /\bsk_[A-Za-z0-9_-]{16,}/,
  /\bzk_[A-Za-z0-9_-]{16,}/,
];

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function assertSafeSnapshot(value: unknown): void {
  const text = JSON.stringify(value);
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error('Last module context refused sensitive material.');
    }
  }
}

export function createEmptyLastModuleContext(): SolanaWorkstationLastModuleContext {
  return {
    updatedAt: Date.now(),
    localOnly: true,
  };
}

export function loadLastModuleContext(): SolanaWorkstationLastModuleContext {
  const storage = getStorage();
  if (!storage) return createEmptyLastModuleContext();
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return createEmptyLastModuleContext();
  try {
    const parsed = JSON.parse(raw);
    const result = SolanaWorkstationLastModuleContextSchema.safeParse(parsed);
    if (result.success) return result.data;
    return createEmptyLastModuleContext();
  } catch {
    return createEmptyLastModuleContext();
  }
}

export function saveLastModuleContext(state: SolanaWorkstationLastModuleContext): void {
  const storage = getStorage();
  if (!storage) return;
  const normalized = {
    ...state,
    updatedAt: Date.now(),
    localOnly: true as const,
  };
  assertSafeSnapshot(normalized);
  const result = SolanaWorkstationLastModuleContextSchema.safeParse(normalized);
  if (!result.success) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(result.data));
  } catch {
    // localStorage may be full or disabled.
  }
}

export function saveLastShieldContext(snapshot: SolanaWorkstationLastShieldContext): void {
  const current = loadLastModuleContext();
  saveLastModuleContext({
    ...current,
    shield: {
      ...snapshot,
      source: SolanaWorkstationContextSource.SHIELD,
      localOnly: true,
      updatedAt: Date.now(),
    },
  });
}

export function saveLastBuilderContext(snapshot: SolanaWorkstationLastBuilderContext): void {
  const current = loadLastModuleContext();
  saveLastModuleContext({
    ...current,
    builder: {
      ...snapshot,
      source: SolanaWorkstationContextSource.BUILDER,
      localOnly: true,
      updatedAt: Date.now(),
    },
  });
}

export function clearLastModuleContext(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export const LAST_MODULE_CONTEXT_STORAGE_KEY = STORAGE_KEY;
