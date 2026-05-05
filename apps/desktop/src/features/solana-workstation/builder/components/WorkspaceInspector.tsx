import {
  getBuilderProjectKindLabel,
  type SolanaBuilderWorkspaceSummary,
  type SolanaAnchorTomlSummary,
} from '@gorkh/shared';

interface WorkspaceInspectorProps {
  summary: SolanaBuilderWorkspaceSummary;
  anchorToml: SolanaAnchorTomlSummary | null;
}

export function WorkspaceInspector({ summary, anchorToml }: WorkspaceInspectorProps) {
  const booleanBadge = (value: boolean, label: string) => (
    <span
      key={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.2rem 0.5rem',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 600,
        background: value ? 'rgba(220,252,231,0.6)' : 'rgba(241,245,249,0.6)',
        color: value ? '#166534' : '#64748b',
        border: `1px solid ${value ? 'rgba(134,239,172,0.3)' : 'rgba(226,232,240,0.5)'}`,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: value ? '#22c55e' : '#cbd5e1',
        }}
      />
      {label}
    </span>
  );

  return (
    <div
      style={{
        padding: '1rem',
        borderRadius: '10px',
        background: 'rgba(255,255,255,0.6)',
        border: '1px solid rgba(148,163,184,0.18)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
          {getBuilderProjectKindLabel(summary.projectKind)}
        </div>
        <span
          style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '0.15rem 0.4rem',
            borderRadius: '4px',
            background: '#f1f5f9',
            color: '#64748b',
            border: '1px solid #e2e8f0',
          }}
        >
          {summary.detectedPackageManager ?? 'unknown'} pkg
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {booleanBadge(summary.hasAnchorToml, 'Anchor.toml')}
        {booleanBadge(summary.hasCargoToml, 'Cargo.toml')}
        {booleanBadge(summary.hasPackageJson, 'package.json')}
        {booleanBadge(summary.hasProgramsDir, 'programs/')}
        {booleanBadge(summary.hasTestsDir, 'tests/')}
        {booleanBadge(summary.hasMigrationsDir, 'migrations/')}
        {booleanBadge(summary.hasTargetIdlDir, 'target/')}
      </div>

      {anchorToml && (
        <div
          style={{
            marginTop: '0.25rem',
            padding: '0.75rem',
            borderRadius: '8px',
            background: 'rgba(241,245,249,0.5)',
            border: '1px solid rgba(226,232,240,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Anchor.toml Summary</div>

          {anchorToml.providerCluster && (
            <div style={{ fontSize: '0.78rem', color: '#475569' }}>
              <strong>Cluster:</strong> {anchorToml.providerCluster}
            </div>
          )}

          {anchorToml.providerWalletPathPresent && (
            <div style={{ fontSize: '0.78rem', color: '#475569' }}>
              <strong>Wallet:</strong> {anchorToml.providerWalletPathRedacted ?? '[redacted]'}
            </div>
          )}

          {anchorToml.programsByCluster.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Programs</div>
              {anchorToml.programsByCluster.map((p, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    color: '#475569',
                  }}
                >
                  <span style={{ color: '#94a3b8' }}>[{p.cluster}]</span>{' '}
                  <strong>{p.programName}</strong> {p.programId}
                </div>
              ))}
            </div>
          )}

          {anchorToml.scripts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Scripts</div>
              {anchorToml.scripts.map((s, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    color: '#475569',
                  }}
                >
                  <strong>{s.name}</strong> = {s.commandPreview}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {summary.warnings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {summary.warnings.map((w, i) => (
            <div key={i} style={{ fontSize: '0.75rem', color: '#92400e', background: 'rgba(254,252,232,0.5)', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
              ⚠️ {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
