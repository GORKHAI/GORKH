import { useState, useCallback, useEffect } from 'react';
import {
  SolanaShieldInputKind,
  SolanaRpcNetwork,
  type SolanaShieldRpcAnalysis,
  type SolanaDecodedTransaction,
  type SolanaShieldRiskFinding,
  type SolanaAccountLookupResult,
  type SolanaSignatureLookupResult,
  type SolanaSimulationPreview,
  type SolanaAddressLookupTableResolution,
} from '@gorkh/shared';
import { classifySolanaInput } from '../classifySolanaInput.js';
import { decodeSolanaTransaction } from '../decodeSolanaTransaction.js';
import { analyzeSolanaRisk } from '../analyzeSolanaRisk.js';
import {
  getAccountInfoReadOnly,
  getTransactionReadOnly,
  simulateTransactionPreview,
  resolveAddressLookupTables,
  getDefaultEndpointConfig,
  sanitizeRpcEndpointUrl,
} from '../../rpc/index.js';
import { DecodedTransactionView } from './DecodedTransactionView.js';
import { RiskFindingsPanel } from './RiskFindingsPanel.js';
import { RpcAccountView } from './RpcAccountView.js';
import { RpcTransactionView } from './RpcTransactionView.js';
import { RpcSimulationView } from './RpcSimulationView.js';
import { RpcLookupTableResolutionView } from './RpcLookupTableResolutionView.js';
import { createLastShieldContextSnapshot } from '../../context-bridge/createLastModuleContextSnapshots.js';
import { saveLastShieldContext } from '../../context-bridge/lastModuleContextStorage.js';

const NETWORK_OPTIONS: { value: SolanaRpcNetwork; label: string }[] = [
  { value: 'devnet', label: 'Devnet' },
  { value: 'mainnet-beta', label: 'Mainnet Beta' },
  { value: 'localnet', label: 'Localnet' },
];

