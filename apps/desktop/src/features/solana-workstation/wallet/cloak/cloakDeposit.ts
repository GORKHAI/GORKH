import { invoke } from '@tauri-apps/api/core';
import {
  CLOAK_PROGRAM_ID,
  NATIVE_SOL_MINT,
  createUtxo,
  createZeroUtxo,
  generateUtxoKeypair,
  parseError,
  serializeUtxo,
  transact,
} from '@cloak.dev/sdk';
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import {
  CloakDepositDraftSchema,
  CloakNoteMetadataSchema,
  type CloakDepositDraft,
  type CloakNoteMetadata,
} from '@gorkh/shared';

export function calculateCloakSolDepositFees(amountLamports: string): {
  fixedFeeLamports: string;
  variableFeeLamports: string;
  totalFeeLamports: string;
  estimatedPrivateAmountLamports: string;
} {
  const amount = BigInt(amountLamports);
  const fixed = 5_000_000n;
  const variable = (amount * 3n) / 1_000n;
  const total = fixed + variable;
  return {
    fixedFeeLamports: fixed.toString(),
    variableFeeLamports: variable.toString(),
    totalFeeLamports: total.toString(),
    estimatedPrivateAmountLamports: amount > total ? (amount - total).toString() : '0',
  };
}

export type CloakDepositProgressStage =
  | 'creating_utxo'
  | 'signing_viewing_key_registration'
  | 'generating_proof'
  | 'signing_transaction'
  | 'submitting'
  | 'confirmed'
  | 'failed';

export interface CloakDepositProgressUpdate {
  stage: CloakDepositProgressStage;
  label: string;
  proofPercent?: number;
}

interface CloakSigningSession {
  sessionId: string;
  draftId: string;
  walletId: string;
  operationKind: 'cloak_deposit';
  operationDigest: string;
  expiresAt: number;
  allowedMessageKind: 'cloak_viewing_key_registration';
  allowedTransactionKind: 'cloak_deposit';
}

interface CloakSignTransactionPayload {
  signedTransaction: number[];
  signerPublicAddress: string;
}

interface CloakSignMessagePayload {
  signature: number[];
  signerPublicAddress: string;
}

export async function prepareCloakDeposit(input: {
  walletId: string;
  amountLamports: string;
  asset: 'SOL';
  network: 'mainnet';
}): Promise<CloakDepositDraft> {
  const draft = await invoke<unknown>('wallet_cloak_deposit_prepare', {
    request: input,
  });
  return CloakDepositDraftSchema.parse(draft);
}

