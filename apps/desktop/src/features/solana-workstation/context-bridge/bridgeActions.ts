import {
  SolanaAgentActionStatus,
  SolanaWorkstationBridgeActionKind,
  type SolanaAgentActionDraft,
  type SolanaWorkstationBridgeActionResult,
  type SolanaBuilderContextSummary,
} from '@gorkh/shared';

function makeResult(
  kind: SolanaWorkstationBridgeActionKind,
  ok: boolean,
  message: string,
  warnings: string[] = []
): SolanaWorkstationBridgeActionResult {
  return {
    id: `bridge-${kind}-${Date.now()}`,
    kind,
    ok,
    message,
    createdAt: Date.now(),
    localOnly: true,
    warnings,
  };
}

export function prefillShieldFromAgentDraft(
  draft: SolanaAgentActionDraft
): { result: SolanaWorkstationBridgeActionResult; relatedInput: string | null } {
  const relatedInput = draft.relatedInput?.trim() ?? null;
  if (!relatedInput) {
    return {
      result: makeResult(
        SolanaWorkstationBridgeActionKind.PREFILL_SHIELD_FROM_AGENT_DRAFT,
        false,
        'Draft has no related input to send to Shield.',
        ['Add related input to the draft before sending to Shield.']
      ),
      relatedInput: null,
    };
  }

  return {
    result: makeResult(
      SolanaWorkstationBridgeActionKind.PREFILL_SHIELD_FROM_AGENT_DRAFT,
      true,
      'Input copied to Shield. Click Analyze Offline or RPC actions manually.',
      ['Shield does not auto-analyze. User must click analyze buttons.']
    ),
    relatedInput,
  };
}

export function attachBuilderContextToAgentDraft(
  draft: SolanaAgentActionDraft,
  builderContextSummary: SolanaBuilderContextSummary | null
): { result: SolanaWorkstationBridgeActionResult; updatedDraft: SolanaAgentActionDraft } {
  if (!builderContextSummary) {
    return {
      result: makeResult(
        SolanaWorkstationBridgeActionKind.ATTACH_BUILDER_CONTEXT_TO_AGENT_DRAFT,
        false,
        'No Builder context is currently saved. Save a Builder context first.',
        ['Inspect a workspace in Builder mode and save its sanitized context.']
      ),
      updatedDraft: draft,
    };
  }

  const updatedDraft: SolanaAgentActionDraft = {
    ...draft,
    relatedBuilderContext: builderContextSummary.copyableMarkdown.slice(0, 4000),
    updatedAt: Date.now(),
  };

  return {
    result: makeResult(
      SolanaWorkstationBridgeActionKind.ATTACH_BUILDER_CONTEXT_TO_AGENT_DRAFT,
      true,
      'Builder context summary attached to draft.',
      ['Only sanitized summary is attached, not full source code.']
    ),
    updatedDraft,
  };
}

export function rejectAgentDraft(
  draft: SolanaAgentActionDraft,
  reason?: string
): { result: SolanaWorkstationBridgeActionResult; updatedDraft: SolanaAgentActionDraft } {
  const updatedDraft: SolanaAgentActionDraft = {
    ...draft,
    status: SolanaAgentActionStatus.REJECTED_LOCAL,
    updatedAt: Date.now(),
    safetyNotes: [
      ...draft.safetyNotes,
      `Rejected locally${reason ? `: ${reason}` : ''}. No execution occurred.`,
    ],
  };

  return {
    result: makeResult(
      SolanaWorkstationBridgeActionKind.REJECT_AGENT_DRAFT,
      true,
      `Draft "${draft.title}" rejected locally.`,
      ['Rejection is local only. No on-chain action was taken.']
    ),
    updatedDraft,
  };
}

export function archiveAgentDraft(
  draft: SolanaAgentActionDraft
): { result: SolanaWorkstationBridgeActionResult; updatedDraft: SolanaAgentActionDraft } {
  const updatedDraft: SolanaAgentActionDraft = {
    ...draft,
    status: SolanaAgentActionStatus.ARCHIVED,
    updatedAt: Date.now(),
    safetyNotes: [...draft.safetyNotes, 'Draft archived locally. No execution occurred.'],
  };

  return {
    result: makeResult(
      SolanaWorkstationBridgeActionKind.ARCHIVE_AGENT_DRAFT,
      true,
      `Draft "${draft.title}" archived locally.`,
      ['Archive is local only.']
    ),
    updatedDraft,
  };
}