export function ShieldWorkbench({ prefilledInput }: { prefilledInput?: string }) {
  const [input, setInput] = useState(prefilledInput ?? '');

  // Apply prefilled input when it changes externally
  useEffect(() => {
    if (prefilledInput) {
      setInput(prefilledInput);
    }
  }, [prefilledInput]);
  const [network, setNetwork] = useState<SolanaRpcNetwork>('devnet');
  const [customUrl, setCustomUrl] = useState('');
  const [analysis, setAnalysis] = useState<SolanaShieldRpcAnalysis | null>(null);
  const [decodedTx, setDecodedTx] = useState<SolanaDecodedTransaction | null>(null);
  const [accountLookup, setAccountLookup] = useState<SolanaAccountLookupResult | null>(null);
  const [signatureLookup, setSignatureLookup] = useState<SolanaSignatureLookupResult | null>(null);
  const [simulationPreview, setSimulationPreview] = useState<SolanaSimulationPreview | null>(null);
  const [altResolutions, setAltResolutions] = useState<SolanaAddressLookupTableResolution[] | null>(null);
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [rpcBusy, setRpcBusy] = useState(false);
  const [rpcAction, setRpcAction] = useState<string>('');

  useEffect(() => {
    if (!analysis) return;
    saveLastShieldContext(
      createLastShieldContextSnapshot({
        analysis,
        decodedAvailable: Boolean(decodedTx),
        accountLookup,
        signatureLookup,
        simulationPreview,
        altResolutions,
      })
    );
  }, [accountLookup, altResolutions, analysis, decodedTx, signatureLookup, simulationPreview]);

  const endpoint = getDefaultEndpointConfig(network);
  const activeEndpoint = customUrl.trim()
    ? { ...endpoint, url: customUrl.trim(), label: 'Custom Endpoint', isCustom: true }
    : endpoint;

  const handleAnalyzeOffline = useCallback(() => {
    setRpcError(null);
    setAnalysis(null);
    setDecodedTx(null);
    setAccountLookup(null);
    setSignatureLookup(null);
    setSimulationPreview(null);
    setAltResolutions(null);

    const trimmed = input.trim();
    if (!trimmed) {
      setRpcError('Please paste a Solana address, signature, or serialized transaction.');
      return;
    }

    const kind = classifySolanaInput(trimmed);

    if (kind === SolanaShieldInputKind.UNKNOWN) {
      setAnalysis({
        input: trimmed,
        inputKind: kind,
        network: activeEndpoint.network,
        riskFindings: [
          {
            id: 'unknown_input',
            level: 'low',
            title: 'Unrecognized input format',
            description: 'The input does not match a known Solana address, signature, or serialized transaction.',
            recommendation: 'Paste a base58-encoded address or signature, or a base64-encoded serialized transaction.',
          },
        ],
        summary: 'Input could not be classified.',
        safetyStatus: 'lookup_failed',
      });
      return;
    }

    if (kind === SolanaShieldInputKind.ADDRESS) {
      setAnalysis({
        input: trimmed,
        inputKind: kind,
        network: activeEndpoint.network,
        riskFindings: [],
        summary: 'Solana address detected. Use "Fetch Account Info" to query RPC data.',
        safetyStatus: 'rpc_read_only',
      });
      return;
    }

    if (kind === SolanaShieldInputKind.SIGNATURE) {
      setAnalysis({
        input: trimmed,
        inputKind: kind,
        network: activeEndpoint.network,
        riskFindings: [],
        summary: 'Solana transaction signature detected. Use "Fetch Transaction" to query RPC data.',
        safetyStatus: 'rpc_read_only',
      });
      return;
    }

    if (kind === SolanaShieldInputKind.SERIALIZED_TRANSACTION_BASE64) {
      try {
        const decoded = decodeSolanaTransaction(trimmed);
        setDecodedTx(decoded);
        const riskFindings = analyzeSolanaRisk(decoded);
        setAnalysis({
          input: trimmed,
          inputKind: kind,
          network: activeEndpoint.network,
          riskFindings,
          summary: `Decoded ${decoded.format} transaction with ${decoded.instructions.length} instruction(s), ${decoded.accountKeys.length} account(s), and ${decoded.signatureCount}/${decoded.requiredSignatureCount} signature(s).`,
          safetyStatus: 'rpc_read_only',
        });
      } catch (decodeErr) {
        setAnalysis({
          input: trimmed,
          inputKind: kind,
          network: activeEndpoint.network,
          riskFindings: [
            {
              id: 'decode_failed',
              level: 'medium',
              title: 'Transaction decode failed',
              description: decodeErr instanceof Error ? decodeErr.message : 'The transaction could not be parsed.',
              recommendation: 'Verify the input is a valid base64-encoded serialized Solana transaction.',
            },
          ],
          summary: 'Transaction decode failed.',
          safetyStatus: 'lookup_failed',
        });
      }
      return;
    }

    setAnalysis({
      input: trimmed,
      inputKind: kind,
      network: activeEndpoint.network,
      riskFindings: [],
      summary: 'Input classified but not yet supported for offline decode.',
      safetyStatus: 'unsupported',
    });
  }, [input, activeEndpoint.network]);

  const doRpc = useCallback(
    async <T,>(label: string, fn: () => Promise<T>): Promise<T | null> => {
      setRpcBusy(true);
      setRpcAction(label);
      setRpcError(null);
      try {
        const result = await fn();
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown RPC error';
        setRpcError(message);
        return null;
      } finally {
        setRpcBusy(false);
        setRpcAction('');
      }
    },
    []
  );

  const handleFetchAccount = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const result = await doRpc('Fetching account info…', () =>
      getAccountInfoReadOnly(activeEndpoint, trimmed)
    );
    if (result) {
      setAccountLookup(result);
      setRpcError(null);
    }
  }, [input, activeEndpoint, doRpc]);

  const handleFetchTransaction = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const result = await doRpc('Fetching transaction…', () =>
      getTransactionReadOnly(activeEndpoint, trimmed)
    );
    if (result) {
      setSignatureLookup(result);
      setRpcError(null);
    }
  }, [input, activeEndpoint, doRpc]);

  const handleSimulate = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const result = await doRpc('Simulating transaction…', () =>
      simulateTransactionPreview(activeEndpoint, trimmed)
    );
    if (result) {
      setSimulationPreview(result);
      setRpcError(null);
    }
  }, [input, activeEndpoint, doRpc]);

  const handleResolveAlt = useCallback(async () => {
    if (!decodedTx || decodedTx.addressTableLookups.length === 0) return;
    const result = await doRpc('Resolving lookup tables…', () =>
      resolveAddressLookupTables(activeEndpoint, decodedTx.addressTableLookups)
    );
    if (result) {
      setAltResolutions(result);
      setRpcError(null);
    }
  }, [decodedTx, activeEndpoint, doRpc]);

  const inputKind = analysis?.inputKind ?? classifySolanaInput(input.trim());
  const isAddress = inputKind === SolanaShieldInputKind.ADDRESS;
  const isSignature = inputKind === SolanaShieldInputKind.SIGNATURE;
  const isSerializedTx = inputKind === SolanaShieldInputKind.SERIALIZED_TRANSACTION_BASE64;

  return (
    <div className="gorkh-premium-workbench gorkh-shield-workbench" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
            GORKH Shield — Offline Decode + RPC Read-Only
          </h3>
        </div>
      </div>

      {/* Safety banner */}
      <div
        style={{
          padding: '0.6rem 0.85rem',
          borderRadius: '8px',
          background: 'rgba(254,252,232,0.6)',
          border: '1px solid rgba(253,224,71,0.3)',
          fontSize: '0.8rem',
          lineHeight: 1.45,
          color: '#854d0e',
        }}
      >
        <strong>RPC read-only mode.</strong> GORKH can fetch public chain data and simulate pasted
        transactions, but cannot sign or execute anything.
      </div>

      {/* Network + Endpoint */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
            Network
          </label>
          <select
            value={network}
            onChange={(e) => {
              setNetwork(e.target.value as SolanaRpcNetwork);
              setCustomUrl('');
            }}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(148,163,184,0.24)',
              background: 'rgba(255,255,255,0.8)',
              fontSize: '0.875rem',
              color: '#0f172a',
              cursor: 'pointer',
            }}
          >
            {NETWORK_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: '200px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
            RPC Endpoint
          </label>
          <input
            type="text"
            value={customUrl || activeEndpoint.url}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="https://api.devnet.solana.com"
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(148,163,184,0.24)',
              background: 'rgba(255,255,255,0.8)',
              fontSize: '0.875rem',
              color: '#0f172a',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
          {customUrl && !sanitizeRpcEndpointUrl(customUrl).ok && (
            <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>
              {sanitizeRpcEndpointUrl(customUrl).error}
            </span>
          )}
        </div>
      </div>

      {customUrl && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            background: 'rgba(254,252,232,0.5)',
            border: '1px solid rgba(253,224,71,0.25)',
            fontSize: '0.75rem',
            color: '#854d0e',
          }}
        >
          ⚠️ Use trusted RPC endpoints only. RPC providers can observe lookup requests.
        </div>
      )}

      {/* Input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste a serialized Solana transaction, address, or signature…"
          rows={4}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '10px',
            border: '1px solid rgba(148,163,184,0.24)',
            background: 'rgba(255,255,255,0.8)',
            fontSize: '0.875rem',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={handleAnalyzeOffline}
            disabled={rpcBusy || !input.trim()}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '9999px',
              border: 'none',
              background: rpcBusy || !input.trim() ? '#e5e7eb' : '#0f172a',
              color: rpcBusy || !input.trim() ? '#9ca3af' : 'white',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: rpcBusy || !input.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            Analyze Offline
          </button>

          {isAddress && (
            <button
              onClick={() => void handleFetchAccount()}
              disabled={rpcBusy}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '9999px',
                border: '1px solid rgba(148,163,184,0.24)',
                background: 'rgba(255,255,255,0.8)',
                color: '#0f172a',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: rpcBusy ? 'not-allowed' : 'pointer',
              }}
            >
              Fetch Account Info
            </button>
          )}

          {isSignature && (
            <button
              onClick={() => void handleFetchTransaction()}
              disabled={rpcBusy}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '9999px',
                border: '1px solid rgba(148,163,184,0.24)',
                background: 'rgba(255,255,255,0.8)',
                color: '#0f172a',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: rpcBusy ? 'not-allowed' : 'pointer',
              }}
            >
              Fetch Transaction
            </button>
          )}

          {isSerializedTx && (
            <>
              <button
                onClick={() => void handleSimulate()}
                disabled={rpcBusy}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '9999px',
                  border: '1px solid rgba(148,163,184,0.24)',
                  background: 'rgba(255,255,255,0.8)',
                  color: '#0f172a',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: rpcBusy ? 'not-allowed' : 'pointer',
                }}
              >
                Simulate Preview
              </button>
              {decodedTx && decodedTx.addressTableLookups.length > 0 && (
                <button
                  onClick={() => void handleResolveAlt()}
                  disabled={rpcBusy}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '9999px',
                    border: '1px solid rgba(148,163,184,0.24)',
                    background: 'rgba(255,255,255,0.8)',
                    color: '#0f172a',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: rpcBusy ? 'not-allowed' : 'pointer',
                  }}
                >
                  Resolve Lookup Tables
                </button>
              )}
            </>
          )}

          <button
            onClick={() => {
              setInput('');
              setAnalysis(null);
              setDecodedTx(null);
              setAccountLookup(null);
              setSignatureLookup(null);
              setSimulationPreview(null);
              setAltResolutions(null);
              setRpcError(null);
            }}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '9999px',
              border: '1px solid rgba(148,163,184,0.24)',
              background: 'rgba(255,255,255,0.8)',
              color: '#0f172a',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* RPC status */}
      {rpcBusy && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6', animation: 'pulse 1s infinite' }} />
          {rpcAction}
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
        </div>
      )}

      {/* Error */}
      {rpcError && (
        <div
          style={{
            padding: '0.75rem',
            borderRadius: '8px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            fontSize: '0.875rem',
            color: '#991b1b',
          }}
        >
          {rpcError}
        </div>
      )}

      {/* Results */}
      {analysis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              background: 'rgba(241,245,249,0.6)',
              border: '1px solid rgba(226,232,240,0.6)',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
              Input kind
            </div>
            <div style={{ marginTop: '0.25rem', fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>
              {analysis.inputKind.replace(/_/g, ' ')}
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
              Summary
            </div>
            <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
              {analysis.summary}
            </div>
          </div>

          {accountLookup && <RpcAccountView result={accountLookup} />}
          {signatureLookup && <RpcTransactionView result={signatureLookup} />}
          {decodedTx && !accountLookup && !signatureLookup && <DecodedTransactionView decoded={decodedTx} />}
          {simulationPreview && <RpcSimulationView result={simulationPreview} />}
          {altResolutions && altResolutions.length > 0 && <RpcLookupTableResolutionView resolutions={altResolutions} />}

          <div>
            <p
              style={{
                margin: '0 0 0.5rem',
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#94a3b8',
              }}
            >
              Risk Findings ({analysis.riskFindings.length})
            </p>
            <RiskFindingsPanel findings={analysis.riskFindings as SolanaShieldRiskFinding[]} />
          </div>
        </div>
      )}
    </div>
  );
}
