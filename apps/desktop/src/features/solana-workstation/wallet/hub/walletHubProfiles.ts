import {
  SolanaWalletProfileStatus,
  WalletHubFilter,
  WalletHubProfileSchema,
  WalletProfileKind,
  WalletProfileStatus,
  WALLET_HUB_SAFETY_NOTES,
  type LocalWalletProfile,
  type SolanaWalletProfile,
  type WalletHubProfile,
  type WalletProfileKind as WalletProfileKindType,
} from '@gorkh/shared';
import { validateWalletPublicAddress } from '../walletGuards.js';

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return 'Watch-Only Wallet';
  return trimmed.slice(0, 48);
}

function sanitizeTags(tags: string[]): string[] {
  return tags.map((tag) => tag.trim()).filter(Boolean).map((tag) => tag.slice(0, 24)).slice(0, 8);
}

export function createWatchOnlyWalletHubProfile(input: {
  publicAddress: string;
  label?: string;
  tags?: string[];
  category?: string;
  network?: WalletHubProfile['network'];
  now?: number;
}): WalletHubProfile {
  const error = validateWalletPublicAddress(input.publicAddress);
  if (error) throw new Error(error);

  const now = input.now ?? Date.now();
  return WalletHubProfileSchema.parse({
    id: id('wallet-hub-watch'),
    kind: WalletProfileKind.WATCH_ONLY,
    status: WalletProfileStatus.WATCH_ONLY,
    label: sanitizeLabel(input.label ?? 'Watch-Only Wallet'),
    publicAddress: input.publicAddress.trim(),
    network: input.network ?? 'devnet',
    tags: sanitizeTags(input.tags ?? ['watch-only']),
    category: input.category?.trim().slice(0, 32),
    createdAt: now,
    updatedAt: now,
    localOnly: true,
    safetyNotes: [
      ...WALLET_HUB_SAFETY_NOTES,
      'Watch-only wallet profile. No signing capability exists.',
    ],
  });
}

export function profileKindLabel(kind: WalletProfileKindType): string {
  switch (kind) {
    case WalletProfileKind.LOCAL_VAULT:
      return 'Local Vault';
    case WalletProfileKind.BROWSER_HANDOFF:
      return 'Browser Handoff';
    case WalletProfileKind.WATCH_ONLY:
      return 'Watch-Only';
    case WalletProfileKind.HARDWARE_WALLET_LOCKED:
      return 'Hardware Wallet Locked';
    case WalletProfileKind.MULTISIG_LOCKED:
      return 'Multisig Locked';
    default:
      return kind;
  }
}

export function walletHubProfileFromLocalWallet(wallet: LocalWalletProfile): WalletHubProfile {
  const locked = wallet.securityStatus === 'locked';
  return WalletHubProfileSchema.parse({
    id: `local:${wallet.walletId}`,
    kind: WalletProfileKind.LOCAL_VAULT,
    status: locked ? WalletProfileStatus.LOCKED : WalletProfileStatus.ACTIVE,
    label: wallet.label,
    publicAddress: wallet.publicAddress,
    network: wallet.network,
    tags: ['local-vault'],
    sourceProfileId: wallet.walletId,
    createdAt: wallet.createdAt,
    updatedAt: wallet.updatedAt,
    localOnly: true,
    safetyNotes: [
      ...WALLET_HUB_SAFETY_NOTES,
      'Local vault metadata only. Secret material remains Rust/keychain-side.',
    ],
  });
}

export function walletHubProfileFromWalletProfile(profile: SolanaWalletProfile): WalletHubProfile | null {
  if (!profile.publicAddress) return null;
  const browser = profile.tags.some((tag) => tag.includes('browser') || tag.includes('external_wallet'));
  return WalletHubProfileSchema.parse({
    id: `profile:${profile.id}`,
    kind: browser ? WalletProfileKind.BROWSER_HANDOFF : WalletProfileKind.WATCH_ONLY,
    status: browser ? WalletProfileStatus.DISCONNECTED : WalletProfileStatus.WATCH_ONLY,
    label: profile.label,
    publicAddress: profile.publicAddress,
    network: profile.network,
    tags: sanitizeTags(profile.tags.length > 0 ? profile.tags : browser ? ['browser-handoff'] : ['watch-only']),
    sourceProfileId: profile.id,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    localOnly: true,
    safetyNotes: [
      ...WALLET_HUB_SAFETY_NOTES,
      profile.status === SolanaWalletProfileStatus.ADDRESS_ONLY
        ? 'Address-only profile. No signing capability exists.'
        : 'Wallet profile metadata only.',
    ],
  });
}

export function mergeWalletHubProfiles(input: {
  storedProfiles: WalletHubProfile[];
  walletProfiles: SolanaWalletProfile[];
  localWallets: LocalWalletProfile[];
}): WalletHubProfile[] {
  const byId = new Map<string, WalletHubProfile>();
  for (const profile of input.storedProfiles) byId.set(profile.id, profile);
  for (const profile of input.walletProfiles) {
    const hubProfile = walletHubProfileFromWalletProfile(profile);
    if (hubProfile) byId.set(hubProfile.id, { ...byId.get(hubProfile.id), ...hubProfile });
  }
  for (const wallet of input.localWallets) {
    const hubProfile = walletHubProfileFromLocalWallet(wallet);
    byId.set(hubProfile.id, { ...byId.get(hubProfile.id), ...hubProfile });
  }
  return Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function updateWalletHubProfileLabel(
  profiles: WalletHubProfile[],
  idToUpdate: string,
  label: string,
  now: number = Date.now()
): WalletHubProfile[] {
  return profiles.map((profile) =>
    profile.id === idToUpdate
      ? WalletHubProfileSchema.parse({ ...profile, label: sanitizeLabel(label), updatedAt: now })
      : profile
  );
}

export function updateWalletHubProfileTags(
  profiles: WalletHubProfile[],
  idToUpdate: string,
  tags: string[],
  category?: string,
  now: number = Date.now()
): WalletHubProfile[] {
  return profiles.map((profile) =>
    profile.id === idToUpdate
      ? WalletHubProfileSchema.parse({
          ...profile,
          tags: sanitizeTags(tags),
          category: category?.trim().slice(0, 32),
          updatedAt: now,
        })
      : profile
  );
}

export function removeWatchOnlyWalletHubProfile(
  profiles: WalletHubProfile[],
  idToRemove: string
): WalletHubProfile[] {
  return profiles.filter((profile) => profile.id !== idToRemove || profile.kind !== WalletProfileKind.WATCH_ONLY);
}

export function filterWalletHubProfiles(
  profiles: WalletHubProfile[],
  filter: WalletHubFilter,
  activeProfileId?: string | null
): WalletHubProfile[] {
  if (filter === WalletHubFilter.ACTIVE_WALLET) {
    return activeProfileId ? profiles.filter((profile) => profile.id === activeProfileId) : [];
  }
  if (filter === WalletHubFilter.WATCH_ONLY) {
    return profiles.filter((profile) => profile.kind === WalletProfileKind.WATCH_ONLY);
  }
  if (filter === WalletHubFilter.LOCAL_VAULT) {
    return profiles.filter((profile) => profile.kind === WalletProfileKind.LOCAL_VAULT);
  }
  return profiles;
}
