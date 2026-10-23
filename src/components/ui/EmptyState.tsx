import React from 'react';
import { UploadIcon } from '../icons';
import DropletMascot from '../brand/DropletMascot';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  showMascot?: boolean;
  mascotVariant?: 'head' | 'full';
  mascotSize?: number;
  isDragOver?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Drop files here or click to browse',
  description = 'Supports images, documents, PDFs, code, and archives up to 50 MiB',
  actionText = 'Select Files',
  onAction,
  showMascot = true,
  mascotVariant = 'head',
  mascotSize = 76,
  isDragOver = false,
}) => {
  return (
    <div
      className={`nb-empty-state ${isDragOver ? 'drag-over' : ''}`}
      style={{
        border: '3px dashed var(--color-ink)',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: isDragOver ? '#FFF8B8' : 'var(--color-surface)',
        padding: '36px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: '12px',
        cursor: onAction ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
      }}
      onClick={onAction}
    >
      {showMascot ? (
        <DropletMascot size={mascotSize} variant={mascotVariant} mood={isDragOver ? 'excited' : 'happy'} />
      ) : (
        <div
          style={{
            width: '56px',
            height: '56px',
            backgroundColor: 'var(--color-primary)',
            border: 'var(--border-thick)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-small)',
          }}
        >
          <UploadIcon size={28} />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--color-ink)',
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            color: 'var(--color-muted)',
            maxWidth: '360px',
          }}
        >
          {description}
        </p>
      </div>

      {actionText && (
        <button
          type="button"
          style={{
            marginTop: '8px',
            padding: '8px 18px',
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-ink)',
            border: 'var(--border-standard)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-small)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
