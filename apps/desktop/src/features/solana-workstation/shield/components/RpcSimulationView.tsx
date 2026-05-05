import type { SolanaSimulationPreview } from '@gorkh/shared';

interface RpcSimulationViewProps {
  result: SolanaSimulationPreview;
}

export function RpcSimulationView({ result }: RpcSimulationViewProps) {
  return (
    <div
      style={{
        padding: '1rem',
        borderRadius: '10px',
        border: '1px solid rgba(148,163,184,0.18)',
        background: 'rgba(255,255,255,0.6)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Simulation Preview</span>
        <span
          style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '0.15rem 0.45rem',
            borderRadius: '4px',
            background: result.success ? '#dcfce7' : '#fef2f2',
            color: result.success ? '#166534' : '#991b1b',
            border: `1px solid ${result.success ? '#bbf7d0' : '#fecaca'}`,
          }}
        >
          {result.success ? 'Success' : 'Failed'}
        </span>
      </div>

      <div
        style={{
          marginTop: '0.6rem',
          padding: '0.6rem',
          borderRadius: '6px',
          background: 'rgba(254,252,232,0.6)',
          border: '1px solid rgba(253,224,71,0.3)',
          fontSize: '0.8rem',
          lineHeight: 1.45,
          color: '#854d0e',
        }}
      >
        ⚠️ {result.warning}
      </div>

      {result.err != null && (
        <div
          style={{
            marginTop: '0.6rem',
            padding: '0.6rem',
            borderRadius: '6px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            fontSize: '0.8rem',
            color: '#991b1b',
          }}
        >
          <strong>Simulation error:</strong>{' '}
          {typeof result.err === 'string' ? result.err : JSON.stringify(result.err ?? null)}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '0.5rem',
          marginTop: '0.75rem',
        }}
      >
        <Metric label="Network" value={result.network} />
        <Metric label="Compute units" value={String(result.unitsConsumed ?? '-')} />
        <Metric label="Logs" value={String(result.logs.length)} />
        {result.replacementBlockhash && (
          <Metric label="Replacement blockhash" value={result.replacementBlockhash} />
        )}
      </div>

      {result.logs.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.35rem' }}>
            Simulation Logs
          </div>
          <div
            style={{
              maxHeight: '240px',
              overflow: 'auto',
              background: 'rgba(15,23,42,0.04)',
              borderRadius: '6px',
              padding: '0.5rem',
              fontSize: '0.75rem',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              color: '#334155',
            }}
          >
            {result.logs.map((log, i) => (
              <div key={i} style={{ lineHeight: 1.5 }}>{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', background: 'rgba(241,245,249,0.6)', border: '1px solid rgba(226,232,240,0.6)' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>{label}</div>
      <div style={{ marginTop: '0.15rem', fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', wordBreak: 'break-all' }}>{value}</div>
    </div>
  );
}
