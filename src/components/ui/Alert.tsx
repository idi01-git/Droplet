import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface AlertProps {
  variant?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'success',
  title,
  message,
  onDismiss,
  className = '',
}) => {
  const variantConfig = {
    success: {
      bg: 'var(--color-success)',
      icon: <CheckCircle2 size={20} strokeWidth={3} color="#000000" />,
      text: '#000000',
    },
    error: {
      bg: 'var(--color-error)',
      icon: <AlertCircle size={20} strokeWidth={3} color="#000000" />,
      text: '#000000',
    },
    warning: {
      bg: '#F59E0B',
      icon: <AlertTriangle size={20} strokeWidth={3} color="#000000" />,
      text: '#000000',
    },
    info: {
      bg: 'var(--color-info)',
      icon: <Info size={20} strokeWidth={3} color="#FFFFFF" />,
      text: '#FFFFFF',
    },
  };

  const config = variantConfig[variant];

  return (
    <div
      role="alert"
      className={`nb-alert nb-alert-${variant} ${className}`}
      style={{
        backgroundColor: config.bg,
        color: config.text,
        border: 'var(--border-thick)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-standard)',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
        <span style={{ display: 'inline-flex', flexShrink: 0 }}>{config.icon}</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {title && <span style={{ fontWeight: 800, fontSize: '15px' }}>{title}</span>}
          <span style={{ fontSize: '14px', lineHeight: 1.3 }}>{message}</span>
        </div>
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss alert"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: config.text,
            borderRadius: 'var(--radius-sm)',
            flexShrink: 0,
          }}
        >
          <X size={18} strokeWidth={3} />
        </button>
      )}
    </div>
  );
};

export default Alert;
