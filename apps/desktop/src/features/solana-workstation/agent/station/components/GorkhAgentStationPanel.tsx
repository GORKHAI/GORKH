import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GORKH_AGENT_BACKGROUND_COPY,
  GORKH_AGENT_STATION_SAFETY_NOTES,
  GORKH_AGENT_TEMPLATES,
  GorkhAgentRuntimeMode,
  GorkhAgentTemplateStatus,
  getGorkhAgentStatusLabel,
  getGorkhAgentTemplateStatusLabel,
  type GorkhAgentCloakDraftHandoff,
  type GorkhAgentContextBundleResult,
  type GorkhAgentHandoffEntry,
  type GorkhAgentMarketsToolResult,
  type GorkhAgentShieldToolResult,
  type GorkhAgentWalletToolResult,
  type GorkhAgentZerionProposalHandoff,
  type SolanaMarketsWorkspaceState,
  type SolanaWalletWorkspaceState,
} from '@gorkh/shared';
import {
  loadAgentStationState,
  saveAgentStationState,
} from '../agentStationStorage.js';
import {
  killAgent,
  manualRun,
  pauseAgent,
  rejectApproval,
  resumeAgent,
  startAgent,
  tickAgent,
  type ManualRunModuleContext,
} from '../agentRuntime.js';
import { ACTIVE_TEMPLATES, BLOCKED_TEMPLATES, COMING_SOON_TEMPLATES } from '../agentRoadmapTemplates.js';
import { loadHandoffEntries } from '../agentHandoffStorage.js';
import { summarizeWalletResult } from '../agentWalletTools.js';
import { summarizeMarketsResult } from '../agentMarketsTools.js';
import { summarizeShieldResult } from '../agentShieldTools.js';
import { summarizeCloakHandoff } from '../agentCloakHandoff.js';
import { summarizeZerionHandoff } from '../agentZerionHandoff.js';

export interface GorkhAgentStationPanelProps {
  walletWorkspace?: SolanaWalletWorkspaceState | null;
  marketsWorkspace?: SolanaMarketsWorkspaceState | null;
  marketsSampleData?: boolean;
  onOpenWalletCloak?: (handoff: GorkhAgentCloakDraftHandoff) => void;
  onOpenZerionExecutor?: (handoff: GorkhAgentZerionProposalHandoff) => void;
  onOpenShield?: (prefilledInput: string) => void;
}

type StationTab =
  | 'run'
  | 'tools'
  | 'handoffs'
  | 'policy'
  | 'memory'
  | 'audit'
  | 'templates'
  | 'safety';

const TABS: { id: StationTab; label: string }[] = [
  { id: 'run', label: 'Run' },
  { id: 'tools', label: 'Tools' },
  { id: 'handoffs', label: 'Handoffs' },
  { id: 'policy', label: 'Policy' },
  { id: 'memory', label: 'Memory' },
  { id: 'audit', label: 'Audit' },
  { id: 'templates', label: 'Templates' },
  { id: 'safety', label: 'Safety' },
];

