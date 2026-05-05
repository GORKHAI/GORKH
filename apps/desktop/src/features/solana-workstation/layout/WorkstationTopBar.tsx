import { useState, useCallback } from 'react';
import { classifySolanaInput } from '../shield/classifySolanaInput.js';
import { SolanaShieldInputKind } from '@gorkh/shared';
import { getNavItemById, type WorkstationModuleId } from './workstationNavigation.js';

export function WorkstationTopBar({
  activeModule,
  onShieldPrefill,
}: {
  activeModule: WorkstationModuleId | null;
  onShieldPrefill?: (input: string) => void;
}) {
  const [command, setCommand] = useState('');

  const activeItem = activeModule ? getNavItemById(activeModule) : undefined;

  const handleSubmit = useCallback(() => {
    const trimmed = command.trim();
    if (!trimmed) return;
    const classification = classifySolanaInput(trimmed);
    if (classification !== SolanaShieldInputKind.UNKNOWN) {
      onShieldPrefill?.(trimmed);
    }
    setCommand('');
  }, [command, onShieldPrefill]);

  return (
    <header
      style={{
        height: '56px',
        minHeight: '56px',
        background: '#111318',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1rem',
        gap: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '140px' }}>
        <span
          style={{
            fontSize: '0.95rem',
            fontWeight: 700,
            color: '#f8fafc',
          }}
        >
          {activeItem?.label ?? 'Dashboard'}
        </span>
        {activeItem && (
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '0.1rem 0.4rem',
              borderRadius: '4px',
              background: '#1e293b',
              color: '#64748b',
            }}
          >
            {activeItem.status.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
          placeholder="Search modules or paste address / signature / transaction..."
          aria-label="Command bar"
          style={{
            flex: 1,
            maxWidth: '480px',
            background: '#0b0d12',
            border: '1px solid #1e293b',
            borderRadius: '6px',
            padding: '0.4rem 0.75rem',
            color: '#e2e8f0',
            fontSize: '0.85rem',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '120px', justifyContent: 'flex-end' }}>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 600,
            color: '#64748b',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            background: '#0b0d12',
            border: '1px solid #1e293b',
          }}
        >
          Devnet
        </span>
        <span
          style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '0.15rem 0.4rem',
            borderRadius: '4px',
            background: '#1e293b',
            color: '#94a3b8',
          }}
        >
          Read-Only
        </span>
      </div>
    </header>
  );
}
