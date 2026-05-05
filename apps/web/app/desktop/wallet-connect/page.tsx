'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Copy, Loader2, Wallet, XCircle, Shield } from 'lucide-react';
import { Card, Button, Banner } from '../../../components/ui';

// Inline types to avoid adding @gorkh/shared dependency to the web app.

type SolanaExternalWalletProvider = 'solflare' | 'phantom' | 'backpack' | 'wallet_standard' | 'unknown';

interface DetectedProvider {
  provider: SolanaExternalWalletProvider;
  label: string;
  detected: boolean;
  detail: string;
}

interface HandoffPayload {
  version: 'gorkh-wallet-handoff-v1';
  requestId: string;
  nonce: string;
  publicAddress: string;
  provider: SolanaExternalWalletProvider;
  network: string;
  connectedAt: number;
  safetyNotes: string[];
}

interface OwnershipProofPayload {
  version: 'gorkh-wallet-ownership-proof-v1';
  requestId: string;
  handoffRequestId: string;
  nonce: string;
  publicAddress: string;
  provider: SolanaExternalWalletProvider;
  network: string;
  message: string;
  signature: string;
  signatureEncoding: 'base58' | 'base64' | 'hex' | 'unknown';
  signedAt: number;
  status: 'signed';
  verificationStatus: 'not_verified';
  safetyNotes: string[];
}

const SAFETY_NOTES = [
  'Browser wallet handoff transfers only the public wallet address.',
  'No private key, seed phrase, or signing capability leaves the browser.',
  'GORKH Desktop receives only the public address to create a read-only profile.',
  'Always verify the pasted payload matches the browser wallet you connected.',
];

const OWNERSHIP_SAFETY_NOTES = [
  'Ownership proof uses message signing only.',
  'Message signing cannot move funds.',
  'GORKH does not request transaction signatures.',
  'Ownership proof is optional and can be skipped.',
];

function detectProviders(): DetectedProvider[] {
  if (typeof window === 'undefined') {
    return [
      { provider: 'solflare', label: 'Solflare', detected: false, detail: 'Not available' },
      { provider: 'phantom', label: 'Phantom', detected: false, detail: 'Not available' },
    ];
  }

  const providers: DetectedProvider[] = [];

  const solflare = (window as unknown as Record<string, unknown>).solflare;
  const solflareDetected = Boolean(
    solflare && typeof (solflare as { isConnected?: boolean }).isConnected === 'boolean'
  );
  providers.push({
    provider: 'solflare',
    label: 'Solflare',
    detected: solflareDetected,
    detail: solflareDetected ? 'Extension detected' : 'Extension not detected',
  });

  const phantom = (window as unknown as Record<string, Record<string, unknown>>).phantom;
  const phantomSolana = phantom?.solana;
  const phantomDetected = Boolean(
    phantomSolana && typeof (phantomSolana as { isConnected?: boolean }).isConnected === 'boolean'
  );
  providers.push({
    provider: 'phantom',
    label: 'Phantom',
    detected: phantomDetected,
    detail: phantomDetected ? 'Extension detected' : 'Extension not detected',
  });

  const backpack = (window as unknown as Record<string, unknown>).backpack;
  const backpackDetected = Boolean(backpack);
  if (backpackDetected) {
    providers.push({
      provider: 'backpack',
      label: 'Backpack',
      detected: true,
      detail: 'Extension detected',
    });
  }

  return providers;
}

async function connectProvider(provider: SolanaExternalWalletProvider): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  if (provider === 'solflare') {
    const solflare = (window as unknown as Record<string, unknown>).solflare;
    const connector = solflare as { connect?: () => Promise<void>; publicKey?: { toString: () => string } } | undefined;
    if (connector?.connect) {
      await connector.connect();
      return connector.publicKey?.toString() ?? null;
    }
  }

  if (provider === 'phantom') {
    const phantom = (window as unknown as Record<string, Record<string, unknown>>).phantom;
    const solana = phantom?.solana as { connect?: () => Promise<void>; publicKey?: { toString: () => string } } | undefined;
    if (solana?.connect) {
      await solana.connect();
      return solana.publicKey?.toString() ?? null;
    }
  }

  if (provider === 'backpack') {
    const backpack = (window as unknown as Record<string, unknown>).backpack;
    const bp = backpack as { connect?: () => Promise<void>; publicKey?: { toString: () => string } } | undefined;
    if (bp?.connect) {
      await bp.connect();
      return bp.publicKey?.toString() ?? null;
    }
  }

  return null;
}

