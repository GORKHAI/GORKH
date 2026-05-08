import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SolanaRpcNetwork,
  TransactionStudioInputKind,
  TransactionStudioSimulationStatus,
  type SolanaRpcEndpointConfig,
  type TransactionStudioDecodedTransaction,
  type TransactionStudioExplanation,
  type TransactionStudioInput,
  type TransactionStudioRiskReport,
  type TransactionStudioSimulationResult,
  type TransactionStudioWorkspaceState,
} from '@gorkh/shared';
import {
  getAccountInfoReadOnly,
  getDefaultEndpointConfig,
  getTransactionReadOnly,
  sanitizeRpcEndpointUrl,
  simulateTransactionPreview,
} from '../../rpc/index.js';
import { createTransactionStudioContextSnapshot } from '../createTransactionStudioContextSnapshot.js';
import { createTransactionStudioExplanation } from '../createTransactionStudioExplanation.js';
import { createTransactionStudioRiskReport } from '../createTransactionStudioRiskReport.js';
import {
  createEmptyTransactionStudioWorkspace,
  createTransactionStudioInput,
} from '../createTransactionStudioWorkspace.js';
import { decodeTransactionStudioInput } from '../decodeTransactionStudioInput.js';
import { saveLastTransactionStudioContext } from '../../context-bridge/lastModuleContextStorage.js';
import {
  clearTransactionStudioWorkspace,
  saveTransactionStudioLastContext,
  saveTransactionStudioWorkspace,
} from '../transactionStudioStorage.js';
import {
  extractBalanceChangesFromTransactionMeta,
  mapSimulationPreviewToStudio,
} from '../transactionStudioRpc.js';
import {
  TRANSACTION_STUDIO_SUBTITLE,
  TRANSACTION_STUDIO_TITLE,
} from '../transactionStudioCopy.js';
import { isTransactionStudioBlockedIntent } from '../transactionStudioGuards.js';
import { TransactionStudioAccountsPanel } from './TransactionStudioAccountsPanel.js';
import { TransactionStudioBalanceDiffPanel } from './TransactionStudioBalanceDiffPanel.js';
import { TransactionStudioComingSoonPanel } from './TransactionStudioComingSoonPanel.js';
import { TransactionStudioDecodedPanel } from './TransactionStudioDecodedPanel.js';
import { TransactionStudioExplanationPanel } from './TransactionStudioExplanationPanel.js';
import { TransactionStudioInputPanel } from './TransactionStudioInputPanel.js';
import { TransactionStudioInspector } from './TransactionStudioInspector.js';
import { TransactionStudioInstructionTimeline } from './TransactionStudioInstructionTimeline.js';
import { TransactionStudioLogsPanel } from './TransactionStudioLogsPanel.js';
import { TransactionStudioRiskPanel } from './TransactionStudioRiskPanel.js';
import { TransactionStudioSafetyPanel } from './TransactionStudioSafetyPanel.js';
import { TransactionStudioSimulationPanel } from './TransactionStudioSimulationPanel.js';
import { TransactionStudioSourcePanel } from './TransactionStudioSourcePanel.js';

const NETWORK_OPTIONS: { value: SolanaRpcNetwork; label: string }[] = [
  { value: SolanaRpcNetwork.DEVNET, label: 'Devnet' },
  { value: SolanaRpcNetwork.MAINNET_BETA, label: 'Mainnet' },
  { value: SolanaRpcNetwork.LOCALNET, label: 'Localnet' },
];

type BottomTab = 'simulation' | 'balance' | 'logs' | 'explanation' | 'context';

function buildWorkspace(input: {
  state: TransactionStudioWorkspaceState;
  activeInput?: TransactionStudioInput;
  decoded?: TransactionStudioDecodedTransaction | null;
  riskReport?: TransactionStudioRiskReport | null;
  simulation?: TransactionStudioSimulationResult | null;
  explanation?: TransactionStudioExplanation | null;
}): TransactionStudioWorkspaceState {
  return {
    ...input.state,
    activeInput: input.activeInput ?? input.state.activeInput,
    activeDecodedTransaction:
      'decoded' in input ? input.decoded ?? undefined : input.state.activeDecodedTransaction,
    activeRiskReport:
      'riskReport' in input ? input.riskReport ?? undefined : input.state.activeRiskReport,
    activeSimulation:
      'simulation' in input ? input.simulation ?? undefined : input.state.activeSimulation,
    activeExplanation:
      'explanation' in input ? input.explanation ?? undefined : input.state.activeExplanation,
    lastUpdatedAt: Date.now(),
    localOnly: true,
  };
}