function toBytes(value: Uint8Array | Buffer): number[] {
  return Array.from(value);
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function serializeForSigning(transaction: Transaction | VersionedTransaction): number[] {
  if (transaction instanceof VersionedTransaction) {
    return toBytes(transaction.serialize());
  }
  return toBytes(transaction.serialize({ requireAllSignatures: false, verifySignatures: false }));
}

function deserializeSignedLikeOriginal<T extends Transaction | VersionedTransaction>(
  original: T,
  signedTransaction: number[]
): T {
  const bytes = new Uint8Array(signedTransaction);
  if (original instanceof VersionedTransaction) {
    return VersionedTransaction.deserialize(bytes) as T;
  }
  return Transaction.from(bytes) as T;
}

async function beginCloakSigningSession(draft: CloakDepositDraft): Promise<CloakSigningSession> {
  const session = await invoke<CloakSigningSession>('wallet_cloak_begin_signing_session', {
    request: {
      draftId: draft.id,
      walletId: draft.walletId,
      amountLamports: draft.amountLamports,
      asset: draft.asset,
      network: draft.network,
      approvalDigest: draft.approvalDigest,
      approvalConfirmed: true,
      initiatedBy: 'wallet_ui',
    },
  });
  return session;
}

async function endCloakSigningSession(session: CloakSigningSession): Promise<void> {
  await invoke('wallet_cloak_end_signing_session', {
    request: {
      sessionId: session.sessionId,
      walletId: session.walletId,
      operationDigest: session.operationDigest,
    },
  });
}

function createTauriCloakSigner(session: CloakSigningSession, publicAddress: string) {
  return {
    signTransaction: async <T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> => {
      const result = await invoke<CloakSignTransactionPayload>('wallet_cloak_sign_transaction', {
        request: {
          sessionId: session.sessionId,
          walletId: session.walletId,
          operationDigest: session.operationDigest,
          serializedTransaction: serializeForSigning(transaction),
          purpose: 'cloak_deposit',
        },
      });
      if (result.signerPublicAddress !== publicAddress) {
        throw new Error('Cloak signer returned a different wallet address.');
      }
      return deserializeSignedLikeOriginal(transaction, result.signedTransaction);
    },
    signMessage: async (message: Uint8Array): Promise<Uint8Array> => {
      const result = await invoke<CloakSignMessagePayload>('wallet_cloak_sign_message', {
        request: {
          sessionId: session.sessionId,
          walletId: session.walletId,
          operationDigest: session.operationDigest,
          message: toBytes(message),
          purpose: 'cloak_viewing_key_registration',
        },
      });
      if (result.signerPublicAddress !== publicAddress) {
        throw new Error('Cloak message signer returned a different wallet address.');
      }
      return new Uint8Array(result.signature);
    },
  };
}

function summarizeCloakError(error: unknown): string {
  try {
    const parsed = parseError(error);
    return `${parsed.message}${parsed.recoverable ? ' This may be recoverable with a retry.' : ''}`;
  } catch {
    return error instanceof Error ? error.message : 'Cloak deposit failed.';
  }
}

export async function executeCloakDepositWithSignerBridge(
  draft: CloakDepositDraft,
  onProgress?: (update: CloakDepositProgressUpdate) => void
): Promise<CloakNoteMetadata> {
  if (BigInt(draft.amountLamports) < 10_000_000n) {
    throw new Error('Minimum SOL deposit is 10000000 lamports.');
  }
  let session: CloakSigningSession | null = null;
  try {
    session = await beginCloakSigningSession(draft);
    onProgress?.({ stage: 'creating_utxo', label: 'Creating private UTXO' });
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    const walletPublicKey = new PublicKey(draft.publicAddress);
    const owner = await generateUtxoKeypair();
    const output = await createUtxo(BigInt(draft.amountLamports), owner, NATIVE_SOL_MINT);
    const signer = createTauriCloakSigner(session, draft.publicAddress);

    const result = await transact(
      {
        inputUtxos: [await createZeroUtxo(NATIVE_SOL_MINT)],
        outputUtxos: [output],
        externalAmount: BigInt(draft.amountLamports),
        depositor: walletPublicKey,
      },
      {
        connection,
        programId: CLOAK_PROGRAM_ID,
        relayUrl: draft.relayUrl,
        signTransaction: async (transaction) => {
          onProgress?.({ stage: 'signing_transaction', label: 'Signing approved Cloak transaction' });
          return signer.signTransaction(transaction);
        },
        signMessage: async (message) => {
          onProgress?.({
            stage: 'signing_viewing_key_registration',
            label: 'Signing Cloak viewing-key registration',
          });
          return signer.signMessage(message);
        },
        depositorPublicKey: walletPublicKey,
        walletPublicKey,
        onProgress: (status) => {
          onProgress?.({ stage: status.toLowerCase().includes('proof') ? 'generating_proof' : 'submitting', label: status });
        },
        onProofProgress: (percent) => {
          onProgress?.({ stage: 'generating_proof', label: 'Generating Cloak proof', proofPercent: percent });
        },
      }
    );

    const outputUtxos = result.outputUtxos ?? [output];
    const rawNotePayload = JSON.stringify({
      version: 'gorkh-cloak-utxo-note-v1',
      draftId: draft.id,
      operationDigest: draft.approvalDigest,
      serializedOutputUtxos: outputUtxos.map((utxo) => toBase64(serializeUtxo(utxo))),
      depositSignature: result.signature,
      commitmentIndices: result.commitmentIndices ?? [],
      createdAt: Date.now(),
    });
    const note = await invoke<unknown>('wallet_cloak_note_save_secure', {
      request: {
        walletId: draft.walletId,
        draftId: draft.id,
        operationDigest: draft.approvalDigest,
        asset: 'SOL',
        amountLamports: draft.amountLamports,
        depositSignature: result.signature ?? null,
        leafIndex: result.commitmentIndices?.[0] ?? null,
        rawNotePayload,
      },
    });
    onProgress?.({ stage: 'confirmed', label: 'Cloak deposit confirmed' });
    return CloakNoteMetadataSchema.parse(note);
  } catch (error) {
    onProgress?.({ stage: 'failed', label: summarizeCloakError(error) });
    throw new Error(summarizeCloakError(error));
  } finally {
    if (session) {
      await endCloakSigningSession(session).catch(() => undefined);
    }
  }
}

export async function executeCloakDeposit(draft: CloakDepositDraft): Promise<CloakNoteMetadata> {
  return executeCloakDepositWithSignerBridge(draft);
}

export async function listCloakNotes(walletId: string): Promise<CloakNoteMetadata[]> {
  const notes = await invoke<unknown[]>('wallet_cloak_notes_list', { walletId });
  return notes.map((note) => CloakNoteMetadataSchema.parse(note));
}

export async function forgetCloakNote(walletId: string, noteId: string): Promise<void> {
  const result = await invoke<{ ok: boolean; error?: string }>('wallet_cloak_note_forget', {
    walletId,
    noteId,
  });
  if (!result.ok) {
    throw new Error(result.error ?? 'Failed to forget Cloak note.');
  }
}
