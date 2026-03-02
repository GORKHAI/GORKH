import { useState } from 'react';
import type { ApprovalRequest } from '@ai-operator/shared';

interface ApprovalModalProps {
  approval: ApprovalRequest;
  onDecision: (decision: 'approved' | 'denied', comment?: string) => void;
}

export function ApprovalModal({ approval, onDecision }: ApprovalModalProps) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDecision = (decision: 'approved' | 'denied') => {
    setIsSubmitting(true);
    onDecision(decision, comment.trim() || undefined);
  };

  const riskColors: Record<string, { bg: string; border: string; text: string }> = {
    low: { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
    medium: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e' },
    high: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
  };

  const riskConfig = riskColors[approval.risk] || riskColors.medium;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          maxWidth: '480px',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '1rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              backgroundColor: riskConfig.bg,
              color: riskConfig.text,
              border: `1px solid ${riskConfig.border}`,
              marginBottom: '0.75rem',
            }}
          >
            {approval.risk} Risk
          </div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
            {approval.title}
          </h2>
        </div>

        {/* Description */}
        <p
          style={{
            margin: '0 0 1rem',
            color: '#4b5563',
            fontSize: '0.9375rem',
            lineHeight: 1.5,
          }}
        >
          {approval.description}
        </p>

        {/* Expiration warning */}
        <div
          style={{
            padding: '0.75rem',
            backgroundColor: '#fef3c7',
            borderRadius: '6px',
            fontSize: '0.875rem',
            color: '#92400e',
            marginBottom: '1rem',
          }}
        >
          <strong>⏱ Time Limit:</strong> This request expires at{' '}
          {new Date(approval.expiresAt).toLocaleTimeString()}
        </div>

        {/* Comment input */}
        <div style={{ marginBottom: '1rem' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.25rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#374151',
            }}
          >
            Comment (optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a note about your decision..."
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
              resize: 'vertical',
              minHeight: '80px',
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => handleDecision('denied')}
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              backgroundColor: 'white',
              color: '#dc2626',
              border: '1px solid #dc2626',
              borderRadius: '6px',
              fontSize: '0.9375rem',
              fontWeight: 500,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            Deny
          </button>
          <button
            onClick={() => handleDecision('approved')}
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.9375rem',
              fontWeight: 500,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