const STUDIO_CSS = `
.txs-workbench { height: 100%; min-height: 0; display: grid; grid-template-rows: 42px minmax(0, 1fr) 188px; gap: 8px; overflow: hidden; color: rgba(255,255,255,0.9); }
.txs-toolbar { display:flex; align-items:center; justify-content:space-between; gap:10px; min-height:0; padding:0 2px; }
.txs-brand { display:flex; align-items:center; gap:10px; min-width:0; }
.txs-brand h2 { margin:0; font-size:0.98rem; letter-spacing:0; }
.txs-brand p { margin:1px 0 0; color:rgba(255,255,255,0.5); font-size:0.72rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.txs-status-line { min-width:130px; max-width:320px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:rgba(255,255,255,0.56); font-size:0.68rem; border:1px solid rgba(255,255,255,0.1); border-radius:5px; padding:4px 7px; background:rgba(255,255,255,0.035); }
.txs-led { width:9px; height:9px; border-radius:999px; background:#22c55e; box-shadow:0 0 16px rgba(34,197,94,0.32); }
.txs-toolbar-controls { display:flex; align-items:center; gap:7px; min-width:0; }
.txs-grid { min-height:0; display:grid; grid-template-columns: 260px minmax(360px, 1fr) 300px; gap:8px; overflow:hidden; }
.txs-center-stack { min-height:0; display:grid; grid-template-rows:minmax(0, 1fr) 154px; gap:8px; overflow:hidden; }
.txs-bottom { min-height:0; display:grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap:8px; overflow:hidden; }
.txs-panel, .txs-subpanel, .txs-bottom-pane { min-height:0; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.11); border-radius:8px; overflow:hidden; }
.txs-bottom-pane { overflow:auto; }
.txs-panel { display:flex; flex-direction:column; }
.txs-subpanel, .txs-bottom-pane { padding:10px; }
.txs-tight { margin-top:8px; }
.txs-panel-header { min-height:42px; padding:9px 10px; border-bottom:1px solid rgba(255,255,255,0.09); display:flex; align-items:center; justify-content:space-between; gap:8px; }
.txs-panel-header h3 { margin:1px 0 0; font-size:0.82rem; }
.txs-eyebrow, .txs-subpanel-title { color:rgba(255,255,255,0.44); font-size:0.62rem; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; }
.txs-scroll { min-height:0; overflow:auto; padding:10px; }
.txs-input { flex:0 0 132px; margin:10px; width:calc(100% - 20px); resize:none; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:0.72rem; line-height:1.45; padding:9px; }
.txs-button-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; padding:0 10px 10px; }
.txs-button { min-height:30px; border-radius:6px; border:1px solid rgba(255,255,255,0.13); background:rgba(255,255,255,0.055); color:rgba(255,255,255,0.82); font-size:0.72rem; font-weight:750; cursor:pointer; }
.txs-button:hover:not(:disabled) { background:rgba(255,255,255,0.09); color:white; }
.txs-button:disabled { opacity:0.42; cursor:not-allowed; }
.txs-button-primary { background:rgba(14,165,233,0.18); border-color:rgba(14,165,233,0.42); color:#dff5ff; }
.txs-button-muted { margin:8px 10px 0; width:calc(100% - 20px); }
.txs-chip { display:inline-flex; align-items:center; min-height:18px; padding:0 6px; border-radius:4px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.62); font-size:0.62rem; font-weight:800; text-transform:uppercase; }
.txs-chip-warn, .txs-risk-medium { color:#fde68a; border-color:rgba(245,158,11,0.45); background:rgba(245,158,11,0.12); }
.txs-risk-high, .txs-risk-critical { color:#fecaca; border-color:rgba(239,68,68,0.5); background:rgba(239,68,68,0.12); }
.txs-risk-low { color:#bbf7d0; border-color:rgba(34,197,94,0.4); background:rgba(34,197,94,0.1); }
.txs-source-list { padding:0 10px; display:flex; flex-direction:column; gap:4px; overflow:auto; }
.txs-source-row, .txs-account-row { display:flex; align-items:center; justify-content:space-between; gap:7px; min-height:26px; padding:0 7px; border:1px solid rgba(255,255,255,0.08); border-radius:6px; background:rgba(0,0,0,0.12); font-size:0.69rem; color:rgba(255,255,255,0.65); }
.txs-source-row span:last-child, .txs-account-row em { color:rgba(255,255,255,0.38); font-style:normal; }
.txs-locked-note, .txs-warning { margin:8px 10px 0; color:#fbbf24; font-size:0.68rem; line-height:1.35; }
.txs-timeline-row { display:grid; grid-template-columns:28px minmax(0,1fr); gap:8px; padding:9px 0; border-bottom:1px solid rgba(255,255,255,0.08); }
.txs-timeline-index { width:22px; height:22px; display:grid; place-items:center; border-radius:5px; background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.7); font-size:0.7rem; font-weight:800; }
.txs-row-title { display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:0.78rem; font-weight:800; color:rgba(255,255,255,0.88); }
.txs-timeline-row p, .txs-finding p, .txs-bottom-pane p, .txs-empty { margin:5px 0 0; color:rgba(255,255,255,0.52); font-size:0.71rem; line-height:1.45; }
.txs-finding { padding:9px 0; border-bottom:1px solid rgba(255,255,255,0.08); }
.txs-finding strong { display:block; margin-top:5px; color:rgba(255,255,255,0.7); font-size:0.7rem; line-height:1.35; }
.txs-metrics { display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }
.txs-metrics span { border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.045); border-radius:5px; padding:3px 6px; font-size:0.66rem; color:rgba(255,255,255,0.62); }
.txs-kv { display:grid; grid-template-columns:auto 1fr; gap:6px 10px; margin-top:8px; font-size:0.7rem; }
.txs-kv span { color:rgba(255,255,255,0.42); }
.txs-kv strong { color:rgba(255,255,255,0.76); font-weight:750; min-width:0; overflow:hidden; text-overflow:ellipsis; }
.txs-account-list, .txs-log-list { overflow:auto; max-height:118px; margin-top:8px; display:flex; flex-direction:column; gap:4px; }
.txs-account-row code, .txs-log-list code { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:rgba(255,255,255,0.72); font-size:0.66rem; }
.txs-log-list code { display:block; border-bottom:1px solid rgba(255,255,255,0.08); padding:3px 0; }
.txs-tabs { display:none; }
.txs-compact-list { margin:8px 0 0; padding-left:16px; color:rgba(255,255,255,0.56); font-size:0.7rem; line-height:1.45; }
.txs-roadmap-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:8px; }
.txs-roadmap-item { border:1px solid rgba(255,255,255,0.09); border-radius:6px; padding:7px; min-height:52px; }
.txs-roadmap-item-locked { opacity:0.58; filter:saturate(0.72); }
.txs-roadmap-item span { display:block; color:rgba(255,255,255,0.78); font-size:0.7rem; font-weight:800; }
.txs-roadmap-item em { display:block; margin-top:3px; color:rgba(255,255,255,0.42); font-size:0.62rem; font-style:normal; text-transform:uppercase; }
.txs-roadmap-item p { margin:5px 0 0; color:#fbbf24; font-size:0.64rem; line-height:1.3; }
@media (max-width: 1180px) { .txs-grid { grid-template-columns:240px minmax(300px,1fr); } .txs-risk-panel { display:none; } .txs-bottom { grid-template-columns:repeat(2,minmax(0,1fr)); } }
`;

