import React from 'react';

export interface DropletLogoProps {
  layout?: 'horizontal' | 'vertical' | 'icon-only';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  height?: number;
  width?: number;
  showTagline?: boolean;
  className?: string;
  priority?: boolean;
  style?: React.CSSProperties;
}

export const DropletLogo: React.FC<DropletLogoProps> = ({
  layout = 'horizontal',
  size = 'md',
  height: customHeight,
  width: customWidth,
  showTagline = false,
  className = '',
  priority = false,
  style,
}) => {
  // Dimensions for 3:1 ratio horizontal brand artwork
  const horizontalDimensions = {
    sm: { height: 32, width: 96 },
    md: { height: 44, width: 132 },
    lg: { height: 60, width: 180 },
    xl: { height: 80, width: 240 },
  };

  // Dimensions for 1:1 icon
  const iconDimensions = {
    sm: 32,
    md: 44,
    lg: 64,
    xl: 96,
  };

  if (layout === 'icon-only') {
    const dim = iconDimensions[size];
    return (
      <div
        className={`droplet-app-icon ${className}`}
        style={{
          width: dim,
          height: dim,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <picture>
          <source srcSet="/assets/Sq_Logo_Transparent.webp" type="image/webp" />
          <img
            src="/assets/Sq_Logo_Transparent.png"
            alt="Droplet"
            width={dim}
            height={dim}
            decoding="async"
            fetchPriority={priority ? 'high' : 'auto'}
            style={{
              width: `${dim}px`,
              height: `${dim}px`,
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </picture>
      </div>
    );
  }

  const height = customHeight || horizontalDimensions[size].height;
  const width = customWidth || (customHeight ? Math.round(customHeight * 3) : horizontalDimensions[size].width);

  return (
    <div
      className={`droplet-logo-container ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: layout === 'vertical' ? 'column' : 'row',
        alignItems: 'center',
        gap: '8px',
        userSelect: 'none',
        ...style,
      }}
    >
      <picture>
        <source srcSet="/assets/Horizontal_Logo.webp" type="image/webp" />
        <img
          src="/assets/Horizontal Logo.png"
          alt="Droplet"
          width={width}
          height={height}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          style={{
            height: `${height}px`,
            width: `${width}px`,
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </picture>

      {showTagline && (
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--color-ink)',
            letterSpacing: '-0.01em',
          }}
        >
          Drop anything. Pick it up anywhere.
        </span>
      )}
    </div>
  );
};

export default DropletLogo;
