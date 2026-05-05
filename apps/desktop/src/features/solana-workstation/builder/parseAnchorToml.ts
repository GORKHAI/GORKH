import type {
  SolanaAnchorTomlSummary,
  SolanaAnchorTomlProgramEntry,
  SolanaAnchorTomlScriptEntry,
} from '@gorkh/shared';

// ============================================================================
// Anchor.toml Parser — Phase 4
// ============================================================================
// Lightweight parser for Anchor.toml configuration files.
// Handles simple TOML-like structure without a full TOML dependency.
// Only extracts fields needed for read-only inspection.
// ============================================================================

interface ParsedToml {
  [section: string]: Record<string, unknown>;
}

function parseSimpleToml(text: string): ParsedToml {
  const result: ParsedToml = {};
  let currentSection = '';

  for (const rawLine of text.split('\n')) {
    const line = rawLine.split('#')[0].trim();
    if (!line) continue;

    if (line.startsWith('[') && line.endsWith(']')) {
      currentSection = line.slice(1, -1).trim();
      if (!result[currentSection]) {
        result[currentSection] = {};
      }
      continue;
    }

    const eqIdx = line.indexOf('=');
    if (eqIdx === -1 || !currentSection) continue;

    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();

    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    result[currentSection][key] = value;
  }

  return result;
}

function parseTableSection(obj: Record<string, unknown>): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string') {
      // Simple key = "value" inside a table section
      const dotIdx = key.indexOf('.');
      if (dotIdx > 0) {
        const outer = key.slice(0, dotIdx);
        const inner = key.slice(dotIdx + 1);
        if (!result[outer]) result[outer] = {};
        result[outer][inner] = val;
      } else {
        if (!result['_root']) result['_root'] = {};
        result['_root'][key] = val;
      }
    }
  }
  return result;
}

/**
 * Parse Anchor.toml content into a structured summary.
 */
export function parseAnchorToml(content: string): SolanaAnchorTomlSummary {
  const parsed = parseSimpleToml(content);

  // Provider section
  let providerCluster: string | undefined;
  let providerWalletPathPresent = false;
  let providerWalletPathRedacted: string | undefined;

  const provider = parsed['provider'];
  if (provider) {
    if (typeof provider.cluster === 'string') {
      providerCluster = provider.cluster;
    }
    if (typeof provider.wallet === 'string') {
      providerWalletPathPresent = true;
      providerWalletPathRedacted = '[redacted]';
    }
  }

  // Programs section — may be nested like [programs.localnet]
  const programsByCluster: SolanaAnchorTomlProgramEntry[] = [];
  for (const [sectionName, sectionValue] of Object.entries(parsed)) {
    if (sectionName.startsWith('programs')) {
      const cluster = sectionName.replace(/^programs\.?/, '') || 'unknown';
      const table = parseTableSection(sectionValue as Record<string, unknown>);
      for (const [programName, programId] of Object.entries(table._root ?? {})) {
        programsByCluster.push({ cluster, programName, programId });
      }
      // Handle nested tables
      for (const [subKey, subTable] of Object.entries(table)) {
        if (subKey === '_root') continue;
        for (const [programName, programId] of Object.entries(subTable)) {
          programsByCluster.push({ cluster: `${cluster}.${subKey}`, programName, programId });
        }
      }
    }
  }

  // Scripts section
  const scripts: SolanaAnchorTomlScriptEntry[] = [];
  const scriptsSection = parsed['scripts'];
  if (scriptsSection) {
    for (const [name, command] of Object.entries(scriptsSection)) {
      if (typeof command === 'string') {
        scripts.push({ name, commandPreview: command });
      }
    }
  }

  return {
    providerCluster,
    providerWalletPathPresent,
    providerWalletPathRedacted,
    programsByCluster,
    scripts,
  };
}
