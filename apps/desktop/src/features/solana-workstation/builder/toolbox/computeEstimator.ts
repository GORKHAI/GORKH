import type { ComputeEstimateResult, SolanaRpcEndpointConfig, SolanaSimulationPreview } from '@gorkh/shared';
import { simulateTransactionPreview } from '../../rpc/solanaRpcClient.js';

export function createIdleComputeEstimate(): ComputeEstimateResult {
  return {
    status: 'idle',
    logs: [],
    warnings: ['Compute estimation requires an explicit user click and uses read-only simulation only.'],
  };
}

export function mapSimulationToComputeEstimate(preview: SolanaSimulationPreview): ComputeEstimateResult {
  return {
    status: preview.success ? 'success' : 'failed',
    computeUnitsConsumed: preview.unitsConsumed,
    logs: preview.logs,
    err: preview.err,
    replacementBlockhash: preview.replacementBlockhash,
    warnings: [
      preview.warning,
      'Simulation uses sigVerify false for preview when signatures are unavailable.',
      'No signing, broadcast, deployment, or wallet execution is performed.',
    ],
    estimatedAt: preview.simulatedAt,
  };
}

export async function estimateComputeUnitsReadOnly(
  endpoint: SolanaRpcEndpointConfig,
  serializedTransactionBase64: string
): Promise<ComputeEstimateResult> {
  const preview = await simulateTransactionPreview(endpoint, serializedTransactionBase64, 'confirmed');
  return mapSimulationToComputeEstimate(preview);
}
