import { TRANSACTION_STUDIO_COMING_SOON_FEATURES } from '@gorkh/shared';
import { TRANSACTION_STUDIO_LOCKED_ADVANCED_COPY } from '../transactionStudioCopy.js';

const FEATURE_LABELS: Record<string, string> = {
  visual_transaction_builder: 'Visual Transaction Builder',
  batch_transaction_builder: 'Batch Transaction Builder',
  priority_fee_advisor: 'Priority Fee Advisor',
  replay_against_current_state: 'Replay Against Current State',
  jito_bundle_composer_locked: 'Jito Bundle Composer',
  raw_transaction_broadcast_locked: 'Raw Transaction Broadcast',
};

export function TransactionStudioComingSoonPanel() {
  return (
    <div className="txs-subpanel" data-testid="transaction-studio-coming-soon-panel">
      <div className="txs-subpanel-title">Coming Soon / Locked</div>
      <div className="txs-roadmap-grid">
        {TRANSACTION_STUDIO_COMING_SOON_FEATURES.map((feature) => {
          const locked = feature.endsWith('_locked');
          return (
            <div
              className={locked ? 'txs-roadmap-item txs-roadmap-item-locked' : 'txs-roadmap-item'}
              aria-disabled={locked}
              key={feature}
            >
              <span>{FEATURE_LABELS[feature] ?? feature}</span>
              <em>{locked ? 'Locked Advanced' : 'Coming Soon'}</em>
              {locked && <p>{TRANSACTION_STUDIO_LOCKED_ADVANCED_COPY}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
