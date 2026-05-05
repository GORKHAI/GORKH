import {
  SolanaPrivatePrivacyRiskKind,
  WorkstationRiskLevel,
  type SolanaPrivateWorkflowDraft,
  type SolanaPrivatePrivacyRiskNote,
} from '@gorkh/shared';

export function analyzePrivacyRisks(draft: SolanaPrivateWorkflowDraft): SolanaPrivatePrivacyRiskNote[] {
  const risks: SolanaPrivatePrivacyRiskNote[] = [];

  // Always add planner-only informational note
  risks.push({
    id: 'planner_only',
    kind: SolanaPrivatePrivacyRiskKind.PLANNER_ONLY,
    level: WorkstationRiskLevel.LOW,
    title: 'Planner only',
    description:
      'This workflow is a local planning draft. No private or confidential transfer has been created or executed.',
    recommendation: 'Review this draft carefully before any future on-chain action.',
    confidence: 'high',
  });

  // Source wallet linkage
  const lowerNotes = (draft.notes ?? '').toLowerCase();
  const lowerPurpose = (draft.purpose ?? '').toLowerCase();
  if (
    lowerNotes.includes('source wallet') ||
    lowerNotes.includes('main treasury') ||
    lowerNotes.includes('main wallet') ||
    lowerPurpose.includes('treasury') ||
    lowerPurpose.includes('main wallet')
  ) {
    risks.push({
      id: 'source_wallet_linkage',
      kind: SolanaPrivatePrivacyRiskKind.SOURCE_WALLET_LINKAGE,
      level: WorkstationRiskLevel.MEDIUM,
      title: 'Source wallet linkage risk',
      description:
        'Notes or purpose mention a source wallet or treasury, which may link this payment to a known address.',
      recommendation: 'Avoid referencing specific wallets in payment metadata.',
      confidence: 'medium',
    });
  }

  // Recipient reuse
  if (draft.recipient?.publicAddress) {
    risks.push({
      id: 'recipient_reuse',
      kind: SolanaPrivatePrivacyRiskKind.RECIPIENT_REUSE,
      level: WorkstationRiskLevel.MEDIUM,
      title: 'Recipient reuse risk',
      description:
        'A public recipient address is configured. Reusing addresses across payments reduces privacy.',
      recommendation:
        'Consider whether address rotation or a privacy route is appropriate for future payments.',
      confidence: 'high',
    });
  }

  // Amount fingerprinting
  if (draft.amountUi) {
    const amount = parseFloat(draft.amountUi);
    if (!Number.isNaN(amount) && amount > 0) {
      const isRound = amount % 1 === 0 || amount % 10 === 0 || amount % 100 === 0;
      if (!isRound) {
        risks.push({
          id: 'amount_fingerprinting',
          kind: SolanaPrivatePrivacyRiskKind.AMOUNT_FINGERPRINTING,
          level: WorkstationRiskLevel.LOW,
          title: 'Amount fingerprinting risk',
          description:
            'The amount is not a round number, which may make this payment easier to identify on-chain.',
          recommendation: 'Consider using round amounts or splitting payments where appropriate.',
          confidence: 'medium',
        });
      }
    }
  }

  // Payroll/invoice timing correlation
  if (draft.kind === 'private_payroll_batch' || draft.kind === 'private_invoice_payment') {
    risks.push({
      id: 'timing_correlation',
      kind: SolanaPrivatePrivacyRiskKind.TIMING_CORRELATION,
      level: WorkstationRiskLevel.MEDIUM,
      title: 'Timing correlation risk',
      description:
        'Batch payroll or invoice payments often occur on predictable schedules, making timing-based correlation easier.',
      recommendation:
        'Consider varying payment timing or splitting batches across multiple time windows in future phases.',
      confidence: 'medium',
    });

    // Unique amounts in payroll
    const amounts = draft.paymentLines.map((l) => l.amountUi);
    const uniqueAmounts = new Set(amounts);
    if (uniqueAmounts.size > 1 && amounts.length > 2) {
      risks.push({
        id: 'amount_fingerprinting_payroll',
        kind: SolanaPrivatePrivacyRiskKind.AMOUNT_FINGERPRINTING,
        level: WorkstationRiskLevel.LOW,
        title: 'Payroll amount fingerprinting',
        description:
          'Multiple unique amounts in a payroll batch may help identify individual recipients.',
        recommendation: 'Review whether uniform or grouped amounts would improve privacy.',
        confidence: 'low',
      });
    }
  }

  // Public memo leakage
  if (lowerNotes.includes('memo') || lowerNotes.includes('note') || lowerNotes.includes('description')) {
    risks.push({
      id: 'public_memo_leakage',
      kind: SolanaPrivatePrivacyRiskKind.PUBLIC_MEMO_LEAKAGE,
      level: WorkstationRiskLevel.MEDIUM,
      title: 'Public memo leakage risk',
      description:
        'Notes contain terms like memo, note, or description. Any public memo on Solana is visible to everyone.',
      recommendation: 'Keep payment metadata minimal and store sensitive details locally only.',
      confidence: 'high',
    });
  }

  // Token-2022 public address visibility
  if (draft.route === 'token_2022_confidential_transfer_planned') {
    risks.push({
      id: 'public_address_visibility',
      kind: SolanaPrivatePrivacyRiskKind.PUBLIC_ADDRESS_VISIBILITY,
      level: WorkstationRiskLevel.MEDIUM,
      title: 'Public address visibility with Token-2022 Confidential Transfers',
      description:
        'Token-2022 Confidential Transfers hide amounts and balances, but sender and recipient public addresses remain visible on-chain.',
      recommendation:
        'Do not assume full anonymity. Use complementary privacy practices where possible.',
      confidence: 'high',
    });

    risks.push({
      id: 'amount_only_confidentiality_limitation',
      kind: SolanaPrivatePrivacyRiskKind.AMOUNT_ONLY_CONFIDENTIALITY_LIMITATION,
      level: WorkstationRiskLevel.LOW,
      title: 'Amount-only confidentiality limitation',
      description:
        'Token-2022 Confidential Transfers provide confidentiality for amounts and balances only. Transaction patterns and addresses are still public.',
      recommendation:
        'Review whether this level of confidentiality meets your requirements before future execution.',
      confidence: 'high',
    });
  }

  // Small anonymity set for Umbra/Cloak
  if (draft.route === 'umbra_planned' || draft.route === 'cloak_planned') {
    risks.push({
      id: 'small_anonymity_set',
      kind: SolanaPrivatePrivacyRiskKind.SMALL_ANONYMITY_SET,
      level: WorkstationRiskLevel.MEDIUM,
      title: 'Anonymity set cannot be verified',
      description:
        'Umbra and Cloak anonymity sets depend on network usage. In this planning phase, the effective anonymity set cannot be verified.',
      recommendation:
        'Before any future execution, research current anonymity set size and usage statistics.',
      confidence: 'medium',
    });
  }

  // Mainnet caution
  if (draft.network === 'mainnet-beta') {
    risks.push({
      id: 'mainnet_operational_caution',
      kind: SolanaPrivatePrivacyRiskKind.MAINNET_OPERATIONAL_CAUTION,
      level: WorkstationRiskLevel.HIGH,
      title: 'Mainnet operational caution',
      description:
        'This draft targets mainnet-beta. Any future on-chain action would involve real funds and permanently visible public data.',
      recommendation: 'Double-check all addresses, amounts, and privacy assumptions before execution.',
      confidence: 'high',
    });
  }

  return risks;
}
