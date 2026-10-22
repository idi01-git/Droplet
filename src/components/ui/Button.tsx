import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'black' | 'surface' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  style,
  ...props
}) => {
  const sizeStyles = {
    sm: {
      padding: '6px 14px',
      fontSize: '14px',
      borderRadius: 'var(--radius-sm)',
      gap: '6px',
    },
    md: {
      padding: '10px 20px',
      fontSize: '16px',
      borderRadius: 'var(--radius-md)',
      gap: '8px',
    },
    lg: {
      padding: '14px 28px',
      fontSize: '18px',
      borderRadius: 'var(--radius-md)',
      gap: '10px',
    },
  };

  const variantStyles = {
    primary: {
      backgroundColor: 'var(--color-primary)',
      color: 'var(--color-ink)',
      border: 'var(--border-standard)',
      boxShadow: 'var(--shadow-standard)',
    },
    black: {
      backgroundColor: 'var(--color-ink)',
      color: '#FFFFFF',
      border: '2px solid var(--color-ink)',
      boxShadow: 'var(--shadow-standard)',
    },
    surface: {
      backgroundColor: 'var(--color-surface-card)',
      color: 'var(--color-ink)',
      border: 'var(--border-standard)',
      boxShadow: 'var(--shadow-standard)',
    },
    danger: {
      backgroundColor: 'var(--color-error)',
      color: 'var(--color-ink)',
      border: 'var(--border-standard)',
      boxShadow: 'var(--shadow-standard)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--color-ink)',
      border: '2px solid transparent',
      boxShadow: 'none',
    },
  };

  return (
    <button
      className={`nb-button nb-button-${variant} nb-button-${size} ${fullWidth ? 'nb-button-full' : ''} ${className}`}
      disabled={disabled || isLoading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        letterSpacing: '0.01em',
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.12s cubic-bezier(0.2, 0, 0, 1)',
        width: fullWidth ? '100%' : 'auto',
        outline: 'none',
        position: 'relative',
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
      {...props}
    >
      {isLoading ? (
        <span className="nb-button-spinner" aria-hidden="true" style={{ display: 'inline-flex' }}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            style={{ animation: 'spin 1s linear infinite' }}
          >
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2 A 10 10 0 0 1 22 12" strokeLinecap="round" />
          </svg>
        </span>
      ) : (
        leftIcon && <span className="nb-button-icon-left">{leftIcon}</span>
      )}

      <span>{children}</span>

      {!isLoading && rightIcon && <span className="nb-button-icon-right">{rightIcon}</span>}
    </button>
  );
};

export default Button;
