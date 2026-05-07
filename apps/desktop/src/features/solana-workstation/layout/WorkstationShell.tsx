import { type ReactNode } from 'react';
import { type WorkstationViewId } from './workstationNavigation.js';
import { WorkstationSidebar } from './WorkstationSidebar.js';
import { WorkstationTopBar } from './WorkstationTopBar.js';
import { WorkstationStatusBar } from './WorkstationStatusBar.js';
import { WorkstationInspector } from './WorkstationInspector.js';

export function WorkstationShell({
  activeModule,
  onSelectModule,
  onShieldPrefill,
  onOpenSettings,
  onOpenAssistant,
  assistantActive,
  children,
}: {
  activeModule: WorkstationViewId | null;
  onSelectModule: (id: WorkstationViewId | null) => void;
  onShieldPrefill?: (input: string) => void;
  onOpenSettings?: () => void;
  onOpenAssistant?: () => void;
  assistantActive?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="gorkh-workstation-shell">
      <div className="gorkh-workstation-main-row">
        <WorkstationSidebar activeModule={activeModule} onSelect={onSelectModule} />

        <div className="gorkh-workstation-content-area">
          <WorkstationTopBar
            activeModule={activeModule}
            onShieldPrefill={onShieldPrefill}
            onOpenSettings={onOpenSettings}
            onOpenAssistant={onOpenAssistant}
            assistantActive={assistantActive}
          />

          <main className="gorkh-workstation-workspace">
            {children}
          </main>

          <WorkstationStatusBar activeModule={activeModule} />
        </div>

        <WorkstationInspector activeModule={activeModule} />
      </div>
    </div>
  );
}
