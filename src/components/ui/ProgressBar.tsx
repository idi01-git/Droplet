import React from 'react';

export interface ProgressBarProps {
  progress: number; // 0 - 100
  label?: string;
  showPercentage?: boolean;
  color?: string;
  onCancel?: () => void;
  cancelTitle?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label = 'Uploading...',
  showPercentage = true,
  color = 'var(--color-primary)',
  onCancel,
  cancelTitle,
}) => {
  const clampedProgress = Math.min(100, Math.max(0, Math.round(progress)));

  return (
    <div
      className="nb-progress-wrapper"
      style={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '13px',
          color: 'var(--color-ink)',
          minWidth: 0,
          gap: '8px',
        }}
      >
        <span
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
            flex: 1,
          }}
          title={label}
        >
          {label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {showPercentage && (
            <span style={{ fontWeight: 800 }}>{clampedProgress}%</span>
          )}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              title={cancelTitle || 'Cancel upload'}
              aria-label={cancelTitle || 'Cancel upload'}
              className="nb-progress-cancel-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '22px',
                height: '22px',
                padding: 0,
                backgroundColor: 'var(--color-surface, #FFFFFF)',
                color: 'var(--color-ink, #000000)',
                border: '1.5px solid var(--color-ink, #000000)',
                borderRadius: 'var(--radius-sm, 4px)',
                boxShadow: '1px 1px 0px var(--color-ink, #000000)',
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-error, #FF3366)';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-surface, #FFFFFF)';
                e.currentTarget.style.color = 'var(--color-ink, #000000)';
              }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        aria-valuetext={`${clampedProgress}% - ${label}`}
        style={{
          width: '100%',
          height: '18px',
          backgroundColor: 'var(--color-surface)',
          border: 'var(--border-standard)',
          borderRadius: 'var(--radius-full)',
          boxShadow: 'var(--shadow-small)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${clampedProgress}%`,
            height: '100%',
            backgroundColor: color,
            borderRight: clampedProgress > 0 && clampedProgress < 100 ? '2px solid var(--color-ink)' : 'none',
            transition: 'width 0.2s ease-in-out',
          }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
