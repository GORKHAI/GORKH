import { useState, useCallback, useEffect, useMemo } from 'react';
import type {
  SolanaPrivateWorkflowDraft,
  SolanaPrivateWorkspaceState,
} from '@gorkh/shared';
import {
  SolanaPrivateWorkflowKind,
  SolanaPrivateRouteKind,
  SolanaPrivateAssetKind,
} from '@gorkh/shared';
import {
  loadPrivateWorkspaceState,
  savePrivateWorkspaceState,
  createEmptyPrivateWorkspaceState,
} from './privateStorage.js';
import { createPrivateWorkflowDraft } from './createPrivateWorkflowDraft.js';
import { analyzePrivacyRisks } from './analyzePrivacyRisks.js';
import { createPrivateRoutePlanPreview } from './createPrivateRoutePlanPreview.js';
import { createReceiveRequestPayload } from './createReceiveRequestPayload.js';
import { createPrivateContextSummary } from './createPrivateContextSummary.js';
import {
  PrivateSafetyPanel,
  PrivateDraftPanel,
  PrivacyRiskPanel,
  PrivateRoutePlanPanel,
  ReceiveRequestPanel,
  PrivateContextPanel,
} from './components/index.js';

type PrivateTab = 'drafts' | 'risks' | 'route' | 'receive' | 'context' | 'safety';

const TABS: { id: PrivateTab; label: string }[] = [
  { id: 'drafts', label: 'Drafts' },
  { id: 'risks', label: 'Privacy Risks' },
  { id: 'route', label: 'Route Plan' },
  { id: 'receive', label: 'Receive Request' },
  { id: 'context', label: 'Context' },
  { id: 'safety', label: 'Safety' },
];

