import type { SolanaAgentActionDraft } from '@gorkh/shared';

function canonicalJson(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as Record<string, unknown>).sort());
}

function stableDraftInput(draft: SolanaAgentActionDraft): Record<string, unknown> {
  return {
    agentId: draft.agentId,
    kind: draft.kind,
    title: draft.title,
    userIntent: draft.userIntent,
    network: draft.network,
    protocolIds: draft.protocolIds,
    proposedSteps: draft.proposedSteps,
    blockedReasons: draft.blockedReasons,
    requiredApprovals: draft.requiredApprovals,
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

export async function createActionHash(draft: SolanaAgentActionDraft): Promise<string> {
  const input = canonicalJson(stableDraftInput(draft));
  try {
    return await webCryptoSha256(input);
  } catch {
    return testSafeFallbackHash(input);
  }
}
