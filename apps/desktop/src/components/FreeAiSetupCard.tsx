import { useEffect, useState } from 'react';
import {
  formatLocalAiByteCount,
  getLocalAiGpuExecutionLabel,
  getLocalAiInstallStageLabel,
  getLocalAiInstallProgressSummary,
  getLocalAiRuntimeSourceLabel,
  getLocalAiTierDetails,
  getLocalAiTierRuntimePlan,
  getLocalAiTroubleshootingHint,
  type LocalAiHardwareProfile,
  type LocalAiInstallProgress,
  type LocalAiInstallStage,
  type LocalAiRuntimeStatus,
  type LocalAiTier,
  type LocalAiTierRecommendation,
} from '../lib/localAi.js';

interface FreeAiSetupCardProps {
  status: LocalAiRuntimeStatus | null;
  installProgress: LocalAiInstallProgress | null;
  recommendation: LocalAiTierRecommendation | null;
  hardwareProfile: LocalAiHardwareProfile | null;
  busy?: boolean;
  actionBusy?: boolean;
  error?: string | null;
  showVisionBoost?: boolean;
  onStart: (tier: LocalAiTier) => void;
  onEnableVisionBoost: () => void;
  onRefresh: () => void;
  onResetToManaged?: () => void;
}

const STAGE_ORDER: Array<{ key: LocalAiInstallStage; label: string }> = [
  { key: 'not_started', label: 'Check this device' },
  { key: 'installing', label: 'Install local engine' },
  { key: 'installed', label: 'Download AI model' },
  { key: 'starting', label: 'Start local engine' },
  { key: 'ready', label: 'Ready to use' },
  { key: 'error', label: 'Repair available' },
];

function summarizeHardware(profile: LocalAiHardwareProfile | null): string | null {
  if (!profile) {
    return null;
  }

  const parts = [`${profile.logicalCpuCores} CPU cores`];
  if (profile.ramBytes) {
    parts.push(`${Math.max(1, Math.round(profile.ramBytes / (1024 * 1024 * 1024)))} GB RAM`);
  }
  if (profile.gpuSummary) {
    parts.push(profile.gpuSummary);
  } else {
    parts.push(getLocalAiGpuExecutionLabel(profile.gpuClass));
  }
  return parts.join(' • ');
}

