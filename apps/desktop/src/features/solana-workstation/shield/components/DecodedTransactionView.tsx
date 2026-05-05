import { SolanaTransactionFormat, type SolanaDecodedTransaction } from '@gorkh/shared';

interface DecodedTransactionViewProps {
  decoded: SolanaDecodedTransaction;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: '1rem' }}>
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
        {title}
      </p>
      {children}
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: 'success' | 'warning' | 'neutral' | 'info';
}) {
  const colors = {
    success: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
    warning: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
    neutral: { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' },
    info: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  };
  const c = colors[tone];
  return (
    <span
      style={{
        fontSize: '0.65rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        padding: '0.15rem 0.45rem',
        borderRadius: '4px',
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

export function DecodedTransactionView({ decoded }: DecodedTransactionViewProps) {
  return (
    <div
      style={{
        padding: '1.25rem',
        borderRadius: '12px',
        border: '1px solid rgba(148,163,184,0.22)',
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
          Decoded Transaction
        </h3>
        <Badge tone={decoded.format === SolanaTransactionFormat.LEGACY ? 'neutral' : 'info'}>
          {decoded.format}
        </Badge>
        <Badge tone={decoded.signatureCount >= decoded.requiredSignatureCount ? 'success' : 'warning'}>
          {decoded.signatureCount}/{decoded.requiredSignatureCount} signatures
        </Badge>
      </div>

      {decoded.warnings.length > 0 && (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {decoded.warnings.map((w, i) => (
            <div
              key={i}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                background: '#fff7ed',
                border: '1px solid #fdba74',
                fontSize: '0.8rem',
                color: '#9a3412',
              }}
            >
              ⚠️ {w}
            </div>
          ))}
        </div>
      )}

      <Section title="Overview">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '0.5rem',
          }}
        >
          <Metric label="Format" value={decoded.format} />
          <Metric label="Instructions" value={String(decoded.instructions.length)} />
          <Metric label="Accounts" value={String(decoded.accountKeys.length)} />
          <Metric label="Signatures present" value={String(decoded.signatureCount)} />
          <Metric label="Signatures required" value={String(decoded.requiredSignatureCount)} />
        </div>
      </Section>

      {decoded.recentBlockhash && (
        <Section title="Recent Blockhash">
          <MonoValue value={decoded.recentBlockhash} />
        </Section>
      )}

      <Section title="Account Keys">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {decoded.accountKeys.map((key, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.35rem 0.5rem',
                borderRadius: '6px',
                background: i < decoded.requiredSignatureCount ? 'rgba(220,252,231,0.3)' : 'rgba(248,250,252,0.5)',
                border: `1px solid ${i < decoded.requiredSignatureCount ? 'rgba(134,239,172,0.25)' : 'rgba(226,232,240,0.5)'}`,
              }}
            >
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', minWidth: '1.5rem' }}>
                {i}
              </span>
              <MonoValue value={key} size="small" />
              {i < decoded.requiredSignatureCount && (
                <Badge tone="success">signer</Badge>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Instructions">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {decoded.instructions.map((ix) => (
            <div
              key={ix.index}
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                border: `1px solid ${ix.isKnownProgram ? 'rgba(148,163,184,0.18)' : 'rgba(252,165,165,0.35)'}`,
                background: ix.isKnownProgram ? 'rgba(248,250,252,0.4)' : 'rgba(254,242,242,0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>#{ix.index}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{ix.programName}</span>
                <Badge tone={ix.isKnownProgram ? 'success' : 'warning'}>
                  {ix.isKnownProgram ? 'known' : 'unknown'}
                </Badge>
              </div>
              <MonoValue value={ix.programId} size="small" />
              {ix.accounts && ix.accounts.length > 0 && (
                <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#64748b' }}>
                  Accounts: {ix.accounts.length} referenced
                </div>
              )}
              {ix.dataLength > 0 && (
                <div style={{ marginTop: '0.3rem', fontSize: '0.75rem', color: '#64748b' }}>
                  Data: {ix.dataLength} bytes (base64)
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {decoded.addressTableLookups.length > 0 && (
        <Section title="Address Table Lookups">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {decoded.addressTableLookups.map((lookup, i) => (
              <div
                key={i}
                style={{
                  padding: '0.6rem',
                  borderRadius: '6px',
                  background: 'rgba(239,246,255,0.4)',
                  border: '1px solid rgba(191,219,254,0.4)',
                }}
              >
                <MonoValue value={lookup.accountKey} size="small" />
                <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#64748b' }}>
                  Writable: {lookup.writableIndexes.length} | Readonly: {lookup.readonlyIndexes.length}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
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
      <div style={{ marginTop: '0.15rem', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
        {value}
      </div>
    </div>
  );
}

function MonoValue({ value, size = 'normal' }: { value: string; size?: 'normal' | 'small' }) {
  return (
    <span
      style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: size === 'small' ? '0.75rem' : '0.8rem',
        wordBreak: 'break-all',
        color: '#334155',
        background: 'rgba(241,245,249,0.6)',
        padding: '0.15rem 0.35rem',
        borderRadius: '4px',
        border: '1px solid rgba(226,232,240,0.6)',
      }}
    >
      {value}
    </span>
  );
}
