import { DeveloperToolboxContextSnapshotSchema, type DeveloperToolboxContextSnapshot } from '@gorkh/shared';

const STORAGE_KEY = 'gorkh.solana.builderToolbox.lastContext.v1';

const FORBIDDEN_PATTERNS = [
  /privateKey/i,
  /seedPhrase/i,
  /walletJson/i,
  /apiKey/i,
  /authHeader/i,
  /authorization/i,
  /cloakNote/i,
  /viewingKey/i,
  /zerion/i,
  /\bsk_[A-Za-z0-9_-]{16,}/,
  /\bzk_[A-Za-z0-9_-]{16,}/,
  /api[-_]?key=/i,
  /token=/i,
];

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function assertSafeBuilderToolboxSnapshot(snapshot: unknown): void {
  const text = JSON.stringify(snapshot);
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) throw new Error('Builder Toolbox context refused sensitive material.');
  }
}

export function saveBuilderToolboxContextSnapshot(snapshot: DeveloperToolboxContextSnapshot): void {
  const normalized = {
    ...snapshot,
    updatedAt: Date.now(),
    localOnly: true as const,
  };
  assertSafeBuilderToolboxSnapshot(normalized);
  const result = DeveloperToolboxContextSnapshotSchema.safeParse(normalized);
  if (!result.success) return;
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(result.data));
}

export function loadBuilderToolboxContextSnapshot(): DeveloperToolboxContextSnapshot | null {
  const storage = getStorage();
  if (!storage) return null;
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const result = DeveloperToolboxContextSnapshotSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export const BUILDER_TOOLBOX_CONTEXT_STORAGE_KEY = STORAGE_KEY;
