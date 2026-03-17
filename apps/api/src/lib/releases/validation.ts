export interface DesktopDownloadsPayload {
  version: string;
  windowsUrl: string;
  macIntelUrl: string;
  macArmUrl: string;
}

export interface DesktopUpdateManifest {
  version: string;
  platforms?: Record<string, { url: string; signature: string }>;
}

export interface DesktopReleaseValidationOptions {
  nodeEnv: 'development' | 'production' | 'test';
  allowInsecureDev: boolean;
  apiPublicBaseUrl?: string;
  target?: string;
}

const PLACEHOLDER_HOST_PATTERN = /(^|\.)example\.com$/i;
const PLACEHOLDER_SIGNATURE_PATTERN = /(replace-with-tauri-signature|placeholder-signature|changeme-signature)/i;
const UPDATER_SIGNATURE_PATTERN = /^[A-Za-z0-9+/=_-]{40,}$/;

function isStrictReleaseMode(options: DesktopReleaseValidationOptions) {
  return options.nodeEnv === 'production' && !options.allowInsecureDev;
}

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
}

export function normalizeDesktopAssetUrl(rawUrl: string, apiPublicBaseUrl?: string) {
  const trimmed = rawUrl.trim();

  if (!trimmed) {
    throw new Error('Desktop release asset URL is missing');
  }

  if (trimmed.startsWith('/')) {
    if (!apiPublicBaseUrl) {
      throw new Error('Desktop release asset URL requires API_PUBLIC_BASE_URL for relative paths');
    }
    return new URL(trimmed, `${apiPublicBaseUrl.replace(/\/$/, '')}/`).toString();
  }

  return trimmed;
}

export function validateDesktopAssetUrl(
  rawUrl: string,
  label: string,
  options: DesktopReleaseValidationOptions,
) {
  const normalized = normalizeDesktopAssetUrl(rawUrl, options.apiPublicBaseUrl);

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`${label} is not a valid URL`);
  }

  if (PLACEHOLDER_HOST_PATTERN.test(parsed.hostname)) {
    throw new Error(`${label} uses a placeholder host`);
  }

  if (isStrictReleaseMode(options)) {
    if (parsed.protocol !== 'https:') {
      throw new Error(`${label} must use https outside insecure dev`);
    }

    if (isLocalHostname(parsed.hostname)) {
      throw new Error(`${label} must not use localhost outside insecure dev`);
    }
  }

  return parsed.toString();
}

export function validateDesktopSignature(signature: string, label: string) {
  const trimmed = signature.trim();

  if (!trimmed) {
    throw new Error(`${label} signature is missing`);
  }

  if (PLACEHOLDER_SIGNATURE_PATTERN.test(trimmed)) {
    throw new Error(`${label} signature is still a placeholder`);
  }

  if (!UPDATER_SIGNATURE_PATTERN.test(trimmed)) {
    throw new Error(`${label} signature is not in updater format`);
  }

  return trimmed;
}

function validateDesktopReleaseVersion(version: string) {
  const trimmed = version.trim();
  if (!trimmed) {
    throw new Error('Desktop release version is missing');
  }

  return trimmed;
}

export function validateDesktopDownloadsPayload(
  payload: DesktopDownloadsPayload,
  options: DesktopReleaseValidationOptions,
): DesktopDownloadsPayload {
  return {
    version: validateDesktopReleaseVersion(payload.version),
    windowsUrl: validateDesktopAssetUrl(payload.windowsUrl, 'Windows desktop download', options),
    macIntelUrl: validateDesktopAssetUrl(payload.macIntelUrl, 'Intel macOS desktop download', options),
    macArmUrl: validateDesktopAssetUrl(payload.macArmUrl, 'Apple Silicon macOS desktop download', options),
  };
}

export function validateDesktopUpdateManifest(
  manifest: DesktopUpdateManifest,
  options: DesktopReleaseValidationOptions,
): DesktopUpdateManifest {
  const version = validateDesktopReleaseVersion(manifest.version);
  const platforms = manifest.platforms ?? {};
  const target = options.target;

  if (!target) {
    throw new Error('Desktop update manifest target is missing');
  }

  const platformEntry = platforms[target];
  if (!platformEntry) {
    throw new Error(`Desktop update manifest missing ${target}`);
  }

  return {
    ...manifest,
    version,
    platforms: {
      ...platforms,
      [target]: {
        url: validateDesktopAssetUrl(platformEntry.url, `${target} update asset`, options),
        signature: validateDesktopSignature(platformEntry.signature, `${target} update asset`),
      },
    },
  };
}
