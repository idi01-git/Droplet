import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'file' | 'link' | 'text' | 'new' | 'warning' | 'danger' | 'accent' | 'dark' | 'outline';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'text',
  size = 'md',
  icon,
  className = '',
  style,
  ...props
}) => {
  const sizeStyles = {
    sm: {
      padding: '2px 8px',
      fontSize: '11px',
      gap: '4px',
    },
    md: {
      padding: '4px 12px',
      fontSize: '12px',
      gap: '6px',
    },
  };

  const variantStyles = {
    file: {
      backgroundColor: '#E5E5E5',
      color: '#000000',
    },
    link: {
      backgroundColor: 'var(--color-info)',
      color: '#FFFFFF',
    },
    text: {
      backgroundColor: 'var(--color-primary)',
      color: '#000000',
    },
    new: {
      backgroundColor: 'var(--color-success)',
      color: '#000000',
    },
    warning: {
      backgroundColor: '#F59E0B',
      color: '#000000',
    },
    danger: {
      backgroundColor: 'var(--color-error)',
      color: '#000000',
    },
    accent: {
      backgroundColor: 'var(--color-accent)',
      color: '#FFFFFF',
    },
    dark: {
      backgroundColor: 'var(--color-ink)',
      color: '#FFFFFF',
    },
    outline: {
      backgroundColor: 'transparent',
      color: 'var(--color-ink)',
    },
  };

  return (
    <span
      className={`nb-badge nb-badge-${variant} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        borderRadius: 'var(--radius-full)',
        border: '2px solid var(--color-ink)',
        boxShadow: '1.5px 1.5px 0px var(--color-ink)',
        lineHeight: 1.2,
        userSelect: 'none',
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
      {...props}
    >
      {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