async function signMessageWithProvider(
  provider: SolanaExternalWalletProvider,
  message: Uint8Array
): Promise<{ signature: Uint8Array; encoding: 'base58' } | null> {
  if (typeof window === 'undefined') return null;

  if (provider === 'solflare') {
    const solflare = (window as unknown as Record<string, unknown>).solflare;
    const signer = solflare as { signMessage?: (msg: Uint8Array, display: string) => Promise<{ signature: Uint8Array }> } | undefined;
    if (signer?.signMessage) {
      const result = await signer.signMessage(message, 'utf8');
      return { signature: result.signature, encoding: 'base58' };
    }
  }

  if (provider === 'phantom') {
    const phantom = (window as unknown as Record<string, Record<string, unknown>>).phantom;
    const solana = phantom?.solana as { signMessage?: (msg: Uint8Array, display: string) => Promise<{ signature: Uint8Array }> } | undefined;
    if (solana?.signMessage) {
      const result = await solana.signMessage(message, 'utf8');
      return { signature: result.signature, encoding: 'base58' };
    }
  }

  if (provider === 'backpack') {
    const backpack = (window as unknown as Record<string, unknown>).backpack;
    const bp = backpack as { signMessage?: (msg: Uint8Array) => Promise<{ signature: Uint8Array }> } | undefined;
    if (bp?.signMessage) {
      const result = await bp.signMessage(message);
      return { signature: result.signature, encoding: 'base58' };
    }
  }

  return null;
}

function encodeBase58(bytes: Uint8Array): string {
  // Simple base58 alphabet
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const BASE = BigInt(58);

  let num = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    num = (num << BigInt(8)) | BigInt(bytes[i]);
  }

  let encoded = '';
  if (num === BigInt(0)) {
    encoded = ALPHABET[0];
  } else {
    while (num > BigInt(0)) {
      encoded = ALPHABET[Number(num % BASE)] + encoded;
      num = num / BASE;
    }
  }

  // Add leading zero bytes
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    encoded = ALPHABET[0] + encoded;
  }

  return encoded;
}

function buildOwnershipProofMessage(input: {
  publicAddress: string;
  provider: string;
  network: string;
  requestId: string;
  handoffRequestId: string;
  nonce: string;
  domain: string;
  createdAt: number;
  expiresAt: number;
}): string {
  return [
    'GORKH Wallet Ownership Proof',
    'Version: gorkh-wallet-ownership-proof-v1',
    `Domain: ${input.domain}`,
    `Address: ${input.publicAddress}`,
    `Provider: ${input.provider}`,
    `Network: ${input.network}`,
    `Request ID: ${input.requestId}`,
    `Handoff Request ID: ${input.handoffRequestId}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${new Date(input.createdAt).toISOString()}`,
    `Expires At: ${new Date(input.expiresAt).toISOString()}`,
    '',
    'Statement:',
    'I am proving ownership of this public Solana address to GORKH. This message signing request cannot move funds or authorize transactions.',
  ].join('\n');
}

function buildPayload(
  requestId: string,
  nonce: string,
  publicAddress: string,
  provider: SolanaExternalWalletProvider,
  network: string
): HandoffPayload {
  return {
    version: 'gorkh-wallet-handoff-v1',
    requestId,
    nonce,
    publicAddress,
    provider,
    network,
    connectedAt: Date.now(),
    safetyNotes: SAFETY_NOTES,
  };
}

function buildOwnershipPayload(
  requestId: string,
  handoffRequestId: string,
  nonce: string,
  publicAddress: string,
  provider: SolanaExternalWalletProvider,
  network: string,
  message: string,
  signature: string,
  signatureEncoding: 'base58' | 'base64' | 'hex' | 'unknown'
): OwnershipProofPayload {
  return {
    version: 'gorkh-wallet-ownership-proof-v1',
    requestId,
    handoffRequestId,
    nonce,
    publicAddress,
    provider,
    network,
    message,
    signature,
    signatureEncoding,
    signedAt: Date.now(),
    status: 'signed',
    verificationStatus: 'not_verified',
    safetyNotes: OWNERSHIP_SAFETY_NOTES,
  };
}

