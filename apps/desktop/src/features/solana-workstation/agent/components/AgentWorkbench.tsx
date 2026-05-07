import { useState, useCallback, useEffect } from 'react';
import {
  SolanaAgentActionStatus,
  getAgentActionKindLabel,
  type SolanaAgentProfile,
  type SolanaAgentPolicy,
  type SolanaAgentActionDraft,
  type SolanaAgentAttestationPreview,
} from '@gorkh/shared';
import { AgentSafetyPanel } from './AgentSafetyPanel.js';
import { AgentProfilePanel } from './AgentProfilePanel.js';
import { AgentPolicyPanel } from './AgentPolicyPanel.js';
import { ProtocolPermissionsPanel } from './ProtocolPermissionsPanel.js';
import { ActionDraftPanel } from './ActionDraftPanel.js';
import { AttestationPreviewPanel } from './AttestationPreviewPanel.js';
import { AgentAuditTimeline } from './AgentAuditTimeline.js';
import { AgentExportPanel } from './AgentExportPanel.js';
import { ZerionAgentExecutorPanel } from '../zerion/index.js';
import { GorkhAgentStationPanel } from '../station/index.js';
import { createDefaultAgent } from '../createDefaultAgent.js';
import {
  loadAgentWorkspaceState,
  saveAgentWorkspaceState,
  createEmptyAgentWorkspaceState,
} from '../agentStorage.js';
import {
  auditAgentCreated,
  auditAgentUpdated,
  auditPolicyUpdated,
  auditActionDrafted,
  auditAttestationPreviewGenerated,
  auditActionRejectedLocal,
} from '../agentAudit.js';
import {
  prefillShieldFromAgentDraft,
  attachBuilderContextToAgentDraft,
  rejectAgentDraft,
  archiveAgentDraft,
} from '../../context-bridge/bridgeActions.js';

type AgentTab = 'station' | 'agents' | 'policy' | 'draft' | 'zerion' | 'attestation' | 'audit' | 'export' | 'safety';

const TABS: { id: AgentTab; label: string }[] = [
  { id: 'station', label: 'GORKH Agent' },
  { id: 'zerion', label: 'Zerion Executor' },
  { id: 'agents', label: 'Legacy Agents' },
  { id: 'policy', label: 'Policy' },
  { id: 'draft', label: 'Draft Action' },
  { id: 'attestation', label: 'Attestation Preview' },
  { id: 'audit', label: 'Audit' },
  { id: 'export', label: 'Export' },
  { id: 'safety', label: 'Safety' },
];

