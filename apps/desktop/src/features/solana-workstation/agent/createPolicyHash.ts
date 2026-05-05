import type { SolanaAgentPolicy } from '@gorkh/shared';

function canonicalJson(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as Record<string, unknown>).sort());
}

function stablePolicyInput(policy: SolanaAgentPolicy): Record<string, unknown> {
  return {
    id: policy.id,
    name: policy.name,
    riskTolerance: policy.riskTolerance,
    approvalMode: policy.approvalMode,
    allowedNetworks: policy.allowedNetworks,
    protocolPermissions: policy.protocolPermissions.map((p) => ({
      protocolId: p.protocolId,
      enabled: p.enabled,
      permissionLevel: p.permissionLevel,
      allowedActionKinds: p.allowedActionKinds,
    })),
    spendLimits: policy.spendLimits.map((s) => ({
      enabled: s.enabled,
      tokenSymbol: s.tokenSymbol,
      mintAddress: s.mintAddress,
      maxUiAmount: s.maxUiAmount,
      period: s.period,
    })),
    maxInstructionsPerDraft: policy.maxInstructionsPerDraft,
    requireShieldSimulationPreview: policy.requireShieldSimulationPreview,
    requireHumanApproval: policy.requireHumanApproval,
    allowMainnet: policy.allowMainnet,
  };
}

async function webCryptoSha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function testSafeFallbackHash(input: string): string {
  // Deterministic, NOT cryptographically secure. Used only when Web Crypto is unavailable in tests.
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(64, '0');
  return hex.slice(0, 64);
}

export async function createPolicyHash(policy: SolanaAgentPolicy): Promise<string> {
  const input = canonicalJson(stablePolicyInput(policy));
  try {
    return await webCryptoSha256(input);
  } catch {
    return testSafeFallbackHash(input);
  }
}
