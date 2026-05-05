import { type ReactNode } from 'react';
import { type WorkstationModuleId } from './workstationNavigation.js';
import { WorkstationSidebar } from './WorkstationSidebar.js';
import { WorkstationTopBar } from './WorkstationTopBar.js';
import { WorkstationStatusBar } from './WorkstationStatusBar.js';
import { WorkstationInspector } from './WorkstationInspector.js';

export function WorkstationShell({
  activeModule,
  onSelectModule,
  onShieldPrefill,
  children,
}: {
  activeModule: WorkstationModuleId | null;
  onSelectModule: (id: WorkstationModuleId) => void;
  onShieldPrefill?: (input: string) => void;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: '#0f1117',
        color: '#e2e8f0',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <WorkstationSidebar activeModule={activeModule} onSelect={onSelectModule} />

        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
          <WorkstationTopBar activeModule={activeModule} onShieldPrefill={onShieldPrefill} />

          <main
            style={{
              flex: 1,
              overflow: 'auto',
              padding: '1rem',
              background: '#0f1117',
            }}
          >
            {children}
          </main>

          <WorkstationStatusBar activeModule={activeModule} />
        </div>

        <WorkstationInspector activeModule={activeModule} />
      </div>
    </div>
  );
}
