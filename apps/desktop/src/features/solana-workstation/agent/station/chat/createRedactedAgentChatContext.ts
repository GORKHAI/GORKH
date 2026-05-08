import type {
  GorkhAgentChatRedactedContext,
  GorkhAgentChatSettings,
  GorkhAgentStationState,
  SolanaMarketsWorkspaceState,
  SolanaWalletWorkspaceState,
  SolanaWorkstationLastModuleContext,
} from '@gorkh/shared';
import { readWalletToolResult, summarizeWalletResult } from '../agentWalletTools.js';
import { readMarketsToolResult, summarizeMarketsResult } from '../agentMarketsTools.js';
import { redactAgentChatText } from './agentChatRedaction.js';

export interface AgentChatContextInput {
  stationState: GorkhAgentStationState;
  settings: GorkhAgentChatSettings;
  walletWorkspace?: SolanaWalletWorkspaceState | null;
  marketsWorkspace?: SolanaMarketsWorkspaceState | null;
  lastModuleContext?: SolanaWorkstationLastModuleContext | null;
  marketsSampleData?: boolean;
}

export function createRedactedAgentChatContext(input: AgentChatContextInput): GorkhAgentChatRedactedContext {
  const lines: string[] = ['# GORKH Agent Chat Redacted Context'];
  const sources: string[] = ['agent_station'];
  const excludedSources: string[] = [];
  const redactions = new Set<string>([
    'private_keys',
    'seed_phrases',
    'wallet_json',
    'cloak_notes',
    'viewing_keys',
    'api_keys',
    'zerion_tokens',
    'raw_signing_payloads',
  ]);
  const warnings: string[] = [];

  lines.push(`Runtime kill switch: ${input.stationState.runtime.killSwitchEnabled}`);
  lines.push(`Policy approvals: cloak=${input.stationState.policy.requireApprovalForCloak}, zerion=${input.stationState.policy.requireApprovalForZerion}`);

  if (input.settings.includeWalletContext) {
    const wallet = readWalletToolResult({ workspace: input.walletWorkspace ?? null });
    sources.push('wallet_workspace');
    lines.push(`Wallet: ${summarizeWalletResult(wallet)}`);
  } else {
    excludedSources.push('wallet_workspace');
  }

  if (input.settings.includeMarketsContext) {
    const markets = readMarketsToolResult({
      workspace: input.marketsWorkspace ?? null,
      sampleDataPresent: input.marketsSampleData,
    });
    sources.push('markets_workspace');
    lines.push(`Markets: ${summarizeMarketsResult(markets)}`);
  } else {
    excludedSources.push('markets_workspace');
  }

  if (input.settings.includeShieldContext && input.lastModuleContext?.shield) {
    sources.push('shield_context');
    lines.push(`Last Shield: ${input.lastModuleContext.shield.summary}`);
    input.lastModuleContext.shield.redactionsApplied.forEach((r) => redactions.add(r));
  } else if (!input.settings.includeShieldContext) {
    excludedSources.push('shield_context');
  }

  if (input.settings.includeShieldContext && input.lastModuleContext?.transactionStudio) {
    const studio = input.lastModuleContext.transactionStudio;
    sources.push('transaction_studio_context');
    lines.push(`Last Transaction Studio: ${studio.decodedSummary}; ${studio.riskSummary}; ${studio.simulationSummary}`);
    studio.redactionsApplied.forEach((r) => redactions.add(r));
  }

  if (input.settings.includeBuilderContext && input.lastModuleContext?.builder) {
    sources.push('builder_context');
    lines.push(`Last Builder: ${input.lastModuleContext.builder.projectKind}; IDLs=${input.lastModuleContext.builder.idlCount}; logs=${input.lastModuleContext.builder.logFindingCount}`);
    input.lastModuleContext.builder.redactionsApplied.forEach((r) => redactions.add(r));
  } else if (!input.settings.includeBuilderContext) {
    excludedSources.push('builder_context');
  }

  if (input.settings.includeMemoryContext) {
    sources.push('memory_non_sensitive');
    const memoryCount = input.stationState.memory.filter((m) => !m.sensitive).length;
    lines.push(`Memory: ${memoryCount} non-sensitive entr${memoryCount === 1 ? 'y' : 'ies'}.`);
    if (memoryCount !== input.stationState.memory.length) redactions.add('memory.sensitive');
  } else {
    excludedSources.push('memory_non_sensitive');
  }

  const redacted = redactAgentChatText(lines.join('\n'));
  redacted.redactionsApplied.forEach((r) => redactions.add(r));
  const markdown = redacted.text.slice(0, input.settings.maxContextChars);
  if (redacted.text.length > markdown.length) warnings.push('Context capped to maxContextChars.');

  return {
    markdown,
    sources: Array.from(new Set(sources)),
    redactionsApplied: Array.from(redactions),
    excludedSources,
    warnings,
    localOnly: true,
  };
}
