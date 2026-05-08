import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { PublicKey } from '@solana/web3.js';
import {
  BUILDER_TOOLBOX_LOCKED_ADVANCED_ACTIONS,
  type AnchorIdlSummary,
  type BuilderToolboxTab,
  type ComputeEstimateResult,
  type NetworkHealthSnapshot,
  type ProgramLogEvent,
  type RpcBenchmarkResult,
  type RpcEndpointProfile,
  type WebsocketSubscriptionProfile,
} from '@gorkh/shared';
import {
  getBlockHeightReadOnly,
  getEpochInfoReadOnly,
  getHealthReadOnly,
  getSlotReadOnly,
} from '../../../rpc/solanaRpcClient.js';
import { summarizeAnchorIdlJson, createIdlEmptyState } from '../idlBrowser.js';
import { decodeAccountData, detectAccountDataEncoding } from '../accountDecoder.js';
import {
  DEFAULT_BUILDER_ENDPOINTS,
  createBenchmarkResult,
  createIdleNetworkHealth,
  isLikelySensitiveRpcUrl,
  loadRpcEndpointProfiles,
  makeEndpointProfile,
  redactedRpcUrl,
  saveRpcEndpointProfiles,
  sortBenchmarkResults,
  toSolanaRpcEndpointConfig,
} from '../rpcEndpointManager.js';
import {
  buildReadOnlySubscriptionPayload,
  capLogEvents,
  createProgramLogEvent,
  createSubscriptionProfile,
  isReadOnlySubscriptionMethod,
  normalizeWebsocketUrl,
} from '../websocketSubscriptions.js';
import {
  createIdleComputeEstimate,
  estimateComputeUnitsReadOnly,
} from '../computeEstimator.js';
import { saveBuilderToolboxContextSnapshot } from '../builderToolboxStorage.js';

const TOOLBOX_TABS: { id: BuilderToolboxTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'idl_browser', label: 'IDL Browser' },
  { id: 'account_decoder', label: 'Account Decoder' },
  { id: 'program_logs', label: 'Program Logs' },
  { id: 'rpc_nodes', label: 'RPC & Nodes' },
  { id: 'network_monitor', label: 'Network Monitor' },
  { id: 'compute_estimator', label: 'Compute Estimator' },
  { id: 'locked_actions', label: 'Locked Actions' },
];

const css = `
.builder-toolbox { height:100%; min-height:0; display:grid; grid-template-columns:168px minmax(0,1fr) 282px; gap:8px; overflow:hidden; color:rgba(255,255,255,0.88); }
.builder-toolbox * { box-sizing:border-box; }
.bt-rail,.bt-main,.bt-inspector { min-height:0; overflow:hidden; border:1px solid rgba(255,255,255,0.1); border-radius:8px; background:rgba(255,255,255,0.035); }
.bt-rail { padding:8px; display:flex; flex-direction:column; gap:5px; }
.bt-tab { min-height:28px; border:1px solid transparent; border-radius:6px; background:transparent; color:rgba(255,255,255,0.58); font-size:0.7rem; font-weight:760; text-align:left; padding:0 8px; cursor:pointer; }
.bt-tab-active { color:white; background:rgba(255,255,255,0.09); border-color:rgba(255,255,255,0.13); }
.bt-main { display:grid; grid-template-rows:40px minmax(0,1fr); }
.bt-header { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 10px; border-bottom:1px solid rgba(255,255,255,0.09); }
.bt-header h4 { margin:0; font-size:0.84rem; letter-spacing:0; }
.bt-header span { color:rgba(255,255,255,0.52); font-size:0.66rem; }
.bt-scroll { min-height:0; overflow:auto; padding:10px; }
.bt-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
.bt-section { border:1px solid rgba(255,255,255,0.09); border-radius:7px; background:rgba(0,0,0,0.16); padding:9px; min-height:0; }
.bt-section h5 { margin:0 0 7px; font-size:0.7rem; color:rgba(255,255,255,0.78); text-transform:uppercase; letter-spacing:0.05em; }
.bt-section p,.bt-note { margin:0; color:rgba(255,255,255,0.58); font-size:0.69rem; line-height:1.45; }
.bt-textarea,.bt-input,.bt-select { width:100%; border:1px solid rgba(255,255,255,0.12); border-radius:6px; background:rgba(0,0,0,0.22); color:rgba(255,255,255,0.86); font-size:0.72rem; padding:7px; }
.bt-textarea { min-height:118px; resize:none; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
.bt-input-row { display:grid; grid-template-columns:1fr 124px; gap:6px; margin-bottom:7px; }
.bt-button { min-height:28px; border:1px solid rgba(255,255,255,0.13); border-radius:6px; background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.84); font-size:0.69rem; font-weight:760; cursor:pointer; }
.bt-button:disabled { opacity:0.45; cursor:not-allowed; }
.bt-row { display:flex; align-items:center; justify-content:space-between; gap:8px; min-height:26px; border-bottom:1px solid rgba(255,255,255,0.06); font-size:0.68rem; color:rgba(255,255,255,0.68); }
.bt-code { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:0.66rem; white-space:pre-wrap; word-break:break-word; color:rgba(255,255,255,0.72); }
.bt-chip { display:inline-flex; align-items:center; min-height:18px; padding:0 6px; border-radius:4px; border:1px solid rgba(255,255,255,0.11); color:rgba(255,255,255,0.62); font-size:0.61rem; font-weight:800; text-transform:uppercase; }
.bt-locked { opacity:0.58; }
.bt-inspector { padding:10px; overflow:auto; }
`;

