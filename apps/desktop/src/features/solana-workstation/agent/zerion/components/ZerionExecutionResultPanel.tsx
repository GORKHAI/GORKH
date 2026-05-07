import type { ZerionExecutionResult } from '@gorkh/shared';

export function ZerionExecutionResultPanel({ result }: { result?: ZerionExecutionResult }) {
  if (!result) return null;
  return (
    <div className="gorkh-inspector-card" style={{ padding: '0.85rem', display: 'grid', gap: '0.45rem' }}>
      <strong style={{ color: result.ok ? '#166534' : '#991b1b' }}>
        {result.ok ? 'Zerion execution succeeded' : 'Zerion execution failed'}
      </strong>
      <span style={{ color: '#475569', fontSize: '0.78rem' }}>
        {result.amountSol} SOL to USDC on {result.chain}
      </span>
      {result.txHash && <code style={{ color: '#0f172a', fontSize: '0.75rem' }}>{result.txHash}</code>}
      {result.errorMessage && <span style={{ color: '#991b1b', fontSize: '0.78rem' }}>{result.errorMessage}</span>}
    </div>
  );
}

