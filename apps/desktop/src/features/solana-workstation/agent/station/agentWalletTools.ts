import type {
  GorkhAgentWalletToolResult,
  SolanaWalletPortfolioSummary,
  SolanaWalletProfile,
  SolanaWalletReadOnlySnapshot,
  SolanaWalletWorkspaceState,
} from '@gorkh/shared';

export interface ReadWalletToolInput {
  workspace: SolanaWalletWorkspaceState | null;
  selectedProfileIdOverride?: string;
  portfolioSummary?: SolanaWalletPortfolioSummary | null;
}

export const NO_WALLET_SNAPSHOT_WARNING =
  'No wallet snapshot available. Open Wallet → Snapshot and refresh manually.';

const NO_WALLET_PROFILE_WARNING =
  'No wallet profile selected. Add or select a profile inside the Wallet module.';

export function readWalletToolResult(input: ReadWalletToolInput): GorkhAgentWalletToolResult {
  const ws = input.workspace;
  if (!ws || ws.profiles.length === 0) {
    return {
      hasSnapshot: false,
      warnings: [NO_WALLET_PROFILE_WARNING, NO_WALLET_SNAPSHOT_WARNING],
      source: 'wallet_workspace',
      localOnly: true,
    };
  }

  const profile = pickProfile(ws, input.selectedProfileIdOverride);
  if (!profile) {
    return {
      hasSnapshot: false,
      warnings: [NO_WALLET_PROFILE_WARNING],
      source: 'wallet_workspace',
      localOnly: true,
    };
  }

  const snapshot = pickLatestSnapshot(ws.readOnlySnapshots, profile.id);
  const summary = input.portfolioSummary ?? null;

  const warnings: string[] = [];
  if (!snapshot) warnings.push(NO_WALLET_SNAPSHOT_WARNING);

  return {
    selectedProfileId: profile.id,
    selectedProfileLabel: profile.label,
    publicAddress: profile.publicAddress,
    network: profile.network,
    hasSnapshot: Boolean(snapshot),
    solBalanceUi: snapshot?.solBalanceUi ?? summary?.solBalanceUi,
    tokenAccountCount: snapshot?.tokenAccountCount ?? summary?.tokenAccountCount,
    portfolioHoldingCount: summary?.tokenHoldingCount,
    ownershipStatus: summary?.ownershipProofStatus,
    snapshotFetchedAt: snapshot?.fetchedAt,
    warnings,
    source: 'wallet_workspace',
    localOnly: true,
  };
}

function pickProfile(
  ws: SolanaWalletWorkspaceState,
  override?: string
): SolanaWalletProfile | undefined {
  if (override) {
    const found = ws.profiles.find((p) => p.id === override);
    if (found) return found;
  }
  if (ws.selectedProfileId) {
    const found = ws.profiles.find((p) => p.id === ws.selectedProfileId);
    if (found) return found;
  }
  return ws.profiles[0];
}

function pickLatestSnapshot(
  snapshots: SolanaWalletReadOnlySnapshot[],
  profileId: string
): SolanaWalletReadOnlySnapshot | undefined {
  const matches = snapshots.filter((s) => s.walletProfileId === profileId);
  if (matches.length === 0) return undefined;
  return matches.reduce((acc, s) =>
    (s.fetchedAt ?? 0) > (acc.fetchedAt ?? 0) ? s : acc
  );
}

export function summarizeWalletResult(result: GorkhAgentWalletToolResult): string {
  if (!result.selectedProfileLabel) {
    return 'No wallet profile selected. Open Wallet to add or pick one.';
  }
  if (!result.hasSnapshot) {
    return `Wallet ${result.selectedProfileLabel} has no snapshot yet. Open Wallet → Snapshot to refresh.`;
  }
  const sol = result.solBalanceUi ? `${result.solBalanceUi} SOL` : 'unknown SOL balance';
  const tokens =
    typeof result.tokenAccountCount === 'number'
      ? `${result.tokenAccountCount} token account(s)`
      : 'unknown token accounts';
  const holdings =
    typeof result.portfolioHoldingCount === 'number'
      ? `${result.portfolioHoldingCount} holding(s)`
      : '';
  const parts = [result.selectedProfileLabel, sol, tokens, holdings].filter(Boolean);
  return `Wallet snapshot — ${parts.join(' · ')} (${result.network ?? 'unknown network'}).`;
}
