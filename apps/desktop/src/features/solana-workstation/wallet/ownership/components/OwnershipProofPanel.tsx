import { useState, useCallback } from 'react';
import type { SolanaWalletProfile } from '@gorkh/shared';
import {
  SOLANA_WALLET_OWNERSHIP_PROOF_PHASE_15_SAFETY_NOTES,
} from '@gorkh/shared';
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
} from '../index.js';

export function OwnershipProofPanel({
  handoffRequestId,
  publicAddress,
  provider,
  network,
  domain,
  onVerified,
}: {
  handoffRequestId: string;
  publicAddress: string;
  provider: string;
  network: string;
  domain?: string;
  onVerified?: (profile: SolanaWalletProfile) => void;
}) {
  const [pasteText, setPasteText] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'verified' | 'failed' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const handleSubmit = useCallback(() => {
    const request = loadPendingOwnershipProofRequest();
    if (!request) {
      setStatus('error');
      setStatusMessage('No pending ownership proof request. Please start a new handoff.');
      return;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(pasteText.trim());
    } catch {
      setStatus('error');
      setStatusMessage('Invalid JSON. Paste the exact ownership proof payload from the browser.');
      return;
    }

    const expectedMessage = buildOwnershipProofMessageFromRequest(request);

    setStatus('processing');
    setStatusMessage('Validating ownership proof...');

    const validation = validateOwnershipProof(request, payload, expectedMessage);
    if (!validation.ok) {
      setStatus('error');
      setStatusMessage(validation.error);
      return;
    }

    const result = validation.result;

    // Attempt local Ed25519 verification
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

    if (verified) {
      setStatus('verified');
      setStatusMessage('Ownership verified locally with Ed25519.');
    } else {
      setStatus('failed');
      setStatusMessage(
        'Local signature verification failed. The proof was accepted as a browser provider claim only.'
      );
    }

    const proof = createWalletVerifiedOwnership(result, verifier);
    saveVerifiedOwnershipProof(proof);
    clearPendingOwnershipProofRequest();

    // Create a minimal profile update payload
    const profile: SolanaWalletProfile = {
      id: crypto.randomUUID(),
      label: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Wallet (Verified)`,
      publicAddress: result.publicAddress,
      network: result.network as 'devnet' | 'mainnet-beta' | 'localnet',
      status: 'address_only',
      preferredPrivateRoute: 'manual_privacy_review_only',
      tags: ['browser_handoff', 'ownership_verified', provider],
      notes: `Ownership verified at ${new Date(proof.verifiedAt).toISOString()} via ${verifier}.`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      localOnly: true,
      safetyNotes: proof.safetyNotes,
    };

    onVerified?.(profile);
  }, [pasteText, provider, onVerified]);

  const handleCreateRequest = useCallback(() => {
    // This is normally called after a handoff request is created.
    // For standalone usage, we reconstruct a minimal request.
    const handoffRequest = {
      id: handoffRequestId,
      requestId: handoffRequestId,
      nonce: handoffRequestId,
      network: network as 'devnet' | 'mainnet-beta' | 'localnet',
      expiry: Date.now() + 5 * 60 * 1000,
      createdAt: Date.now(),
    };

    const request = createOwnershipProofRequest({
      handoffRequest,
      publicAddress,
      provider: provider as 'solflare' | 'phantom' | 'backpack' | 'wallet_standard' | 'unknown',
      network: network as 'devnet' | 'mainnet-beta' | 'localnet',
      domain,
    });

    request.message = buildOwnershipProofMessageFromRequest(request);
    savePendingOwnershipProofRequest(request);

    setStatus('idle');
    setStatusMessage('Ownership proof request ready. Copy the message from below, sign it in your browser wallet, and paste the payload.');
  }, [handoffRequestId, publicAddress, provider, network, domain]);

  const request = loadPendingOwnershipProofRequest();
  const message = request ? buildOwnershipProofMessageFromRequest(request) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
        Optional Ownership Proof
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
        <strong>Ownership proof uses message signing only. It cannot move funds.</strong>
        <br />
        GORKH does not request transaction signatures. This step is optional.
      </div>

      {!request && (
        <button
          onClick={handleCreateRequest}
          style={{
            padding: '0.4rem 0.8rem',
            borderRadius: '4px',
            border: 'none',
            background: '#0f172a',
            color: '#fff',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Prepare Ownership Proof
        </button>
      )}

      {message && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>
            Message to sign:
          </div>
          <pre
            style={{
              margin: 0,
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              fontSize: '0.7rem',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {message}
          </pre>

          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste the ownership proof payload from your browser here..."
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

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleSubmit}
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
              {status === 'processing' ? 'Verifying…' : 'Verify Ownership'}
            </button>
            <button
              onClick={() => {
                clearPendingOwnershipProofRequest();
                setPasteText('');
                setStatus('idle');
                setStatusMessage('');
              }}
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

      {statusMessage && (
        <div
          style={{
            padding: '0.5rem',
            borderRadius: '4px',
            background:
              status === 'error'
                ? '#fef2f2'
                : status === 'verified'
                  ? '#f0fdf4'
                  : status === 'failed'
                    ? '#fefce8'
                    : '#f8fafc',
            border:
              status === 'error'
                ? '1px solid #fecaca'
                : status === 'verified'
                  ? '1px solid #bbf7d0'
                  : status === 'failed'
                    ? '1px solid #fde68a'
                    : '1px solid #e2e8f0',
            fontSize: '0.72rem',
            color:
              status === 'error'
                ? '#991b1b'
                : status === 'verified'
                  ? '#166534'
                  : status === 'failed'
                    ? '#854d0e'
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
        {SOLANA_WALLET_OWNERSHIP_PROOF_PHASE_15_SAFETY_NOTES[1]}
      </div>
    </div>
  );
}
