import type {
  GorkhAgentMarketsSelectedItem,
  GorkhAgentMarketsToolResult,
  SolanaMarketsItemAnalysis,
  SolanaMarketsWorkspaceState,
} from '@gorkh/shared';

export interface ReadMarketsToolInput {
  workspace: SolanaMarketsWorkspaceState | null;
  /** Optional list of provider context names known to be available locally. */
  providerContexts?: string[];
  /** Whether market intelligence currently uses sample/offline data. */
  sampleDataPresent?: boolean;
  /** Whether a Birdeye-derived context blob is already populated locally. */
  birdeyeContextPresent?: boolean;
  /** Optional explicit watchlist subset. */
  selectedItemIds?: string[];
}

export const NO_MARKETS_CONTEXT_WARNING =
  'No market context available. Open Markets and fetch/read context manually.';

const SAMPLE_DATA_WARNING =
  'Markets module is currently using sample/offline data. Live data requires manual refresh.';

export function readMarketsToolResult(input: ReadMarketsToolInput): GorkhAgentMarketsToolResult {
  const ws = input.workspace;
  const providerContexts = (input.providerContexts ?? []).slice(0, 16);
  const sample = input.sampleDataPresent ?? false;
  const birdeye = input.birdeyeContextPresent ?? false;

  if (!ws || (ws.watchlist.length === 0 && ws.analyses.length === 0)) {
    const warnings = [NO_MARKETS_CONTEXT_WARNING];
    if (sample) warnings.push(SAMPLE_DATA_WARNING);
    return {
      watchlistCount: ws?.watchlist.length ?? 0,
      selectedItems: [],
      availableProviderContexts: providerContexts,
      sampleDataPresent: sample,
      birdeyeContextPresent: birdeye,
      warnings,
      source: 'markets_workspace',
      localOnly: true,
    };
  }

  const selectedItems = pickSelectedItems(ws, input.selectedItemIds);

  const warnings: string[] = [];
  if (sample) warnings.push(SAMPLE_DATA_WARNING);

  return {
    watchlistCount: ws.watchlist.length,
    selectedItems,
    availableProviderContexts: providerContexts,
    sampleDataPresent: sample,
    birdeyeContextPresent: birdeye,
    warnings,
    source: 'markets_workspace',
    localOnly: true,
  };
}

function pickSelectedItems(
  ws: SolanaMarketsWorkspaceState,
  selectedItemIds?: string[]
): GorkhAgentMarketsSelectedItem[] {
  const targets = selectedItemIds && selectedItemIds.length > 0
    ? ws.watchlist.filter((item) => selectedItemIds.includes(item.id))
    : ws.selectedItemId
      ? ws.watchlist.filter((item) => item.id === ws.selectedItemId)
      : ws.watchlist.slice(0, 5);

  return targets.map((item) => {
    const analysis = ws.analyses.find((a) => a.item.id === item.id);
    return {
      id: item.id,
      address: item.address,
      label: item.label,
      kind: item.kind,
      riskSignalCount: analysis?.riskSignals.length ?? 0,
    };
  });
}

export function summarizeMarketsResult(result: GorkhAgentMarketsToolResult): string {
  if (result.watchlistCount === 0 && result.selectedItems.length === 0) {
    return 'No watchlist items. Open Markets to add tokens or wallets to watch.';
  }
  const top = result.selectedItems
    .slice(0, 3)
    .map((item) => item.label ?? item.address.slice(0, 8))
    .join(', ');
  return `Markets — ${result.watchlistCount} watchlist item(s)${
    top ? `; recent: ${top}` : ''
  }${result.sampleDataPresent ? ' (sample data)' : ''}.`;
}

/**
 * Pulls a low-risk-signal-based "any high risk" indicator without any
 * RPC/network call.
 */
export function highestRiskInWorkspace(
  analyses: SolanaMarketsItemAnalysis[]
): 'low' | 'medium' | 'high' | undefined {
  let highest: 'low' | 'medium' | 'high' | undefined;
  for (const analysis of analyses) {
    for (const signal of analysis.riskSignals) {
      if (signal.level === 'high') return 'high';
      if (signal.level === 'medium') highest = 'medium';
      else if (!highest) highest = 'low';
    }
  }
  return highest;
}
