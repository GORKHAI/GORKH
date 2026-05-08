import {
  PortfolioContextSnapshotSchema,
  PortfolioSnapshotSchema,
  WALLET_HUB_ACTIVE_PROFILE_STORAGE_KEY,
  WALLET_HUB_CONTEXT_STORAGE_KEY,
  WALLET_HUB_PORTFOLIO_HISTORY_STORAGE_KEY,
  WALLET_HUB_STORAGE_KEY,
  WalletHubProfileSchema,
  type PortfolioContextSnapshot,
  type PortfolioSnapshot,
  type WalletHubProfile,
} from '@gorkh/shared';

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const FORBIDDEN_SERIALIZED_PATTERNS = [
  /privateKey/i,
  /private\s+key/i,
  /seed\s+phrase/i,
  /wallet\s+json/i,
  /secretKey/i,
  /cloak\s+note/i,
  /viewing\s+key/i,
  /zerion.*token/i,
  /api\s+key/i,
  /rawSigning/i,
  /signaturePayload/i,
];

export function assertSafeWalletHubSerialized(value: unknown): void {
  const serialized = JSON.stringify(value);
  for (const pattern of FORBIDDEN_SERIALIZED_PATTERNS) {
    if (pattern.test(serialized)) {
      throw new Error('Wallet Hub storage rejected forbidden secret material.');
    }
  }
}

export function loadWalletHubProfiles(): WalletHubProfile[] {
  const storage = getStorage();
  if (!storage) return [];
  const raw = storage.getItem(WALLET_HUB_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => WalletHubProfileSchema.safeParse(item))
      .filter((result) => result.success)
      .map((result) => result.data);
  } catch {
    return [];
  }
}

export function saveWalletHubProfiles(profiles: WalletHubProfile[]): void {
  assertSafeWalletHubSerialized(profiles);
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(WALLET_HUB_STORAGE_KEY, JSON.stringify(profiles));
}

export function loadActiveWalletHubProfileId(): string | null {
  return getStorage()?.getItem(WALLET_HUB_ACTIVE_PROFILE_STORAGE_KEY) ?? null;
}

export function saveActiveWalletHubProfileId(profileId: string | null): void {
  const storage = getStorage();
  if (!storage) return;
  if (profileId) storage.setItem(WALLET_HUB_ACTIVE_PROFILE_STORAGE_KEY, profileId);
  else storage.removeItem(WALLET_HUB_ACTIVE_PROFILE_STORAGE_KEY);
}

export function loadPortfolioSnapshots(): PortfolioSnapshot[] {
  const storage = getStorage();
  if (!storage) return [];
  const raw = storage.getItem(WALLET_HUB_PORTFOLIO_HISTORY_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => PortfolioSnapshotSchema.safeParse(item))
      .filter((result) => result.success)
      .map((result) => result.data);
  } catch {
    return [];
  }
}

export function savePortfolioSnapshots(snapshots: PortfolioSnapshot[]): void {
  assertSafeWalletHubSerialized(snapshots);
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(WALLET_HUB_PORTFOLIO_HISTORY_STORAGE_KEY, JSON.stringify(snapshots.slice(0, 24)));
}

export function saveWalletHubContextSnapshot(snapshot: PortfolioContextSnapshot): void {
  const parsed = PortfolioContextSnapshotSchema.parse(snapshot);
  assertSafeWalletHubSerialized(parsed);
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(WALLET_HUB_CONTEXT_STORAGE_KEY, JSON.stringify(parsed));
}
