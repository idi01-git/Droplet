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
    <div className="nb-progress-wrapper" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '13px',
          color: 'var(--color-ink)',
        }}
      >
        <span>{label}</span>
        {showPercentage && <span>{clampedProgress}%</span>}
      </div>

      <div
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
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
