// Redaction markers are defined locally; shared constant exists for documentation

export interface SanitizeResult {
  text: string;
  redactionsApplied: string[];
}

const PRIVATE_KEY_ARRAY_REGEX = /\[\s*(?:\d{1,3}\s*,\s*){63}\d{1,3}\s*\]/g;
const SECRET_KEYWORDS = /\b(SECRET|MNEMONIC|SEED_PHRASE|PRIVATE_KEY|API_KEY|AUTH_TOKEN|BEARER)\b/gi;
const RPC_WITH_CREDS = /(https?:\/\/)[^\s:]+:[^\s@]+@[^\s]+/gi;
const WALLET_PATH_REGEX = /\b[^\s]*(?:wallet|keypair|id\.json|deployer)[^\s]*\b/gi;
const ENV_REF_REGEX = /\b\.env[\w.]*\b/gi;
const LONG_BASE64_REGEX = /[A-Za-z0-9+/]{500,}={0,2}/g;

export function sanitizeContextForExport(input: string): SanitizeResult {
  const redactions: string[] = [];
  let text = input;

  if (PRIVATE_KEY_ARRAY_REGEX.test(text)) {
    text = text.replace(PRIVATE_KEY_ARRAY_REGEX, '[private key material excluded]');
    redactions.push('private_key_array');
  }

  if (SECRET_KEYWORDS.test(text)) {
    text = text.replace(SECRET_KEYWORDS, (match) => {
      return `[redacted ${match.toLowerCase().replace(/_/g, ' ')}]`;
    });
    redactions.push('secret_keywords');
  }

  if (RPC_WITH_CREDS.test(text)) {
    text = text.replace(RPC_WITH_CREDS, '[rpc url with credentials redacted]');
    redactions.push('rpc_credentials');
  }

  if (WALLET_PATH_REGEX.test(text)) {
    text = text.replace(WALLET_PATH_REGEX, '[wallet path configured — not read by GORKH]');
    redactions.push('wallet_paths');
  }

  if (ENV_REF_REGEX.test(text)) {
    text = text.replace(ENV_REF_REGEX, '[env file excluded]');
    redactions.push('env_references');
  }

  if (LONG_BASE64_REGEX.test(text)) {
    text = text.replace(LONG_BASE64_REGEX, (match) => {
      return `[long base64 blob redacted (${match.length} chars)]`;
    });
    redactions.push('long_base64_blobs');
  }

  return { text, redactionsApplied: redactions };
}
