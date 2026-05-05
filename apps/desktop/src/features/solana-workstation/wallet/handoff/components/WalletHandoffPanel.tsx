import { useState, useCallback, useEffect } from 'react';
import type { SolanaWalletProfile } from '@gorkh/shared';
import {
  SOLANA_WALLET_HANDOFF_PHASE_14_SAFETY_NOTES,
  SOLANA_WALLET_OWNERSHIP_PROOF_PHASE_15_SAFETY_NOTES,
} from '@gorkh/shared';
import {
  createHandoffRequest,
  savePendingHandoffRequest,
  loadPendingHandoffRequest,
  clearPendingHandoffRequest,
  openBrowserWalletConnect,
  validateHandoffResult,
  createWalletProfileFromHandoff,
  buildWalletConnectUrlFromRuntime,
} from '../index.js';
import {
  createOwnershipProofRequest,
  buildOwnershipProofMessageFromRequest,
  validateOwnershipProof,
  verifySolanaMessageSignature,
  createWalletVerifiedOwnership,
  savePendingOwnershipProofRequest,
  loadPendingOwnershipProofRequest,
  clearPendingOwnershipProofRequest,
  saveVerifiedOwnershipProof,
} from '../../ownership/index.js';

export function WalletHandoffPanel({
  runtimeHttpBase,
  onProfileCreated,
}: {
  runtimeHttpBase: string;
  onProfileCreated?: (profile: SolanaWalletProfile) => void;
}) {
  const [pendingRequest, setPendingRequest] = useState<ReturnType<
    typeof loadPendingHandoffRequest
  >>(null);
  const [pasteText, setPasteText] = useState('');
  const [status, setStatus] = useState<'idle' | 'opening' | 'pending' | 'processing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [createdProfile, setCreatedProfile] = useState<SolanaWalletProfile | null>(null);

  useEffect(() => {
    const req = loadPendingHandoffRequest();
    setPendingRequest(req);
    if (req) {
      setStatus('pending');
      setStatusMessage('Browser wallet connection in progress. Copy the payload from the browser and paste it below.');
    }
  }, []);

  const handleStartHandoff = useCallback(async () => {
    setStatus('opening');
    setStatusMessage('Opening browser for wallet connection...');
    setCreatedProfile(null);

    try {
      const request = createHandoffRequest({ network: 'devnet' });
      savePendingHandoffRequest(request);
      setPendingRequest(request);

      await openBrowserWalletConnect({
        runtimeHttpBase,
        request,
      });

      setStatus('pending');
      setStatusMessage('Browser opened. Please connect your wallet in the browser, copy the payload, and paste it below.');
    } catch (err) {
      setStatus('error');
      setStatusMessage(err instanceof Error ? err.message : 'Failed to open browser.');
      clearPendingHandoffRequest();
      setPendingRequest(null);
    }
  }, [runtimeHttpBase]);

  const handlePasteAndSubmit = useCallback(() => {
    const handoffRequest = loadPendingHandoffRequest();
    if (!handoffRequest) {
      setStatus('error');
      setStatusMessage('No pending handoff request found. Please start a new connection.');
      return;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(pasteText.trim());
    } catch {
      setStatus('error');
      setStatusMessage('Invalid JSON. Please paste the exact payload from the browser.');
      return;
    }

    const record = payload as Record<string, unknown>;
    const version = record.version;

    if (version === 'gorkh-wallet-ownership-proof-v1') {
      // Ownership proof payload
      handleOwnershipProofSubmit(payload, handoffRequest);
      return;
    }

    // Standard handoff payload
    setStatus('processing');
    setStatusMessage('Validating handoff payload...');

    const validation = validateHandoffResult(handoffRequest, payload);
    if (!validation.ok) {
      setStatus('error');
      setStatusMessage(validation.error);
      return;
    }

    try {
      const profile = createWalletProfileFromHandoff(validation.result);
      clearPendingHandoffRequest();
      setPendingRequest(null);
      setPasteText('');
      setStatus('success');
      setStatusMessage(`Wallet profile created: ${profile.label} (${profile.publicAddress?.slice(0, 8)}...)`);
      setCreatedProfile(profile);
      onProfileCreated?.(profile);
    } catch (err) {
      setStatus('error');
      setStatusMessage(err instanceof Error ? err.message : 'Failed to create wallet profile.');
    }
  }, [pasteText, onProfileCreated]);

  const handleOwnershipProofSubmit = useCallback((payload: unknown, handoffRequest: NonNullable<ReturnType<typeof loadPendingHandoffRequest>>) => {
    const ownershipRequest = loadPendingOwnershipProofRequest();
    if (!ownershipRequest) {
      // Auto-create an ownership proof request from the handoff request if none exists
      const autoRequest = createOwnershipProofRequest({
        handoffRequest,
        publicAddress: handoffRequest.requestId, // placeholder, will be validated against payload
        provider: 'unknown',
        network: handoffRequest.network,
        domain: 'app.gorkh.ai',
      });
      savePendingOwnershipProofRequest(autoRequest);
      setStatus('error');
      setStatusMessage('No ownership proof request was prepared. Please start a new handoff with ownership proof.');
      return;
    }

    setStatus('processing');
    setStatusMessage('Validating ownership proof...');

    const expectedMessage = buildOwnershipProofMessageFromRequest(ownershipRequest);
    const validation = validateOwnershipProof(ownershipRequest, payload, expectedMessage);
    if (!validation.ok) {
      setStatus('error');
      setStatusMessage(validation.error);
      return;
    }

    const result = validation.result;

    let verified = false;
    try {
      verified = verifySolanaMessageSignature({
        message: result.message,
        signature: result.signature,
        signatureEncoding: result.signatureEncoding as 'base58' | 'base64' | 'hex' | 'unknown',
        publicAddress: result.publicAddress,
      });
    } catch {
      verified = false;
    }

    const verifier = verified ? 'local_ed25519' : 'browser_provider_claim';

    const proof = createWalletVerifiedOwnership(result, verifier);
    saveVerifiedOwnershipProof(proof);
    clearPendingOwnershipProofRequest();
    clearPendingHandoffRequest();
    setPendingRequest(null);
    setPasteText('');

    const profile = createWalletProfileFromHandoff({
      requestId: handoffRequest.requestId,
      nonce: handoffRequest.nonce,
      publicAddress: result.publicAddress,
      provider: result.provider,
      network: result.network,
      connectedAt: Date.now(),
      safetyNotes: [
        ...SOLANA_WALLET_HANDOFF_PHASE_14_SAFETY_NOTES,
        ...SOLANA_WALLET_OWNERSHIP_PROOF_PHASE_15_SAFETY_NOTES,
        `Ownership verified via ${verifier} at ${new Date(proof.verifiedAt).toISOString()}.`,
      ],
    });

    setStatus('success');
    setStatusMessage(
      verified
        ? `Ownership verified! Profile created: ${profile.label} (${profile.publicAddress?.slice(0, 8)}...)`
        : `Profile created with browser provider claim: ${profile.label} (${profile.publicAddress?.slice(0, 8)}...)`
    );
    setCreatedProfile(profile);
    onProfileCreated?.(profile);
  }, [onProfileCreated]);

  const handlePrepareOwnershipProof = useCallback(() => {
    const handoffRequest = loadPendingHandoffRequest();
    if (!handoffRequest) {
      setStatus('error');
      setStatusMessage('No active handoff request. Please start a browser connection first.');
      return;
    }

    if (!createdProfile?.publicAddress) {
      setStatus('error');
      setStatusMessage('No wallet profile with public address. Complete the handoff first.');
      return;
    }

    const request = createOwnershipProofRequest({
      handoffRequest,
      publicAddress: createdProfile.publicAddress,
      provider: createdProfile.tags.includes('solflare')
        ? 'solflare'
        : createdProfile.tags.includes('phantom')
          ? 'phantom'
          : createdProfile.tags.includes('backpack')
            ? 'backpack'
            : 'unknown',
      network: createdProfile.network,
      domain: 'app.gorkh.ai',
    });

    request.message = buildOwnershipProofMessageFromRequest(request);
    savePendingOwnershipProofRequest(request);

    setStatus('pending');
    setStatusMessage(
      'Ownership proof request prepared. In the browser, choose "Sign Ownership Message", then paste the ownership proof payload here.'
    );
  }, [createdProfile]);

  const handleCancel = useCallback(() => {
    clearPendingHandoffRequest();
    clearPendingOwnershipProofRequest();
    setPendingRequest(null);
    setPasteText('');
    setStatus('idle');
    setStatusMessage('');
    setCreatedProfile(null);
  }, []);

  const connectUrl = pendingRequest
    ? buildWalletConnectUrlFromRuntime(runtimeHttpBase, pendingRequest)
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
        Browser Wallet Connect
      </div>

      <div
        style={{
          padding: '0.5rem',
          borderRadius: '4px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          fontSize: '0.72rem',
          color: '#166534',
        }}
      >
        <strong>How it works:</strong> GORKH Desktop cannot run browser wallet extensions.
        We open your system browser where you can connect Solflare or Phantom, then copy a
        safe payload back into the desktop app. Only your public address is transferred.
      </div>

      {!pendingRequest && !createdProfile && (
        <button
          onClick={handleStartHandoff}
          disabled={status === 'opening'}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            border: 'none',
            background: '#0f172a',
            color: '#fff',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: status === 'opening' ? 'not-allowed' : 'pointer',
            opacity: status === 'opening' ? 0.7 : 1,
          }}
        >
          {status === 'opening' ? 'Opening Browser…' : 'Connect via Browser Wallet'}
        </button>
      )}

      {(pendingRequest || createdProfile) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {connectUrl && (
            <div
              style={{
                padding: '0.5rem',
                borderRadius: '4px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: '0.68rem',
                color: '#64748b',
                wordBreak: 'break-all',
              }}
            >
              <strong>URL:</strong> {connectUrl}
            </div>
          )}

          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste the wallet connection or ownership proof payload from your browser here..."
            rows={6}
            style={{
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
              fontSize: '0.75rem',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              resize: 'vertical',
            }}
          />

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={handlePasteAndSubmit}
              disabled={!pasteText.trim() || status === 'processing'}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '4px',
                border: 'none',
                background: '#0f172a',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: !pasteText.trim() || status === 'processing' ? 'not-allowed' : 'pointer',
                opacity: !pasteText.trim() || status === 'processing' ? 0.6 : 1,
              }}
            >
              {status === 'processing' ? 'Validating…' : 'Complete Connection'}
            </button>
            {createdProfile && (
              <button
                onClick={handlePrepareOwnershipProof}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '4px',
                  border: '1px solid #fde68a',
                  background: '#fefce8',
                  color: '#854d0e',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Prepare Ownership Proof
              </button>
            )}
            <button
              onClick={handleCancel}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#475569',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {createdProfile && (
        <div
          style={{
            padding: '0.5rem',
            borderRadius: '4px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            fontSize: '0.72rem',
            color: '#1e40af',
          }}
        >
          <strong>Profile created:</strong> {createdProfile.label} ({createdProfile.publicAddress?.slice(0, 8)}...)
          <br />
          To prove ownership, click <strong>Prepare Ownership Proof</strong> above, then in the browser choose
          &quot;Sign Ownership Message&quot; and paste the resulting payload here.
        </div>
      )}

      {statusMessage && (
        <div
          style={{
            padding: '0.5rem',
            borderRadius: '4px',
            background:
              status === 'error'
                ? '#fef2f2'
                : status === 'success'
                  ? '#f0fdf4'
                  : '#f8fafc',
            border:
              status === 'error'
                ? '1px solid #fecaca'
                : status === 'success'
                  ? '1px solid #bbf7d0'
                  : '1px solid #e2e8f0',
            fontSize: '0.72rem',
            color:
              status === 'error'
                ? '#991b1b'
                : status === 'success'
                  ? '#166534'
                  : '#475569',
          }}
        >
          {statusMessage}
        </div>
      )}

      <div
        style={{
          padding: '0.5rem',
          borderRadius: '4px',
          background: '#fefce8',
          border: '1px solid #fde68a',
          fontSize: '0.68rem',
          color: '#854d0e',
        }}
      >
        <strong>Safety:</strong>{' '}
        {SOLANA_WALLET_HANDOFF_PHASE_14_SAFETY_NOTES[0]}
      </div>

      <div
        style={{
          padding: '0.5rem',
          borderRadius: '4px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          fontSize: '0.68rem',
          color: '#166534',
        }}
      >
        <strong>Ownership Proof:</strong>{' '}
        {SOLANA_WALLET_OWNERSHIP_PROOF_PHASE_15_SAFETY_NOTES[0]}
        {' '}
        {SOLANA_WALLET_OWNERSHIP_PROOF_PHASE_15_SAFETY_NOTES[1]}
      </div>
    </div>
  );
}
