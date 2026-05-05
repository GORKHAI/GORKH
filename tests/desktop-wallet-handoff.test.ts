import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  createHandoffRequest,
  HANDOFF_REQUEST_EXPIRY_MS,
} from '../apps/desktop/src/features/solana-workstation/wallet/handoff/createHandoffRequest.js';
import {
  validateHandoffResult,
} from '../apps/desktop/src/features/solana-workstation/wallet/handoff/validateHandoffResult.js';
import {
  loadPendingHandoffRequest,
  savePendingHandoffRequest,
  clearPendingHandoffRequest,
} from '../apps/desktop/src/features/solana-workstation/wallet/handoff/walletHandoffStorage.js';
import {
  createWalletProfileFromHandoff,
} from '../apps/desktop/src/features/solana-workstation/wallet/handoff/createWalletProfileFromHandoff.js';
import {
  buildWalletConnectUrl,
  buildWalletConnectUrlFromRuntime,
} from '../apps/desktop/src/features/solana-workstation/wallet/handoff/openBrowserWalletConnect.js';
import {
  SolanaWalletHandoffPayloadSchema,
  SOLANA_WALLET_HANDOFF_FORBIDDEN_PAYLOAD_FIELDS,
  hasForbiddenHandoffPayloadFields,
  SolanaExternalWalletProvider,
} from '../packages/shared/src/index.ts';