function WalletConnectPageContent() {
  const searchParams = useSearchParams();
  const requestId = searchParams.get('requestId');
  const nonce = searchParams.get('nonce');
  const network = searchParams.get('network') || 'devnet';

  const [providers, setProviders] = useState<DetectedProvider[]>([]);
  const [connectingProvider, setConnectingProvider] = useState<SolanaExternalWalletProvider | null>(null);
  const [payload, setPayload] = useState<HandoffPayload | null>(null);
  const [ownershipPayload, setOwnershipPayload] = useState<OwnershipProofPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [signingMessage, setSigningMessage] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [connectedProvider, setConnectedProvider] = useState<SolanaExternalWalletProvider | null>(null);

  useEffect(() => {
    setProviders(detectProviders());
  }, []);

  const handleConnect = useCallback(
    async (provider: SolanaExternalWalletProvider) => {
      if (!requestId || !nonce) {
        setError('Missing request parameters. Please start the connection from GORKH Desktop.');
        return;
      }

      setConnectingProvider(provider);
      setError(null);
      setPayload(null);
      setOwnershipPayload(null);

      try {
        const address = await connectProvider(provider);
        if (!address) {
          throw new Error('Could not retrieve public address from wallet. Make sure the extension is unlocked and try again.');
        }
        setConnectedAddress(address);
        setConnectedProvider(provider);
        const p = buildPayload(requestId, nonce, address, provider, network);
        setPayload(p);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Connection failed.');
      } finally {
        setConnectingProvider(null);
      }
    },
    [requestId, nonce, network]
  );

  const handleSignOwnership = useCallback(async () => {
    if (!requestId || !nonce || !connectedAddress || !connectedProvider) {
      setError('Wallet not connected. Please connect a wallet first.');
      return;
    }

    setSigningMessage(true);
    setError(null);

    try {
      const now = Date.now();
      const domain = typeof window !== 'undefined' ? window.location.host : 'app.gorkh.ai';
      const message = buildOwnershipProofMessage({
        publicAddress: connectedAddress,
        provider: connectedProvider,
        network,
        requestId: crypto.randomUUID(),
        handoffRequestId: requestId,
        nonce,
        domain,
        createdAt: now,
        expiresAt: now + 5 * 60 * 1000,
      });

      const messageBytes = new TextEncoder().encode(message);
      const signResult = await signMessageWithProvider(connectedProvider, messageBytes);

      if (!signResult) {
        throw new Error('This wallet provider does not support signMessage. Use the public-address-only payload instead.');
      }

      const signatureStr = encodeBase58(signResult.signature);
      const op = buildOwnershipPayload(
        crypto.randomUUID(),
        requestId,
        nonce,
        connectedAddress,
        connectedProvider,
        network,
        message,
        signatureStr,
        signResult.encoding
      );
      setOwnershipPayload(op);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ownership proof signing failed.');
    } finally {
      setSigningMessage(false);
    }
  }, [requestId, nonce, connectedAddress, connectedProvider, network]);

  const handleCopy = useCallback(async (data: HandoffPayload | OwnershipProofPayload) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Failed to copy to clipboard.');
    }
  }, []);

  const missingParams = !requestId || !nonce;

  return (
    <main className="page page--center">
      <Card className="auth-card" style={{ textAlign: 'center' }}>
        <div
          style={{
            margin: '0 auto 18px',
            width: 74,
            height: 74,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            border: '1px solid var(--line)',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          {error ? (
            <XCircle size={28} color="#f87171" />
          ) : ownershipPayload ? (
            <Shield size={28} color="#34d399" />
          ) : payload ? (
            <CheckCircle2 size={28} color="#34d399" />
          ) : (
            <Wallet size={28} />
          )}
        </div>

        <h1 className="section-heading" style={{ fontSize: 28 }}>
          Wallet Connect
        </h1>

        <p className="copy" style={{ marginTop: 12 }}>
          Connect your browser wallet to transfer your public address to GORKH Desktop.
        </p>

        {missingParams && (
          <Banner tone="danger" style={{ marginTop: 16, textAlign: 'left' }}>
            Missing connection parameters. Please start the wallet connection from the GORKH Desktop app.
          </Banner>
        )}

        {!missingParams && !payload && (
          <div style={{ marginTop: 24, display: 'grid', gap: 12 }}>
            {providers.map((p) => (
              <div
                key={p.provider}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--line)',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.label}</div>
                  <div
                    className="small-note"
                    style={{
                      color: p.detected ? 'var(--success)' : 'var(--muted)',
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    {p.detail}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  loading={connectingProvider === p.provider}
                  disabled={!p.detected || connectingProvider !== null}
                  onClick={() => handleConnect(p.provider)}
                >
                  {connectingProvider === p.provider ? 'Connecting…' : 'Connect'}
                </Button>
              </div>
            ))}

            {providers.length === 0 && (
              <div className="small-note" style={{ color: 'var(--muted)' }}>
                No wallet providers detected. Install Solflare or Phantom to connect.
              </div>
            )}
          </div>
        )}

        {error && (
          <Banner tone="danger" style={{ marginTop: 16, textAlign: 'left' }}>
            {error}
          </Banner>
        )}

        {payload && !ownershipPayload && (
          <div style={{ marginTop: 24, textAlign: 'left', display: 'grid', gap: 16 }}>
            <Banner tone="success">
              <strong>Wallet connected!</strong> Choose how to complete the connection.
            </Banner>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--line)',
                background: 'rgba(255,255,255,0.02)',
                display: 'grid',
                gap: 12,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14 }}>Public Address Only</div>
              <div className="small-note" style={{ fontSize: 12 }}>
                Transfer just your public address. Fast and safe.
              </div>
              <Button variant="secondary" onClick={() => handleCopy(payload)}>
                {copied ? (
                  <>
                    <CheckCircle2 size={14} /> Copied
                  </>
                ) : (
                  <>
                    <Copy size={14} /> Copy Payload
                  </>
                )}
              </Button>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(251,191,36,0.24)',
                background: 'rgba(251,191,36,0.08)',
                display: 'grid',
                gap: 12,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, color: '#fde68a' }}>
                Optional Ownership Proof
              </div>
              <div className="small-note" style={{ fontSize: 12, color: '#fde68a' }}>
                Sign a plain text message to prove you own this address.
                <br />
                <strong>This is not a transaction and cannot move funds.</strong>
              </div>
              <Button
                variant="secondary"
                loading={signingMessage}
                disabled={signingMessage}
                onClick={handleSignOwnership}
              >
                {signingMessage ? 'Signing…' : 'Sign Ownership Message'}
              </Button>
            </div>
          </div>
        )}

        {ownershipPayload && (
          <div style={{ marginTop: 24, textAlign: 'left', display: 'grid', gap: 16 }}>
            <Banner tone="success">
              <strong>Ownership proof signed!</strong> Copy the payload below and paste it into GORKH Desktop.
            </Banner>

            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <span className="section-title">Ownership Proof Payload</span>
                <Button variant="ghost" onClick={() => handleCopy(ownershipPayload)}>
                  {copied ? (
                    <>
                      <CheckCircle2 size={14} /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Copy
                    </>
                  )}
                </Button>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: 16,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--line)',
                  background: 'rgba(0,0,0,0.75)',
                  fontSize: 12,
                  lineHeight: 1.7,
                  color: 'rgba(255,255,255,0.56)',
                  overflow: 'auto',
                  textAlign: 'left',
                  maxHeight: 320,
                }}
              >
                {JSON.stringify(ownershipPayload, null, 2)}
              </pre>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(251,191,36,0.24)',
                background: 'rgba(251,191,36,0.08)',
                fontSize: 12,
                lineHeight: 1.6,
                color: '#fde68a',
                textAlign: 'left',
              }}
            >
              <strong>Safety reminder:</strong> This payload contains your public address, the signed message, and the signature.
              It does not contain private keys or transaction authorizations.
            </div>

            <Button variant="ghost" onClick={() => { setOwnershipPayload(null); setPayload(null); setConnectedAddress(null); setConnectedProvider(null); }}>
              Start Over
            </Button>
          </div>
        )}
      </Card>
    </main>
  );
}

export default function WalletConnectPage() {
  return (
    <Suspense
      fallback={
        <main className="page page--center">
          <Card className="auth-card" style={{ textAlign: 'center' }}>
            <Loader2 size={28} className="spinner" style={{ margin: '0 auto 18px' }} />
            <h1 className="section-heading" style={{ fontSize: 28 }}>
              Wallet Connect
            </h1>
            <p className="copy" style={{ marginTop: 12 }}>
              Loading wallet connection...
            </p>
          </Card>
        </main>
      }
    >
      <WalletConnectPageContent />
    </Suspense>
  );
}