function formatUpdatedAt(updatedAtMs: number | null | undefined): string | null {
  if (!updatedAtMs) {
    return null;
  }

  try {
    return new Date(updatedAtMs).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

export function FreeAiSetupCard({
  status,
  installProgress,
  recommendation,
  hardwareProfile,
  busy = false,
  actionBusy = false,
  error = null,
  showVisionBoost = false,
  onStart,
  onEnableVisionBoost,
  onRefresh,
  onResetToManaged,
}: FreeAiSetupCardProps) {
  const recommendedTier = recommendation?.tier ?? 'light';
  const [selectedTier, setSelectedTier] = useState<LocalAiTier>(recommendedTier);

  useEffect(() => {
    setSelectedTier(recommendedTier);
  }, [recommendedTier]);

  const activeStage = installProgress?.stage ?? status?.installStage ?? 'not_started';
  const stageLabel = getLocalAiInstallStageLabel(activeStage);
  const hardwareSummary = summarizeHardware(hardwareProfile);
  const selectedDetails = getLocalAiTierDetails(selectedTier);
  const visionPlan = getLocalAiTierRuntimePlan(status?.selectedTier ?? recommendation?.tier ?? 'standard');
  const visionModel = visionPlan.optionalVisionModel;
  const progressSummary = getLocalAiInstallProgressSummary(installProgress);
  const activeError = error ?? status?.lastError ?? null;
  const supportHint = getLocalAiTroubleshootingHint(status, installProgress, hardwareProfile, error);
  const availableDiskLabel = formatLocalAiByteCount(hardwareProfile?.availableDiskBytes);
  const lastUpdatedLabel = formatUpdatedAt(installProgress?.updatedAtMs);
  const selectedModel = installProgress?.selectedModel ?? status?.selectedModel ?? null;
  const runtimeSourceLabel = getLocalAiRuntimeSourceLabel(status?.runtimeSource ?? null);
  const statusMessage = installProgress?.message && installProgress.message !== activeError
    ? installProgress.message
    : null;
  const visionBoostInstalled = Boolean(
    status?.selectedModel === visionModel || status?.installedModels.includes(visionModel)
  );
  const visionBoostAvailable = showVisionBoost
    || Boolean(recommendation?.visionAvailable || visionBoostInstalled || status?.selectedTier === 'vision');

  return (
    <section
      style={{
        marginTop: '1rem',
        padding: '1rem',
        background: '#f8fafc',
        border: '1px solid #dbe4f0',
        borderRadius: '12px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>Set Up Free AI</h3>
          <p style={{ margin: '0.35rem 0 0', color: '#475569', fontSize: '0.875rem', maxWidth: '64ch', lineHeight: 1.5 }}>
            GORKH can install the local engine, download the default AI model, and verify that everything is ready on this desktop without using the terminal.
          </p>
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.45rem 0.8rem',
            borderRadius: '9999px',
            background: activeStage === 'ready' ? '#dcfce7' : '#eff6ff',
            color: activeStage === 'ready' ? '#166534' : '#1d4ed8',
            fontWeight: 600,
            fontSize: '0.75rem',
          }}
        >
          {activeStage === 'ready' ? 'Ready to use' : activeStage === 'error' ? 'Repair available' : stageLabel}
        </div>
      </div>

      {hardwareSummary && (
        <div
          style={{
            marginTop: '0.85rem',
            padding: '0.75rem',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '0.8125rem',
            color: '#475569',
          }}
        >
          Best guess for this machine: {hardwareSummary}
        </div>
      )}

      {(progressSummary || supportHint) && (
        <div
          style={{
            marginTop: '0.85rem',
            padding: '0.85rem',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '0.8125rem',
            color: '#334155',
          }}
        >
          {progressSummary && (
            <div>
              <strong>Install progress:</strong> {progressSummary}
            </div>
          )}
          {supportHint && (
            <div style={{ marginTop: progressSummary ? '0.45rem' : 0, color: '#475569', lineHeight: 1.5 }}>
              {supportHint}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '1rem', display: 'grid', gap: '0.65rem' }}>
        {STAGE_ORDER.map((stage) => {
          const active = activeStage === stage.key || (activeStage === 'planned' && stage.key === 'installing');
          return (
            <div
              key={stage.key}
              style={{
                padding: '0.65rem 0.8rem',
                borderRadius: '8px',
                border: `1px solid ${active ? '#93c5fd' : '#e5e7eb'}`,
                background: active ? '#eff6ff' : 'white',
                fontSize: '0.8125rem',
                color: active ? '#1d4ed8' : '#475569',
                fontWeight: active ? 600 : 500,
              }}
            >
              {stage.label}
            </div>
          );
        })}
      </div>

      {statusMessage && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: '#fff7ed',
            border: '1px solid #fdba74',
            borderRadius: '8px',
            color: '#9a3412',
            fontSize: '0.875rem',
          }}
        >
          {statusMessage}
        </div>
      )}

      <div
        style={{
          marginTop: '1rem',
          padding: '0.85rem',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          fontSize: '0.875rem',
          color: '#334155',
        }}
      >
        <strong>Recommended for this device:</strong> {selectedDetails.title}. {selectedDetails.bestFor}
        {' '}Estimated download {selectedDetails.downloadSizeLabel}. Keep roughly {selectedDetails.diskRequirementLabel} free.
      </div>

      {status?.externalServiceDetected && activeStage !== 'ready' && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: status?.targetModelAvailable ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${status?.targetModelAvailable ? '#86efac' : '#fecaca'}`,
            borderRadius: '8px',
            color: status?.targetModelAvailable ? '#166534' : '#991b1b',
            fontSize: '0.875rem',
          }}
        >
          {status?.targetModelAvailable
            ? 'GORKH found an existing local AI service on this machine. You can keep using it, or let GORKH manage the local engine instead.'
            : 'GORKH found an existing local AI service, but it does not have the required model or is incompatible. Stop the external service, then click Set Up Free AI to let GORKH manage the runtime.'}
        </div>
      )}

      {status?.externalServiceDetected && (activeStage !== 'ready' || Boolean(activeError)) && onResetToManaged && (
        <div style={{ marginTop: '1rem' }}>
          <button
            onClick={onResetToManaged}
            disabled={busy || actionBusy}
            style={{
              padding: '0.6rem 0.95rem',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              background: busy || actionBusy ? '#f3f4f6' : 'white',
              color: '#111827',
              cursor: busy || actionBusy ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            Switch to GORKH-managed runtime
          </button>
        </div>
      )}

      {activeError && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#991b1b',
            fontSize: '0.875rem',
          }}
        >
          {activeError}
        </div>
      )}

      <div
        style={{
          marginTop: '1rem',
          padding: '0.85rem',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
        }}
      >
        <strong style={{ display: 'block', marginBottom: '0.65rem', color: '#0f172a', fontSize: '0.875rem' }}>
          Support details
        </strong>
        <div style={{ display: 'grid', gap: '0.45rem', fontSize: '0.8125rem', color: '#475569' }}>
          <div><strong>Available disk:</strong> {availableDiskLabel ?? 'Unknown'}</div>
          <div><strong>Runtime source:</strong> {runtimeSourceLabel}</div>
          <div><strong>Runtime version:</strong> {status?.runtimeVersion ?? 'Not installed yet'}</div>
          <div><strong>Compatibility mode:</strong> {status?.compatibilityMode ? 'On (CPU-safe)' : 'Off'}</div>
          <div><strong>Selected model:</strong> {selectedModel ?? 'Not selected yet'}</div>
          <div><strong>Managed runtime folder:</strong> {status?.managedRuntimeDir ?? hardwareProfile?.managedRuntimeDir ?? 'Unavailable'}</div>
          {lastUpdatedLabel && <div><strong>Last status update:</strong> {lastUpdatedLabel}</div>}
        </div>
      </div>

      {visionBoostAvailable && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.85rem',
            background: visionBoostInstalled ? '#ecfdf5' : '#eff6ff',
            border: `1px solid ${visionBoostInstalled ? '#86efac' : '#bfdbfe'}`,
            borderRadius: '8px',
            fontSize: '0.875rem',
            color: visionBoostInstalled ? '#166534' : '#1d4ed8',
          }}
        >
          <strong>Vision Boost</strong>
          <p style={{ margin: '0.45rem 0 0', lineHeight: 1.5 }}>
            {visionBoostInstalled
              ? `Ready with ${visionModel}. The assistant can stay lightweight for normal work and only use the heavier screenshot model when a task truly needs it.`
              : `Add screenshot understanding later for tasks like Photoshop, Blender, and UI automation. The default Free AI setup stays lighter until you enable ${visionModel}.`}
          </p>
          {!visionBoostInstalled && (
            <button
              onClick={onEnableVisionBoost}
              disabled={busy || actionBusy || activeStage === 'not_started'}
              style={{
                marginTop: '0.75rem',
                padding: '0.6rem 0.95rem',
                borderRadius: '8px',
                border: 'none',
                background: busy || actionBusy || activeStage === 'not_started' ? '#cbd5e1' : '#1d4ed8',
                color: 'white',
                cursor: busy || actionBusy || activeStage === 'not_started' ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              Enable Vision Boost
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => onStart(selectedTier)}
          disabled={busy || actionBusy}
          style={{
            padding: '0.6rem 0.95rem',
            borderRadius: '8px',
            border: 'none',
            background: busy || actionBusy ? '#cbd5e1' : '#0f172a',
            color: 'white',
            cursor: busy || actionBusy ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          {actionBusy ? 'Installing Free AI...' : activeStage === 'error' ? 'Repair Free AI' : 'Set Up Free AI'}
        </button>
        <button
          onClick={onRefresh}
          disabled={busy}
          style={{
            padding: '0.6rem 0.95rem',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            background: 'white',
            color: '#111827',
            cursor: busy ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          Refresh status
        </button>
      </div>
    </section>
  );
}