export function TransactionStudioWorkbench({ prefilledInput }: { prefilledInput?: string }) {
  const [state, setState] = useState<TransactionStudioWorkspaceState>(() =>
    createEmptyTransactionStudioWorkspace()
  );
  const [rawInput, setRawInput] = useState(prefilledInput ?? '');
  const [customUrl, setCustomUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [rpcStatus, setRpcStatus] = useState<string>('Manual review only.');
  const [bottomTab, setBottomTab] = useState<BottomTab>('simulation');

  useEffect(() => {
    if (prefilledInput) setRawInput(prefilledInput);
  }, [prefilledInput]);

  useEffect(() => {
    saveTransactionStudioWorkspace(state);
    const snapshot = createTransactionStudioContextSnapshot(state);
    saveTransactionStudioLastContext(snapshot);
    saveLastTransactionStudioContext(snapshot);
  }, [state]);

  const baseEndpoint = getDefaultEndpointConfig(state.selectedNetwork);
  const endpoint: SolanaRpcEndpointConfig = customUrl.trim()
    ? { ...baseEndpoint, url: customUrl.trim(), label: 'Custom Endpoint', isCustom: true }
    : baseEndpoint;

  const endpointWarning = useMemo(() => {
    if (!customUrl.trim()) return null;
    const result = sanitizeRpcEndpointUrl(customUrl.trim());
    return result.ok ? null : result.error;
  }, [customUrl]);

  const commitReviewState = useCallback(
    (studioInput: TransactionStudioInput, decoded: TransactionStudioDecodedTransaction | null) => {
      const riskReport = createTransactionStudioRiskReport({
        studioInput,
        decoded,
        selectedNetwork: state.selectedNetwork,
        customEndpoint: Boolean(customUrl.trim()),
      });
      const explanation = createTransactionStudioExplanation({
        studioInput,
        decoded,
        riskReport,
      });
      setState((current) =>
        buildWorkspace({
          state: current,
          activeInput: studioInput,
          decoded,
          riskReport,
          simulation: undefined,
          explanation,
        })
      );
    },
    [customUrl, state.selectedNetwork]
  );

  const handleDecode = useCallback(() => {
    const studioInput = createTransactionStudioInput({ rawInput });
    let decoded: TransactionStudioDecodedTransaction | null = null;
    try {
      decoded = decodeTransactionStudioInput(studioInput);
      if (studioInput.kind === TransactionStudioInputKind.SERIALIZED_TRANSACTION_BASE58) {
        setRpcStatus('Base58 raw transaction detected. Decode is detection-only in v0.1.');
      } else if (studioInput.kind === TransactionStudioInputKind.SIGNATURE) {
        setRpcStatus('Signature detected. Fetch Transaction uses read-only RPC only.');
      } else if (studioInput.kind === TransactionStudioInputKind.ADDRESS) {
        setRpcStatus('Address detected. Lookup Account uses read-only RPC only.');
      } else if (isTransactionStudioBlockedIntent(rawInput)) {
        setRpcStatus('Broadcast is locked in Transaction Studio v0.1. Decode and simulation review are available.');
      } else {
        setRpcStatus(
          decoded
            ? 'Transaction decoded offline.'
            : 'Invalid or unsupported input. Paste a signature, address, or base64 transaction.'
        );
      }
    } catch (err) {
      setRpcStatus(err instanceof Error ? err.message : 'Decode failed.');
    }
    commitReviewState(studioInput, decoded);
  }, [commitReviewState, rawInput]);

  const handleFetchTransaction = useCallback(async () => {
    const activeInput = state.activeInput ?? createTransactionStudioInput({ rawInput });
    if (activeInput.kind !== TransactionStudioInputKind.SIGNATURE) return;
    setBusy(true);
    setRpcStatus('Fetching transaction via read-only RPC...');
    try {
      const result = await getTransactionReadOnly(endpoint, activeInput.rawInput);
      const changes = extractBalanceChangesFromTransactionMeta(result.raw);
      const simulation: TransactionStudioSimulationResult = {
        id: `txs-rpc-${Date.now()}`,
        inputId: activeInput.id,
        status: TransactionStudioSimulationStatus.UNAVAILABLE,
        err: result.err,
        computeUnitsConsumed: result.computeUnitsConsumed,
        logs: result.logs ?? [],
        accountChanges: [],
        balanceChanges: changes.sol,
        tokenBalanceChanges: changes.token,
        warnings: ['Fetched transaction metadata is read-only historical data.'],
        simulatedAt: result.fetchedAt,
      };
      const riskReport = createTransactionStudioRiskReport({
        studioInput: activeInput,
        decoded: state.activeDecodedTransaction,
        simulation,
        selectedNetwork: state.selectedNetwork,
        customEndpoint: Boolean(customUrl.trim()),
      });
      const explanation = createTransactionStudioExplanation({
        studioInput: activeInput,
        decoded: state.activeDecodedTransaction,
        simulation,
        riskReport,
      });
      setState((current) =>
        buildWorkspace({ state: current, activeInput, simulation, riskReport, explanation })
      );
      setRpcStatus(result.found ? `Fetched transaction at slot ${result.slot}.` : 'Transaction not found.');
    } catch (err) {
      setRpcStatus(err instanceof Error ? err.message : 'Transaction fetch failed.');
    } finally {
      setBusy(false);
    }
  }, [customUrl, endpoint, rawInput, state.activeDecodedTransaction, state.activeInput, state.selectedNetwork]);

  const handleFetchAccount = useCallback(async () => {
    const activeInput = state.activeInput ?? createTransactionStudioInput({ rawInput });
    if (activeInput.kind !== TransactionStudioInputKind.ADDRESS) return;
    setBusy(true);
    setRpcStatus('Fetching account via read-only RPC...');
    try {
      const result = await getAccountInfoReadOnly(endpoint, activeInput.rawInput);
      setRpcStatus(
        result.exists
          ? `Account exists. Owner ${result.owner ?? 'unknown'}, ${result.lamports ?? 0} lamports.`
          : 'Account not found on selected RPC.'
      );
      commitReviewState(activeInput, null);
    } catch (err) {
      setRpcStatus(err instanceof Error ? err.message : 'Account lookup failed.');
    } finally {
      setBusy(false);
    }
  }, [commitReviewState, endpoint, rawInput, state.activeInput]);

  const handleSimulate = useCallback(async () => {
    const activeInput = state.activeInput ?? createTransactionStudioInput({ rawInput });
    if (activeInput.kind !== TransactionStudioInputKind.SERIALIZED_TRANSACTION_BASE64) return;
    setBusy(true);
    setRpcStatus('Simulating via read-only RPC with sigVerify false...');
    const runningSimulation: TransactionStudioSimulationResult = {
      id: `txs-sim-running-${Date.now()}`,
      inputId: activeInput.id,
      status: TransactionStudioSimulationStatus.RUNNING,
      logs: [],
      accountChanges: [],
      balanceChanges: [],
      tokenBalanceChanges: [],
      warnings: ['Simulation is running after explicit user click.'],
      simulatedAt: Date.now(),
    };
    setState((current) => buildWorkspace({ state: current, activeInput, simulation: runningSimulation }));
    try {
      const simulationAccountAddresses =
        state.activeDecodedTransaction?.accounts
          .filter((account) => account.writable || account.signer)
          .map((account) => account.address)
          .filter((address) => address !== 'UNKNOWN')
          .slice(0, 20) ?? [];
      const preview = await simulateTransactionPreview(
        endpoint,
        activeInput.rawInput,
        undefined,
        simulationAccountAddresses
      );
      const simulation = mapSimulationPreviewToStudio(
        activeInput,
        preview,
        state.activeDecodedTransaction,
        simulationAccountAddresses
      );
      const riskReport = createTransactionStudioRiskReport({
        studioInput: activeInput,
        decoded: state.activeDecodedTransaction,
        simulation,
        selectedNetwork: state.selectedNetwork,
        customEndpoint: Boolean(customUrl.trim()),
      });
      const explanation = createTransactionStudioExplanation({
        studioInput: activeInput,
        decoded: state.activeDecodedTransaction,
        simulation,
        riskReport,
      });
      setState((current) =>
        buildWorkspace({ state: current, activeInput, simulation, riskReport, explanation })
      );
      setRpcStatus(preview.success ? 'Simulation succeeded.' : 'Simulation failed. Inspect logs.');
      setBottomTab('logs');
    } catch (err) {
      const failedSimulation: TransactionStudioSimulationResult = {
        id: `txs-sim-failed-${Date.now()}`,
        inputId: activeInput.id,
        status: TransactionStudioSimulationStatus.FAILED,
        err: err instanceof Error ? err.message : 'Simulation failed.',
        logs: [],
        accountChanges: [],
        balanceChanges: [],
        tokenBalanceChanges: [],
        warnings: ['RPC unavailable or simulation request failed. No execution was attempted.'],
        simulatedAt: Date.now(),
      };
      const riskReport = createTransactionStudioRiskReport({
        studioInput: activeInput,
        decoded: state.activeDecodedTransaction,
        simulation: failedSimulation,
        selectedNetwork: state.selectedNetwork,
        customEndpoint: Boolean(customUrl.trim()),
      });
      const explanation = createTransactionStudioExplanation({
        studioInput: activeInput,
        decoded: state.activeDecodedTransaction,
        simulation: failedSimulation,
        riskReport,
      });
      setState((current) =>
        buildWorkspace({
          state: current,
          activeInput,
          simulation: failedSimulation,
          riskReport,
          explanation,
        })
      );
      setRpcStatus(err instanceof Error ? `Simulation failed: ${err.message}` : 'Simulation failed.');
    } finally {
      setBusy(false);
    }
  }, [customUrl, endpoint, rawInput, state.activeDecodedTransaction, state.activeInput, state.selectedNetwork]);

  const handleClear = useCallback(() => {
    clearTransactionStudioWorkspace();
    setRawInput('');
    setState(createEmptyTransactionStudioWorkspace());
    setRpcStatus('Workspace cleared.');
  }, []);

  return (
    <div className="txs-workbench" data-testid="transaction-studio-workbench">
      <style>{STUDIO_CSS}</style>
      <div className="txs-toolbar">
        <div className="txs-brand">
          <span className="txs-led" />
          <div>
            <h2>{TRANSACTION_STUDIO_TITLE}</h2>
            <p>{TRANSACTION_STUDIO_SUBTITLE}</p>
          </div>
        </div>
        <div className="txs-toolbar-controls">
          <select
            value={state.selectedNetwork}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                selectedNetwork: event.target.value as SolanaRpcNetwork,
                lastUpdatedAt: Date.now(),
              }))
            }
          >
            {NETWORK_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <input
            value={customUrl || endpoint.url}
            onChange={(event) => setCustomUrl(event.target.value)}
            aria-label="Transaction Studio RPC endpoint"
          />
          <span className="txs-chip">{busy ? 'busy' : 'safe review'}</span>
          <span className="txs-status-line" data-testid="transaction-studio-visible-status">
            {rpcStatus}
          </span>
        </div>
      </div>

      {endpointWarning && <div className="txs-warning">{endpointWarning}</div>}

      <div className="txs-grid">
        <TransactionStudioSourcePanel
          input={state.activeInput ?? null}
          value={rawInput}
          onValueChange={setRawInput}
          onDecode={handleDecode}
          onFetchTransaction={handleFetchTransaction}
          onFetchAccount={handleFetchAccount}
          onSimulate={handleSimulate}
          onClear={handleClear}
          busy={busy}
        />
        <div className="txs-center-stack">
          <TransactionStudioInstructionTimeline decoded={state.activeDecodedTransaction ?? null} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 8, minHeight: 0 }}>
            <TransactionStudioDecodedPanel decoded={state.activeDecodedTransaction ?? null} />
            <TransactionStudioAccountsPanel decoded={state.activeDecodedTransaction ?? null} />
          </div>
        </div>
        <TransactionStudioRiskPanel report={state.activeRiskReport ?? null} />
      </div>

      <div className="txs-bottom" data-testid="transaction-studio-bottom-tabs">
        <TransactionStudioSimulationPanel simulation={state.activeSimulation ?? null} />
        <TransactionStudioBalanceDiffPanel simulation={state.activeSimulation ?? null} />
        <TransactionStudioLogsPanel simulation={state.activeSimulation ?? null} />
        <TransactionStudioExplanationPanel explanation={state.activeExplanation ?? null} />
        <div className="txs-bottom-pane">
          <TransactionStudioInputPanel input={state.activeInput ?? null} />
          <TransactionStudioInspector
            decoded={state.activeDecodedTransaction ?? null}
            riskReport={state.activeRiskReport ?? null}
            simulation={state.activeSimulation ?? null}
          />
          <TransactionStudioSafetyPanel />
          <TransactionStudioComingSoonPanel />
        </div>
      </div>

      <div className="txs-tabs" data-active-tab={bottomTab} />
    </div>
  );
}
