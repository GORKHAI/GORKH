import { useState, useCallback } from 'react';
import { classifySolanaInput } from '../shield/classifySolanaInput.js';
import { SolanaShieldInputKind } from '@gorkh/shared';
import { getNavItemById, type WorkstationModuleId, type WorkstationViewId } from './workstationNavigation.js';

export function WorkstationTopBar({
  activeModule,
  onShieldPrefill,
  onTransactionStudioPrefill,
  onOpenSettings,
  onOpenAssistant,
  assistantActive,
}: {
  activeModule: WorkstationViewId | null;
  onShieldPrefill?: (input: string) => void;
  onTransactionStudioPrefill?: (input: string) => void;
  onOpenSettings?: () => void;
  onOpenAssistant?: () => void;
  assistantActive?: boolean;
}) {
  const [command, setCommand] = useState('');

  const activeItem =
    activeModule && activeModule !== 'assistant'
      ? getNavItemById(activeModule as WorkstationModuleId)
      : undefined;

  const handleSubmit = useCallback(() => {
    const trimmed = command.trim();
    if (!trimmed) return;
    const classification = classifySolanaInput(trimmed);
    if (classification !== SolanaShieldInputKind.UNKNOWN) {
      onTransactionStudioPrefill?.(trimmed);
      if (!onTransactionStudioPrefill) onShieldPrefill?.(trimmed);
    }
    setCommand('');
  }, [command, onShieldPrefill, onTransactionStudioPrefill]);

  return (
    <header
      className="gorkh-workstation-topbar"
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
        <span className="gorkh-wordmark-badge">GORKH</span>
        <span className="gorkh-topbar-active-area">
          {activeModule === 'assistant' ? 'Assistant — Secondary Workspace' : activeItem?.label ?? 'Solana Workstation'}
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
          className="gorkh-workstation-command-input"
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
          Global Safety: Read-only shell
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
          Module Data: local / backend / RPC
        </span>
        <span className="gorkh-workstation-mini-badge">No signing</span>
        <span className="gorkh-workstation-mini-badge">Execution disabled</span>
        <button className="gorkh-workstation-icon-button" onClick={onOpenSettings} aria-label="Settings" title="Settings">
          S
        </button>
        <button
          className={assistantActive ? 'gorkh-workstation-icon-button active' : 'gorkh-workstation-icon-button'}
          onClick={onOpenAssistant}
          aria-label="Assistant"
          title="Assistant"
        >
          AI
        </button>
      </div>
    </header>
  );
}
