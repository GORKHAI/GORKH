import type { SolanaAccountLookupResult } from '@gorkh/shared';

interface RpcAccountViewProps {
  result: SolanaAccountLookupResult;
}

export function RpcAccountView({ result }: RpcAccountViewProps) {
  if (!result.exists) {
    return (
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
        Account <strong>{result.address}</strong> does not exist on {result.network}.
      </div>
    );
  }

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
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Account</span>
        <span
          style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '0.15rem 0.45rem',
            borderRadius: '4px',
            background: '#dcfce7',
            color: '#166534',
            border: '1px solid #bbf7d0',
          }}
        >
          Found
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '0.5rem',
          marginTop: '0.75rem',
        }}
      >
        <Metric label="Address" value={result.address} mono />
        <Metric label="Balance (lamports)" value={String(result.lamports ?? 0)} />
        <Metric label="Owner" value={result.owner ?? 'Unknown'} mono />
        <Metric label="Executable" value={result.executable ? 'Yes' : 'No'} />
        <Metric label="Data length" value={String(result.dataLength ?? 0)} />
      </div>
    </div>
  );
}

function Metric({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div
      style={{
        padding: '0.5rem 0.75rem',
        borderRadius: '6px',
        background: 'rgba(241,245,249,0.6)',
        border: '1px solid rgba(226,232,240,0.6)',
      }}
    >
      <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
        {label}
      </div>
      <div
        style={{
          marginTop: '0.15rem',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: '#0f172a',
          wordBreak: 'break-all',
          fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' : undefined,
        }}
      >
        {value}
      </div>
    </div>
  );
}
