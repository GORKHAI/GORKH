import { SolanaWalletOwnershipProofRequestSchema, SolanaWalletVerifiedOwnershipSchema } from '@gorkh/shared';
import type { SolanaWalletOwnershipProofRequest, SolanaWalletVerifiedOwnership } from '@gorkh/shared';

const REQUEST_KEY = 'gorkh.solana.wallet.ownershipProof.request.v1';
const VERIFIED_KEY = 'gorkh.solana.wallet.ownershipProof.verified.v1';

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Pending request
// ---------------------------------------------------------------------------

export function loadPendingOwnershipProofRequest(): SolanaWalletOwnershipProofRequest | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(REQUEST_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const validated = SolanaWalletOwnershipProofRequestSchema.safeParse(parsed);
    if (!validated.success) {
      storage.removeItem(REQUEST_KEY);
      return null;
    }

    if (Date.now() > validated.data.expiresAt) {
      storage.removeItem(REQUEST_KEY);
      return null;
    }

    return validated.data;
  } catch {
    storage.removeItem(REQUEST_KEY);
    return null;
  }
}

export function savePendingOwnershipProofRequest(request: SolanaWalletOwnershipProofRequest): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(REQUEST_KEY, JSON.stringify(request));
  } catch {
    // Best-effort only.
  }
}

export function clearPendingOwnershipProofRequest(): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(REQUEST_KEY);
  } catch {
    // Best-effort only.
  }
}

// ---------------------------------------------------------------------------
// Verified ownership
// ---------------------------------------------------------------------------

export function loadVerifiedOwnershipProofs(): SolanaWalletVerifiedOwnership[] {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(VERIFIED_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      storage.removeItem(VERIFIED_KEY);
      return [];
    }

    const validated = parsed
      .map((p) => SolanaWalletVerifiedOwnershipSchema.safeParse(p))
      .filter((r) => r.success)
      .map((r) => r.data);

    return validated;
  } catch {
    storage.removeItem(VERIFIED_KEY);
    return [];
  }
}

export function saveVerifiedOwnershipProof(proof: SolanaWalletVerifiedOwnership): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    const existing = loadVerifiedOwnershipProofs();
    // Replace if same address
    const filtered = existing.filter((p) => p.publicAddress !== proof.publicAddress);
    const updated = [...filtered, proof];
    storage.setItem(VERIFIED_KEY, JSON.stringify(updated));
  } catch {
    // Best-effort only.
  }
}

export function clearVerifiedOwnershipProofs(): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(VERIFIED_KEY);
  } catch {
    // Best-effort only.
  }
}
