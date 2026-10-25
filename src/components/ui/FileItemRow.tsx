import React from 'react';
import { FileIcon, ImageIcon, ArchiveIcon, CodeIcon, DownloadIcon, TrashIcon } from '../icons';
import Badge from './Badge';

export interface FileItemRowProps {
  id: string;
  filename: string;
  sizeBytes: number;
  mimeType?: string;
  downloadUrl?: string;
  isDownloading?: boolean;
  onDownload: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
}

export const FileItemRow: React.FC<FileItemRowProps> = ({
  filename,
  sizeBytes,
  mimeType = '',
  isDownloading = false,
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
        padding: '10px 14px',
        gap: '10px',
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        overflow: 'hidden',
        transition: 'transform 0.12s ease, box-shadow 0.12s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        {/* File Icon Box */}
        <div
          className="nb-file-icon-box"
          style={{
            width: '40px',
            height: '40px',
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
        <div
          className="nb-file-details"
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '14.5px',
              color: 'var(--color-ink)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'block',
              width: '100%',
            }}
            title={filename}
          >
            {filename}
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '2px',
              flexWrap: 'wrap',
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-muted)',
                whiteSpace: 'nowrap',
              }}
            >
              {formatSize(sizeBytes)}
            </span>
            <Badge variant="file" size="sm">
              {ext}
            </Badge>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div
        className="nb-file-actions"
        style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
      >
        <button
          onClick={onDownload}
          disabled={isDownloading}
          className="nb-file-btn"
          title={isDownloading ? 'Preparing download...' : 'Download file'}
          aria-label={isDownloading ? `Downloading ${filename}` : `Download ${filename}`}
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-ink)',
            border: '2px solid var(--color-ink)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: '1.5px 1.5px 0px var(--color-ink)',
            padding: '7px 10px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            minWidth: '68px',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '12.5px',
            cursor: isDownloading ? 'wait' : 'pointer',
            opacity: isDownloading ? 0.8 : 1,
            pointerEvents: isDownloading ? 'none' : 'auto',
          }}
        >
          {isDownloading ? (
            <svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ animation: 'spin 0.8s linear infinite' }}
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <DownloadIcon size={15} />
          )}
          <span className="hide-on-mobile">{isDownloading ? 'GETTING...' : 'GET'}</span>
        </button>

        {canDelete && onDelete && (
          <button
            onClick={onDelete}
            className="nb-file-btn nb-file-btn-delete"
            title="Delete file"
            aria-label={`Delete ${filename}`}
            style={{
              backgroundColor: 'var(--color-error)',
              color: 'var(--color-ink)',
              border: '2px solid var(--color-ink)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: '1.5px 1.5px 0px var(--color-ink)',
              padding: '7px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <TrashIcon size={15} />
          </button>
        )}
      </div>
    </div>
  );
};

export default FileItemRow;
