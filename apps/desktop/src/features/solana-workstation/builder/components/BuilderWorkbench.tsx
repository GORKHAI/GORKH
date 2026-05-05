import { useState, useCallback, useMemo } from 'react';
import {
  SolanaBuilderWorkspaceStatus,
  type SolanaBuilderIdlSummary,
  type SolanaBuilderToolStatus,
} from '@gorkh/shared';
import {
  selectWorkspaceDirectory,
  configureWorkspace,
  clearWorkspace,
} from '../../../../lib/workspace.js';
import { inspectConfiguredWorkspace, type BuilderInspectionResult } from '../inspectWorkspace.js';
import { runBuilderVersionChecks } from '../runVersionCheck.js';
import { createSolanaBuilderCommandDrafts } from '../createCommandDrafts.js';
import { createBuilderContextSummary } from '../createBuilderContextSummary.js';
import { WorkspaceInspector } from './WorkspaceInspector.js';
import { IdlViewer } from './IdlViewer.js';
import { ToolStatusPanel } from './ToolStatusPanel.js';
import { FileTreeView } from './FileTreeView.js';
import { LogAnalyzerPanel } from './LogAnalyzerPanel.js';
import { DiagnosticsPanel } from './DiagnosticsPanel.js';
import { CommandDraftsPanel } from './CommandDraftsPanel.js';
import { FilePreviewPanel } from './FilePreviewPanel.js';
import { BuilderContextPanel } from './BuilderContextPanel.js';

type BuilderTab = 'inspect' | 'files' | 'logs' | 'diagnostics' | 'commands' | 'context';

const TABS: { id: BuilderTab; label: string }[] = [
  { id: 'inspect', label: 'Inspect' },
  { id: 'files', label: 'Files' },
  { id: 'logs', label: 'Logs' },
  { id: 'diagnostics', label: 'Diagnostics' },
  { id: 'commands', label: 'Commands' },
  { id: 'context', label: 'Context' },
];

