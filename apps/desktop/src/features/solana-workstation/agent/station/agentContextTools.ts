import {
  GORKH_AGENT_BACKGROUND_COPY,
  GORKH_AGENT_TEMPLATES,
  hasForbiddenHandoffField,
  getGorkhAgentTemplateStatusLabel,
  type GorkhAgentApprovalItem,
  type GorkhAgentAuditEvent,
  type GorkhAgentCloakDraftHandoff,
  type GorkhAgentContextBundleResult,
  type GorkhAgentMarketsToolResult,
  type GorkhAgentMemoryEntry,
  type GorkhAgentPolicy,
  type GorkhAgentProfile,
  type GorkhAgentProposal,
  type GorkhAgentRuntimeState,
  type GorkhAgentShieldToolResult,
  type GorkhAgentTask,
  type GorkhAgentWalletToolResult,
  type GorkhAgentZerionProposalHandoff,
  type SolanaWorkstationLastModuleContext,
} from '@gorkh/shared';

export interface CreateAgentContextBundleInput {
  profile: GorkhAgentProfile;
  runtime: GorkhAgentRuntimeState;
  policy: GorkhAgentPolicy;
  tasks: GorkhAgentTask[];
  proposals: GorkhAgentProposal[];
  approvals: GorkhAgentApprovalItem[];
  audit: GorkhAgentAuditEvent[];
  memory: GorkhAgentMemoryEntry[];
  walletResult?: GorkhAgentWalletToolResult | null;
  marketsResult?: GorkhAgentMarketsToolResult | null;
  shieldResult?: GorkhAgentShieldToolResult | null;
  cloakHandoffs?: GorkhAgentCloakDraftHandoff[];
  zerionHandoffs?: GorkhAgentZerionProposalHandoff[];
  lastModuleContext?: SolanaWorkstationLastModuleContext | null;
}

const ALWAYS_REDACTED = [
  'agent.privateKeys',
  'agent.cloakNoteSecrets',
  'agent.viewingKeys',
  'agent.zerionApiKeys',
  'agent.zerionAgentTokens',
  'agent.rawSignatures',
];