export function PrivateWorkbench() {
  const [workspace, setWorkspace] = useState<SolanaPrivateWorkspaceState>(() =>
    loadPrivateWorkspaceState() ?? createEmptyPrivateWorkspaceState()
  );
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PrivateTab>('drafts');

  useEffect(() => {
    savePrivateWorkspaceState(workspace);
  }, [workspace]);

  const selectedDraft = useMemo(
    () => workspace.drafts.find((d) => d.id === selectedDraftId) ?? null,
    [selectedDraftId, workspace.drafts]
  );

  const selectedRisks = useMemo(
    () => (selectedDraft ? analyzePrivacyRisks(selectedDraft) : []),
    [selectedDraft]
  );

  const selectedPlan = useMemo(
    () =>
      selectedDraft
        ? workspace.routePlanPreviews.find((p) => p.workflowDraftId === selectedDraft.id)
        : undefined,
    [selectedDraft, workspace.routePlanPreviews]
  );

  const contextSummary = useMemo(
    () => createPrivateContextSummary(workspace, 'devnet'),
    [workspace]
  );

  const handleCreateDraft = useCallback(
    (input: {
      kind: SolanaPrivateWorkflowKind;
      route: SolanaPrivateRouteKind;
      title: string;
      network: 'localnet' | 'devnet' | 'mainnet-beta';
      assetSymbol: string;
      assetKind: SolanaPrivateAssetKind;
      amountUi?: string;
      recipientLabel?: string;
      recipientAddress?: string;
      purpose?: string;
      notes?: string;
    }) => {
      const draft = createPrivateWorkflowDraft({
        kind: input.kind,
        route: input.route,
        title: input.title,
        network: input.network,
        assetSymbol: input.assetSymbol,
        assetKind: input.assetKind,
        amountUi: input.amountUi,
        recipient: input.recipientLabel
          ? {
              id: `recipient-${Date.now()}`,
              label: input.recipientLabel,
              publicAddress: input.recipientAddress,
              safetyNotes: [],
            }
          : undefined,
        purpose: input.purpose,
        notes: input.notes,
      });

      const plan = createPrivateRoutePlanPreview(draft);

      setWorkspace((prev) => ({
        ...prev,
        drafts: [...prev.drafts, draft],
        routePlanPreviews: [...prev.routePlanPreviews, plan],
        updatedAt: Date.now(),
      }));
      setSelectedDraftId(draft.id);
    },
    []
  );

  const handleSelectDraft = useCallback((draft: SolanaPrivateWorkflowDraft) => {
    setSelectedDraftId(draft.id);
  }, []);

  const handleRemoveDraft = useCallback((id: string) => {
    setWorkspace((prev) => ({
      ...prev,
      drafts: prev.drafts.map((d) => (d.id === id ? { ...d, status: 'archived_local' as const } : d)),
      updatedAt: Date.now(),
    }));
    setSelectedDraftId((sid) => (sid === id ? null : sid));
  }, []);

  const handleCreateReceiveRequest = useCallback(
    (label: string, asset: string, amount?: string, address?: string) => {
      const req = createReceiveRequestPayload({
        network: 'devnet',
        route: 'manual_privacy_review_only',
        label,
        requestedAssetSymbol: asset,
        requestedAmountUi: amount,
        recipientPublicAddress: address,
      });
      setWorkspace((prev) => ({
        ...prev,
        receiveRequests: [...prev.receiveRequests, req],
        updatedAt: Date.now(),
      }));
    },
    []
  );

  return (
    <div
      className="gorkh-premium-workbench gorkh-private-workbench"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#8b5cf6' }} />
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
          GORKH Private / Confidential
        </h3>
      </div>

      <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.5, color: '#475569' }}>
        Plan private payments, confidential token transfers, receive requests, payroll, and invoices
        with Umbra, Cloak, Token-2022 Confidential Transfers, and Light Protocol research routes.
      </p>

      <PrivateSafetyPanel />

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
              color: activeTab === tab.id ? '#fff' : '#475569',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'drafts' && (
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <PrivateDraftPanel
            drafts={workspace.drafts}
            selectedDraftId={selectedDraftId}
            onCreate={handleCreateDraft}
            onSelect={handleSelectDraft}
            onRemove={handleRemoveDraft}
          />

          <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {selectedDraft ? (
              <>
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(226,232,240,0.6)',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                    {selectedDraft.title}
                  </span>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem' }}>
                    {selectedDraft.kind} — {selectedDraft.route}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Asset: {selectedDraft.assetSymbol} {selectedDraft.amountUi ?? ''} ({selectedDraft.assetKind})
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Network: {selectedDraft.network} — Risk: {selectedDraft.riskLevel}
                  </div>
                  {selectedDraft.blockedReasons.length > 0 && (
                    <div style={{ marginTop: '0.4rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400e' }}>
                        Blocked Reasons:
                      </span>
                      <ul style={{ margin: '0.2rem 0 0', paddingLeft: '1.25rem', fontSize: '0.72rem', color: '#92400e' }}>
                        {selectedDraft.blockedReasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {selectedDraft.paymentLines.length > 0 && (
                  <div
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                      Payment Lines ({selectedDraft.paymentLines.length})
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.3rem' }}>
                      {selectedDraft.paymentLines.map((line) => (
                        <div key={line.id} style={{ fontSize: '0.72rem', color: '#475569' }}>
                          {line.recipientLabel}: {line.amountUi} {line.assetSymbol} ({line.memoPolicy})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  fontSize: '0.85rem',
                  color: '#94a3b8',
                }}
              >
                Select a draft to view details.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'risks' && (
        <div style={{ maxWidth: '640px' }}>
          <PrivacyRiskPanel risks={selectedRisks} />
        </div>
      )}

      {activeTab === 'route' && (
        <div style={{ maxWidth: '640px' }}>
          <PrivateRoutePlanPanel plan={selectedPlan} />
        </div>
      )}

      {activeTab === 'receive' && (
        <div style={{ maxWidth: '640px' }}>
          <ReceiveRequestPanel requests={workspace.receiveRequests} onCreate={handleCreateReceiveRequest} />
        </div>
      )}

      {activeTab === 'context' && (
        <div style={{ maxWidth: '640px' }}>
          <PrivateContextPanel summary={contextSummary} />
        </div>
      )}

      {activeTab === 'safety' && (
        <div
          style={{
            padding: '1rem',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(226,232,240,0.6)',
            fontSize: '0.85rem',
            lineHeight: 1.55,
            color: '#475569',
          }}
        >
          <strong style={{ color: '#0f172a' }}>Phase 9B Safety Boundary</strong>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
            <li>No wallet connection is available.</li>
            <li>No private keys, keypairs, seed phrases, mnemonics, or note secrets are stored or requested.</li>
            <li>No commitment, nullifier, or stealth address generation occurs.</li>
            <li>No zk proof generation or circom/snarkjs integration.</li>
            <li>No transaction construction, signing, or execution occurs.</li>
            <li>No Umbra, Cloak, Token-2022, or Light Protocol API/program calls are made.</li>
            <li>No HumanRail or White Protocol integration exists.</li>
            <li>Drift is excluded from all protocol lists.</li>
            <li>All private data is local metadata only.</li>
            <li>Context exports are manual and copyable only.</li>
          </ul>
        </div>
      )}

      <div
        style={{
          padding: '0.6rem 0.8rem',
          borderRadius: '6px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          fontSize: '0.7rem',
          color: '#94a3b8',
        }}
      >
        Private / Confidential v0.1 — Planner only. No private or confidential transfer has been created or executed.
      </div>
    </div>
  );
}
