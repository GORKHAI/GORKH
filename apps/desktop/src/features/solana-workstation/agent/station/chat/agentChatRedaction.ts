import { GORKH_AGENT_CHAT_FORBIDDEN_CONTENT_KEYS } from '@gorkh/shared';

const SECRET_PATTERNS: RegExp[] = [
  /zk_[A-Za-z0-9_-]{8,}/,
  /(^|[^a-z])sk_[A-Za-z0-9_-]{16,}/,
  /BEGIN PRIVATE KEY/,
  /\b(seed phrase|mnemonic|privateKey|private_key)\b/i,
  /\[(?:\s*(?:1?\d?\d|2[0-4]\d|25[0-5])\s*,){63}\s*(?:1?\d?\d|2[0-4]\d|25[0-5])\s*\]/,
];

export function findForbiddenAgentChatContent(value: unknown): string | null {
  let text: string;
  try {
    text = JSON.stringify(value);
  } catch {
    return null;
  }
  for (const key of GORKH_AGENT_CHAT_FORBIDDEN_CONTENT_KEYS) {
    if (new RegExp(`"${key}"\\s*:`).test(text)) return key;
  }
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(text)) return 'secret_like_value';
  }
  return null;
}

export function assertNoSensitiveAgentChatContent(value: unknown): void {
  const violation = findForbiddenAgentChatContent(value);
  if (violation) {
    throw new Error(`GORKH Agent Chat storage refused sensitive content: ${violation}.`);
  }
}

export function redactAgentChatText(text: string): { text: string; redactionsApplied: string[] } {
  let redacted = text.slice(0, 8000);
  const redactions = new Set<string>();
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(redacted)) {
      redacted = redacted.replace(pattern, '[REDACTED]');
      redactions.add('secret_like_value');
    }
  }
  for (const key of GORKH_AGENT_CHAT_FORBIDDEN_CONTENT_KEYS) {
    const keyPattern = new RegExp(`${key}\\s*[:=]\\s*[^\\s,;]+`, 'gi');
    if (keyPattern.test(redacted)) {
      redacted = redacted.replace(keyPattern, `${key}=[REDACTED]`);
      redactions.add(key);
    }
  }
  return { text: redacted, redactionsApplied: Array.from(redactions) };
}
