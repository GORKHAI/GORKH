import {
  SOLANA_PRIVATE_PHASE_9B_SAFETY_NOTES,
  type SolanaPrivateWorkspaceState,
  type SolanaPrivateContextSummary,
  type SolanaRpcNetwork,
} from '@gorkh/shared';

export function createPrivateContextSummary(
  state: SolanaPrivateWorkspaceState,
  network: SolanaRpcNetwork
): SolanaPrivateContextSummary {
  const now = new Date().toISOString();
  const activeDrafts = state.drafts.filter(
    (d) => d.status !== 'rejected_local' && d.status !== 'archived_local'
  );

  const draftSummaries = activeDrafts.map((draft) => ({
    title: draft.title,
    kind: draft.kind,
    route: draft.route,
    assetSymbol: draft.assetSymbol,
    amountUi: draft.amountUi,
    riskLevel: draft.riskLevel,
    summary: `Draft ${draft.title} (${draft.kind}) on ${draft.route} with ${draft.blockedReasons.length} blocked reason(s).`,
  }));

  const lines: string[] = [];
  lines.push('# GORKH Private / Confidential Context');
  lines.push('');
  lines.push('> **Planner only.** No private transfer, proof, note, commitment, nullifier, or stealth address is created.');
  lines.push('');
  lines.push(`## Overview`);
  lines.push(`- **Network:** ${network}`);
  lines.push(`- **Active drafts:** ${activeDrafts.length}`);
  lines.push(`- **Receive requests:** ${state.receiveRequests.length}`);
  lines.push(`- **Generated:** ${now}`);
  lines.push('');

  if (draftSummaries.length > 0) {
    lines.push(`## Workflow Drafts`);
    for (const s of draftSummaries) {
      lines.push(`### ${s.title}`);
      lines.push(`- **Kind:** ${s.kind}`);
      lines.push(`- **Route:** ${s.route}`);
      lines.push(`- **Asset:** ${s.assetSymbol} ${s.amountUi ?? ''}`);
      lines.push(`- **Risk level:** ${s.riskLevel}`);
      lines.push(`- **Summary:** ${s.summary}`);
      lines.push('');
    }
  }

  if (state.receiveRequests.length > 0) {
    lines.push(`## Receive Requests`);
    for (const r of state.receiveRequests) {
      lines.push(`- **${r.label}** — ${r.requestedAssetSymbol} ${r.requestedAmountUi ?? ''} (${r.route})`);
    }
    lines.push('');
  }

  lines.push('## Safety Notes');
  for (const note of SOLANA_PRIVATE_PHASE_9B_SAFETY_NOTES) {
    lines.push(`- ${note}`);
  }
  lines.push('');

  return {
    generatedAt: now,
    network,
    draftCount: activeDrafts.length,
    draftSummaries,
    markdown: lines.join('\n'),
    redactionsApplied: [],
    safetyNotes: SOLANA_PRIVATE_PHASE_9B_SAFETY_NOTES,
  };
}