function isValidPublicKey(value: string): boolean {
  try {
    new PublicKey(value.trim());
    return true;
  } catch {
    return false;
  }
}

function defaultEndpoint(endpoints: RpcEndpointProfile[]): RpcEndpointProfile {
  return endpoints.find((endpoint) => endpoint.isDefault && endpoint.enabled) ?? endpoints.find((endpoint) => endpoint.enabled) ?? DEFAULT_BUILDER_ENDPOINTS[0];
}

export function DeveloperToolboxPanel(): ReactElement {
  const [activeTab, setActiveTab] = useState<BuilderToolboxTab>('overview');
  const [idlInput, setIdlInput] = useState('');
  const [idlSummary, setIdlSummary] = useState<AnchorIdlSummary | null>(null);
  const [idlError, setIdlError] = useState<string | null>(null);
  const [accountData, setAccountData] = useState('');
  const [accountTypeName, setAccountTypeName] = useState('');
  const [programId, setProgramId] = useState('');
  const [programLogs, setProgramLogs] = useState<ProgramLogEvent[]>([]);
  const [logSubscription, setLogSubscription] = useState<WebsocketSubscriptionProfile | null>(null);
  const [logPaused, setLogPaused] = useState(false);
  const [endpoints, setEndpoints] = useState<RpcEndpointProfile[]>(() => loadRpcEndpointProfiles());
  const [endpointLabel, setEndpointLabel] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [endpointCluster, setEndpointCluster] = useState<RpcEndpointProfile['cluster']>('devnet');
  const [endpointError, setEndpointError] = useState<string | null>(null);
  const [benchmarks, setBenchmarks] = useState<RpcBenchmarkResult[]>([]);
  const [benchmarking, setBenchmarking] = useState(false);
  const [networkHealth, setNetworkHealth] = useState<NetworkHealthSnapshot>(() => createIdleNetworkHealth('devnet'));
  const [networkLoading, setNetworkLoading] = useState(false);
  const [subscriptions, setSubscriptions] = useState<WebsocketSubscriptionProfile[]>([]);
  const [subscriptionTarget, setSubscriptionTarget] = useState('');
  const [subscriptionKind, setSubscriptionKind] = useState<WebsocketSubscriptionProfile['kind']>('slot');
  const [computeInput, setComputeInput] = useState('');
  const [computeResult, setComputeResult] = useState<ComputeEstimateResult>(() => createIdleComputeEstimate());
  const [computeRunning, setComputeRunning] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const selectedEndpoint = useMemo(() => defaultEndpoint(endpoints), [endpoints]);
  const selectedRpcConfig = useMemo(() => toSolanaRpcEndpointConfig(selectedEndpoint), [selectedEndpoint]);
  const accountDecode = useMemo(
    () =>
      decodeAccountData(
        {
          rawInput: accountData,
          encoding: detectAccountDataEncoding(accountData),
          accountTypeName: accountTypeName || undefined,
          idlName: idlSummary?.name,
          localOnly: true,
        },
        idlSummary
      ),
    [accountData, accountTypeName, idlSummary]
  );

  useEffect(() => {
    saveBuilderToolboxContextSnapshot({
      selectedCluster: selectedEndpoint.cluster,
      selectedEndpointLabel: selectedEndpoint.label,
      selectedEndpointRedactedUrl: selectedEndpoint.redactedUrl,
      latestSlot: networkHealth.currentSlot,
      epoch: networkHealth.epoch,
      idlSummary: idlSummary ? `${idlSummary.name}: ${idlSummary.instructionCount} instructions, ${idlSummary.accountCount} accounts` : undefined,
      accountDecodeSummary: accountDecode.status === 'decoded' ? `${accountDecode.accountTypeName ?? 'account'} decoded (${accountDecode.byteLength} bytes)` : undefined,
      activeSubscriptionsCount: subscriptions.filter((subscription) => subscription.status === 'active').length + (logSubscription?.status === 'active' ? 1 : 0),
      recentLogSummary: programLogs.length ? `${programLogs.length} local log events buffered` : undefined,
      computeEstimateSummary: computeResult.computeUnitsConsumed ? `${computeResult.computeUnitsConsumed} compute units` : computeResult.status,
      updatedAt: Date.now(),
      redactionsApplied: ['rpc_url_redacted', 'raw_idl_excluded', 'raw_account_data_excluded', 'raw_transaction_excluded'],
      localOnly: true,
    });
  }, [accountDecode, computeResult, idlSummary, logSubscription, networkHealth, programLogs.length, selectedEndpoint, subscriptions]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  const parseIdl = useCallback(() => {
    const summary = summarizeAnchorIdlJson(idlInput);
    setIdlSummary(summary);
    setIdlError(summary ? null : 'Invalid Anchor IDL JSON. No data was sent anywhere.');
  }, [idlInput]);

  const addEndpoint = useCallback(() => {
    setEndpointError(null);
    try {
      if (isLikelySensitiveRpcUrl(endpointUrl)) {
        setEndpointError('Private RPC URLs with API keys or tokens are not stored in localStorage in v0.1. Use a public/local URL or future keychain storage.');
        return;
      }
      const next = makeEndpointProfile(endpointLabel || 'Custom RPC', endpointUrl, endpointCluster);
      const updated = [...endpoints.map((endpoint) => ({ ...endpoint, isDefault: false })), { ...next, isDefault: endpoints.length === 0 }];
      setEndpoints(updated);
      saveRpcEndpointProfiles(updated);
      setEndpointLabel('');
      setEndpointUrl('');
    } catch (err) {
      setEndpointError(err instanceof Error ? err.message : 'Invalid endpoint.');
    }
  }, [endpointCluster, endpointLabel, endpointUrl, endpoints]);

  const selectEndpoint = useCallback(
    (id: string) => {
      const updated = endpoints.map((endpoint) => ({ ...endpoint, isDefault: endpoint.id === id }));
      setEndpoints(updated);
      saveRpcEndpointProfiles(updated);
    },
    [endpoints]
  );

  const runBenchmark = useCallback(async () => {
    setBenchmarking(true);
    const results: RpcBenchmarkResult[] = [];
    for (const endpoint of endpoints.filter((item) => item.enabled)) {
      const started = performance.now();
      try {
        const config = toSolanaRpcEndpointConfig(endpoint);
        const [slot, blockHeight] = await Promise.all([
          getSlotReadOnly(config, 'confirmed'),
          getBlockHeightReadOnly(config, 'confirmed'),
        ]);
        results.push(createBenchmarkResult({
          endpointId: endpoint.id,
          label: endpoint.label,
          redactedUrl: endpoint.redactedUrl,
          status: 'healthy',
          latencyMs: Math.round(performance.now() - started),
          slot: slot.slot,
          blockHeight: blockHeight.blockHeight,
          checkedAt: Date.now(),
        }));
      } catch (err) {
        results.push(createBenchmarkResult({
          endpointId: endpoint.id,
          label: endpoint.label,
          redactedUrl: endpoint.redactedUrl,
          status: 'failed',
          checkedAt: Date.now(),
          error: err instanceof Error ? err.message : 'Benchmark failed',
        }));
      }
    }
    setBenchmarks(sortBenchmarkResults(results));
    setBenchmarking(false);
  }, [endpoints]);

  const refreshNetworkHealth = useCallback(async () => {
    setNetworkLoading(true);
    try {
      const [health, slot, blockHeight, epoch] = await Promise.all([
        getHealthReadOnly(selectedRpcConfig).catch(() => ({ status: 'unknown' })),
        getSlotReadOnly(selectedRpcConfig, 'confirmed'),
        getBlockHeightReadOnly(selectedRpcConfig, 'confirmed'),
        getEpochInfoReadOnly(selectedRpcConfig, 'confirmed'),
      ]);
      setNetworkHealth({
        selectedCluster: selectedEndpoint.cluster,
        selectedEndpointLabel: selectedEndpoint.label,
        selectedEndpointRedactedUrl: selectedEndpoint.redactedUrl,
        websocketStatus: wsRef.current?.readyState === WebSocket.OPEN ? 'connected' : 'idle',
        currentSlot: slot.slot,
        blockHeight: blockHeight.blockHeight,
        epoch: epoch.epoch,
        epochProgress: epoch.slotsInEpoch ? Math.round((epoch.slotIndex / epoch.slotsInEpoch) * 100) : undefined,
        subscriptionEventCount: subscriptions.reduce((sum, subscription) => sum + subscription.eventCount, 0) + programLogs.length,
        status: health.status === 'ok' ? 'healthy' : 'degraded',
        checkedAt: Date.now(),
        warnings: ['Read-only network monitor. TPS and leader schedule are future diagnostics when safe limits are finalized.'],
      });
    } catch (err) {
      setNetworkHealth({
        ...createIdleNetworkHealth(selectedEndpoint.cluster),
        selectedEndpointLabel: selectedEndpoint.label,
        selectedEndpointRedactedUrl: selectedEndpoint.redactedUrl,
        status: 'error',
        websocketStatus: 'error',
        warnings: [err instanceof Error ? err.message : 'Network monitor failed.'],
      });
    } finally {
      setNetworkLoading(false);
    }
  }, [programLogs.length, selectedEndpoint, selectedRpcConfig, subscriptions]);

  const startProgramLogs = useCallback(() => {
    if (!isValidPublicKey(programId)) {
      setLogSubscription({ ...createSubscriptionProfile('program_logs', programId), status: 'error', error: 'Invalid program ID.' });
      return;
    }
    const websocketUrl = normalizeWebsocketUrl(selectedEndpoint.url, selectedEndpoint.websocketUrl);
    if (!websocketUrl) {
      setLogSubscription({ ...createSubscriptionProfile('program_logs', programId), status: 'error', error: 'Websocket URL unavailable.' });
      return;
    }
    const subscription = { ...createSubscriptionProfile('program_logs', programId), status: 'connecting' as const };
    setLogSubscription(subscription);
    const ws = new WebSocket(websocketUrl);
    wsRef.current = ws;
    ws.onopen = () => {
      const payload = buildReadOnlySubscriptionPayload(subscription);
      if (!isReadOnlySubscriptionMethod(payload.method)) return;
      ws.send(JSON.stringify({ jsonrpc: '2.0', id: 1, method: payload.method, params: payload.params }));
      setLogSubscription((current) => current ? { ...current, status: 'active' } : current);
    };
    ws.onmessage = (event) => {
      if (logPaused) return;
      const text = typeof event.data === 'string' ? event.data : 'websocket event';
      setProgramLogs((current) => capLogEvents([...current, createProgramLogEvent([text])]));
    };
    ws.onerror = () => setLogSubscription((current) => current ? { ...current, status: 'error', error: 'Websocket error.' } : current);
    ws.onclose = () => setLogSubscription((current) => current ? { ...current, status: 'stopped' } : current);
  }, [logPaused, programId, selectedEndpoint]);

  const stopProgramLogs = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setLogSubscription((current) => current ? { ...current, status: 'stopped' } : current);
  }, []);

  const addSubscription = useCallback(() => {
    if (subscriptionKind !== 'slot' && !isValidPublicKey(subscriptionTarget)) return;
    const next = createSubscriptionProfile(subscriptionKind, subscriptionKind === 'slot' ? undefined : subscriptionTarget);
    const payload = buildReadOnlySubscriptionPayload(next);
    if (!isReadOnlySubscriptionMethod(payload.method)) return;
    setSubscriptions((current) => [...current, { ...next, status: 'active', eventCount: 0 }]);
    setSubscriptionTarget('');
  }, [subscriptionKind, subscriptionTarget]);

  const runComputeEstimate = useCallback(async () => {
    setComputeRunning(true);
    setComputeResult({ status: 'running', logs: [], warnings: ['Read-only simulation in progress.'] });
    try {
      setComputeResult(await estimateComputeUnitsReadOnly(selectedRpcConfig, computeInput.trim()));
    } catch (err) {
      setComputeResult({
        status: 'failed',
        logs: [],
        err: err instanceof Error ? err.message : 'Simulation failed',
        warnings: ['Compute estimation failed. No signing or broadcast was attempted.'],
        estimatedAt: Date.now(),
      });
    } finally {
      setComputeRunning(false);
    }
  }, [computeInput, selectedRpcConfig]);

  const renderMain = (): ReactElement => {
    if (activeTab === 'idl_browser') {
      return (
        <div className="bt-grid">
          <div className="bt-section">
            <h5>Local IDL Input</h5>
            <textarea className="bt-textarea" value={idlInput} onChange={(event) => setIdlInput(event.target.value)} placeholder={createIdlEmptyState()} />
            <button className="bt-button" onClick={parseIdl}>Load IDL Locally</button>
            {idlError && <p className="bt-note">{idlError}</p>}
          </div>
          <div className="bt-section">
            <h5>IDL Summary</h5>
            {idlSummary ? (
              <>
                <div className="bt-row"><span>Program</span><strong>{idlSummary.name}</strong></div>
                <div className="bt-row"><span>Instructions</span><span>{idlSummary.instructionCount}</span></div>
                <div className="bt-row"><span>Accounts</span><span>{idlSummary.accountCount}</span></div>
                <div className="bt-row"><span>Types / Events / Errors</span><span>{idlSummary.typeCount} / {idlSummary.eventCount} / {idlSummary.errorCount}</span></div>
                <p className="bt-note">{idlSummary.warnings[0]}</p>
              </>
            ) : <p>{createIdlEmptyState()}</p>}
          </div>
          <div className="bt-section">
            <h5>Instructions</h5>
            {(idlSummary?.instructions ?? []).map((instruction) => (
              <div className="bt-row" key={instruction.name}><span>{instruction.name}</span><span>{instruction.accounts.length} accounts / {instruction.args.length} args</span></div>
            ))}
          </div>
          <div className="bt-section">
            <h5>Accounts</h5>
            {(idlSummary?.accounts ?? []).map((account) => (
              <div className="bt-row" key={account.name}><span>{account.name}</span><span>{account.fields.length} fields</span></div>
            ))}
          </div>
        </div>
      );
    }
    if (activeTab === 'account_decoder') {
      return (
        <div className="bt-grid">
          <div className="bt-section">
            <h5>Account Data Decoder</h5>
            <div className="bt-input-row">
              <input className="bt-input" value={accountTypeName} onChange={(event) => setAccountTypeName(event.target.value)} placeholder="IDL account type/name" />
              <span className="bt-chip">{accountDecode.encoding}</span>
            </div>
            <textarea className="bt-textarea" value={accountData} onChange={(event) => setAccountData(event.target.value)} placeholder="Paste account data as base64, hex, or base58" />
          </div>
          <div className="bt-section">
            <h5>Decode Result</h5>
            <div className="bt-row"><span>Status</span><span>{accountDecode.status}</span></div>
            <div className="bt-row"><span>Raw byte length</span><span>{accountDecode.byteLength}</span></div>
            <div className="bt-row"><span>Discriminator</span><span>{accountDecode.discriminatorHex ?? 'none'}</span></div>
            {accountDecode.fields.map((field) => <div className="bt-row" key={field.name}><span>{field.name}</span><span>{field.value}</span></div>)}
            {accountDecode.warnings.map((warning) => <p className="bt-note" key={warning}>{warning}</p>)}
          </div>
        </div>
      );
    }
    if (activeTab === 'program_logs') {
      return (
        <div className="bt-grid">
          <div className="bt-section">
            <h5>Program Logs</h5>
            <input className="bt-input" value={programId} onChange={(event) => setProgramId(event.target.value)} placeholder="Program ID" />
            <button className="bt-button" onClick={startProgramLogs}>Start Subscription</button>
            <button className="bt-button" onClick={stopProgramLogs}>Stop</button>
            <button className="bt-button" onClick={() => setLogPaused((value) => !value)}>{logPaused ? 'Resume Display' : 'Pause Display'}</button>
            <button className="bt-button" onClick={() => setProgramLogs([])}>Clear Logs</button>
            <p className="bt-note">Status: {logSubscription?.status ?? 'logs disconnected'} {logSubscription?.error ?? ''}</p>
          </div>
          <div className="bt-section">
            <h5>Live Buffer</h5>
            <div className="bt-code">{programLogs.length ? programLogs.map((log) => `[${new Date(log.timestamp).toLocaleTimeString()}] ${log.logs.join('\n')}`).join('\n\n') : 'No log events yet. Buffer is capped to prevent memory growth.'}</div>
          </div>
        </div>
      );
    }
    if (activeTab === 'rpc_nodes') {
      return (
        <div className="bt-grid">
          <div className="bt-section">
            <h5>Endpoint Manager</h5>
            <input className="bt-input" value={endpointLabel} onChange={(event) => setEndpointLabel(event.target.value)} placeholder="Endpoint label" />
            <input className="bt-input" value={endpointUrl} onChange={(event) => setEndpointUrl(event.target.value)} placeholder="https://rpc.example.com" />
            <select className="bt-select" value={endpointCluster} onChange={(event) => setEndpointCluster(event.target.value as RpcEndpointProfile['cluster'])}>
              <option value="localnet">localnet</option><option value="devnet">devnet</option><option value="testnet">testnet</option><option value="mainnet">mainnet</option><option value="custom">custom</option>
            </select>
            <button className="bt-button" onClick={addEndpoint}>Add Endpoint</button>
            {endpointUrl && <p className="bt-note">Preview: {redactedRpcUrl(endpointUrl)}</p>}
            {endpointError && <p className="bt-note">{endpointError}</p>}
          </div>
          <div className="bt-section">
            <h5>Configured Endpoints</h5>
            {endpoints.map((endpoint) => (
              <div className="bt-row" key={endpoint.id}>
                <span>{endpoint.label} — {endpoint.redactedUrl}</span>
                <button className="bt-button" onClick={() => selectEndpoint(endpoint.id)}>{endpoint.isDefault ? 'Default' : 'Use'}</button>
              </div>
            ))}
          </div>
          <div className="bt-section">
            <h5>Latency Benchmark</h5>
            <button className="bt-button" disabled={benchmarking} onClick={() => void runBenchmark()}>{benchmarking ? 'Benchmarking' : 'Run Benchmark'}</button>
            {benchmarks.map((result) => <div className="bt-row" key={result.endpointId}><span>{result.label}</span><span>{result.status} {result.latencyMs ? `${result.latencyMs}ms` : result.error}</span></div>)}
          </div>
        </div>
      );
    }
    if (activeTab === 'network_monitor') {
      return (
        <div className="bt-grid">
          <div className="bt-section">
            <h5>Network Health</h5>
            <button className="bt-button" disabled={networkLoading} onClick={() => void refreshNetworkHealth()}>{networkLoading ? 'Loading' : 'Refresh Health'}</button>
            <div className="bt-row"><span>Cluster</span><span>{networkHealth.selectedCluster}</span></div>
            <div className="bt-row"><span>Slot</span><span>{networkHealth.currentSlot ?? 'loading'}</span></div>
            <div className="bt-row"><span>Block height</span><span>{networkHealth.blockHeight ?? 'unavailable'}</span></div>
            <div className="bt-row"><span>Epoch progress</span><span>{networkHealth.epochProgress ?? 0}%</span></div>
            <div className="bt-row"><span>Websocket</span><span>{networkHealth.websocketStatus}</span></div>
          </div>
          <div className="bt-section">
            <h5>Subscriptions</h5>
            <div className="bt-input-row">
              <input className="bt-input" value={subscriptionTarget} onChange={(event) => setSubscriptionTarget(event.target.value)} placeholder="Account/program target" />
              <select className="bt-select" value={subscriptionKind} onChange={(event) => setSubscriptionKind(event.target.value as WebsocketSubscriptionProfile['kind'])}>
                <option value="slot">slot</option><option value="account">account</option><option value="program_logs">program logs</option>
              </select>
            </div>
            <button className="bt-button" onClick={addSubscription}>Add Read-Only Subscription</button>
            {subscriptions.map((subscription) => <div className="bt-row" key={subscription.id}><span>{subscription.kind} {subscription.target ?? ''}</span><span>{subscription.status}</span></div>)}
          </div>
        </div>
      );
    }
    if (activeTab === 'compute_estimator') {
      return (
        <div className="bt-grid">
          <div className="bt-section">
            <h5>Compute Unit Estimator</h5>
            <textarea className="bt-textarea" value={computeInput} onChange={(event) => setComputeInput(event.target.value)} placeholder="Paste base64 serialized transaction" />
            <button className="bt-button" disabled={computeRunning || !computeInput.trim()} onClick={() => void runComputeEstimate()}>{computeRunning ? 'Running Simulation' : 'Estimate Compute'}</button>
            <p className="bt-note">Explicit-click read-only simulation only. No signing, deployment, or broadcast.</p>
          </div>
          <div className="bt-section">
            <h5>Estimate Result</h5>
            <div className="bt-row"><span>Status</span><span>{computeResult.status}</span></div>
            <div className="bt-row"><span>Compute units</span><span>{computeResult.computeUnitsConsumed ?? 'unavailable'}</span></div>
            <div className="bt-code">{computeResult.logs.join('\n') || String(computeResult.err ?? computeResult.warnings.join('\n'))}</div>
          </div>
        </div>
      );
    }
    if (activeTab === 'locked_actions') {
      return (
        <div className="bt-grid">
          {BUILDER_TOOLBOX_LOCKED_ADVANCED_ACTIONS.map((action) => (
            <div className="bt-section bt-locked" aria-disabled="true" key={action}>
              <h5>{action}</h5>
              <p>Coming soon. Disabled in v0.1 and requires proposal creation, policy checks, explicit approval, secure signer gateway, and audit log before any future execution.</p>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="bt-grid">
        <div className="bt-section"><h5>Builder Developer Toolbox</h5><p>Read-only diagnostics for Anchor IDLs, account data, program logs, RPC endpoints, websocket subscriptions, network health, and compute estimation.</p></div>
        <div className="bt-section"><h5>Safety Boundary</h5><p>No deployment, upgrade, authority change, arbitrary RPC, shell command, signing, broadcast, bundles, multisig execution, hardware signing, swaps, staking, bridging, excluded protocol integrations, or autonomous developer execution exists in v0.1.</p></div>
        <div className="bt-section"><h5>Selected Endpoint</h5><p>{selectedEndpoint.label} — {selectedEndpoint.redactedUrl}</p></div>
        <div className="bt-section"><h5>Dev Faucet</h5><p>Locked in v0.1. Deferred because `requestAirdrop` is outside the diagnostic allowlist and needs stricter devnet/localnet policy gates.</p></div>
      </div>
    );
  };

  return (
    <div className="builder-toolbox" data-testid="builder-developer-toolbox">
      <style>{css}</style>
      <nav className="bt-rail" aria-label="Builder toolbox tabs">
        {TOOLBOX_TABS.map((tab) => (
          <button key={tab.id} className={`bt-tab ${activeTab === tab.id ? 'bt-tab-active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </nav>
      <section className="bt-main">
        <div className="bt-header">
          <h4>Builder Developer Toolbox</h4>
          <span>read-only / diagnostic v0.1</span>
        </div>
        <div className="bt-scroll">{renderMain()}</div>
      </section>
      <aside className="bt-inspector">
        <div className="bt-section">
          <h5>RPC & Node Status</h5>
          <p>{selectedEndpoint.label}</p>
          <p className="bt-code">{selectedEndpoint.redactedUrl}</p>
          <div className="bt-row"><span>Cluster</span><span>{selectedEndpoint.cluster}</span></div>
          <div className="bt-row"><span>Health</span><span>{networkHealth.status}</span></div>
          <div className="bt-row"><span>Events</span><span>{programLogs.length + subscriptions.reduce((sum, subscription) => sum + subscription.eventCount, 0)}</span></div>
        </div>
        <div className="bt-section">
          <h5>Storage</h5>
          <p>Context snapshots store redacted endpoint views and summaries only. Raw IDL, raw account data, raw transaction payloads, API keys, auth headers, and secrets are excluded.</p>
        </div>
      </aside>
    </div>
  );
}
