import { useState, useCallback, useEffect } from 'react';
import type {
  SolanaWalletConnectionState,
  SolanaExternalWalletProvider,
  SolanaWalletProfile,
} from '@gorkh/shared';

import { detectExternalWallets, isExternalWalletConnectionSupported } from '../detectExternalWallets.js';
import {
  loadWalletConnectionState,
  saveWalletConnectionState,
  createEmptyWalletConnectionState,
} from '../walletConnectionStorage.js';
import { validateConnectedPublicAddress } from '../walletConnectionGuards.js';
import { createWalletProfileFromConnection } from '../createWalletProfileFromConnection.js';
import { WalletConnectionStatusPanel } from './WalletConnectionStatusPanel.js';
import { WalletConnectionSafetyPanel } from './WalletConnectionSafetyPanel.js';
import { WalletConnectionStrategyPanel } from './WalletConnectionStrategyPanel.js';

export function ExternalWalletPanel({
  onProfileCreated,
}: {
  onProfileCreated?: (profile: SolanaWalletProfile) => void;
}) {
  const [connectionState, setConnectionState] = useState<SolanaWalletConnectionState>(() =>
    loadWalletConnectionState() ?? createEmptyWalletConnectionState()
  );
  const [detectedProviders, setDetectedProviders] = useState<
    ReturnType<typeof detectExternalWallets>
  >([]);
  const [tauriBlocker, setTauriBlocker] = useState(true);

  useEffect(() => {
    const providers = detectExternalWallets();
    setDetectedProviders(providers);
    // In Tauri, browser extensions are not available. We still show UI but block connect.
    setTauriBlocker(!isExternalWalletConnectionSupported());
  }, []);

  useEffect(() => {
    saveWalletConnectionState(connectionState);
  }, [connectionState]);

  const handleConnect = useCallback(
    async (provider: SolanaExternalWalletProvider) => {
      if (tauriBlocker) {
        setConnectionState((prev) => ({
          ...prev,
          status: 'unsupported',
          error:
            'Browser wallet extensions are not available in the Tauri desktop environment. Use address-only profiles or connect via a web browser.',
          updatedAt: Date.now(),
        }));
        return;
      }

      setConnectionState((prev) => ({
        ...prev,
        status: 'connecting',
        provider,
        error: undefined,
        updatedAt: Date.now(),
      }));

      // Attempt connection via window provider if available.
      // This is a read-only connection: we only request the public address.
      try {
        let publicAddress: string | null = null;

        if (provider === 'solflare' && typeof window !== 'undefined') {
          const solflare = (window as unknown as Record<string, unknown>).solflare;
          if (solflare && typeof (solflare as { connect?: () => Promise<void> }).connect === 'function') {
            await (solflare as { connect: () => Promise<void> }).connect();
            publicAddress =
              (solflare as { publicKey?: { toString: () => string } }).publicKey?.toString() ?? null;
          }
        }

        if (provider === 'phantom' && typeof window !== 'undefined') {
          const phantom = (window as unknown as Record<string, Record<string, unknown>>).phantom;
          const solana = phantom?.solana;
          if (solana && typeof (solana as { connect?: () => Promise<void> }).connect === 'function') {
            await (solana as { connect: () => Promise<void> }).connect();
            publicAddress =
              (solana as { publicKey?: { toString: () => string } }).publicKey?.toString() ?? null;
          }
        }

        if (!publicAddress) {
          throw new Error('Could not retrieve public address from wallet provider.');
        }

        const validationError = validateConnectedPublicAddress(publicAddress);
        if (validationError) {
          throw new Error(validationError);
        }

        const now = Date.now();
        setConnectionState({
          status: 'connected_read_only',
          provider,
          publicAddress,
          network: 'devnet',
          capabilities: [
            {
              name: 'read_address',
              status: 'enabled_read_only',
              safetyNote: 'Public address read from connected wallet.',
            },
            {
              name: 'sign_transaction',
              status: 'disabled_signing',
              safetyNote: 'Signing is disabled in Phase 13.',
            },
            {
              name: 'sign_message',
              status: 'disabled_signing',
              safetyNote: 'Message signing is disabled in Phase 13.',
            },
            {
              name: 'send_transaction',
              status: 'disabled_execution',
              safetyNote: 'Transaction execution is disabled in Phase 13.',
            },
            {
              name: 'local_generated_wallet',
              status: 'planned',
              safetyNote: 'Local generated wallet is planned for a future phase.',
            },
          ],
          updatedAt: now,
        });

        const profile = createWalletProfileFromConnection({
          provider,
          publicAddress,
          network: 'devnet',
        });
        onProfileCreated?.(profile);
      } catch (err) {
        setConnectionState((prev) => ({
          ...prev,
          status: 'error',
          error: err instanceof Error ? err.message : 'Connection failed.',
          updatedAt: Date.now(),
        }));
      }
    },
    [tauriBlocker, onProfileCreated]
  );

  const handleDisconnect = useCallback(() => {
    setConnectionState(createEmptyWalletConnectionState(Date.now()));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <WalletConnectionStrategyPanel />

      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
        Detected Providers
      </div>

      {detectedProviders.length === 0 && (
        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
          No wallet providers detected.
        </div>
      )}

      {detectedProviders.map((p) => (
        <div
          key={p.provider}
          style={{
            padding: '0.5rem',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            background: p.detected ? '#f0fdf4' : '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>
              {p.label}
            </span>
            <span style={{ fontSize: '0.7rem', color: p.detected ? '#166534' : '#94a3b8' }}>
              {p.detail}
            </span>
          </div>
          <button
            onClick={() => handleConnect(p.provider)}
            disabled={connectionState.status === 'connecting' || !p.detected}
            style={{
              padding: '0.3rem 0.7rem',
              borderRadius: '4px',
              border: 'none',
              background:
                connectionState.status === 'connecting'
                  ? '#cbd5e1'
                  : p.detected
                    ? '#0f172a'
                    : '#e2e8f0',
              color:
                connectionState.status === 'connecting'
                  ? '#64748b'
                  : p.detected
                    ? '#fff'
                    : '#94a3b8',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor:
                connectionState.status === 'connecting' || !p.detected
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            {connectionState.status === 'connecting' && connectionState.provider === p.provider
              ? 'Connecting…'
              : 'Connect Read-Only'}
          </button>
        </div>
      ))}

      {tauriBlocker && (
        <div
          style={{
            padding: '0.5rem',
            borderRadius: '4px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            fontSize: '0.72rem',
            color: '#991b1b',
          }}
        >
          <strong>Tauri environment blocker:</strong> Browser wallet extensions (Solflare, Phantom,
          etc.) are not available inside the GORKH desktop app. Use an address-only profile or open
          GORKH in a web browser with the extension installed.
        </div>
      )}

      <WalletConnectionStatusPanel state={connectionState} onDisconnect={handleDisconnect} />
      <WalletConnectionSafetyPanel />
    </div>
  );
}
