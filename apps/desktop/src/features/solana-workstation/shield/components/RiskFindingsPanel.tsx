import type { SolanaShieldRiskFinding } from '@gorkh/shared';

interface RiskFindingsPanelProps {
  findings: SolanaShieldRiskFinding[];
}

const levelColors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  low: {
    bg: 'rgba(241,245,249,0.6)',
    border: 'rgba(226,232,240,0.6)',
    text: '#64748b',
    badge: '#94a3b8',
  },
  medium: {
    bg: 'rgba(254,252,232,0.6)',
    border: 'rgba(253,224,71,0.3)',
    text: '#854d0e',
    badge: '#f59e0b',
  },
  high: {
    bg: 'rgba(254,242,242,0.6)',
    border: 'rgba(252,165,165,0.4)',
    text: '#991b1b',
    badge: '#ef4444',
  },
  critical: {
    bg: 'rgba(127,29,29,0.06)',
    border: 'rgba(239,68,68,0.35)',
    text: '#7f1d1d',
    badge: '#dc2626',
  },
};

export function RiskFindingsPanel({ findings }: RiskFindingsPanelProps) {
  if (findings.length === 0) {
    return (
      <div
        style={{
          padding: '1rem',
          borderRadius: '10px',
          border: '1px solid rgba(52,211,153,0.25)',
          background: 'rgba(220,252,231,0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#10b981',
            }}
          />
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#166534' }}>
            No risk findings
          </span>
        </div>
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
          Static analysis did not detect any flagged patterns. Always verify transactions
          independently before signing.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {findings.map((finding) => {
        const colors = levelColors[finding.level] ?? levelColors.low;
        return (
          <div
            key={finding.id}
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: colors.bg,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '4px',
                  background: finding.level === 'high' || finding.level === 'critical' ? colors.badge : 'white',
                  color: finding.level === 'high' || finding.level === 'critical' ? 'white' : colors.badge,
                  border: `1px solid ${colors.badge}`,
                }}
              >
                {finding.level}
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: colors.text }}>
                {finding.title}
              </span>
            </div>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', lineHeight: 1.5, color: '#475569' }}>
              {finding.description}
            </p>
            {finding.recommendation && (
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', lineHeight: 1.45, color: '#64748b' }}>
                <strong>Recommendation:</strong> {finding.recommendation}
              </p>
            )}
            {finding.affectedInstructionIndexes && finding.affectedInstructionIndexes.length > 0 && (
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>
                Affected instructions: {finding.affectedInstructionIndexes.join(', ')}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
