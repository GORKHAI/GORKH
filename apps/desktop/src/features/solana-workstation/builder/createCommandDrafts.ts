import {
  SOLANA_BUILDER_DRAFT_COMMANDS,
  SolanaBuilderCommandSafety,
  type SolanaBuilderCommandDraft,
  type SolanaBuilderWorkspaceSummary,
} from '@gorkh/shared';

// ============================================================================
// Command Drafts Generator — Phase 5
// ============================================================================
// Creates draft command definitions from workspace analysis.
// No command is marked allowed_to_run except diagnostic version checks.
// ============================================================================

/**
 * Generate command drafts for the workspace.
 */
export function createSolanaBuilderCommandDrafts(
  workspace: SolanaBuilderWorkspaceSummary | null
): SolanaBuilderCommandDraft[] {
  const drafts: SolanaBuilderCommandDraft[] = [];

  // Add standard draft commands from constants
  for (const template of SOLANA_BUILDER_DRAFT_COMMANDS) {
    drafts.push({
      id: `draft_${template.kind}_${template.command.join('_')}`,
      title: template.title,
      kind: template.kind,
      command: template.command,
      workingDirectory: workspace?.rootPath,
      safety: template.safety,
      reason: template.reason,
      expectedWrites: template.expectedWrites,
      requiresWalletOrKeypair: template.requiresWalletOrKeypair,
      requiresNetwork: template.requiresNetwork,
      warning: template.warning,
      canCopy: template.safety === SolanaBuilderCommandSafety.DRAFT_ONLY,
      canRunInGorkh: false,
    });
  }

  // Add package manager test draft if applicable
  if (workspace?.detectedPackageManager) {
    const pm = workspace.detectedPackageManager;
    if (pm === 'pnpm' || pm === 'npm' || pm === 'yarn') {
      const testCmd = pm === 'yarn' ? ['yarn', 'test'] : [pm, 'run', 'test'];
      drafts.push({
        id: `draft_test_${pm}`,
        title: `${pm} Test`,
        kind: 'test',
        command: testCmd,
        workingDirectory: workspace.rootPath,
        safety: SolanaBuilderCommandSafety.DRAFT_ONLY,
        reason: 'Test commands execute project code.',
        expectedWrites: false,
        requiresWalletOrKeypair: false,
        requiresNetwork: false,
        warning: 'Builder v0.2 does not run test commands. Copy and run in your own terminal.',
        canCopy: true,
        canRunInGorkh: false,
      });
    }
  }

  return drafts;
}