export function GorkhAgentStationPanel(props: GorkhAgentStationPanelProps = {}) {
  const [state, setState] = useState(() => loadAgentStationState());
  const [handoffEntries, setHandoffEntries] = useState<GorkhAgentHandoffEntry[]>(() =>
    loadHandoffEntries()
  );
  const [activeTab, setActiveTab] = useState<StationTab>('run');
  const [intent, setIntent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastRunSummary, setLastRunSummary] = useState<{
    classifiedKind?: string;
    walletResult?: GorkhAgentWalletToolResult;
    marketsResult?: GorkhAgentMarketsToolResult;
    shieldResult?: GorkhAgentShieldToolResult;
    cloakHandoff?: GorkhAgentCloakDraftHandoff;
    zerionHandoff?: GorkhAgentZerionProposalHandoff;
    contextBundle?: GorkhAgentContextBundleResult;
  }>({});
  const tickHandleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    saveAgentStationState(state);
  }, [state]);

  useEffect(() => {
    const shouldRun =
      state.runtime.isRunning &&
      !state.runtime.isPaused &&
      !state.runtime.killSwitchEnabled &&
      state.runtime.runtimeMode === GorkhAgentRuntimeMode.BACKGROUND_WHILE_APP_OPEN;
    if (!shouldRun) {
      if (tickHandleRef.current) {
        clearInterval(tickHandleRef.current);
        tickHandleRef.current = null;
      }
      return;
    }
    const intervalMs = Math.max(15, state.runtime.tickIntervalSeconds) * 1000;
    tickHandleRef.current = setInterval(() => {
      setState((prev) => tickAgent(prev).state);
    }, intervalMs);
    return () => {
      if (tickHandleRef.current) {
        clearInterval(tickHandleRef.current);
        tickHandleRef.current = null;
      }
    };
  }, [
    state.runtime.isRunning,
    state.runtime.isPaused,
    state.runtime.killSwitchEnabled,
    state.runtime.runtimeMode,
    state.runtime.tickIntervalSeconds,
  ]);

  const handleStart = useCallback(() => {
    setState((prev) => startAgent(prev).state);
  }, []);
  const handlePause = useCallback(() => {
    setState((prev) => pauseAgent(prev).state);
  }, []);
  const handleResume = useCallback(() => {
    setState((prev) => resumeAgent(prev).state);
  }, []);
  const handleKill = useCallback(() => {
    setState((prev) => killAgent(prev).state);
  }, []);

  const moduleContext = useMemo<ManualRunModuleContext>(
    () => ({
      walletWorkspace: props.walletWorkspace ?? null,
      marketsWorkspace: props.marketsWorkspace ?? null,
      marketsSampleData: props.marketsSampleData,
    }),
    [props.walletWorkspace, props.marketsWorkspace, props.marketsSampleData]
  );

  const handleManualRun = useCallback(() => {
    setError(null);
    if (!intent.trim()) {
      setError('Enter an intent to ask GORKH Agent.');
      return;
    }
    try {
      const result = manualRun(state, { intent }, moduleContext);
      setState(result.state);
      setLastRunSummary({
        classifiedKind: result.task.kind,
        walletResult: result.walletResult,
        marketsResult: result.marketsResult,
        shieldResult: result.shieldResult,
        cloakHandoff: result.cloakHandoff,
        zerionHandoff: result.zerionHandoff,
        contextBundle: result.contextBundle,
      });
      setHandoffEntries(loadHandoffEntries());
      setIntent('');
      setActiveTab('run');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [intent, state, moduleContext]);

  const handleRejectApproval = useCallback((approvalId: string) => {
    setState((prev) => rejectApproval(prev, approvalId).state);
  }, []);

  const handleSetMode = useCallback((mode: GorkhAgentRuntimeMode) => {
    setState((prev) => ({
      ...prev,
      runtime: {
        ...prev.runtime,
        runtimeMode: mode,
        backgroundAllowed: mode === GorkhAgentRuntimeMode.BACKGROUND_WHILE_APP_OPEN,
      },
    }));
  }, []);

  const recentAudit = useMemo(() => state.audit.slice(-25).reverse(), [state.audit]);
  const recentProposals = useMemo(() => state.proposals.slice(-10).reverse(), [state.proposals]);
  const pendingApprovals = useMemo(
    () =>
      state.approvals.filter(
        (a) => a.approvalState === 'pending' || a.approvalState === 'blocked'
      ),
    [state.approvals]
  );

  const recentCloakHandoffs = useMemo(
    () =>
      handoffEntries
        .map((e) => e.cloakHandoff)
        .filter((h): h is GorkhAgentCloakDraftHandoff => Boolean(h))
        .slice(-5)
        .reverse(),
    [handoffEntries]
  );
  const recentZerionHandoffs = useMemo(
    () =>
      handoffEntries
        .map((e) => e.zerionHandoff)
        .filter((h): h is GorkhAgentZerionProposalHandoff => Boolean(h))
        .slice(-5)
        .reverse(),
    [handoffEntries]
  );
  const recentShieldHandoffs = useMemo(
    () =>
      handoffEntries
        .map((e) => e.shieldResult)
        .filter((h): h is GorkhAgentShieldToolResult => Boolean(h))
        .slice(-5)
        .reverse(),
    [handoffEntries]
  );
  const recentWalletResults = useMemo(
    () =>
      handoffEntries
        .map((e) => e.walletResult)
        .filter((h): h is GorkhAgentWalletToolResult => Boolean(h))
        .slice(-5)
        .reverse(),
    [handoffEntries]
  );
  const recentMarketsResults = useMemo(
    () =>
      handoffEntries
        .map((e) => e.marketsResult)
        .filter((h): h is GorkhAgentMarketsToolResult => Boolean(h))
        .slice(-5)
        .reverse(),
    [handoffEntries]
  );
  const recentContextBundles = useMemo(
    () =>
      handoffEntries
        .map((e) => e.contextBundle)
        .filter((bundle): bundle is GorkhAgentContextBundleResult => Boolean(bundle))
        .slice(-5)
        .reverse(),
    [handoffEntries]
  );

  return (
    <div
      data-testid="gorkh-agent-station-panel"
      style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
    >
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0ea5e9' }} />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
            GORKH Agent Station — v0.2
          </h3>
          <span style={statusChipStyle}>{getGorkhAgentStatusLabel(state.profile.status)}</span>
        </div>
        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
          {GORKH_AGENT_BACKGROUND_COPY}
        </div>
      </header>

      <div
        style={{
          display: 'flex',
          gap: '0.25rem',
          flexWrap: 'wrap',
          borderBottom: '1px solid rgba(148,163,184,0.18)',
          paddingBottom: '0.25rem',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.35rem 0.7rem',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === tab.id ? '#0f172a' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#64748b',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'run' && (
        <section style={cardStyle} data-testid="station-run-card">
          <h4 style={cardTitleStyle}>Manual Run</h4>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleStart}
              disabled={state.runtime.killSwitchEnabled || state.runtime.isRunning}
              style={primaryBtn(state.runtime.killSwitchEnabled || state.runtime.isRunning)}
            >
              Start Agent
            </button>
            <button
              onClick={handlePause}
              disabled={!state.runtime.isRunning}
              style={secondaryBtn(!state.runtime.isRunning)}
            >
              Pause
            </button>
            <button
              onClick={handleResume}
              disabled={!state.runtime.isPaused || state.runtime.killSwitchEnabled}
              style={secondaryBtn(!state.runtime.isPaused || state.runtime.killSwitchEnabled)}
            >
              Resume
            </button>
            <button
              onClick={handleKill}
              disabled={state.runtime.killSwitchEnabled}
              style={dangerBtn(state.runtime.killSwitchEnabled)}
              data-testid="station-kill-switch"
            >
              Kill Switch
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <button
              onClick={() => handleSetMode(GorkhAgentRuntimeMode.MANUAL)}
              style={modeBtn(state.runtime.runtimeMode === GorkhAgentRuntimeMode.MANUAL)}
            >
              Manual mode
            </button>
            <button
              onClick={() => handleSetMode(GorkhAgentRuntimeMode.BACKGROUND_WHILE_APP_OPEN)}
              style={modeBtn(
                state.runtime.runtimeMode === GorkhAgentRuntimeMode.BACKGROUND_WHILE_APP_OPEN
              )}
            >
              Background (app open)
            </button>
          </div>

          <label
            htmlFor="gorkh-agent-intent"
            style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a', marginTop: '0.5rem' }}
          >
            Ask GORKH Agent to analyze, draft, or plan…
          </label>
          <textarea
            id="gorkh-agent-intent"
            data-testid="gorkh-agent-intent-input"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="e.g. check my wallet, prepare a tiny Zerion DCA, send privately via Cloak, explain this tx"
            rows={3}
            style={textareaStyle}
          />
          {error && (
            <div style={{ color: '#b91c1c', fontSize: '0.75rem', marginTop: '0.25rem' }}>{error}</div>
          )}
          <div style={{ marginTop: '0.4rem' }}>
            <button onClick={handleManualRun} style={primaryBtn(false)} data-testid="gorkh-agent-manual-run">
              Run GORKH Agent
            </button>
          </div>

          {lastRunSummary.classifiedKind && (
            <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                Classified intent: <strong>{lastRunSummary.classifiedKind}</strong>
              </div>
              {lastRunSummary.walletResult && (
                <ResultCard
                  testId="last-wallet-card"
                  title="Wallet Summary"
                  subtitle={summarizeWalletResult(lastRunSummary.walletResult)}
                  warnings={lastRunSummary.walletResult.warnings}
                />
              )}
              {lastRunSummary.marketsResult && (
                <ResultCard
                  testId="last-markets-card"
                  title="Markets Summary"
                  subtitle={summarizeMarketsResult(lastRunSummary.marketsResult)}
                  warnings={lastRunSummary.marketsResult.warnings}
                />
              )}
              {lastRunSummary.shieldResult && (
                <ResultCard
                  testId="last-shield-card"
                  title="Shield Review Handoff"
                  subtitle={summarizeShieldResult(lastRunSummary.shieldResult)}
                  warnings={lastRunSummary.shieldResult.warnings}
                  action={
                    props.onOpenShield
                      ? {
                          label: 'Open Shield',
                          onClick: () =>
                            props.onOpenShield?.(lastRunSummary.shieldResult?.prefilledInput ?? ''),
                        }
                      : undefined
                  }
                />
              )}
              {lastRunSummary.cloakHandoff && (
                <ResultCard
                  testId="last-cloak-card"
                  title="Cloak Draft Handoff"
                  subtitle={summarizeCloakHandoff(lastRunSummary.cloakHandoff)}
                  warnings={lastRunSummary.cloakHandoff.warnings}
                  action={
                    props.onOpenWalletCloak
                      ? {
                          label: 'Open Wallet → Cloak Private',
                          onClick: () =>
                            lastRunSummary.cloakHandoff &&
                            props.onOpenWalletCloak?.(lastRunSummary.cloakHandoff),
                        }
                      : undefined
                  }
                />
              )}
              {lastRunSummary.zerionHandoff && (
                <ResultCard
                  testId="last-zerion-card"
                  title="Zerion Proposal Handoff"
                  subtitle={summarizeZerionHandoff(lastRunSummary.zerionHandoff)}
                  warnings={lastRunSummary.zerionHandoff.warnings}
                  action={
                    props.onOpenZerionExecutor
                      ? {
                          label: 'Open Agent → Zerion Executor',
                          onClick: () =>
                            lastRunSummary.zerionHandoff &&
                            props.onOpenZerionExecutor?.(lastRunSummary.zerionHandoff),
                        }
                      : undefined
                  }
                />
              )}
              {lastRunSummary.contextBundle && (
                <ResultCard
                  testId="last-context-card"
                  title="Context Bundle"
                  subtitle={`Sanitized context bundle ready with ${lastRunSummary.contextBundle.sources.length} source(s) and ${lastRunSummary.contextBundle.redactionsApplied.length} redaction rule(s).`}
                  warnings={lastRunSummary.contextBundle.warnings}
                />
              )}
            </div>
          )}
        </section>
      )}

      {activeTab === 'tools' && (
        <section style={cardStyle} data-testid="station-tools">
          <h4 style={cardTitleStyle}>Recent Tool Results</h4>

          <h5 style={subTitleStyle}>Wallet</h5>
          {recentWalletResults.length === 0 ? (
            <p style={mutedStyle}>No wallet tool calls yet.</p>
          ) : (
            recentWalletResults.map((w, i) => (
              <ResultCard
                key={`w-${i}`}
                testId={`tools-wallet-${i}`}
                title="Wallet Summary"
                subtitle={summarizeWalletResult(w)}
                warnings={w.warnings}
              />
            ))
          )}

          <h5 style={subTitleStyle}>Markets</h5>
          {recentMarketsResults.length === 0 ? (
            <p style={mutedStyle}>No markets tool calls yet.</p>
          ) : (
            recentMarketsResults.map((m, i) => (
              <ResultCard
                key={`m-${i}`}
                testId={`tools-markets-${i}`}
                title="Markets Summary"
                subtitle={summarizeMarketsResult(m)}
                warnings={m.warnings}
              />
            ))
          )}

          <h5 style={subTitleStyle}>Shield</h5>
          {recentShieldHandoffs.length === 0 ? (
            <p style={mutedStyle}>No shield handoffs yet.</p>
          ) : (
            recentShieldHandoffs.map((s, i) => (
              <ResultCard
                key={`s-${i}`}
                testId={`tools-shield-${i}`}
                title="Shield Review Handoff"
                subtitle={summarizeShieldResult(s)}
                warnings={s.warnings}
                action={
                  props.onOpenShield
                    ? {
                        label: 'Open Shield',
                        onClick: () => props.onOpenShield?.(s.prefilledInput),
                      }
                    : undefined
                }
              />
            ))
          )}

          <h5 style={subTitleStyle}>Context</h5>
          {recentContextBundles.length === 0 ? (
            <p style={mutedStyle}>No context bundle tool calls yet.</p>
          ) : (
            recentContextBundles.map((bundle) => (
              <ResultCard
                key={bundle.id}
                testId={`tools-context-${bundle.id}`}
                title="Context Bundle"
                subtitle={`Sources: ${bundle.sources.join(', ')} · Redactions: ${bundle.redactionsApplied.join(', ')}`}
                warnings={bundle.warnings}
              />
            ))
          )}
        </section>
      )}

      {activeTab === 'handoffs' && (
        <section style={cardStyle} data-testid="station-handoffs">
          <h4 style={cardTitleStyle}>Cross-Module Handoffs</h4>
          <p style={mutedStyle}>
            GORKH Agent only prepares drafts and proposals. All execution happens in the destination
            module after explicit user approval.
          </p>

          <h5 style={subTitleStyle}>Cloak (Wallet → Cloak Private)</h5>
          {recentCloakHandoffs.length === 0 ? (
            <p style={mutedStyle}>No Cloak handoffs yet.</p>
          ) : (
            recentCloakHandoffs.map((handoff) => (
              <ResultCard
                key={handoff.id}
                testId={`handoff-cloak-${handoff.id}`}
                title={`Cloak ${handoff.draftKind}`}
                subtitle={summarizeCloakHandoff(handoff)}
                warnings={handoff.warnings}
                action={
                  props.onOpenWalletCloak
                    ? {
                        label: 'Open Wallet → Cloak Private',
                        onClick: () => props.onOpenWalletCloak?.(handoff),
                      }
                    : undefined
                }
              />
            ))
          )}

          <h5 style={subTitleStyle}>Zerion (Agent → Zerion Executor)</h5>
          {recentZerionHandoffs.length === 0 ? (
            <p style={mutedStyle}>No Zerion handoffs yet.</p>
          ) : (
            recentZerionHandoffs.map((handoff) => (
              <ResultCard
                key={handoff.id}
                testId={`handoff-zerion-${handoff.id}`}
                title={`Zerion ${handoff.proposalKind}`}
                subtitle={summarizeZerionHandoff(handoff)}
                warnings={handoff.warnings}
                action={
                  props.onOpenZerionExecutor
                    ? {
                        label: 'Open Agent → Zerion Executor',
                        onClick: () => props.onOpenZerionExecutor?.(handoff),
                      }
                    : undefined
                }
              />
            ))
          )}

          <h5 style={subTitleStyle}>Approval queue</h5>
          {pendingApprovals.length === 0 ? (
            <p style={mutedStyle}>No approvals pending.</p>
          ) : (
            <ul style={listStyle}>
              {pendingApprovals.map((a) => (
                <li key={a.id} style={listItemStyle}>
                  <strong>{a.title}</strong>
                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>{a.description}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    state={a.approvalState} · risk={a.riskLevel}
                  </div>
                  {a.approvalState === 'pending' && (
                    <button onClick={() => handleRejectApproval(a.id)} style={dangerBtn(false)}>
                      Reject
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <h5 style={subTitleStyle}>Recent proposals</h5>
          {recentProposals.length === 0 ? (
            <p style={mutedStyle}>No proposals yet.</p>
          ) : (
            <ul style={listStyle}>
              {recentProposals.map((p) => (
                <li key={p.id} style={listItemStyle}>
                  <strong>{p.kind}</strong>: {p.summary}
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    executionBlocked={String(p.executionBlocked)} · approvalRequired={String(p.requiresApproval)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {activeTab === 'policy' && (
        <section style={cardStyle}>
          <h4 style={cardTitleStyle}>Policy</h4>
          <ul style={{ ...listStyle, fontSize: '0.78rem' }}>
            <li>Name: {state.policy.name}</li>
            <li>Allowed tools: {state.policy.allowedTools.join(', ')}</li>
            <li>Blocked tools: {state.policy.blockedTools.join(', ')}</li>
            <li>requireApprovalForTransactions: {String(state.policy.requireApprovalForTransactions)}</li>
            <li>requireApprovalForCloak: {String(state.policy.requireApprovalForCloak)}</li>
            <li>requireApprovalForZerion: {String(state.policy.requireApprovalForZerion)}</li>
            <li>allowMainWalletAutonomousExecution: {String(state.policy.allowMainWalletAutonomousExecution)}</li>
            <li>allowAutonomousCloakSend: {String(state.policy.allowAutonomousCloakSend)}</li>
            <li>allowAutonomousTrading: {String(state.policy.allowAutonomousTrading)}</li>
            <li>allowAutonomousDaoVoting: {String(state.policy.allowAutonomousDaoVoting)}</li>
          </ul>
        </section>
      )}

      {activeTab === 'memory' && (
        <section style={cardStyle}>
          <h4 style={cardTitleStyle}>Memory</h4>
          <p style={mutedStyle}>
            Memory v0.1 stores non-sensitive observations only. SQLite + vector memory planned for v0.3.
          </p>
          {state.memory.length === 0 ? (
            <p style={mutedStyle}>No memory entries yet.</p>
          ) : (
            <ul style={listStyle}>
              {state.memory.slice(-15).map((m) => (
                <li key={m.id} style={listItemStyle}>
                  <strong>{m.title}</strong> ({m.kind})
                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>{m.content}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {activeTab === 'audit' && (
        <section style={cardStyle} data-testid="station-audit-timeline">
          <h4 style={cardTitleStyle}>Audit timeline</h4>
          {recentAudit.length === 0 ? (
            <p style={mutedStyle}>No audit events yet.</p>
          ) : (
            <ul style={listStyle}>
              {recentAudit.map((event) => (
                <li key={event.id} style={listItemStyle}>
                  <strong>{event.kind}</strong>{' '}
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    {new Date(event.createdAt).toLocaleTimeString()}
                  </span>
                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>{event.summary}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {activeTab === 'templates' && (
        <section style={cardStyle} data-testid="station-templates">
          <h4 style={cardTitleStyle}>Agent templates</h4>

          <h5 style={subTitleStyle}>Active</h5>
          <div style={templateGridStyle}>
            {ACTIVE_TEMPLATES.map((tpl) => (
              <article key={tpl.id} style={templateCardStyle('active')}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{tpl.name}</strong>
                  <span style={pillStyle('#dcfce7', '#166534')}>{getGorkhAgentTemplateStatusLabel(tpl.status)}</span>
                </header>
                <p style={{ fontSize: '0.75rem', color: '#475569' }}>{tpl.description}</p>
              </article>
            ))}
          </div>

          <h5 style={subTitleStyle}>Coming Soon</h5>
          <div style={templateGridStyle}>
            {COMING_SOON_TEMPLATES.map((tpl) => (
              <article key={tpl.id} style={templateCardStyle('coming_soon')}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{tpl.name}</strong>
                  <span style={pillStyle('#fef3c7', '#92400e')}>{getGorkhAgentTemplateStatusLabel(tpl.status)}</span>
                </header>
                <p style={{ fontSize: '0.75rem', color: '#475569' }}>{tpl.description}</p>
                {tpl.unavailableReason && (
                  <p style={{ fontSize: '0.7rem', color: '#92400e', margin: 0 }}>{tpl.unavailableReason}</p>
                )}
              </article>
            ))}
          </div>

          <h5 style={subTitleStyle}>Blocked</h5>
          <div style={templateGridStyle}>
            {BLOCKED_TEMPLATES.map((tpl) => (
              <article
                key={tpl.id}
                style={templateCardStyle('blocked')}
                data-testid={`station-template-${tpl.id}`}
              >
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{tpl.name}</strong>
                  <span style={pillStyle('#fee2e2', '#991b1b')}>{getGorkhAgentTemplateStatusLabel(tpl.status)}</span>
                </header>
                <p style={{ fontSize: '0.75rem', color: '#475569' }}>{tpl.description}</p>
                {tpl.unavailableReason && (
                  <p style={{ fontSize: '0.7rem', color: '#991b1b', margin: 0 }}>{tpl.unavailableReason}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'safety' && (
        <section style={cardStyle}>
          <h4 style={cardTitleStyle}>Safety</h4>
          <ul style={{ ...listStyle, fontSize: '0.78rem' }}>
            {GORKH_AGENT_STATION_SAFETY_NOTES.map((note) => (
              <li key={note} style={{ color: '#475569' }}>
                {note}
              </li>
            ))}
            {GORKH_AGENT_TEMPLATES.find((t) => t.id === 'main_wallet_without_approval')?.unavailableReason && (
              <li style={{ color: '#991b1b', fontWeight: 600 }}>
                {
                  GORKH_AGENT_TEMPLATES.find((t) => t.id === 'main_wallet_without_approval')!
                    .unavailableReason
                }
              </li>
            )}
          </ul>
          <p style={{ fontSize: '0.75rem', color: '#475569' }}>
            All Cloak private sends require explicit Wallet → Cloak approval. All Zerion swaps require explicit Zerion Executor approval.
          </p>
        </section>
      )}

      <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0 }}>
        Active templates: {ACTIVE_TEMPLATES.length}, Coming soon: {COMING_SOON_TEMPLATES.length}, Blocked:{' '}
        {BLOCKED_TEMPLATES.length}.
        {GorkhAgentTemplateStatus.ACTIVE === 'active' ? '' : ''}
      </p>
    </div>
  );
}

function ResultCard({
  title,
  subtitle,
  warnings,
  action,
  testId,
}: {
  title: string;
  subtitle: string;
  warnings: string[];
  action?: { label: string; onClick: () => void };
  testId?: string;
}) {
  return (
    <article
      data-testid={testId}
      style={{
        padding: '0.6rem 0.75rem',
        borderRadius: '6px',
        background: 'rgba(255,255,255,0.85)',
        border: '1px solid rgba(226,232,240,0.6)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.3rem',
      }}
    >
      <strong style={{ fontSize: '0.8rem', color: '#0f172a' }}>{title}</strong>
      <span style={{ fontSize: '0.75rem', color: '#475569' }}>{subtitle}</span>
      {warnings.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: '1.1rem', color: '#92400e', fontSize: '0.7rem' }}>
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      {action && (
        <button onClick={action.onClick} style={primaryBtn(false)}>
          {action.label}
        </button>
      )}
    </article>
  );
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
};

const statusChipStyle: React.CSSProperties = {
  fontSize: '0.6rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  padding: '0.1rem 0.35rem',
  borderRadius: '4px',
  background: '#f1f5f9',
  color: '#0f172a',
  border: '1px solid #e2e8f0',
};

const cardStyle: React.CSSProperties = {
  padding: '0.85rem',
  borderRadius: '8px',
  background: 'rgba(255,255,255,0.65)',
  border: '1px solid rgba(226,232,240,0.6)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

const cardTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '0.85rem',
  fontWeight: 700,
  color: '#0f172a',
};

const subTitleStyle: React.CSSProperties = {
  margin: '0.5rem 0 0',
  fontSize: '0.75rem',
  fontWeight: 700,
  color: '#0f172a',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const listStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: '1.1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
};

const listItemStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  color: '#0f172a',
};

const mutedStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  color: '#64748b',
  margin: 0,
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  marginTop: '0.3rem',
  padding: '0.5rem',
  borderRadius: '6px',
  border: '1px solid rgba(148,163,184,0.4)',
  background: 'rgba(255,255,255,0.85)',
  fontSize: '0.8rem',
  fontFamily: 'inherit',
  resize: 'vertical',
};

const templateGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '0.5rem',
};

function templateCardStyle(state: 'active' | 'coming_soon' | 'blocked'): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: '0.6rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    background: 'rgba(255,255,255,0.7)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  };
  if (state === 'blocked') {
    return { ...base, background: '#fef2f2', borderColor: '#fecaca' };
  }
  if (state === 'coming_soon') {
    return { ...base, background: '#fffbeb', borderColor: '#fde68a' };
  }
  return { ...base, background: '#f0fdf4', borderColor: '#bbf7d0' };
}

function pillStyle(bg: string, color: string): React.CSSProperties {
  return {
    fontSize: '0.6rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    padding: '0.1rem 0.35rem',
    borderRadius: '4px',
    background: bg,
    color,
  };
}

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '0.4rem 0.8rem',
    borderRadius: '6px',
    border: 'none',
    background: disabled ? '#cbd5f5' : '#0f172a',
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function secondaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '0.4rem 0.8rem',
    borderRadius: '6px',
    border: '1px solid rgba(148,163,184,0.4)',
    background: disabled ? '#f1f5f9' : 'rgba(255,255,255,0.95)',
    color: disabled ? '#94a3b8' : '#0f172a',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function dangerBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '0.4rem 0.8rem',
    borderRadius: '6px',
    border: '1px solid rgba(239,68,68,0.4)',
    background: disabled ? '#f1f5f9' : '#fef2f2',
    color: disabled ? '#94a3b8' : '#991b1b',
    fontSize: '0.75rem',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function modeBtn(active: boolean): React.CSSProperties {
  return {
    padding: '0.3rem 0.6rem',
    borderRadius: '9999px',
    border: '1px solid rgba(148,163,184,0.4)',
    background: active ? '#0f172a' : 'rgba(255,255,255,0.9)',
    color: active ? 'white' : '#0f172a',
    fontSize: '0.7rem',
    fontWeight: 600,
    cursor: 'pointer',
  };
}
