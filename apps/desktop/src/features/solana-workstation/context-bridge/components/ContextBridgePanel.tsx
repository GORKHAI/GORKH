import { useMemo, useState, useEffect } from 'react';
import {
  SolanaWorkstationContextSource,
  SolanaWorkstationContextSensitivity,
  SolanaWorkstationContextReferenceKind,
  type SolanaAgentProfile,
  type SolanaAgentActionDraft,
  type SolanaAgentAttestationPreview,
  type SolanaAgentAuditEvent,
  type SolanaShieldRpcAnalysis,
} from '@gorkh/shared';
import { BridgeSafetyPanel } from './BridgeSafetyPanel.js';
import { ContextBundlePreview } from './ContextBundlePreview.js';
import { AssistantExportPanel } from './AssistantExportPanel.js';
import { createAgentContextMarkdown } from '../createAgentContextMarkdown.js';
import { createShieldContextMarkdown } from '../createShieldContextMarkdown.js';
import { createWorkstationContextBundle } from '../createWorkstationContextBundle.js';

export function ContextBridgePanel({
  agents: agentsProp,
  drafts: draftsProp,
  attestationPreviews: attestationPreviewsProp,
  auditEvents: auditEventsProp,
  savedBuilderContext,
  shieldAnalysis,
  privateContextSummary,
}: {
  agents: SolanaAgentProfile[];
  drafts: SolanaAgentActionDraft[];
  attestationPreviews: SolanaAgentAttestationPreview[];
  auditEvents: SolanaAgentAuditEvent[];
  savedBuilderContext: string | null;
  shieldAnalysis: SolanaShieldRpcAnalysis | null;
  privateContextSummary?: string | null;
}) {
  // Load agent state from localStorage if props are empty
  const [loadedAgentState, setLoadedAgentState] = useState<{
    agents: SolanaAgentProfile[];
    drafts: SolanaAgentActionDraft[];
    attestationPreviews: SolanaAgentAttestationPreview[];
    auditEvents: SolanaAgentAuditEvent[];
  } | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('gorkh.solana.agent.workspace.v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        setLoadedAgentState({
          agents: parsed.agents ?? [],
          drafts: parsed.drafts ?? [],
          attestationPreviews: parsed.attestationPreviews ?? [],
          auditEvents: parsed.auditEvents ?? [],
        });
      }
    } catch {
      // ignore
    }
  }, []);

  const agents = agentsProp.length > 0 ? agentsProp : (loadedAgentState?.agents ?? []);
  const drafts = draftsProp.length > 0 ? draftsProp : (loadedAgentState?.drafts ?? []);
  const attestationPreviews = attestationPreviewsProp.length > 0 ? attestationPreviewsProp : (loadedAgentState?.attestationPreviews ?? []);
  const auditEvents = auditEventsProp.length > 0 ? auditEventsProp : (loadedAgentState?.auditEvents ?? []);

  const selectedAgent = agents[0] ?? null;

  const agentMarkdown = useMemo(() => {
    if (!selectedAgent) return undefined;
    return createAgentContextMarkdown({
      agent: selectedAgent,
      drafts,
      attestationPreviews,
      auditEvents,
    });
  }, [selectedAgent, drafts, attestationPreviews, auditEvents]);

  const builderMarkdown = useMemo(() => {
    if (!savedBuilderContext) return undefined;
    return savedBuilderContext;
  }, [savedBuilderContext]);

  const shieldMarkdown = useMemo(() => {
    return createShieldContextMarkdown({ analysis: shieldAnalysis });
  }, [shieldAnalysis]);

  const privateMarkdown = useMemo(() => {
    return privateContextSummary ?? undefined;
  }, [privateContextSummary]);

  const bundle = useMemo(() => {
    const references = [];

    if (selectedAgent) {
      references.push({
        id: `ref-agent-${selectedAgent.id}`,
        kind: SolanaWorkstationContextReferenceKind.AGENT_PROFILE,
        source: SolanaWorkstationContextSource.AGENT,
        title: `Agent: ${selectedAgent.name}`,
        summary: selectedAgent.description,
        createdAt: selectedAgent.createdAt,
        sensitivity: SolanaWorkstationContextSensitivity.REDACTED_SAFE_SUMMARY,
        localOnly: true,
        safetyNotes: selectedAgent.safetyNotes,
      });
    }

    if (savedBuilderContext) {
      references.push({
        id: `ref-builder-${Date.now()}`,
        kind: SolanaWorkstationContextReferenceKind.BUILDER_WORKSPACE_SUMMARY,
        source: SolanaWorkstationContextSource.BUILDER,
        title: 'Builder Workspace Summary',
        summary: 'Sanitized builder context',
        createdAt: Date.now(),
        sensitivity: SolanaWorkstationContextSensitivity.LOCAL_PROJECT_METADATA,
        localOnly: true,
        safetyNotes: ['Sanitized summary only. No full source code.'],
      });
    }

    if (shieldAnalysis) {
      references.push({
        id: `ref-shield-${Date.now()}`,
        kind: SolanaWorkstationContextReferenceKind.SHIELD_RPC_ANALYSIS,
        source: SolanaWorkstationContextSource.SHIELD,
        title: 'Shield Analysis',
        summary: shieldAnalysis.summary,
        createdAt: Date.now(),
        sensitivity: SolanaWorkstationContextSensitivity.PUBLIC_CHAIN_DATA,
        localOnly: true,
        safetyNotes: ['Advisory analysis only.'],
      });
    }

    if (privateMarkdown) {
      references.push({
        id: `ref-private-${Date.now()}`,
        kind: SolanaWorkstationContextReferenceKind.PRIVATE_CONTEXT_SUMMARY,
        source: SolanaWorkstationContextSource.PRIVATE,
        title: 'Private / Confidential Context Summary',
        summary: 'Sanitized private workflow context',
        createdAt: Date.now(),
        sensitivity: SolanaWorkstationContextSensitivity.REDACTED_SAFE_SUMMARY,
        localOnly: true,
        safetyNotes: ['Planner-only summary. No secrets, proofs, or executable data.'],
      });
    }

    return createWorkstationContextBundle({
      title: 'GORKH Workstation Context Bundle',
      description: 'Consolidated context from Agent, Builder, Shield, and Private for manual assistant review.',
      agentMarkdown,
      builderMarkdown,
      shieldMarkdown,
      privateMarkdown,
      references,
    });
  }, [selectedAgent, savedBuilderContext, shieldAnalysis, privateMarkdown, agentMarkdown, builderMarkdown, shieldMarkdown]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
          GORKH Context Bridge
        </h3>
      </div>

      <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.5, color: '#475569' }}>
        Copy sanitized context from Agent, Builder, and Shield into a single bundle for manual
        assistant review. No auto-send. No execution.
      </p>

      <BridgeSafetyPanel />

      <ContextBundlePreview bundle={bundle} />

      <AssistantExportPanel />
    </div>
  );
}
