import type {
  SolanaBuilderProjectKind,
  SolanaBuilderWorkspaceSummary,
  SolanaAnchorTomlSummary,
  SolanaBuilderIdlSummary,
} from '@gorkh/shared';
import {
  SolanaBuilderProjectKind as ProjectKind,
  isExcludedBuilderDir,
} from '@gorkh/shared';
import { executeTool, type ToolResult } from '../../../lib/workspace.js';
import { assertSafeBuilderFilePath, assertSafeBuilderDirName } from './builderGuards.js';
import { parseAnchorToml } from './parseAnchorToml.js';
import { parseIdlJson } from './parseIdl.js';

// ============================================================================
// Workspace Inspector — Phase 4
// ============================================================================
// Read-only inspection of a configured workspace. Assumes the workspace
// has already been configured to the target directory.
// ============================================================================

export interface BuilderInspectionResult {
  summary: SolanaBuilderWorkspaceSummary;
  anchorToml: SolanaAnchorTomlSummary | null;
  idls: SolanaBuilderIdlSummary[];
  fileTree: BuilderFileEntry[];
}

export interface BuilderFileEntry {
  name: string;
  kind: 'file' | 'dir';
  path: string;
  size?: number;
  children?: BuilderFileEntry[];
}

const MAX_LIST_ENTRIES = 200;
const MAX_DEPTH = 3;

async function safeList(path: string): Promise<{ entries: Array<{ name: string; kind: 'file' | 'dir'; size?: number }>; truncated: boolean }> {
  const result: ToolResult = await executeTool({ tool: 'fs.list', path });
  if (!result.ok || !result.data?.entries) {
    return { entries: [], truncated: false };
  }
  return {
    entries: result.data.entries
      .filter((e) => !isExcludedBuilderDir(e.name))
      .map((e) => ({ name: e.name, kind: e.kind, size: e.size })),
    truncated: result.data.truncated ?? false,
  };
}

async function safeReadText(path: string): Promise<string | null> {
  if (!isSafeBuilderFilePath(path)) return null;
  const result: ToolResult = await executeTool({ tool: 'fs.read_text', path });
  if (!result.ok || !result.data?.content) {
    return null;
  }
  return result.data.content;
}

function isSafeBuilderFilePath(path: string): boolean {
  try {
    assertSafeBuilderFilePath(path);
    return true;
  } catch {
    return false;
  }
}

function detectPackageManager(entries: Array<{ name: string }>): 'pnpm' | 'npm' | 'yarn' | 'bun' | 'unknown' {
  if (entries.some((e) => e.name === 'pnpm-lock.yaml')) return 'pnpm';
  if (entries.some((e) => e.name === 'yarn.lock')) return 'yarn';
  if (entries.some((e) => e.name === 'bun.lockb' || e.name === 'bun.lock')) return 'bun';
  if (entries.some((e) => e.name === 'package-lock.json')) return 'npm';
  if (entries.some((e) => e.name === 'package.json')) return 'npm';
  return 'unknown';
}

function detectProjectKind(
  hasAnchorToml: boolean,
  hasCargoToml: boolean,
  hasPackageJson: boolean,
  hasProgramsDir: boolean
): SolanaBuilderProjectKind {
  if (hasAnchorToml) return ProjectKind.ANCHOR;
  if (hasProgramsDir && hasCargoToml) return ProjectKind.SOLANA_RUST;
  if (hasCargoToml) return ProjectKind.RUST;
  if (hasPackageJson) return ProjectKind.TYPESCRIPT;
  return ProjectKind.UNKNOWN;
}

async function buildFileTree(
  relPath: string,
  depth: number
): Promise<BuilderFileEntry[]> {
  if (depth >= MAX_DEPTH) return [];

  const { entries, truncated } = await safeList(relPath);
  const results: BuilderFileEntry[] = [];

  for (const entry of entries.slice(0, MAX_LIST_ENTRIES)) {
    try {
      assertSafeBuilderDirName(entry.name);
    } catch {
      continue;
    }

    const childPath = relPath === '.' ? entry.name : `${relPath}/${entry.name}`;

    if (entry.kind === 'dir') {
      const children = truncated ? undefined : await buildFileTree(childPath, depth + 1);
      results.push({
        name: entry.name,
        kind: 'dir',
        path: childPath,
        size: entry.size,
        children,
      });
    } else {
      results.push({
        name: entry.name,
        kind: 'file',
        path: childPath,
        size: entry.size,
      });
    }
  }

  return results;
}

async function findIdlFiles(tree: BuilderFileEntry[], prefix: string): Promise<string[]> {
  const results: string[] = [];
  for (const entry of tree) {
    const fullPath = prefix === '.' ? entry.path : entry.path;
    if (entry.kind === 'file' && entry.name.endsWith('.json') && fullPath.includes('/idl/')) {
      results.push(fullPath);
    }
    if (entry.kind === 'dir' && entry.children) {
      results.push(...(await findIdlFiles(entry.children, prefix)));
    }
  }
  return results;
}

/**
 * Inspect a configured workspace and return a full builder analysis.
 * This assumes the workspace has already been configured to the target path.
 */
export async function inspectConfiguredWorkspace(
  rootPath: string
): Promise<BuilderInspectionResult> {
  const rootEntries = await safeList('.');
  const names = new Set(rootEntries.entries.map((e) => e.name));

  const hasAnchorToml = names.has('Anchor.toml');
  const hasCargoToml = names.has('Cargo.toml');
  const hasPackageJson = names.has('package.json');
  const hasProgramsDir = names.has('programs');
  const hasTestsDir = names.has('tests');
  const hasMigrationsDir = names.has('migrations');
  const hasTargetIdlDir = names.has('target');

  const warnings: string[] = [];
  if (rootEntries.truncated) {
    warnings.push(`Root directory listing truncated to ${MAX_LIST_ENTRIES} entries.`);
  }

  const projectKind = detectProjectKind(
    hasAnchorToml,
    hasCargoToml,
    hasPackageJson,
    hasProgramsDir
  );

  const summary: SolanaBuilderWorkspaceSummary = {
    rootPath,
    projectKind,
    detectedPackageManager: detectPackageManager(rootEntries.entries),
    hasAnchorToml,
    hasCargoToml,
    hasPackageJson,
    hasProgramsDir,
    hasTestsDir,
    hasMigrationsDir,
    hasTargetIdlDir,
    detectedAt: new Date().toISOString(),
    warnings,
  };

  // Parse Anchor.toml
  let anchorToml: SolanaAnchorTomlSummary | null = null;
  if (hasAnchorToml) {
    const content = await safeReadText('Anchor.toml');
    if (content) {
      anchorToml = parseAnchorToml(content);
    }
  }

  // Build file tree
  const fileTree = await buildFileTree('.', 0);

  // Find and parse IDL files
  const idlPaths = await findIdlFiles(fileTree, '.');
  const idls: SolanaBuilderIdlSummary[] = [];
  for (const idlPath of idlPaths.slice(0, 10)) {
    const content = await safeReadText(idlPath);
    if (content) {
      try {
        const idl = parseIdlJson(content);
        if (idl) {
          idls.push({ ...idl, sourcePath: idlPath });
        }
      } catch {
        // Skip unparseable IDL files
      }
    }
  }

  return { summary, anchorToml, idls, fileTree };
}