export function createAgentContextBundle(
  input: CreateAgentContextBundleInput
): GorkhAgentContextBundleResult {
  const inputViolation =
    hasForbiddenHandoffField(input.cloakHandoffs ?? []) ??
    hasForbiddenHandoffField(input.zerionHandoffs ?? []);
  if (inputViolation) {
    throw new Error(
      `Context bundle refused: forbidden field "${inputViolation}" present.`
    );
  }

  const lines: string[] = [];
  const sources: string[] = ['agent_station'];
  const redactionsApplied = [...ALWAYS_REDACTED];
  const warnings: string[] = [];

  lines.push(`# GORKH Agent Station — Context Bundle`);
  lines.push('');
  lines.push(`Profile: ${input.profile.name} (${input.profile.version})`);
  lines.push(`Status: ${input.profile.status}`);
  lines.push(
    `Runtime: ${input.runtime.runtimeMode} — running=${input.runtime.isRunning} paused=${input.runtime.isPaused} kill=${input.runtime.killSwitchEnabled}`
  );
  lines.push(`Background: ${GORKH_AGENT_BACKGROUND_COPY}`);
  lines.push('');

  lines.push('## Policy');
  lines.push(`Name: ${input.policy.name}`);
  lines.push(`Allowed tools: ${input.policy.allowedTools.length}`);
  lines.push(`Blocked tools: ${input.policy.blockedTools.length}`);
  lines.push(
    `allowMainWalletAutonomousExecution=${input.policy.allowMainWalletAutonomousExecution}, allowAutonomousCloakSend=${input.policy.allowAutonomousCloakSend}, allowAutonomousTrading=${input.policy.allowAutonomousTrading}, allowAutonomousDaoVoting=${input.policy.allowAutonomousDaoVoting}`
  );
  lines.push('');

  if (input.walletResult) {
    sources.push('wallet_workspace');
    lines.push('## Wallet Summary');
    lines.push(`Profile: ${input.walletResult.selectedProfileLabel ?? '—'}`);
    lines.push(`Network: ${input.walletResult.network ?? '—'}`);
    lines.push(`Snapshot present: ${input.walletResult.hasSnapshot}`);
    if (input.walletResult.solBalanceUi) {
      lines.push(`SOL balance: ${input.walletResult.solBalanceUi}`);
    }
    if (typeof input.walletResult.tokenAccountCount === 'number') {
      lines.push(`Token accounts: ${input.walletResult.tokenAccountCount}`);
    }
    if (typeof input.walletResult.portfolioHoldingCount === 'number') {
      lines.push(`Portfolio holdings: ${input.walletResult.portfolioHoldingCount}`);
    }
    for (const w of input.walletResult.warnings) lines.push(`- warning: ${w}`);
    lines.push('');
  }

  if (input.marketsResult) {
    sources.push('markets_workspace');
    lines.push('## Markets Summary');
    lines.push(`Watchlist count: ${input.marketsResult.watchlistCount}`);
    lines.push(`Sample data: ${input.marketsResult.sampleDataPresent}`);
    lines.push(`Birdeye context: ${input.marketsResult.birdeyeContextPresent}`);
    if (input.marketsResult.selectedItems.length > 0) {
      lines.push(`Recent items:`);
      for (const item of input.marketsResult.selectedItems.slice(0, 5)) {
        lines.push(`- ${item.label ?? item.address.slice(0, 12)} (${item.kind}, risk signals=${item.riskSignalCount})`);
      }
    }
    for (const w of input.marketsResult.warnings) lines.push(`- warning: ${w}`);
    lines.push('');
  }

  if (input.shieldResult) {
    sources.push('shield_context');
    lines.push('## Shield Review Handoff');
    lines.push(`Input kind: ${input.shieldResult.inputKind}`);
    lines.push(
      `Prefilled input length: ${input.shieldResult.prefilledInput.length} chars (open Shield to decode/simulate)`
    );
    for (const w of input.shieldResult.warnings) lines.push(`- warning: ${w}`);
    lines.push('');
  }

  if (input.cloakHandoffs && input.cloakHandoffs.length > 0) {
    sources.push('cloak_handoff');
    lines.push('## Cloak Handoffs');
    for (const handoff of input.cloakHandoffs.slice(-5)) {
      lines.push(
        `- ${handoff.draftKind} ${handoff.amountUi ?? '?'} ${handoff.asset ?? 'SOL'} → ${
          handoff.recipient ? `${handoff.recipient.slice(0, 8)}…` : 'no recipient'
        } (${handoff.handoffStatus}). Execution stays in Wallet → Cloak Private.`
      );
    }
    lines.push('');
  }

  if (input.zerionHandoffs && input.zerionHandoffs.length > 0) {
    sources.push('zerion_handoff');
    lines.push('## Zerion Proposal Handoffs');
    for (const handoff of input.zerionHandoffs.slice(-5)) {
      lines.push(
        `- ${handoff.proposalKind} ${handoff.amountSol} ${handoff.fromToken} → ${handoff.toToken} (${handoff.handoffStatus}). Execution stays in Zerion Executor.`
      );
    }
    lines.push('');
  }

  if (input.lastModuleContext?.shield) {
    sources.push('shield_context');
    const shield = input.lastModuleContext.shield;
    lines.push('## Last Shield Context');
    lines.push(`Input kind: ${shield.inputKind}`);
    lines.push(`Network: ${shield.network}`);
    lines.push(`Summary: ${shield.summary}`);
    lines.push(`Risk findings: ${shield.riskFindingCount}`);
    if (shield.highestRiskLevel) lines.push(`Highest risk: ${shield.highestRiskLevel}`);
    lines.push(`Simulation present: ${shield.simulationAvailable}`);
    lines.push(`RPC lookup present: ${shield.accountLookupAvailable || shield.signatureLookupAvailable}`);
    for (const w of shield.warnings) lines.push(`- warning: ${w}`);
    redactionsApplied.push(...shield.redactionsApplied);
    lines.push('');
  }

  if (input.lastModuleContext?.builder) {
    sources.push('builder_context');
    const builder = input.lastModuleContext.builder;
    lines.push('## Last Builder Context');
    lines.push(`Project: ${builder.projectKind}`);
    if (builder.rootPathLabel) lines.push(`Workspace label: ${builder.rootPathLabel}`);
    if (builder.packageManager) lines.push(`Package manager: ${builder.packageManager}`);
    lines.push(`IDLs: ${builder.idlCount}`);
    lines.push(`Instructions: ${builder.instructionCount}`);
    lines.push(`IDL errors: ${builder.idlErrorCount}`);
    lines.push(`Recent log findings: ${builder.logFindingCount}`);
    if (builder.toolchainAvailable.length > 0) {
      lines.push(`Toolchain: ${builder.toolchainAvailable.join(', ')}`);
    }
    for (const w of builder.warnings) lines.push(`- warning: ${w}`);
    if (builder.recommendedNextChecks.length > 0) {
      lines.push('Recommended next checks:');
      for (const check of builder.recommendedNextChecks) lines.push(`- ${check}`);
    }
    redactionsApplied.push(...builder.redactionsApplied);
    lines.push('');
  }

  lines.push('## Tasks (recent)');
  if (input.tasks.length === 0) lines.push('(none)');
  for (const t of input.tasks.slice(-10)) {
    lines.push(`- [${t.status}] ${t.title} (${t.kind}, risk=${t.riskLevel})`);
  }
  lines.push('');

  lines.push('## Proposals (recent)');
  if (input.proposals.length === 0) lines.push('(none)');
  for (const p of input.proposals.slice(-10)) {
    lines.push(`- ${p.kind}: ${p.summary} (executionBlocked=${p.executionBlocked})`);
  }
  lines.push('');

  lines.push('## Approval Queue');
  if (input.approvals.length === 0) lines.push('(none)');
  for (const a of input.approvals.slice(-10)) {
    lines.push(`- ${a.title} — ${a.approvalState} (risk=${a.riskLevel})`);
  }
  lines.push('');

  lines.push('## Audit (recent)');
  for (const e of input.audit.slice(-15)) {
    lines.push(`- [${new Date(e.createdAt).toISOString()}] ${e.kind}: ${e.summary}`);
  }
  lines.push('');

  lines.push('## Memory (non-sensitive only)');
  const safeMemory = input.memory.filter((m) => !m.sensitive);
  if (safeMemory.length === 0) lines.push('(none)');
  for (const m of safeMemory.slice(-10)) {
    lines.push(`- (${m.kind}) ${m.title}`);
  }
  if (safeMemory.length !== input.memory.length) {
    redactionsApplied.push('memory.sensitive');
    lines.push(
      `(${input.memory.length - safeMemory.length} sensitive memory entr${
        input.memory.length - safeMemory.length === 1 ? 'y' : 'ies'
      } excluded)`
    );
  }
  lines.push('');

  lines.push('## Roadmap Templates');
  for (const tpl of GORKH_AGENT_TEMPLATES) {
    lines.push(`- [${getGorkhAgentTemplateStatusLabel(tpl.status)}] ${tpl.name}`);
  }

  const bundle: GorkhAgentContextBundleResult = {
    id: `gorkh-context-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    markdown: lines.join('\n'),
    sources: Array.from(new Set(sources)),
    redactionsApplied: Array.from(new Set(redactionsApplied)),
    warnings,
    createdAt: Date.now(),
    localOnly: true,
  };

  const violation = hasForbiddenHandoffField(bundle);
  if (violation) {
    throw new Error(
      `Context bundle refused: forbidden field "${violation}" present.`
    );
  }
  return bundle;
}
