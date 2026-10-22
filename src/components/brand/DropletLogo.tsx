import React from 'react';
import DropletMascot from './DropletMascot';

export interface DropletLogoProps {
  layout?: 'horizontal' | 'vertical' | 'icon-only';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
}

export const DropletLogo: React.FC<DropletLogoProps> = ({
  layout = 'horizontal',
  size = 'md',
  showTagline = false,
  className = '',
}) => {
  const mascotSizes = {
    sm: 36,
    md: 48,
    lg: 72,
    xl: 100,
  };

  const textSizes = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-5xl',
    xl: 'text-6xl',
  };

  if (layout === 'icon-only') {
    return (
      <div
        className={`droplet-app-icon ${className}`}
        style={{
          width: mascotSizes[size],
          height: mascotSizes[size],
          backgroundColor: 'var(--color-primary)',
          borderRadius: 'var(--radius-md)',
          border: 'var(--border-thick)',
          boxShadow: 'var(--shadow-small)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <DropletMascot size={mascotSizes[size] * 0.9} withSparkles={false} />
      </div>
    );
  }

  return (
    <div
      className={`droplet-logo-container ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: layout === 'vertical' ? 'column' : 'row',
        alignItems: 'center',
        gap: layout === 'vertical' ? '8px' : '14px',
        userSelect: 'none',
      }}
    >
      <DropletMascot
        size={mascotSizes[size]}
        mood={size === 'xl' ? 'waving' : 'happy'}
        withSparkles={size === 'lg' || size === 'xl'}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: layout === 'vertical' ? 'center' : 'flex-start',
        }}
      >
        <span
          className={`droplet-wordmark ${textSizes[size]}`}
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--color-ink)',
            lineHeight: 1,
            position: 'relative',
            display: 'inline-block',
            textShadow: '2px 2px 0px rgba(0,0,0,0.1)',
          }}
        >
          Droplet
          {/* Small hand-drawn dot on top of 'e' or at end */}
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              backgroundColor: 'var(--color-primary)',
              border: '2px solid var(--color-ink)',
              borderRadius: '50%',
              marginLeft: '4px',
              verticalAlign: 'super',
            }}
          />
        </span>

        {showTagline && (
          <span
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--color-ink)',
              marginTop: '4px',
              letterSpacing: '-0.01em',
            }}
          >
            Create a room. Drop anything. Let it disappear.
          </span>
        )}
      </div>
    </div>
  );
};

export default DropletLogo;
