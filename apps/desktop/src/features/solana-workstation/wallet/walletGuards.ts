import { SOLANA_WALLET_DENIED_CAPABILITIES } from '@gorkh/shared';

export function validateWalletAssetSymbol(symbol: string): string | null {
  const trimmed = symbol.trim();
  if (trimmed.length < 2 || trimmed.length > 12) {
    return 'Asset symbol must be 2–12 characters.';
  }
  return null;
}

export function validateWalletAmount(amount: string): string | null {
  const trimmed = amount.trim();
  if (!trimmed) return 'Amount is required.';
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return 'Amount must be a positive decimal number.';
  }
  if (parseFloat(trimmed) <= 0) {
    return 'Amount must be greater than zero.';
  }
  return null;
}

export function validateWalletPublicAddress(address?: string): string | null {
  if (!address || !address.trim()) return null;
  const trimmed = address.trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) {
    return 'Invalid Solana address format.';
  }
  return null;
}

export function rejectDeniedWalletCapability(capability: string): void {
  if (SOLANA_WALLET_DENIED_CAPABILITIES.includes(capability)) {
    throw new Error(`Capability denied in GORKH Wallet: ${capability}`);
  }
}

const SECRET_KEYWORDS = [
  'PRIVATE_KEY',
  'SECRET',
  'MNEMONIC',
  'SEED_PHRASE',
  'API_KEY',
  'AUTH_TOKEN',
  'BEARER',
  'KEYPAIR',
  'WALLET_JSON',
];

export function sanitizeWalletNotes(notes: string): { text: string; redactionsApplied: string[] } {
  let text = notes;
  const redactionsApplied: string[] = [];

  for (const keyword of SECRET_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    if (regex.test(text)) {
      text = text.replace(regex, '[redacted secret]');
      redactionsApplied.push(keyword);
    }
  }

  // Detect seed phrase-like word lists (12/24 words)
  const wordListMatch = text.match(/\b[a-z]+(?:\s+[a-z]+){11,23}\b/gi);
  if (wordListMatch) {
    for (const match of wordListMatch) {
      text = text.replace(match, '[redacted possible seed phrase]');
    }
    redactionsApplied.push('possible_seed_phrase');
  }

  // Reject HumanRail, White Protocol, Drift in notes
  const bannedTerms = ['humanrail', 'white protocol', 'white_protocol', 'drift'];
  for (const term of bannedTerms) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    if (regex.test(text)) {
      throw new Error(`Notes contain disallowed term: ${term}`);
    }
  }

  return { text, redactionsApplied };
}

export function assertSafeWalletRoute(route: string): void {
  const banned = ['humanrail', 'white_protocol', 'white protocol', 'drift'];
  const lower = route.toLowerCase();
  for (const term of banned) {
    if (lower.includes(term)) {
      throw new Error(`Disallowed route/integration: ${term}`);
    }
  }
}
