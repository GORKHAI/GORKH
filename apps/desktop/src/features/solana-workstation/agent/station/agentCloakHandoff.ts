import {
  hasForbiddenHandoffField,
  type GorkhAgentCloakDraftHandoff,
  type GorkhAgentCloakDraftKind,
  type GorkhAgentWalletToolResult,
} from '@gorkh/shared';

export interface PrepareCloakHandoffInput {
  intent: string;
  draftKind?: GorkhAgentCloakDraftKind;
  walletResult?: GorkhAgentWalletToolResult | null;
  /** Optional explicit recipient extracted from intent. */
  recipientOverride?: string;
}

const SOL_AMOUNT_REGEX =
  /([0-9]+(?:\.[0-9]+)?)\s*(?:sol|sols|◎)\b/i;
const RECIPIENT_REGEX = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/;

export function detectCloakDraftKind(intent: string): GorkhAgentCloakDraftKind {
  const lowered = intent.toLowerCase();
  if (/(deposit|fund|top.?up|stake into cloak)/.test(lowered)) {
    return 'cloak_deposit';
  }
  return 'cloak_private_send';
}

export function extractAmountLamports(intent: string): { lamports?: string; ui?: string } {
  const match = SOL_AMOUNT_REGEX.exec(intent);
  if (!match) return {};
  const ui = match[1];
  const lamports = solUiToLamports(ui);
  return { lamports, ui };
}

function solUiToLamports(ui: string): string | undefined {
  const num = Number(ui);
  if (!Number.isFinite(num) || num < 0) return undefined;
  // 1 SOL = 1_000_000_000 lamports. Avoid float drift for small values.
  const lamports = Math.round(num * 1_000_000_000);
  if (!Number.isSafeInteger(lamports)) return undefined;
  return String(lamports);
}

export function extractRecipient(intent: string): string | undefined {
  const m = RECIPIENT_REGEX.exec(intent);
  return m ? m[0] : undefined;
}

export function prepareCloakHandoff(
  input: PrepareCloakHandoffInput
): GorkhAgentCloakDraftHandoff {
  const draftKind = input.draftKind ?? detectCloakDraftKind(input.intent);
  const { lamports, ui } = extractAmountLamports(input.intent);
  const recipient = input.recipientOverride ?? extractRecipient(input.intent);
  const wallet = input.walletResult ?? null;

  const warnings: string[] = [];
  if (!wallet || !wallet.selectedProfileLabel) {
    warnings.push('No wallet profile selected. Open Wallet to pick a profile before Cloak review.');
  }
  if (!lamports) {
    warnings.push('No SOL amount detected. Confirm amount inside Wallet → Cloak Private.');
  }
  if (draftKind === 'cloak_private_send' && !recipient) {
    warnings.push('No recipient address detected. Confirm recipient inside Wallet → Cloak Private.');
  }
  warnings.push('Cloak execution remains in Wallet → Cloak Private with explicit approval.');

  let handoffStatus: GorkhAgentCloakDraftHandoff['handoffStatus'];
  const missingRequired =
    !wallet?.selectedProfileLabel ||
    !lamports ||
    (draftKind === 'cloak_private_send' && !recipient);
  if (missingRequired) handoffStatus = 'missing_required_fields';
  else handoffStatus = 'ready_for_wallet_review';

  const handoff: GorkhAgentCloakDraftHandoff = {
    id: `gorkh-cloak-handoff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    draftKind,
    walletId: wallet?.selectedProfileId,
    walletLabel: wallet?.selectedProfileLabel,
    asset: 'SOL',
    amountLamports: lamports,
    amountUi: ui,
    recipient,
    network: wallet?.network,
    targetModule: 'wallet_cloak',
    executionBlocked: true,
    handoffStatus,
    warnings,
    createdAt: Date.now(),
    localOnly: true,
  };

  // Defense in depth: never persist a handoff with a forbidden secret field.
  const violation = hasForbiddenHandoffField(handoff);
  if (violation) {
    throw new Error(
      `Cloak handoff refused: forbidden field "${violation}" present.`
    );
  }
  return handoff;
}

export function summarizeCloakHandoff(handoff: GorkhAgentCloakDraftHandoff): string {
  const amount = handoff.amountUi ? `${handoff.amountUi} ${handoff.asset ?? 'SOL'}` : 'unknown amount';
  const recipient = handoff.recipient ? `to ${handoff.recipient.slice(0, 8)}…` : 'no recipient';
  return `Cloak ${handoff.draftKind} draft — ${amount} ${recipient} (${handoff.handoffStatus}).`;
}
