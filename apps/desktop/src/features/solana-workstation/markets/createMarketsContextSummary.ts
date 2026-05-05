import {
  SOLANA_MARKETS_PHASE_8_SAFETY_NOTES,
  SOLANA_MARKETS_PHASE_17_SAFETY_NOTES,
  SOLANA_MARKETS_PHASE_18_SAFETY_NOTES,
  type SolanaMarketsWorkspaceState,
  type SolanaMarketsContextSummary,
  type SolanaRpcNetwork,
} from '@gorkh/shared';

export function createMarketsContextSummary(
  state: SolanaMarketsWorkspaceState,
  network: SolanaRpcNetwork
): SolanaMarketsContextSummary {
  const now = new Date().toISOString();
  const activeItems = state.watchlist.filter((i) => i.status !== 'archived');
  const analyses = state.analyses;

  const itemSummaries = activeItems.map((item) => {
    const analysis = analyses.find((a) => a.item.id === item.id);
    return {
      label: item.label,
      address: item.address,
      kind: item.kind,
      riskSignalCount: analysis?.riskSignals.length ?? 0,
      summary: analysis?.summary ?? 'No analysis available.',
    };
  });

  const lines: string[] = [];
  lines.push('# GORKH Markets Context');
  lines.push('');
  lines.push('> **Read-only market intelligence.** No trading. No signing. No execution.');
  lines.push('');
  lines.push(`## Overview`);
  lines.push(`- **Network:** ${network}`);
  lines.push(`- **Watchlist items:** ${activeItems.length}`);
  lines.push(`- **Generated:** ${now}`);
  lines.push('');

  if (itemSummaries.length > 0) {
    lines.push(`## Watchlist`);
    for (const s of itemSummaries) {
      lines.push(`### ${s.label ?? s.address}`);
      lines.push(`- **Address:** ${s.address}`);
      lines.push(`- **Kind:** ${s.kind}`);
      lines.push(`- **Risk signals:** ${s.riskSignalCount}`);
      lines.push(`- **Summary:** ${s.summary}`);
      lines.push('');
    }
  }

  lines.push('## Safety Notes');
  for (const note of SOLANA_MARKETS_PHASE_8_SAFETY_NOTES) {
    lines.push(`- ${note}`);
  }
  for (const note of SOLANA_MARKETS_PHASE_17_SAFETY_NOTES) {
    lines.push(`- ${note}`);
  }
  for (const note of SOLANA_MARKETS_PHASE_18_SAFETY_NOTES) {
    lines.push(`- ${note}`);
  }
  lines.push('');

  return {
    generatedAt: now,
    network,
    watchlistCount: activeItems.length,
    itemSummaries,
    markdown: lines.join('\n'),
    redactionsApplied: [],
    safetyNotes: [
      ...SOLANA_MARKETS_PHASE_8_SAFETY_NOTES,
      ...SOLANA_MARKETS_PHASE_17_SAFETY_NOTES,
      ...SOLANA_MARKETS_PHASE_18_SAFETY_NOTES,
    ],
  };
}