export function BuilderWorkbench({ onSaveContext }: { onSaveContext?: (markdown: string) => void }) {
  const [activeTab, setActiveTab] = useState<BuilderTab>('inspect');
  const [status, setStatus] = useState<SolanaBuilderWorkspaceStatus>(SolanaBuilderWorkspaceStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [inspection, setInspection] = useState<BuilderInspectionResult | null>(null);
  const [toolStatuses, setToolStatuses] = useState<SolanaBuilderToolStatus[]>([]);
  const [checkingTools, setCheckingTools] = useState(false);
  const [selectedIdl, setSelectedIdl] = useState<SolanaBuilderIdlSummary | null>(null);
  const handleSelectDirectory = useCallback(async () => {
    setError(null);
    setStatus(SolanaBuilderWorkspaceStatus.LOADING);
    try {
      const path = await selectWorkspaceDirectory();
      if (!path) {
        setStatus(SolanaBuilderWorkspaceStatus.IDLE);
        return;
      }
      await configureWorkspace(path);
      setWorkspacePath(path);
      const result = await inspectConfiguredWorkspace(path);
      setInspection(result);
      setStatus(SolanaBuilderWorkspaceStatus.READY);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inspection failed');
      setStatus(SolanaBuilderWorkspaceStatus.ERROR);
    }
  }, []);

  const handleClear = useCallback(async () => {
    setInspection(null);
    setSelectedIdl(null);
    setToolStatuses([]);
    setWorkspacePath(null);
    setError(null);
    setStatus(SolanaBuilderWorkspaceStatus.IDLE);
    await clearWorkspace();
  }, []);

  const handleCheckTools = useCallback(async () => {
    setCheckingTools(true);
    setError(null);
    try {
      const results = await runBuilderVersionChecks({
        onProgress: (status) => {
          setToolStatuses((prev) => {
            const filtered = prev.filter((s) => s.tool !== status.tool);
            return [...filtered, status];
          });
        },
      });
      setToolStatuses(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tool check failed');
    } finally {
      setCheckingTools(false);
    }
  }, []);

  const handleSelectIdl = useCallback((idl: SolanaBuilderIdlSummary) => {
    setSelectedIdl(idl);
  }, []);

  const commandDrafts = useMemo(
    () => createSolanaBuilderCommandDrafts(inspection?.summary ?? null),
    [inspection]
  );

  const contextSummary = useMemo(
    () =>
      createBuilderContextSummary(
        inspection?.summary ?? null,
        inspection?.anchorToml ?? null,
        inspection?.idls ?? [],
        toolStatuses
      ),
    [inspection, toolStatuses]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#8b5cf6' }} />
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
            GORKH Builder — Workspace Inspector
          </h3>
        </div>
      </div>

      {/* Safety banner */}
      <div
        style={{
          padding: '0.6rem 0.85rem',
          borderRadius: '8px',
          background: 'rgba(254,252,232,0.6)',
          border: '1px solid rgba(253,224,71,0.3)',
          fontSize: '0.8rem',
          lineHeight: 1.45,
          color: '#854d0e',
        }}
      >
        <strong>Read-only inspector.</strong> GORKH Builder can analyze local project files,
        parse logs, and check toolchain versions. No builds, tests, deployments, or file modifications occur in v0.2.
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={() => void handleSelectDirectory()}
          disabled={status === SolanaBuilderWorkspaceStatus.LOADING}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '9999px',
            border: 'none',
            background: status === SolanaBuilderWorkspaceStatus.LOADING ? '#e5e7eb' : '#0f172a',
            color: status === SolanaBuilderWorkspaceStatus.LOADING ? '#9ca3af' : 'white',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: status === SolanaBuilderWorkspaceStatus.LOADING ? 'not-allowed' : 'pointer',
          }}
        >
          {status === SolanaBuilderWorkspaceStatus.LOADING ? 'Inspecting…' : 'Select Project Directory'}
        </button>

        {inspection && (
          <button
            onClick={() => void handleCheckTools()}
            disabled={checkingTools}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '9999px',
              border: '1px solid rgba(148,163,184,0.24)',
              background: 'rgba(255,255,255,0.8)',
              color: '#0f172a',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: checkingTools ? 'not-allowed' : 'pointer',
            }}
          >
            {checkingTools ? 'Checking…' : 'Check Tool Versions'}
          </button>
        )}

        {inspection && onSaveContext && (
          <button
            onClick={() => onSaveContext(contextSummary.copyableMarkdown)}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '9999px',
              border: '1px solid rgba(148,163,184,0.24)',
              background: 'rgba(255,255,255,0.8)',
              color: '#0f172a',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Save Sanitized Context
          </button>
        )}

        {workspacePath && (
          <button
            onClick={() => void handleClear()}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '9999px',
              border: '1px solid rgba(148,163,184,0.24)',
              background: 'rgba(255,255,255,0.8)',
              color: '#0f172a',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Workspace path */}
      {workspacePath && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            background: 'rgba(241,245,249,0.6)',
            border: '1px solid rgba(226,232,240,0.6)',
            fontSize: '0.8rem',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            color: '#475569',
          }}
        >
          {workspacePath}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            padding: '0.75rem',
            borderRadius: '8px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            fontSize: '0.875rem',
            color: '#991b1b',
          }}
        >
          {error}
        </div>
      )}

      {/* Tabs */}
      {inspection && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', borderBottom: '1px solid rgba(148,163,184,0.18)', paddingBottom: '0.25rem' }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeTab === tab.id ? '#0f172a' : 'transparent',
                  color: activeTab === tab.id ? 'white' : '#64748b',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'inspect' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <WorkspaceInspector summary={inspection.summary} anchorToml={inspection.anchorToml} />
              {toolStatuses.length > 0 && <ToolStatusPanel statuses={toolStatuses} />}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
                    File Tree
                  </p>
                  <FileTreeView entries={inspection.fileTree} onSelectIdl={handleSelectIdl} idls={inspection.idls} />
                </div>
                <div>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
                    IDL Inspector
                  </p>
                  {selectedIdl ? (
                    <IdlViewer idl={selectedIdl} />
                  ) : (
                    <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(241,245,249,0.5)', border: '1px dashed rgba(148,163,184,0.3)', fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }}>
                      Select an IDL file from the file tree to inspect
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'files' && <FilePreviewPanel fileTree={inspection.fileTree} />}
          {activeTab === 'logs' && <LogAnalyzerPanel idls={inspection.idls} />}
          {activeTab === 'diagnostics' && <DiagnosticsPanel />}
          {activeTab === 'commands' && <CommandDraftsPanel drafts={commandDrafts} />}
          {activeTab === 'context' && <BuilderContextPanel summary={contextSummary} />}
        </div>
      )}

      {/* Empty state */}
      {!inspection && status === SolanaBuilderWorkspaceStatus.IDLE && !error && (
        <div
          style={{
            padding: '1.5rem',
            borderRadius: '8px',
            background: 'rgba(241,245,249,0.5)',
            border: '1px dashed rgba(148,163,184,0.3)',
            fontSize: '0.85rem',
            color: '#94a3b8',
            textAlign: 'center',
          }}
        >
          Select a project directory to inspect Anchor, Solana, Rust, or TypeScript workspaces.
        </div>
      )}
    </div>
  );
}
