import React from 'react';
import { FileIcon, ImageIcon, ArchiveIcon, CodeIcon, DownloadIcon, TrashIcon } from '../icons';
import Badge from './Badge';

export interface FileItemRowProps {
  id: string;
  filename: string;
  sizeBytes: number;
  mimeType?: string;
  downloadUrl?: string;
  onDownload: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
}

export const FileItemRow: React.FC<FileItemRowProps> = ({
  filename,
  sizeBytes,
  mimeType = '',
  onDownload,
  onDelete,
  canDelete = false,
}) => {
  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get file extension and category
  const ext = filename.split('.').pop()?.toUpperCase() || 'FILE';

  const getFileIcon = () => {
    const lower = filename.toLowerCase();
    if (mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/.test(lower)) {
      return <ImageIcon size={24} />;
    }
    if (lower.endsWith('.pdf') || mimeType.includes('pdf')) {
      return <FileIcon size={24} />;
    }
    if (/\.(zip|tar|gz|7z|rar)$/.test(lower)) {
      return <ArchiveIcon size={24} />;
    }
    if (/\.(js|ts|tsx|jsx|py|java|cpp|c|html|css|json|md)$/.test(lower)) {
      return <CodeIcon size={24} />;
    }
    return <FileIcon size={24} />;
  };

  return (
    <div
      className="nb-file-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--color-surface-card)',
        border: 'var(--border-thick)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-small)',
        padding: '12px 16px',
        gap: '12px',
        transition: 'transform 0.12s ease, box-shadow 0.12s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
        {/* File Icon Box */}
        <div
          style={{
            width: '42px',
            height: '42px',
            backgroundColor: 'var(--color-surface)',
            border: '2px solid var(--color-ink)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {getFileIcon()}
        </div>

        {/* File Details */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '15px',
              color: 'var(--color-ink)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={filename}
          >
            {filename}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)' }}>
              {formatSize(sizeBytes)}
            </span>
            <Badge variant="file" size="sm">
              {ext}
            </Badge>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={onDownload}
          title="Download file"
          aria-label={`Download ${filename}`}
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-ink)',
            border: '2px solid var(--color-ink)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: '2px 2px 0px var(--color-ink)',
            padding: '8px 12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          <DownloadIcon size={16} />
          <span>GET</span>
        </button>

        {canDelete && onDelete && (
          <button
            onClick={onDelete}
            title="Delete file"
            aria-label={`Delete ${filename}`}
            style={{
              backgroundColor: 'var(--color-error)',
              color: 'var(--color-ink)',
              border: '2px solid var(--color-ink)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: '2px 2px 0px var(--color-ink)',
              padding: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <TrashIcon size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default FileItemRow;
