import {
  SolanaWorkstationContextBundleSchema,
  type SolanaWorkstationContextBundle,
} from '@gorkh/shared';

const STORAGE_KEY_BUILDER = 'gorkh.solana.contextBridge.builder.v1';
const STORAGE_KEY_BUNDLE = 'gorkh.solana.contextBridge.bundle.v1';

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadSavedBuilderContext(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return storage.getItem(STORAGE_KEY_BUILDER);
  } catch {
    return null;
  }
}

export function saveBuilderContextMarkdown(markdown: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY_BUILDER, markdown);
  } catch {
    // localStorage may be full
  }
}

export function loadSavedContextBundle(): SolanaWorkstationContextBundle | null {
  const storage = getStorage();
  if (!storage) return null;
  const raw = storage.getItem(STORAGE_KEY_BUNDLE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const result = SolanaWorkstationContextBundleSchema.safeParse(parsed);
    if (result.success) return result.data;
    // eslint-disable-next-line no-console
    console.warn('[GORKH ContextBridge] Invalid stored bundle; resetting.', result.error);
    return null;
  } catch {
    return null;
  }
}

export function saveContextBundle(bundle: SolanaWorkstationContextBundle): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY_BUNDLE, JSON.stringify(bundle));
  } catch {
    // localStorage may be full
  }
}

export function clearContextBridgeStorage(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY_BUILDER);
    storage.removeItem(STORAGE_KEY_BUNDLE);
  } catch {
    // ignore
  }
}
