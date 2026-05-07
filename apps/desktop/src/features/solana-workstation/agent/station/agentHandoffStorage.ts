import {
  GorkhAgentHandoffEntrySchema,
  hasForbiddenHandoffField,
  type GorkhAgentHandoffEntry,
} from '@gorkh/shared';

const STORAGE_KEY = 'gorkh.solana.agentStation.handoffs.v1';

const MAX_ENTRIES = 50;

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadHandoffEntries(): GorkhAgentHandoffEntry[] {
  const storage = getStorage();
  if (!storage) return [];
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: GorkhAgentHandoffEntry[] = [];
    for (const entry of parsed) {
      const result = GorkhAgentHandoffEntrySchema.safeParse(entry);
      if (result.success) out.push(result.data);
    }
    return out;
  } catch {
    return [];
  }
}

export function saveHandoffEntries(entries: GorkhAgentHandoffEntry[]): void {
  const storage = getStorage();
  if (!storage) return;
  const trimmed = entries.slice(-MAX_ENTRIES);
  const violation = hasForbiddenHandoffField(trimmed);
  if (violation) {
    throw new Error(
      `Handoff storage refused: forbidden field "${violation}" present.`
    );
  }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage may be full or disabled
  }
}

export function appendHandoffEntry(entry: GorkhAgentHandoffEntry): GorkhAgentHandoffEntry[] {
  const next = [...loadHandoffEntries(), entry];
  saveHandoffEntries(next);
  return next;
}

export function clearHandoffEntries(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export const AGENT_HANDOFF_STORAGE_KEY = STORAGE_KEY;
