import { useState, useCallback, useEffect, type ReactNode } from 'react';
import type { WorkstationModuleId, WorkstationViewId } from './layout/workstationNavigation.js';
import { WorkstationShell } from './layout/WorkstationShell.js';
import { WorkstationDashboard } from './layout/WorkstationDashboard.js';
import { WorkstationModuleHeader } from './layout/WorkstationModuleHeader.js';
import { ShieldWorkbench } from './shield/index.js';
import { BuilderWorkbench } from './builder/index.js';
import { AgentWorkbench } from './agent/index.js';
import { ContextBridgePanel } from './context-bridge/index.js';
import { MarketsWorkbench } from './markets/index.js';
import { WalletWorkbench } from './wallet/index.js';
import { saveBuilderContextMarkdown } from './context-bridge/contextBridgeStorage.js';
import { loadWalletWorkspaceState } from './wallet/walletStorage.js';
import { loadMarketsWorkspaceState } from './markets/marketsStorage.js';
import type {
  GorkhAgentCloakDraftHandoff,
  GorkhAgentZerionProposalHandoff,
  SolanaMarketsWorkspaceState,
  SolanaWalletWorkspaceState,
} from '@gorkh/shared';

export function SolanaWorkstation({
  assistantActive = false,
  assistantContent,
  onAssistantActiveChange,
  onOpenSettings,
}: {
  assistantActive?: boolean;
  assistantContent?: ReactNode;
  onAssistantActiveChange?: (active: boolean) => void;
  onOpenSettings?: () => void;
}) {
  const [activeModule, setActiveModule] = useState<WorkstationModuleId | null>(null);
  const [shieldPrefilledInput, setShieldPrefilledInput] = useState<string | undefined>(undefined);
  const [savedBuilderContext, setSavedBuilderContext] = useState<string | null>(null);
  const [pendingCloakHandoff, setPendingCloakHandoff] =
    useState<GorkhAgentCloakDraftHandoff | null>(null);
  const [pendingZerionProposal, setPendingZerionProposal] =
    useState<GorkhAgentZerionProposalHandoff | null>(null);
  const [walletWorkspace, setWalletWorkspace] = useState<SolanaWalletWorkspaceState | null>(
    () => loadWalletWorkspaceState()
  );
  const [marketsWorkspace, setMarketsWorkspace] = useState<SolanaMarketsWorkspaceState | null>(
    () => loadMarketsWorkspaceState()
  );

  // Refresh module workspaces when the user opens Agent (cheap re-read of localStorage).
  useEffect(() => {
    if (activeModule === 'agent') {
      setWalletWorkspace(loadWalletWorkspaceState());
      setMarketsWorkspace(loadMarketsWorkspaceState());
    }
  }, [activeModule]);

  const handleSelectModule = useCallback((id: WorkstationViewId | null) => {
    if (id === 'assistant') {
      onAssistantActiveChange?.(true);
      return;
    }
    onAssistantActiveChange?.(false);
    setActiveModule((current) => (current === id ? null : id));
  }, [onAssistantActiveChange]);

  const handlePrefillShield = useCallback(
    (input: string) => {
      setShieldPrefilledInput(input);
      setActiveModule('shield');
    },
    []
  );

  const handleSaveBuilderContext = useCallback((markdown: string) => {
    setSavedBuilderContext(markdown);
    saveBuilderContextMarkdown(markdown);
  }, []);

  const handleOpenWalletCloak = useCallback((handoff: GorkhAgentCloakDraftHandoff) => {
    setPendingCloakHandoff(handoff);
    onAssistantActiveChange?.(false);
    setActiveModule('wallet');
  }, [onAssistantActiveChange]);

  const handleOpenZerionExecutor = useCallback((handoff: GorkhAgentZerionProposalHandoff) => {
    setPendingZerionProposal(handoff);
    onAssistantActiveChange?.(false);
    setActiveModule('agent');
  }, [onAssistantActiveChange]);

  return (
    <WorkstationShell
      activeModule={assistantActive ? 'assistant' : activeModule}
      onSelectModule={handleSelectModule}
      onShieldPrefill={handlePrefillShield}
      onOpenSettings={onOpenSettings}
      onOpenAssistant={() => onAssistantActiveChange?.(!assistantActive)}
      assistantActive={assistantActive}
    >
      {assistantActive && (
        <div className="gorkh-assistant-workspace">
          {assistantContent}
        </div>
      )}

      {!assistantActive && activeModule === null && (
        <WorkstationDashboard
          onSelectModule={handleSelectModule}
        />
      )}

      {!assistantActive && activeModule === 'shield' && (
        <div>
          <WorkstationModuleHeader moduleId="shield" />
          <ShieldWorkbench prefilledInput={shieldPrefilledInput} />
        </div>
      )}

      {!assistantActive && activeModule === 'builder' && (
        <div>
          <WorkstationModuleHeader moduleId="builder" />
          <BuilderWorkbench onSaveContext={handleSaveBuilderContext} />
        </div>
      )}

      {!assistantActive && activeModule === 'agent' && (
        <div>
          <WorkstationModuleHeader moduleId="agent" />
          {pendingZerionProposal && (
            <div
              data-testid="pending-zerion-handoff-banner"
              style={{
                margin: '0 0 0.75rem',
                padding: '0.6rem 0.75rem',
                borderRadius: '6px',
                background: '#fef3c7',
                border: '1px solid #fde68a',
                fontSize: '0.78rem',
                color: '#92400e',
              }}
            >
              GORKH Agent prepared a Zerion proposal handoff ({pendingZerionProposal.proposalKind},{' '}
              {pendingZerionProposal.amountSol} SOL → USDC). Review it inside the Zerion Executor tab — execution still requires explicit approval.
            </div>
          )}
          <AgentWorkbench
            onPrefillShield={handlePrefillShield}
            savedBuilderContext={savedBuilderContext}
            walletWorkspace={walletWorkspace}
            marketsWorkspace={marketsWorkspace}
            onOpenWalletCloak={handleOpenWalletCloak}
            onOpenZerionExecutor={handleOpenZerionExecutor}
            pendingZerionProposal={pendingZerionProposal}
          />
        </div>
      )}

      {!assistantActive && activeModule === 'context' && (
        <div>
          <WorkstationModuleHeader moduleId="context" />
          <ContextBridgePanel
            agents={[]}
            drafts={[]}
            attestationPreviews={[]}
            auditEvents={[]}
            savedBuilderContext={savedBuilderContext}
            shieldAnalysis={null}
          />
        </div>
      )}

      {!assistantActive && activeModule === 'markets' && (
        <div>
          <WorkstationModuleHeader moduleId="markets" />
          <MarketsWorkbench />
        </div>
      )}

      {!assistantActive && activeModule === 'wallet' && (
        <div>
          <WorkstationModuleHeader moduleId="wallet" />
          {pendingCloakHandoff && (
            <div
              data-testid="pending-cloak-handoff-banner"
              style={{
                margin: '0 0 0.75rem',
                padding: '0.6rem 0.75rem',
                borderRadius: '6px',
                background: '#fef3c7',
                border: '1px solid #fde68a',
                fontSize: '0.78rem',
                color: '#92400e',
              }}
            >
              GORKH Agent prepared a Cloak {pendingCloakHandoff.draftKind} draft
              {pendingCloakHandoff.amountUi ? ` for ${pendingCloakHandoff.amountUi} ${pendingCloakHandoff.asset ?? 'SOL'}` : ''}
              . Open Wallet → Private / Cloak to review and approve. Execution remains manual.
            </div>
          )}
          <WalletWorkbench pendingCloakHandoff={pendingCloakHandoff} />
        </div>
      )}
    </WorkstationShell>
  );
}
