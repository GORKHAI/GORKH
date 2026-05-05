import type { SolanaAddressLookupTableResolution } from '@gorkh/shared';

interface RpcLookupTableResolutionViewProps {
  resolutions: SolanaAddressLookupTableResolution[];
}

export function RpcLookupTableResolutionView({ resolutions }: RpcLookupTableResolutionViewProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {resolutions.map((res, i) => (
        <div
          key={i}
          style={{
            padding: '0.75rem',
            borderRadius: '8px',
            border: `1px solid ${res.found ? 'rgba(148,163,184,0.18)' : 'rgba(252,165,165,0.35)'}`,
            background: res.found ? 'rgba(248,250,252,0.4)' : 'rgba(254,242,242,0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Lookup Table</span>
            <span
              style={{
                fontSize: '0.6rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '0.1rem 0.35rem',
                borderRadius: '4px',
                background: res.found ? '#dcfce7' : '#fef2f2',
                color: res.found ? '#166534' : '#991b1b',
                border: `1px solid ${res.found ? '#bbf7d0' : '#fecaca'}`,
              }}
            >
              {res.found ? 'Found' : 'Not found'}
            </span>
          </div>

          <div
            style={{
              marginTop: '0.4rem',
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
            {res.lookupTableAddress}
          </div>

          {res.error && (
            <div
              style={{
                marginTop: '0.5rem',
                padding: '0.5rem',
                borderRadius: '6px',
                background: '#fff7ed',
                border: '1px solid #fdba74',
                fontSize: '0.8rem',
                color: '#9a3412',
              }}
            >
              {res.error}
            </div>
          )}

          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#64748b' }}>
            <span>Writable indexes: {res.writableIndexes.length}</span>
            <span>Readonly indexes: {res.readonlyIndexes.length}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
