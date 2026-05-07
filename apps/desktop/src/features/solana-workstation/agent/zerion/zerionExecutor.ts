import { invoke } from '@tauri-apps/api/core';
import {
  ZerionApiKeyStatusSchema,
  ZerionCliStatusSchema,
  ZerionExecutionResultSchema,
  type ZerionAgentPolicy,
  type ZerionAgentProposal,
  type ZerionAgentWallet,
  type ZerionApiKeyStatus,
  type ZerionCliStatus,
  type ZerionExecutionApproval,
  type ZerionExecutionResult,
} from '@gorkh/shared';
import { extractZerionError, extractZerionTxHash } from './zerionResultParsers.js';

interface ZerionCliRunPayload {
  ok: boolean;
  commandKind: string;
  commandPreview: string[];
  exitCode?: number | null;
  stdoutJson?: unknown;
  stderrJson?: unknown;
  stdoutText?: string;
  stderrText?: string;
  errorCode?: string;
  timedOut?: boolean;
  executedAt: number;
}

export async function detectZerionCli(binary: string): Promise<ZerionCliStatus> {
  const result = await invoke<unknown>('zerion_cli_detect', { request: { binary } });
  return ZerionCliStatusSchema.parse(result);
}

export async function getZerionApiKeyStatus(): Promise<ZerionApiKeyStatus> {
  const result = await invoke<unknown>('zerion_cli_config_status');
  return ZerionApiKeyStatusSchema.parse(result);
}

export async function setZerionApiKey(apiKey: string): Promise<ZerionApiKeyStatus> {
  const result = await invoke<unknown>('zerion_api_key_set', { request: { apiKey } });
  return ZerionApiKeyStatusSchema.parse(result);
}

export async function clearZerionApiKey(): Promise<ZerionApiKeyStatus> {
  const result = await invoke<unknown>('zerion_api_key_clear');
  return ZerionApiKeyStatusSchema.parse(result);
}

export async function listZerionWallets(binary: string): Promise<ZerionAgentWallet[]> {
  const result = await invoke<{ stdoutJson?: unknown }>('zerion_cli_wallet_list', { request: { binary } });
  const value = result.stdoutJson;
  if (Array.isArray(value)) {
    return value.map((item) => ({
      name: String((item as Record<string, unknown>).name ?? 'unnamed-wallet'),
      address: typeof (item as Record<string, unknown>).address === 'string'
        ? ((item as Record<string, unknown>).address as string)
        : undefined,
      chain: 'solana' as const,
      source: 'zerion_cli' as const,
    }));
  }
  return [];
}

export async function createZerionPolicy(binary: string, policy: ZerionAgentPolicy): Promise<void> {
  await invoke('zerion_cli_agent_create_policy', {
    request: { binary, policyName: policy.name, expires: '24h', denyTransfers: true },
  });
}

export async function createZerionToken(
  binary: string,
  input: { tokenName: string; walletName: string; policyName: string }
): Promise<void> {
  await invoke('zerion_cli_agent_create_token', {
    request: { binary, ...input },
  });
}

export async function executeZerionSwap(input: {
  binary: string;
  proposal: ZerionAgentProposal;
  policy: ZerionAgentPolicy;
  approval: ZerionExecutionApproval;
}): Promise<ZerionExecutionResult> {
  const result = await invoke<ZerionCliRunPayload>('zerion_cli_swap_execute', {
    request: input,
  });
  const error = extractZerionError({
    stderrText: result.stderrText,
    stderrJson: result.stderrJson,
    timedOut: result.timedOut,
    exitCode: result.exitCode,
  });
  return ZerionExecutionResultSchema.parse({
    id: `zerion-result-${result.executedAt}`,
    proposalId: input.proposal.id,
    commandKind: 'swap_execute',
    ok: result.ok,
    chain: 'solana',
    amountSol: input.proposal.amountSol,
    fromToken: 'SOL',
    toToken: 'USDC',
    walletName: input.proposal.walletName,
    txHash: extractZerionTxHash(result.stdoutJson),
    stdoutJson: result.stdoutJson,
    stderrJson: result.stderrJson,
    errorCode: result.ok ? undefined : error.errorCode ?? result.errorCode,
    errorMessage: result.ok ? undefined : error.errorMessage ?? result.stderrText,
    commandPreview: result.commandPreview,
    executedAt: result.executedAt,
  });
}