export function AgentWorkbench({
  onPrefillShield,
  savedBuilderContext,
  walletWorkspace,
  marketsWorkspace,
  lastModuleContext,
  marketsSampleData,
  onOpenWalletCloak,
  onOpenZerionExecutor,
  pendingZerionProposal,
}: {
  onPrefillShield?: (input: string) => void;
  savedBuilderContext?: string | null;
  walletWorkspace?: import('@gorkh/shared').SolanaWalletWorkspaceState | null;
  marketsWorkspace?: import('@gorkh/shared').SolanaMarketsWorkspaceState | null;
  lastModuleContext?: import('@gorkh/shared').SolanaWorkstationLastModuleContext | null;
  marketsSampleData?: boolean;
  onOpenWalletCloak?: (handoff: import('@gorkh/shared').GorkhAgentCloakDraftHandoff) => void;
  onOpenZerionExecutor?: (handoff: import('@gorkh/shared').GorkhAgentZerionProposalHandoff) => void;
  pendingZerionProposal?: import('@gorkh/shared').GorkhAgentZerionProposalHandoff | null;
}) {
  const [activeTab, setActiveTab] = useState<AgentTab>('station');
  const [state, setState] = useState(() => {
    const loaded = loadAgentWorkspaceState();
    return loaded ?? createEmptyAgentWorkspaceState();
  });

  useEffect(() => {
    saveAgentWorkspaceState(state);
  }, [state]);

  useEffect(() => {
    if (pendingZerionProposal) {
      setActiveTab('zerion');
    }
  }, [pendingZerionProposal]);

  const selectedAgent = state.agents.find((a) => a.id === state.selectedAgentId);

  const handleCreateDefault = useCallback(() => {
    const agent = createDefaultAgent();
    const event = auditAgentCreated(agent);
    setState((prev) => ({
      ...prev,
      agents: [...prev.agents, agent],
      selectedAgentId: agent.id,
      auditEvents: [...prev.auditEvents, event],
      updatedAt: Date.now(),
    }));
  }, []);

  const handleSelectAgent = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      selectedAgentId: id || undefined,
      updatedAt: Date.now(),
    }));
  }, []);

  const handleUpdateAgent = useCallback((agent: SolanaAgentProfile) => {
    const event = auditAgentUpdated(agent);
    setState((prev) => ({
      ...prev,
      agents: prev.agents.map((a) => (a.id === agent.id ? agent : a)),
      auditEvents: [...prev.auditEvents, event],
      updatedAt: Date.now(),
    }));
  }, []);

  const handleUpdatePolicy = useCallback(
    (policy: SolanaAgentPolicy) => {
      if (!selectedAgent) return;
      const updatedAgent: SolanaAgentProfile = {
        ...selectedAgent,
        policy,
        updatedAt: Date.now(),
      };
      const event = auditPolicyUpdated(updatedAgent);
      setState((prev) => ({
        ...prev,
        agents: prev.agents.map((a) => (a.id === updatedAgent.id ? updatedAgent : a)),
        auditEvents: [...prev.auditEvents, event],
        updatedAt: Date.now(),
      }));
    },
    [selectedAgent]
  );

  const handleCreateDraft = useCallback((draft: SolanaAgentActionDraft) => {
    const agent = state.agents.find((a) => a.id === draft.agentId);
    if (!agent) return;
    const event = auditActionDrafted(agent, draft);
    setState((prev) => ({
      ...prev,
      drafts: [...prev.drafts, draft],
      auditEvents: [...prev.auditEvents, event],
      updatedAt: Date.now(),
    }));
  }, [state.agents]);

  const handleGenerateAttestation = useCallback((preview: SolanaAgentAttestationPreview) => {
    const agent = state.agents.find((a) => a.id === preview.agentId);
    if (!agent) return;
    const event = auditAttestationPreviewGenerated(agent, preview);
    setState((prev) => ({
      ...prev,
      attestationPreviews: [...prev.attestationPreviews, preview],
      auditEvents: [...prev.auditEvents, event],
      updatedAt: Date.now(),
    }));
  }, [state.agents]);

  const handleUpdateDraft = useCallback((updated: SolanaAgentActionDraft) => {
    setState((prev) => ({
      ...prev,
      drafts: prev.drafts.map((d) => (d.id === updated.id ? updated : d)),
      updatedAt: Date.now(),
    }));
  }, []);

  const handleSendToShield = useCallback(
    (draft: SolanaAgentActionDraft) => {
      const { result, relatedInput } = prefillShieldFromAgentDraft(draft);
      if (result.ok && relatedInput && onPrefillShield) {
        onPrefillShield(relatedInput);
      }
      // Optionally show result as toast/alert; for now we rely on UI feedback
    },
    [onPrefillShield]
  );

  const handleAttachBuilder = useCallback(
    (draft: SolanaAgentActionDraft) => {
      const { result, updatedDraft } = attachBuilderContextToAgentDraft(
        draft,
        savedBuilderContext ? { copyableMarkdown: savedBuilderContext } as any : null
      );
      if (result.ok) {
        handleUpdateDraft(updatedDraft);
      }
    },
    [savedBuilderContext, handleUpdateDraft]
  );

  const handleRejectDraft = useCallback((draft: SolanaAgentActionDraft) => {
    const { updatedDraft } = rejectAgentDraft(draft);
    const agent = state.agents.find((a) => a.id === draft.agentId);
    setState((prev) => ({
      ...prev,
      drafts: prev.drafts.map((d) => (d.id === updatedDraft.id ? updatedDraft : d)),
      auditEvents: [
        ...prev.auditEvents,
        auditActionRejectedLocal(agent ?? state.agents[0], updatedDraft),
      ],
      updatedAt: Date.now(),
    }));
  }, [state.agents]);

  const handleArchiveDraft = useCallback((draft: SolanaAgentActionDraft) => {
    const { updatedDraft } = archiveAgentDraft(draft);
    setState((prev) => ({
      ...prev,
      drafts: prev.drafts.map((d) => (d.id === updatedDraft.id ? updatedDraft : d)),
      updatedAt: Date.now(),
    }));
  }, []);

  const activeDrafts = state.drafts.filter(
    (d) => d.status !== SolanaAgentActionStatus.ARCHIVED
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0ea5e9' }} />
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
            GORKH Agent Station — Persistent Mainnet-Safe Solana Agent
          </h3>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.5, color: '#475569' }}>
        GORKH Agent runs locally while the desktop app is open. It can analyze, plan, draft, and coordinate
        safe internal tools. It never holds private keys, never signs transactions, and never executes
        Cloak sends or Zerion swaps without explicit module-specific approval.
      </p>

      <AgentSafetyPanel />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', borderBottom: '1px solid rgba(148,163,184,0.18)', paddingBottom: '0.25rem' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === tab.id ? '#0f172a' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#64748b',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'station' && (
        <GorkhAgentStationPanel
          walletWorkspace={walletWorkspace}
          marketsWorkspace={marketsWorkspace}
          lastModuleContext={lastModuleContext}
          marketsSampleData={marketsSampleData}
          onOpenWalletCloak={onOpenWalletCloak}
          onOpenZerionExecutor={onOpenZerionExecutor}
          onOpenShield={onPrefillShield}
        />
      )}

      {activeTab === 'agents' && (
        <AgentProfilePanel
          agents={state.agents}
          selectedAgentId={state.selectedAgentId}
          onSelectAgent={handleSelectAgent}
          onCreateDefault={handleCreateDefault}
          onUpdateAgent={handleUpdateAgent}
        />
      )}

      {activeTab === 'policy' && (
        <>
          <AgentPolicyPanel agent={selectedAgent} onUpdatePolicy={handleUpdatePolicy} />
          {selectedAgent && (
            <>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                Protocol Permissions
              </p>
              <ProtocolPermissionsPanel
                permissions={selectedAgent.policy.protocolPermissions}
                readOnly={true}
              />
            </>
          )}
        </>
      )}

      {activeTab === 'draft' && (
        <>
          <ActionDraftPanel
            agents={state.agents}
            selectedAgentId={state.selectedAgentId}
            onCreateDraft={handleCreateDraft}
          />

          {activeDrafts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                Drafts
              </p>
              {activeDrafts.map((draft) => (
                <div
                  key={draft.id}
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: '6px',
                    background: 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(226,232,240,0.6)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                      {draft.title}
                    </span>
                    <span
                      style={{
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        padding: '0.1rem 0.35rem',
                        borderRadius: '4px',
                        background: '#f1f5f9',
                        color: '#64748b',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      {draft.status}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                      {getAgentActionKindLabel(draft.kind)}
                    </span>
                  </div>

                  <span style={{ fontSize: '0.75rem', color: '#475569' }}>{draft.userIntent}</span>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {onPrefillShield && (
                      <button
                        onClick={() => handleSendToShield(draft)}
                        disabled={!draft.relatedInput}
                        style={{
                          padding: '0.3rem 0.6rem',
                          borderRadius: '9999px',
                          border: '1px solid rgba(148,163,184,0.24)',
                          background: draft.relatedInput ? 'rgba(255,255,255,0.8)' : '#f1f5f9',
                          color: draft.relatedInput ? '#0f172a' : '#9ca3af',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: draft.relatedInput ? 'pointer' : 'not-allowed',
                        }}
                      >
                        Send to Shield
                      </button>
                    )}
                    <button
                      onClick={() => handleAttachBuilder(draft)}
                      disabled={!savedBuilderContext}
                      style={{
                        padding: '0.3rem 0.6rem',
                        borderRadius: '9999px',
                        border: '1px solid rgba(148,163,184,0.24)',
                        background: savedBuilderContext ? 'rgba(255,255,255,0.8)' : '#f1f5f9',
                        color: savedBuilderContext ? '#0f172a' : '#9ca3af',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: savedBuilderContext ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Attach Builder Context
                    </button>
                    <button
                      onClick={() => handleRejectDraft(draft)}
                      style={{
                        padding: '0.3rem 0.6rem',
                        borderRadius: '9999px',
                        border: '1px solid rgba(239,68,68,0.3)',
                        background: '#fef2f2',
                        color: '#991b1b',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleArchiveDraft(draft)}
                      style={{
                        padding: '0.3rem 0.6rem',
                        borderRadius: '9999px',
                        border: '1px solid rgba(148,163,184,0.24)',
                        background: 'rgba(255,255,255,0.8)',
                        color: '#64748b',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Archive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'attestation' && (
        <AttestationPreviewPanel
          agents={state.agents}
          drafts={state.drafts}
          onGenerate={handleGenerateAttestation}
        />
      )}

      {activeTab === 'zerion' && (
        <ZerionAgentExecutorPanel pendingAgentHandoff={pendingZerionProposal} />
      )}

      {activeTab === 'audit' && <AgentAuditTimeline events={state.auditEvents} />}

      {activeTab === 'export' && (
        <AgentExportPanel
          agents={state.agents}
          drafts={state.drafts}
          attestationPreviews={state.attestationPreviews}
          auditEvents={state.auditEvents}
        />
      )}

      {activeTab === 'safety' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <AgentSafetyPanel />
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(226,232,240,0.6)',
              fontSize: '0.85rem',
              lineHeight: 1.55,
              color: '#475569',
            }}
          >
            <strong style={{ color: '#0f172a' }}>Phase 7 Safety Boundary</strong>
            <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
              <li>No wallet connection is available.</li>
              <li>No private keys, keypairs, or seed phrases are stored or requested.</li>
              <li>No transaction construction, signing, or execution occurs.</li>
              <li>No RPC calls are made by the agent control center.</li>
              <li>No on-chain attestation writes occur.</li>
              <li>No protocol APIs (Jupiter, Kamino, Squads, etc.) are called.</li>
              <li>All agent data is local metadata only.</li>
              <li>Drift is excluded from all protocol lists.</li>
              <li>Context exports are manual and copyable only.</li>
              <li>Assistant integration is manual; GORKH does not auto-send context to an LLM.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
