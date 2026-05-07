import { PublicKey } from '@solana/web3.js';
import { GORKH_CLOAK_SUPPORTED_ASSETS, type CloakSupportedAsset } from './cloakConfig.js';

export interface CloakPrivateSendDraftInput {
  asset: string;
  recipient: string;
  amountBaseUnits: string;
  approvalConfirmed: boolean;
  walletUnlocked: boolean;
}

export interface CloakPrivateSendDraft {
  status: 'requires_approval' | 'blocked';
  asset: CloakSupportedAsset;
  recipient: string;
  amountBaseUnits: string;
  blockedReasons: string[];
  approvalRequired: true;
  canSubmit: boolean;
}

export function isCloakSupportedAsset(asset: string): asset is CloakSupportedAsset {
  return (GORKH_CLOAK_SUPPORTED_ASSETS as readonly string[]).includes(asset);
}

export function validateCloakAmountBaseUnits(amount: string): string | null {
  if (!/^[0-9]+$/.test(amount.trim())) {
    return 'Amount must be an integer in base units.';
  }
  const parsed = BigInt(amount);
  if (parsed <= 0n) {
    return 'Amount must be greater than zero.';
  }
  return null;
}

export function validateCloakRecipient(recipient: string): string | null {
  try {
    const key = new PublicKey(recipient.trim());
    if (key.toBase58() !== recipient.trim()) {
      return 'Recipient must be a canonical Solana public key.';
    }
    return null;
  } catch {
    return 'Recipient must be a valid Solana public key.';
  }
}

export function createCloakPrivateSendDraft(input: CloakPrivateSendDraftInput): CloakPrivateSendDraft {
  const blockedReasons: string[] = [];
  if (!isCloakSupportedAsset(input.asset)) {
    blockedReasons.push('Unsupported asset. Cloak is limited to SOL, USDC, and USDT.');
  }
  const amountError = validateCloakAmountBaseUnits(input.amountBaseUnits);
  if (amountError) blockedReasons.push(amountError);
  const recipientError = validateCloakRecipient(input.recipient);
  if (recipientError) blockedReasons.push(recipientError);
  if (!input.walletUnlocked) {
    blockedReasons.push('Selected local wallet is locked.');
  }
  if (!input.approvalConfirmed) {
    blockedReasons.push('Explicit local approval is required before execution.');
  }

  return {
    status: blockedReasons.length === 0 ? 'requires_approval' : 'blocked',
    asset: isCloakSupportedAsset(input.asset) ? input.asset : 'SOL',
    recipient: input.recipient.trim(),
    amountBaseUnits: input.amountBaseUnits.trim(),
    blockedReasons,
    approvalRequired: true,
    canSubmit: blockedReasons.length === 0,
  };
}
