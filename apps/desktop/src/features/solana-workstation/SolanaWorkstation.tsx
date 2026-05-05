import { useState, useCallback } from 'react';
import type { WorkstationModuleId } from './layout/workstationNavigation.js';
import { WorkstationShell } from './layout/WorkstationShell.js';
import { WorkstationDashboard } from './layout/WorkstationDashboard.js';
import { WorkstationModuleHeader } from './layout/WorkstationModuleHeader.js';
import { ShieldWorkbench } from './shield/index.js';
import { BuilderWorkbench } from './builder/index.js';
import { AgentWorkbench } from './agent/index.js';
import { ContextBridgePanel } from './context-bridge/index.js';
import { MarketsWorkbench } from './markets/index.js';
import { WalletWorkbench } from './wallet/index.js';
import { saveBuilderContextMarkdown } from './context-bridge/contextBridgeStorage.js';

export function SolanaWorkstation() {
  const [activeModule, setActiveModule] = useState<WorkstationModuleId | null>(null);
  const [shieldPrefilledInput, setShieldPrefilledInput] = useState<string | undefined>(undefined);
  const [savedBuilderContext, setSavedBuilderContext] = useState<string | null>(null);

  const handleSelectModule = useCallback((id: WorkstationModuleId) => {
    setActiveModule((current) => (current === id ? null : id));
  }, []);

  const handlePrefillShield = useCallback(
    (input: string) => {
      setShieldPrefilledInput(input);
      setActiveModule('shield');
    },
    []
  );

  const handleSaveBuilderContext = useCallback((markdown: string) => {
    setSavedBuilderContext(markdown);
    saveBuilderContextMarkdown(markdown);
  }, []);

  return (
    <WorkstationShell
      activeModule={activeModule}
      onSelectModule={handleSelectModule}
      onShieldPrefill={handlePrefillShield}
    >
      {activeModule === null && (
        <WorkstationDashboard
          onSelectModule={handleSelectModule}
        />
      )}

      {activeModule === 'shield' && (
        <div>
          <WorkstationModuleHeader moduleId="shield" />
          <ShieldWorkbench prefilledInput={shieldPrefilledInput} />
        </div>
      )}

      {activeModule === 'builder' && (
        <div>
          <WorkstationModuleHeader moduleId="builder" />
          <BuilderWorkbench onSaveContext={handleSaveBuilderContext} />
        </div>
      )}

      {activeModule === 'agent' && (
        <div>
          <WorkstationModuleHeader moduleId="agent" />
          <AgentWorkbench
            onPrefillShield={handlePrefillShield}
            savedBuilderContext={savedBuilderContext}
          />
        </div>
      )}

      {activeModule === 'context' && (
        <div>
          <WorkstationModuleHeader moduleId="context" />
          <ContextBridgePanel
            agents={[]}
            drafts={[]}
            attestationPreviews={[]}
            auditEvents={[]}
            savedBuilderContext={savedBuilderContext}
            shieldAnalysis={null}
          />
        </div>
      )}

      {activeModule === 'markets' && (
        <div>
          <WorkstationModuleHeader moduleId="markets" />
          <MarketsWorkbench />
        </div>
      )}

      {activeModule === 'wallet' && (
        <div>
          <WorkstationModuleHeader moduleId="wallet" />
          <WalletWorkbench />
        </div>
      )}
    </WorkstationShell>
  );
}
