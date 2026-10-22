import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'surface' | 'yellow' | 'dashed';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  hoverLift?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  shadow = 'md',
  hoverLift = false,
  className = '',
  style,
  ...props
}) => {
  const paddingStyles = {
    none: '0px',
    sm: 'var(--space-3)',
    md: 'var(--space-5)',
    lg: 'var(--space-8)',
  };

  const shadowStyles = {
    none: 'none',
    sm: 'var(--shadow-small)',
    md: 'var(--shadow-standard)',
    lg: 'var(--shadow-large)',
  };

  const variantStyles = {
    default: {
      backgroundColor: 'var(--color-surface-card)',
      border: 'var(--border-thick)',
    },
    surface: {
      backgroundColor: 'var(--color-surface)',
      border: 'var(--border-thick)',
    },
    yellow: {
      backgroundColor: 'var(--color-primary)',
      border: 'var(--border-thick)',
    },
    dashed: {
      backgroundColor: 'var(--color-surface)',
      border: '2px dashed var(--color-ink)',
    },
  };

  return (
    <div
      className={`nb-card nb-card-${variant} ${hoverLift ? 'nb-card-hover' : ''} ${className}`}
      style={{
        borderRadius: 'var(--radius-lg)',
        padding: paddingStyles[padding],
        boxShadow: shadowStyles[shadow],
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        position: 'relative',
        ...variantStyles[variant],
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
