import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  GorkhAgentChatToolCard,
  GorkhAgentCloakDraftHandoff,
  GorkhAgentContextBundleResult,
  GorkhAgentStationState,
  GorkhAgentZerionProposalHandoff,
} from '@gorkh/shared';
import type { ManualRunModuleContext, ManualRunResult } from '../../agentRuntime.js';
import {
  loadAgentChatStorageState,
  saveAgentChatStorageState,
  type AgentChatStorageState,
} from '../agentChatStorage.js';
import { loadHandoffEntries } from '../../agentHandoffStorage.js';
import { runAgentChatTurn } from '../runAgentChatTurn.js';
import { normalizeAgentChatSettings } from '../agentChatSettings.js';
import { resolveAgentChatToolCardHandoff } from '../agentChatHandoffResolver.js';
import { GorkhAgentChatSafetyBanner } from './GorkhAgentChatSafetyBanner.js';
import { GorkhAgentQuickPrompts } from './GorkhAgentQuickPrompts.js';
import { GorkhAgentComposer } from './GorkhAgentComposer.js';
import { GorkhAgentMessageList } from './GorkhAgentMessageList.js';
import { GorkhAgentChatSettingsPanel } from './GorkhAgentChatSettingsPanel.js';

export function GorkhAgentChatPanel({
  stationState,
  moduleContext,
  onStationStateChange,
  onOpenWalletCloak,
  onOpenZerionExecutor,
  onOpenShield,
}: {
  stationState: GorkhAgentStationState;
  moduleContext: ManualRunModuleContext;
  onStationStateChange: (state: GorkhAgentStationState) => void;
  onOpenWalletCloak?: (handoff: GorkhAgentCloakDraftHandoff) => void;
  onOpenZerionExecutor?: (handoff: GorkhAgentZerionProposalHandoff) => void;
  onOpenShield?: (prefilledInput: string) => void;
}) {
  const [chatState, setChatState] = useState<AgentChatStorageState>(() => loadAgentChatStorageState());
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRunResult, setLastRunResult] = useState<ManualRunResult | null>(null);

  useEffect(() => {
    saveAgentChatStorageState(chatState);
  }, [chatState]);

  const activeThread = useMemo(
    () => chatState.threads.find((thread) => thread.id === chatState.activeThreadId) ?? chatState.threads[0],
    [chatState]
  );

  const composerDisabled = stationState.runtime.killSwitchEnabled && !/(help|what can you do|status|safety|explain)/i.test(input);

  const handleSend = useCallback(async () => {
    if (!input.trim() || thinking) return;
    setThinking(true);
    setError(null);
    try {
      const result = await runAgentChatTurn({
        stationState,
        chatState,
        userText: input,
        moduleContext,
      });
      onStationStateChange(result.stationState);
      setChatState(result.chatState);
      setLastRunResult(result.manualRunResult ?? null);
      setInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setThinking(false);
    }
  }, [chatState, input, moduleContext, onStationStateChange, stationState, thinking]);

  const handleCardAction = useCallback(
    async (card: GorkhAgentChatToolCard) => {
      const resolved = resolveAgentChatToolCardHandoff(card, loadHandoffEntries());
      if (resolved?.kind === 'cloak_handoff') {
        onOpenWalletCloak?.(resolved.cloakHandoff);
      } else if (resolved?.kind === 'zerion_handoff') {
        onOpenZerionExecutor?.(resolved.zerionHandoff);
      } else if (resolved?.kind === 'shield_handoff') {
        onOpenShield?.(resolved.shieldResult.prefilledInput);
      } else if (resolved?.kind === 'context_bundle') {
        await copyContextBundle(resolved.contextBundle);
      } else if (card.kind === 'cloak_handoff' && lastRunResult?.cloakHandoff) {
        onOpenWalletCloak?.(lastRunResult.cloakHandoff);
      } else if (card.kind === 'zerion_handoff' && lastRunResult?.zerionHandoff) {
        onOpenZerionExecutor?.(lastRunResult.zerionHandoff);
      } else if (card.kind === 'shield_handoff' && lastRunResult?.shieldResult) {
        onOpenShield?.(lastRunResult.shieldResult.prefilledInput);
      } else if (card.kind === 'context_bundle' && lastRunResult?.contextBundle) {
        await copyContextBundle(lastRunResult.contextBundle);
      }
    },
    [lastRunResult, onOpenShield, onOpenWalletCloak, onOpenZerionExecutor]
  );

  return (
    <section data-testid="gorkh-agent-chat-panel" style={panelStyle}>
      <header style={headerStyle}>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#0f172a' }}>
            {activeThread.title}
          </h4>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
            Deterministic · LLM disabled · Redacted context
          </div>
        </div>
        <span style={statusStyle}>local only</span>
      </header>

      <GorkhAgentChatSafetyBanner runtime={stationState.runtime} />
      <GorkhAgentQuickPrompts onSelect={setInput} />
      <GorkhAgentMessageList
        messages={activeThread.messages}
        toolCardsByMessageId={chatState.toolCardsByMessageId}
        thinking={thinking}
        onToolAction={handleCardAction}
      />
      {error && <div style={errorStyle}>{error}</div>}
      <GorkhAgentComposer value={input} disabled={composerDisabled || thinking} onChange={setInput} onSend={handleSend} />
      <GorkhAgentChatSettingsPanel
        settings={chatState.settings}
        onChange={(settings) =>
          setChatState((prev) => ({
            ...prev,
            settings: normalizeAgentChatSettings(settings),
            updatedAt: Date.now(),
          }))
        }
      />
    </section>
  );
}

async function copyContextBundle(bundle: GorkhAgentContextBundleResult): Promise<void> {
  try {
    await navigator.clipboard.writeText(bundle.markdown);
  } catch {
    // Clipboard may be unavailable in tests or restricted webviews.
  }
}

const panelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.65rem',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '0.75rem',
  alignItems: 'center',
};

const statusStyle: React.CSSProperties = {
  borderRadius: '4px',
  background: '#ecfeff',
  color: '#155e75',
  padding: '0.15rem 0.4rem',
  fontSize: '0.65rem',
  fontWeight: 800,
  textTransform: 'uppercase',
};

const errorStyle: React.CSSProperties = {
  color: '#991b1b',
  background: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '6px',
  padding: '0.45rem 0.55rem',
  fontSize: '0.74rem',
};
