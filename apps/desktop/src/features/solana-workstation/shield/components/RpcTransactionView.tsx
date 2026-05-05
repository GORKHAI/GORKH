import type { SolanaSignatureLookupResult } from '@gorkh/shared';

interface RpcTransactionViewProps {
  result: SolanaSignatureLookupResult;
}

export function RpcTransactionView({ result }: RpcTransactionViewProps) {
  if (!result.found) {
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
        Transaction signature <strong>{result.signature}</strong> was not found on {result.network}.
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
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Transaction</span>
        <span
          style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '0.15rem 0.45rem',
            borderRadius: '4px',
            background: result.err ? '#fef2f2' : '#dcfce7',
            color: result.err ? '#991b1b' : '#166534',
            border: `1px solid ${result.err ? '#fecaca' : '#bbf7d0'}`,
          }}
        >
          {result.err ? 'Failed' : 'Success'}
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
        <Metric label="Slot" value={String(result.slot ?? '-')} />
        <Metric label="Block time" value={result.blockTime ? new Date(result.blockTime * 1000).toLocaleString() : '-'} />
        <Metric label="Fee (lamports)" value={String(result.fee ?? '-')} />
        <Metric label="Compute units" value={String(result.computeUnitsConsumed ?? '-')} />
      </div>

      {result.err != null && (
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.6rem',
            borderRadius: '6px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            fontSize: '0.8rem',
            color: '#991b1b',
          }}
        >
          <strong>On-chain error:</strong>{' '}
          {typeof result.err === 'string' ? result.err : JSON.stringify(result.err ?? null)}
        </div>
      )}

      {result.accountKeys && result.accountKeys.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.35rem' }}>
            Account Keys ({result.accountKeys.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {result.accountKeys.map((key, i) => (
              <Mono key={i}>{key}</Mono>
            ))}
          </div>
        </div>
      )}

      {result.logs && result.logs.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.35rem' }}>
            Logs ({result.logs.length})
          </div>
          <div
            style={{
              maxHeight: '200px',
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

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '0.75rem',
        wordBreak: 'break-all',
        color: '#334155',
        background: 'rgba(241,245,249,0.6)',
        padding: '0.15rem 0.35rem',
        borderRadius: '4px',
        border: '1px solid rgba(226,232,240,0.6)',
      }}
    >
      {children}
    </span>
  );
}
