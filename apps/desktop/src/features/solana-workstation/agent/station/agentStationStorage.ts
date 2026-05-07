import {
  GorkhAgentStationStateSchema,
  createEmptyGorkhAgentStationState,
  type GorkhAgentStationState,
} from '@gorkh/shared';

const STORAGE_KEY = 'gorkh.solana.agentStation.v1';

const FORBIDDEN_KEY_NAMES = [
  'privateKey',
  'private_key',
  'seedPhrase',
  'seed_phrase',
  'mnemonic',
  'walletJson',
  'wallet_json',
  'walletBackup',
  'cloakNoteSecret',
  'cloak_note_secret',
  'viewingKey',
  'viewing_key',
  'apiKey',
  'api_key',
  'agentToken',
  'agent_token',
];

const SECRET_PATTERNS: RegExp[] = [
  /zk_[A-Za-z0-9_-]{8,}/,
  /(^|[^a-z])sk_[A-Za-z0-9_-]{16,}/,
];

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function assertNoSensitiveAgentStationContent(value: unknown): void {
  let text: string;
  try {
    text = JSON.stringify(value);
  } catch {
    return;
  }
  for (const forbidden of FORBIDDEN_KEY_NAMES) {
    // Match only when the forbidden token appears as a JSON object key (`"foo":`)
    // — NOT as a substring of an unrelated identifier such as the
    // `wallet.export_private_key` blocked-tool literal.
    const keyPattern = new RegExp(`"${forbidden}"\\s*:`);
    if (keyPattern.test(text)) {
      throw new Error(
        `GORKH Agent Station storage must not contain ${forbidden}.`
      );
    }
  }
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error(
        'GORKH Agent Station storage must not contain API key-like material.'
      );
    }
  }
}

export function loadAgentStationState(): GorkhAgentStationState {
  const storage = getStorage();
  if (!storage) {
    return createEmptyGorkhAgentStationState();
  }
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return createEmptyGorkhAgentStationState();
  }
  try {
    const parsed = JSON.parse(raw);
    const result = GorkhAgentStationStateSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
    return createEmptyGorkhAgentStationState();
  } catch {
    return createEmptyGorkhAgentStationState();
  }
}

export function saveAgentStationState(state: GorkhAgentStationState): void {
  assertNoSensitiveAgentStationContent(state);
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be full or disabled; fail silently
  }
}

export function clearAgentStationState(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export const AGENT_STATION_STORAGE_KEY = STORAGE_KEY;
