import type { SolanaBuilderIdlSummary } from '@gorkh/shared';
import type { BuilderFileEntry } from '../inspectWorkspace.js';

interface FileTreeViewProps {
  entries: BuilderFileEntry[];
  idls: SolanaBuilderIdlSummary[];
  onSelectIdl: (idl: SolanaBuilderIdlSummary) => void;
}

function FileTreeNode({
  entry,
  idls,
  onSelectIdl,
  depth = 0,
}: {
  entry: BuilderFileEntry;
  idls: SolanaBuilderIdlSummary[];
  onSelectIdl: (idl: SolanaBuilderIdlSummary) => void;
  depth?: number;
}) {
  const isIdl = entry.kind === 'file' && entry.name.endsWith('.json') && entry.path.includes('/idl/');
  const matchingIdl = isIdl ? idls.find((i) => i.sourcePath === entry.path) : undefined;

  const paddingLeft = depth * 12;

  if (entry.kind === 'dir') {
    return (
      <div>
        <div
          style={{
            padding: '0.15rem 0',
            paddingLeft: `${paddingLeft}px`,
            fontSize: '0.78rem',
            color: '#475569',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
          }}
        >
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>▸</span>
          {entry.name}/
        </div>
        {entry.children && entry.children.length > 0 && (
          <div>
            {entry.children.map((child) => (
              <FileTreeNode
                key={child.path}
                entry={child}
                idls={idls}
                onSelectIdl={onSelectIdl}
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
      style={{
        padding: '0.15rem 0',
        paddingLeft: `${paddingLeft}px`,
        fontSize: '0.78rem',
        color: isIdl ? '#1d4ed8' : '#64748b',
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem',
        cursor: isIdl ? 'pointer' : 'default',
        fontWeight: isIdl ? 600 : 400,
      }}
      onClick={() => {
        if (matchingIdl) {
          onSelectIdl(matchingIdl);
        }
      }}
    >
      <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>─</span>
      {entry.name}
      {isIdl && matchingIdl && (
        <span
          style={{
            fontSize: '0.6rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            padding: '0.05rem 0.3rem',
            borderRadius: '3px',
            background: '#dbeafe',
            color: '#1e40af',
          }}
        >
          IDL
        </span>
      )}
    </div>
  );
}

export function FileTreeView({ entries, idls, onSelectIdl }: FileTreeViewProps) {
  return (
    <div
      style={{
        padding: '0.75rem',
        borderRadius: '8px',
        background: 'rgba(255,255,255,0.6)',
        border: '1px solid rgba(148,163,184,0.18)',
        maxHeight: '400px',
        overflow: 'auto',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      }}
    >
      {entries.map((entry) => (
        <FileTreeNode key={entry.path} entry={entry} idls={idls} onSelectIdl={onSelectIdl} />
      ))}
    </div>
  );
}
