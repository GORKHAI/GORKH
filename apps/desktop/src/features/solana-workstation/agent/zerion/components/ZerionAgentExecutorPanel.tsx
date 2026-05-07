import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ZERION_DEFAULT_MAX_SOL_AMOUNT,
  ZerionAgentPolicySchema,
  ZerionAgentProposalSchema,
  ZerionExecutionApprovalSchema,
  type ZerionAgentPolicy,
  type ZerionAgentWallet,
  type ZerionCliStatus,
  type ZerionApiKeyStatus,
  type ZerionPolicyCheckResult,
  type GorkhAgentZerionProposalHandoff,
} from '@gorkh/shared';
import { createZerionAuditEvent } from '../zerionAudit.js';
import { buildZerionSwapExecuteCommand } from '../zerionCommandBuilders.js';
import {
  createDefaultZerionPolicy,
  checkZerionProposalPolicy,
  assertSafeZerionName,
  assertSolAmount,
} from '../zerionPolicyGuards.js';
import {
  clearZerionApiKey,
  createZerionPolicy,
  createZerionToken,
  detectZerionCli,
  executeZerionSwap,
  getZerionApiKeyStatus,
  listZerionWallets,
  setZerionApiKey,
} from '../zerionExecutor.js';
import {
  loadZerionLocalState,
  saveZerionLocalState,
  type ZerionLocalState,
} from '../zerionStorage.js';
import { ZerionAuditTimeline } from './ZerionAuditTimeline.js';
import { ZerionCliStatusPanel } from './ZerionCliStatusPanel.js';
import { ZerionExecutionResultPanel } from './ZerionExecutionResultPanel.js';
import { ZerionPolicyEditor } from './ZerionPolicyEditor.js';
import { ZerionProposalCard } from './ZerionProposalCard.js';
import { ZerionSafetyPanel } from './ZerionSafetyPanel.js';
import { ZerionWalletSelector } from './ZerionWalletSelector.js';

