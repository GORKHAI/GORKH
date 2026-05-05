import { useState, useCallback } from 'react';
import type { SolanaBuilderFilePreview } from '@gorkh/shared';
import type { BuilderFileEntry } from '../inspectWorkspace.js';
import { createSafeFilePreview, canPreviewFile } from '../safeFilePreview.js';

interface FilePreviewPanelProps {
  fileTree: BuilderFileEntry[];
}

function FileTreeNode({
  entry,
  onSelect,
  selectedPath,
  depth = 0,
}: {
  entry: BuilderFileEntry;
  onSelect: (path: string) => void;
  selectedPath: string | null;
  depth?: number;
}) {
  const paddingLeft = depth * 12;
  const isPreviewable = entry.kind === 'file' && canPreviewFile(entry.path);

  if (entry.kind === 'dir') {
    return (
      <div>
        <div
          style={{
            padding: '0.12rem 0',
            paddingLeft: `${paddingLeft}px`,
            fontSize: '0.75rem',
            color: '#475569',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>▸</span>
          {entry.name}/
        </div>
        {entry.children && entry.children.length > 0 && (
          <div>
            {entry.children.map((child) => (
              <FileTreeNode
                key={child.path}
                entry={child}
                onSelect={onSelect}
                selectedPath={selectedPath}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => isPreviewable && onSelect(entry.path)}
      style={{
        padding: '0.12rem 0',
        paddingLeft: `${paddingLeft}px`,
        fontSize: '0.75rem',
        color: isPreviewable ? (selectedPath === entry.path ? '#1d4ed8' : '#64748b') : '#cbd5e1',
        cursor: isPreviewable ? 'pointer' : 'default',
        fontWeight: selectedPath === entry.path ? 600 : 400,
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
      }}
    >
      <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>─</span>
      {entry.name}
      {!isPreviewable && (
        <span style={{ fontSize: '0.6rem', color: '#cbd5e1' }}>(blocked)</span>
      )}
    </div>
  );
}

export function FilePreviewPanel({ fileTree }: FilePreviewPanelProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [preview, setPreview] = useState<SolanaBuilderFilePreview | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSelect = useCallback(async (path: string) => {
    setSelectedPath(path);
    setBusy(true);
    const result = await createSafeFilePreview(path);
    setPreview(result);
    setBusy(false);
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <div>
        <p
          style={{
            margin: '0 0 0.5rem',
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#94a3b8',
          }}
        >
          Files
        </p>
        <div
          style={{
            padding: '0.5rem',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(148,163,184,0.18)',
            maxHeight: '400px',
            overflow: 'auto',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          }}
        >
          {fileTree.map((entry) => (
            <FileTreeNode
              key={entry.path}
              entry={entry}
              onSelect={handleSelect}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      </div>

      <div>
        <p
          style={{
            margin: '0 0 0.5rem',
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#94a3b8',
          }}
        >
          Preview
        </p>
        {busy && (
          <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Loading…</div>
        )}
        {!busy && preview === null && selectedPath && (
          <div
            style={{
              padding: '1rem',
              borderRadius: '8px',
              background: 'rgba(241,245,249,0.5)',
              border: '1px dashed rgba(148,163,184,0.3)',
              fontSize: '0.85rem',
              color: '#94a3b8',
              textAlign: 'center',
            }}
          >
            Could not preview this file.
          </div>
        )}
        {!busy && preview && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.35rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>
                {preview.relativePath}
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem', borderRadius: '3px', background: '#f1f5f9', color: '#64748b' }}>
                  {preview.language}
                </span>
                <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem', borderRadius: '3px', background: '#f1f5f9', color: '#64748b' }}>
                  {preview.lineCount} lines
                </span>
              </div>
            </div>

            <pre
              style={{
                margin: 0,
                padding: '0.5rem',
                borderRadius: '6px',
                background: 'rgba(241,245,249,0.6)',
                border: '1px solid rgba(226,232,240,0.5)',
                fontSize: '0.72rem',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                color: '#475569',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                maxHeight: '360px',
                overflow: 'auto',
              }}
            >
              {preview.contentPreview}
            </pre>

            {preview.truncated && (
              <div style={{ fontSize: '0.72rem', color: '#92400e', background: 'rgba(254,252,232,0.5)', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
                ⚠️ File truncated for preview.
              </div>
            )}
            {preview.redactionsApplied > 0 && (
              <div style={{ fontSize: '0.72rem', color: '#92400e', background: 'rgba(254,252,232,0.5)', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
                ⚠️ {preview.redactionsApplied} potential secret value(s) redacted.
              </div>
            )}
            {preview.safetyNotes.map((note: string, i: number) => (
              <div key={i} style={{ fontSize: '0.72rem', color: '#64748b' }}>
                ℹ️ {note}
              </div>
            ))}
          </div>
        )}
        {!selectedPath && !busy && (
          <div
            style={{
              padding: '1rem',
              borderRadius: '8px',
              background: 'rgba(241,245,249,0.5)',
              border: '1px dashed rgba(148,163,184,0.3)',
              fontSize: '0.85rem',
              color: '#94a3b8',
              textAlign: 'center',
            }}
          >
            Click a file in the tree to preview.
          </div>
        )}
      </div>
    </div>
  );
}
