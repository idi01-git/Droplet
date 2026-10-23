import React from 'react';

export interface DropletMascotProps {
  size?: number;
  mood?: 'happy' | 'waving' | 'excited' | 'sleepy' | 'working';
  variant?: 'head' | 'full';
  className?: string;
  withSparkles?: boolean;
  style?: React.CSSProperties;
}

/**
 * DropletMascot - Renders official Droplet brand mascot artwork assets
 * Uses optimized WebP with PNG fallbacks, completely replacing any generated SVG stand-ins.
 */
export const DropletMascot: React.FC<DropletMascotProps> = ({
  size = 72,
  mood = 'happy',
  variant,
  className = '',
  style,
}) => {
  // Use full running mascot ('Happy.webp') if explicitly requested or for large displays (>= 110px).
  // Otherwise, use the transparent smiling droplet face ('Sq_Logo_Transparent.webp').
  const isFullCharacter = variant === 'full' || (variant === undefined && size >= 110);

  const webpSrc = isFullCharacter ? '/assets/Happy.webp' : '/assets/Sq_Logo_Transparent.webp';
  const pngSrc = isFullCharacter ? '/assets/Happy.png' : '/assets/Sq_Logo_Transparent.png';
  const altText = isFullCharacter ? 'Happy Droplet Mascot' : 'Droplet Mascot';

  return (
    <div
      className={`droplet-mascot-wrapper ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        userSelect: 'none',
        pointerEvents: 'none',
        ...style,
      }}
      aria-hidden="true"
    >
      <picture>
        <source srcSet={webpSrc} type="image/webp" />
        <img
          src={pngSrc}
          alt={altText}
          width={size}
          height={size}
          decoding="async"
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            transform: mood === 'excited' ? 'scale(1.08)' : 'scale(1)',
            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </picture>
    </div>
  );
};

export default DropletMascot;