async function sha256Hex(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function policyForDigest(policy: ZerionAgentPolicy): Omit<ZerionAgentPolicy, 'localOnlyDigest'> {
  const { localOnlyDigest: _localOnlyDigest, ...rest } = policy;
  return rest;
}

export function ZerionAgentExecutorPanel({
  pendingAgentHandoff,
}: {
  pendingAgentHandoff?: GorkhAgentZerionProposalHandoff | null;
}) {
  const [localState, setLocalState] = useState<ZerionLocalState>(() => loadZerionLocalState());
  const [cliStatus, setCliStatus] = useState<ZerionCliStatus | undefined>();
  const [apiKeyStatus, setApiKeyStatus] = useState<ZerionApiKeyStatus | undefined>();
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [wallets, setWallets] = useState<ZerionAgentWallet[]>([]);
  const [manualWalletName, setManualWalletName] = useState(localState.selectedWalletName ?? '');
  const [amountSol, setAmountSol] = useState(ZERION_DEFAULT_MAX_SOL_AMOUNT);
  const [approvalChecked, setApprovalChecked] = useState(false);
  const [tokenName, setTokenName] = useState('gorkh-agent-token');
  const [message, setMessage] = useState<string | undefined>();

  const policy = localState.policy ?? createDefaultZerionPolicy();
  const policyCheck: ZerionPolicyCheckResult | undefined = useMemo(() => {
    if (!localState.proposal || !policy.localOnlyDigest) return undefined;
    return checkZerionProposalPolicy(
      localState.proposal,
      policy,
      approvalChecked
        ? {
            proposalId: localState.proposal.id,
            source: 'agent_zerion_panel',
            approved: true,
            approvedAt: Date.now(),
            approvalText: 'I understand this will execute a real onchain transaction using Zerion CLI.',
          }
        : undefined
    );
  }, [approvalChecked, localState.proposal, policy]);

  useEffect(() => {
    saveZerionLocalState(localState);
  }, [localState]);

  useEffect(() => {
    getZerionApiKeyStatus().then(setApiKeyStatus).catch(() => undefined);
  }, []);

  const updateState = useCallback((updater: (current: ZerionLocalState) => ZerionLocalState) => {
    setLocalState((current) => updater(current));
  }, []);

  useEffect(() => {
    if (!pendingAgentHandoff) return;
    setAmountSol(pendingAgentHandoff.amountSol);
    if (pendingAgentHandoff.walletName) {
      setManualWalletName(pendingAgentHandoff.walletName);
      updateState((current) => ({
        ...current,
        selectedWalletName: pendingAgentHandoff.walletName,
      }));
    }
    if (pendingAgentHandoff.policyName) {
      updateState((current) => ({
        ...current,
        policy: {
          ...(current.policy ?? createDefaultZerionPolicy()),
          name: pendingAgentHandoff.policyName ?? (current.policy ?? createDefaultZerionPolicy()).name,
        },
      }));
    }
    setApprovalChecked(false);
    setMessage('GORKH Agent proposal handoff imported. Review policy and create the Zerion proposal manually.');
  }, [pendingAgentHandoff, updateState]);

  const handleDetect = useCallback(async () => {
    setMessage('Checking Zerion CLI...');
    const status = await detectZerionCli(localState.binary);
    setCliStatus(status);
    updateState((current) => ({
      ...current,
      auditEvents: [
        ...current.auditEvents,
        createZerionAuditEvent({
          kind: 'cli_detected',
          title: status.detected ? 'Zerion CLI detected' : 'Zerion CLI not detected',
          description: status.detected ? `Detected ${status.binary}.` : status.error ?? 'CLI detection failed.',
          commandKind: 'detect',
        }),
      ],
    }));
    setMessage(status.detected ? 'Zerion CLI detected.' : status.error ?? 'Zerion CLI not detected.');
  }, [localState.binary, updateState]);

  const handleSaveApiKey = useCallback(async () => {
    if (!apiKeyDraft.startsWith('zk_')) {
      setMessage('Zerion API key must start with zk_.');
      return;
    }
    const status = await setZerionApiKey(apiKeyDraft);
    setApiKeyDraft('');
    setApiKeyStatus(status);
    setMessage('Zerion API key stored in OS keychain.');
  }, [apiKeyDraft]);

  const handleClearApiKey = useCallback(async () => {
    const status = await clearZerionApiKey();
    setApiKeyStatus(status);
    setMessage('Zerion API key cleared from GORKH keychain storage.');
  }, []);

  const handleRefreshWallets = useCallback(async () => {
    const listed = await listZerionWallets(localState.binary);
    setWallets(listed);
    setMessage(listed.length > 0 ? `Loaded ${listed.length} Zerion wallet(s).` : 'No wallets returned by Zerion CLI.');
  }, [localState.binary]);

  const handlePolicyChange = useCallback((nextPolicy: ZerionAgentPolicy) => {
    updateState((current) => ({
      ...current,
      policy: ZerionAgentPolicySchema.parse({ ...nextPolicy, localOnlyDigest: undefined }),
      proposal: undefined,
    }));
  }, [updateState]);

  const handleCreatePolicy = useCallback(async () => {
    assertSafeZerionName(policy.name, 'Policy name');
    assertSolAmount(policy.maxSolAmount);
    await createZerionPolicy(localState.binary, policy);
    updateState((current) => ({
      ...current,
      auditEvents: [
        ...current.auditEvents,
        createZerionAuditEvent({
          kind: 'policy_created',
          title: `Zerion policy "${policy.name}" requested`,
          description: 'GORKH invoked zerion agent create-policy with Solana-only tiny-swap boundaries.',
          policyName: policy.name,
          commandKind: 'agent_create_policy',
        }),
      ],
    }));
    setMessage('Zerion policy create command completed.');
  }, [localState.binary, policy, updateState]);

  const handleCreateToken = useCallback(async () => {
    const walletName = localState.selectedWalletName ?? manualWalletName;
    assertSafeZerionName(walletName, 'Wallet name');
    await createZerionToken(localState.binary, { tokenName, walletName, policyName: policy.name });
    updateState((current) => ({
      ...current,
      auditEvents: [
        ...current.auditEvents,
        createZerionAuditEvent({
          kind: 'token_created',
          title: `Zerion agent token "${tokenName}" requested`,
          description: 'Any token secret returned by Zerion CLI is redacted and not stored in localStorage.',
          policyName: policy.name,
          commandKind: 'agent_create_token',
        }),
      ],
    }));
    setMessage('Zerion token create command completed. Token secret is not displayed by GORKH.');
  }, [localState.binary, localState.selectedWalletName, manualWalletName, tokenName, policy.name, updateState]);

  const handleCreateProposal = useCallback(async () => {
    const walletName = localState.selectedWalletName ?? manualWalletName;
    assertSafeZerionName(walletName, 'Wallet name');
    assertSolAmount(amountSol);
    const policyWithDigest = {
      ...policy,
      localOnlyDigest: await sha256Hex(policyForDigest(policy)),
    };
    const proposalDraft = {
      id: `zerion-proposal-${Date.now()}`,
      kind: 'zerion_solana_swap' as const,
      source: 'agent_zerion_panel' as const,
      chain: 'solana' as const,
      walletName,
      amountSol,
      fromToken: 'SOL' as const,
      toToken: 'USDC' as const,
      policyName: policyWithDigest.name,
      localPolicyDigest: policyWithDigest.localOnlyDigest,
      commandPreview: ['zerion', 'swap', 'solana', amountSol, 'SOL', 'USDC', '--wallet', walletName, '--json'],
      riskNotes: ['Real onchain swap through Zerion CLI.', 'Use a fresh tiny-funded Zerion wallet only.'],
      approvalRequired: true as const,
      createdAt: Date.now(),
    };
    const proposal = ZerionAgentProposalSchema.parse({
      ...proposalDraft,
      commandPreview: buildZerionSwapExecuteCommand(localState.binary, proposalDraft, policyWithDigest).preview,
    });
    updateState((current) => ({
      ...current,
      selectedWalletName: walletName,
      policy: policyWithDigest,
      proposal,
      auditEvents: [
        ...current.auditEvents,
        createZerionAuditEvent({
          kind: 'proposal_created',
          title: 'Zerion tiny swap proposal created',
          description: `${amountSol} SOL to USDC through ${walletName}.`,
          proposalId: proposal.id,
          policyName: policyWithDigest.name,
          commandKind: 'swap_execute',
        }),
      ],
    }));
    setApprovalChecked(false);
    setMessage('Proposal created. Review the command preview before approval.');
  }, [amountSol, localState.binary, localState.selectedWalletName, manualWalletName, policy, updateState]);

  const handleExecute = useCallback(async () => {
    if (!localState.proposal || !localState.policy) return;
    const approval = ZerionExecutionApprovalSchema.parse({
      proposalId: localState.proposal.id,
      source: 'agent_zerion_panel',
      approved: true,
      approvedAt: Date.now(),
      approvalText: 'I understand this will execute a real onchain transaction using Zerion CLI and a tiny-funded Zerion agent wallet.',
    });
    const result = await executeZerionSwap({
      binary: localState.binary,
      proposal: localState.proposal,
      policy: localState.policy,
      approval,
    });
    updateState((current) => ({
      ...current,
      lastResult: result,
      policy: current.policy ? { ...current.policy, executionsUsed: result.ok ? 1 : current.policy.executionsUsed } : current.policy,
      auditEvents: [
        ...current.auditEvents,
        createZerionAuditEvent({
          kind: result.ok ? 'execution_succeeded' : 'execution_failed',
          title: result.ok ? 'Zerion swap executed' : 'Zerion swap failed',
          description: result.ok ? 'Zerion CLI returned a successful swap result.' : result.errorMessage ?? 'Zerion CLI failed.',
          proposalId: result.proposalId,
          txHash: result.txHash,
          commandKind: 'swap_execute',
        }),
      ],
    }));
    setMessage(result.ok ? 'Zerion swap execution completed.' : result.errorMessage ?? 'Zerion swap failed.');
  }, [localState, updateState]);

  return (
    <div style={{ display: 'grid', gap: '0.85rem' }}>
      <ZerionSafetyPanel />
      {pendingAgentHandoff && (
        <div
          data-testid="zerion-agent-handoff-prefill"
          style={{
            padding: '0.7rem 0.8rem',
            borderRadius: '6px',
            background: '#fef3c7',
            border: '1px solid #fde68a',
            color: '#92400e',
            fontSize: '0.78rem',
          }}
        >
          GORKH Agent prefilled a {pendingAgentHandoff.proposalKind} handoff for{' '}
          {pendingAgentHandoff.amountSol} SOL → USDC. Use Create Proposal, then approve
          execution only after reviewing the Zerion Executor policy and command preview.
        </div>
      )}
      <ZerionCliStatusPanel
        binary={localState.binary}
        status={cliStatus}
        apiKeyStatus={apiKeyStatus}
        apiKeyDraft={apiKeyDraft}
        onBinaryChange={(binary) => updateState((current) => ({ ...current, binary }))}
        onApiKeyDraftChange={setApiKeyDraft}
        onDetect={handleDetect}
        onSaveApiKey={handleSaveApiKey}
        onClearApiKey={handleClearApiKey}
      />
      <ZerionWalletSelector
        wallets={wallets}
        selectedWalletName={localState.selectedWalletName}
        manualWalletName={manualWalletName}
        onManualWalletNameChange={setManualWalletName}
        onSelectWallet={(walletName) => updateState((current) => ({ ...current, selectedWalletName: walletName }))}
        onRefreshWallets={handleRefreshWallets}
      />
      <ZerionPolicyEditor
        policy={policy}
        onPolicyChange={handlePolicyChange}
        onCreatePolicy={handleCreatePolicy}
        onCreateToken={handleCreateToken}
        tokenName={tokenName}
        onTokenNameChange={setTokenName}
      />
      <ZerionProposalCard
        proposal={localState.proposal}
        amountSol={amountSol}
        approvalChecked={approvalChecked}
        policyCheck={policyCheck}
        onAmountChange={setAmountSol}
        onCreateProposal={handleCreateProposal}
        onApprovalChange={setApprovalChecked}
        onExecute={handleExecute}
      />
      <ZerionExecutionResultPanel result={localState.lastResult} />
      <ZerionAuditTimeline events={localState.auditEvents} />
      {message && <span style={{ color: '#475569', fontSize: '0.78rem' }}>{message}</span>}
    </div>
  );
}