describe('desktop-wallet-handoff', () => {
  describe('createHandoffRequest', () => {
    it('creates a request with all required fields', () => {
      const req = createHandoffRequest({ network: 'devnet' });
      assert.strictEqual(typeof req.id, 'string');
      assert.strictEqual(typeof req.requestId, 'string');
      assert.strictEqual(typeof req.nonce, 'string');
      assert.strictEqual(req.network, 'devnet');
      assert.strictEqual(typeof req.expiry, 'number');
      assert.strictEqual(typeof req.createdAt, 'number');
    });

    it('defaults network to devnet', () => {
      const req = createHandoffRequest({});
      assert.strictEqual(req.network, 'devnet');
    });

    it('sets expiry relative to createdAt', () => {
      const before = Date.now();
      const req = createHandoffRequest({});
      const after = Date.now();
      assert.ok(req.expiry >= before + HANDOFF_REQUEST_EXPIRY_MS);
      assert.ok(req.expiry <= after + HANDOFF_REQUEST_EXPIRY_MS);
    });

    it('generates unique ids per call', () => {
      const req1 = createHandoffRequest({});
      const req2 = createHandoffRequest({});
      assert.notStrictEqual(req1.id, req2.id);
      assert.notStrictEqual(req1.requestId, req2.requestId);
      assert.notStrictEqual(req1.nonce, req2.nonce);
    });
  });

  describe('validateHandoffResult', () => {
    const request = createHandoffRequest({ network: 'devnet' });

    const validPayload = {
      version: 'gorkh-wallet-handoff-v1' as const,
      requestId: request.requestId,
      nonce: request.nonce,
      publicAddress: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
      provider: SolanaExternalWalletProvider.SOLFLARE,
      network: 'devnet' as const,
      connectedAt: Date.now(),
      safetyNotes: ['Test safety note'],
    };

    it('accepts a valid payload', () => {
      const result = validateHandoffResult(request, validPayload);
      assert.strictEqual(result.ok, true);
      if (result.ok) {
        assert.strictEqual(result.result.publicAddress, validPayload.publicAddress);
        assert.strictEqual(result.result.provider, validPayload.provider);
      }
    });

    it('rejects non-object payload', () => {
      const result = validateHandoffResult(request, 'not-an-object');
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.ok(result.error.includes('JSON object'));
      }
    });

    it('rejects null payload', () => {
      const result = validateHandoffResult(request, null);
      assert.strictEqual(result.ok, false);
    });

    it('rejects payload with wrong requestId', () => {
      const result = validateHandoffResult(request, {
        ...validPayload,
        requestId: 'wrong-request-id',
      });
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.ok(result.error.includes('Request ID mismatch'));
        assert.strictEqual(result.field, 'requestId');
      }
    });

    it('rejects payload with wrong nonce', () => {
      const result = validateHandoffResult(request, {
        ...validPayload,
        nonce: 'wrong-nonce',
      });
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.ok(result.error.includes('Nonce mismatch'));
        assert.strictEqual(result.field, 'nonce');
      }
    });

    it('rejects expired request', () => {
      const expiredRequest = {
        ...request,
        expiry: Date.now() - 1000,
      };
      const result = validateHandoffResult(expiredRequest, validPayload);
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.ok(result.error.includes('expired'));
        assert.strictEqual(result.field, 'expiry');
      }
    });

    it('rejects payload with wrong network', () => {
      const result = validateHandoffResult(request, {
        ...validPayload,
        network: 'mainnet-beta',
      });
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.ok(result.error.includes('Network mismatch'));
        assert.strictEqual(result.field, 'network');
      }
    });

    it('rejects payload containing forbidden fields', () => {
      const result = validateHandoffResult(request, {
        ...validPayload,
        privateKey: 'should-not-be-here',
      });
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.ok(result.error.includes('forbidden'));
        assert.strictEqual(result.field, 'forbidden');
      }
    });

    it('rejects payload with invalid schema', () => {
      const result = validateHandoffResult(request, {
        version: 'gorkh-wallet-handoff-v1',
        requestId: request.requestId,
        nonce: request.nonce,
        // missing publicAddress, provider, network, connectedAt, safetyNotes
      });
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.strictEqual(result.field, 'schema');
      }
    });

    it('rejects payload with unknown version', () => {
      const result = validateHandoffResult(request, {
        ...validPayload,
        version: 'unknown-version',
      });
      assert.strictEqual(result.ok, false);
    });
  });

  describe('walletHandoffStorage', () => {
    const store: Record<string, string> = {};

    beforeEach(() => {
      Object.keys(store).forEach((k) => delete store[k]);
      // @ts-expect-error mock window
      globalThis.window = {
        localStorage: {
          getItem: (k: string) => store[k] ?? null,
          setItem: (k: string, v: string) => { store[k] = v; },
          removeItem: (k: string) => { delete store[k]; },
        },
      };
    });

    afterEach(() => {
      // @ts-expect-error cleanup
      delete globalThis.window;
    });

    it('round-trips a pending request', () => {
      const request = createHandoffRequest({ network: 'devnet' });
      savePendingHandoffRequest(request);
      const loaded = loadPendingHandoffRequest();
      assert.deepStrictEqual(loaded, request);
      clearPendingHandoffRequest();
    });

    it('returns null when no request is stored', () => {
      clearPendingHandoffRequest();
      const loaded = loadPendingHandoffRequest();
      assert.strictEqual(loaded, null);
    });

    it('returns null and clears invalid data', () => {
      store['gorkh.solana.wallet.handoff.request.v1'] = 'not-json';
      const loaded = loadPendingHandoffRequest();
      assert.strictEqual(loaded, null);
    });

    it('returns null for expired requests', () => {
      const expired = {
        ...createHandoffRequest({ network: 'devnet' }),
        expiry: Date.now() - 1000,
      };
      savePendingHandoffRequest(expired);
      const loaded = loadPendingHandoffRequest();
      assert.strictEqual(loaded, null);
    });
  });

  describe('createWalletProfileFromHandoff', () => {
    it('creates an address-only profile from handoff result', () => {
      const result = {
        requestId: 'req-1',
        nonce: 'nonce-1',
        publicAddress: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
        provider: SolanaExternalWalletProvider.PHANTOM,
        network: 'devnet' as const,
        connectedAt: Date.now(),
        safetyNotes: ['Safety note'],
      };

      const profile = createWalletProfileFromHandoff(result);
      assert.strictEqual(profile.label, 'Phantom Wallet');
      assert.strictEqual(profile.publicAddress, result.publicAddress);
      assert.strictEqual(profile.network, 'devnet');
      assert.strictEqual(profile.status, 'address_only');
      assert.ok(profile.tags.includes('browser_handoff'));
      assert.ok(profile.tags.includes('phantom'));
      assert.ok(profile.tags.includes('phase_14'));
      assert.strictEqual(profile.localOnly, true);
      assert.ok(profile.safetyNotes.length > 0);
    });

    it('capitalizes provider name in label', () => {
      const result = {
        requestId: 'req-1',
        nonce: 'nonce-1',
        publicAddress: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
        provider: SolanaExternalWalletProvider.SOLFLARE,
        network: 'devnet' as const,
        connectedAt: Date.now(),
        safetyNotes: [],
      };

      const profile = createWalletProfileFromHandoff(result);
      assert.strictEqual(profile.label, 'Solflare Wallet');
    });
  });

  describe('buildWalletConnectUrl', () => {
    it('builds URL with query params', () => {
      const request = createHandoffRequest({ network: 'devnet' });
      const url = buildWalletConnectUrl({ webOrigin: 'https://app.gorkh.ai', request });
      const parsed = new URL(url);
      assert.strictEqual(parsed.pathname, '/desktop/wallet-connect');
      assert.strictEqual(parsed.searchParams.get('requestId'), request.requestId);
      assert.strictEqual(parsed.searchParams.get('nonce'), request.nonce);
      assert.strictEqual(parsed.searchParams.get('network'), 'devnet');
    });
  });

  describe('buildWalletConnectUrlFromRuntime', () => {
    it('derives web origin from API base port 3001', () => {
      const request = createHandoffRequest({ network: 'devnet' });
      const url = buildWalletConnectUrlFromRuntime('http://localhost:3001', request);
      assert.ok(url.includes('localhost:3000'));
    });

    it('falls back to safe default when parsing fails', () => {
      const request = createHandoffRequest({ network: 'devnet' });
      const url = buildWalletConnectUrlFromRuntime('not-a-url', request);
      assert.ok(url.includes('localhost:3000'));
    });
  });

  describe('shared handoff payload schema', () => {
    it('validates a correct payload', () => {
      const payload = {
        version: 'gorkh-wallet-handoff-v1',
        requestId: 'req-1',
        nonce: 'nonce-1',
        publicAddress: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
        provider: SolanaExternalWalletProvider.SOLFLARE,
        network: 'devnet',
        connectedAt: Date.now(),
        safetyNotes: ['Note'],
      };
      const parsed = SolanaWalletHandoffPayloadSchema.safeParse(payload);
      assert.strictEqual(parsed.success, true);
    });

    it('rejects payload with missing fields', () => {
      const payload = {
        version: 'gorkh-wallet-handoff-v1',
        requestId: 'req-1',
        nonce: 'nonce-1',
      };
      const parsed = SolanaWalletHandoffPayloadSchema.safeParse(payload);
      assert.strictEqual(parsed.success, false);
    });
  });

  describe('forbidden field guards', () => {
    it('detects forbidden fields in payload', () => {
      assert.strictEqual(
        hasForbiddenHandoffPayloadFields({ privateKey: 'abc', publicAddress: 'xyz' }),
        true
      );
    });

    it('allows safe payloads', () => {
      assert.strictEqual(
        hasForbiddenHandoffPayloadFields({ publicAddress: 'xyz', provider: 'solflare' }),
        false
      );
    });

    it('includes expected forbidden fields', () => {
      assert.ok(SOLANA_WALLET_HANDOFF_FORBIDDEN_PAYLOAD_FIELDS.includes('privateKey'));
      assert.ok(SOLANA_WALLET_HANDOFF_FORBIDDEN_PAYLOAD_FIELDS.includes('seedPhrase'));
      assert.ok(SOLANA_WALLET_HANDOFF_FORBIDDEN_PAYLOAD_FIELDS.includes('signature'));
      assert.ok(SOLANA_WALLET_HANDOFF_FORBIDDEN_PAYLOAD_FIELDS.includes('secretKey'));
    });
  });
});
