import React from 'react';

export interface ProgressBarProps {
  progress: number; // 0 - 100
  label?: string;
  showPercentage?: boolean;
  color?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label = 'Uploading...',
  showPercentage = true,
  color = 'var(--color-primary)',
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
        {showPercentage && (
          <span style={{ flexShrink: 0, fontWeight: 800 }}>{clampedProgress}%</span>
        )}
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
