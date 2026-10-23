import React, { useState } from 'react';
import { CopyIcon, CheckCircleIcon, ExternalLinkIcon } from '../icons';
import Badge from './Badge';

export interface MessageBubbleProps {
  id?: string;
  text: string;
  type?: 'text' | 'link' | 'code';
  timestamp?: string | number;
  variant?: 'yellow' | 'surface' | 'white';
  isLink?: boolean;
  onDelete?: () => void;
  canDelete?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  text,
  type = 'text',
  timestamp,
  variant = 'yellow',
  isLink = false,
  onDelete,
  canDelete = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Consider text large if it exceeds 150 chars or has more than 3 lines
  const isLargeText = !isLink && (text.length > 150 || text.split('\n').length > 3);

  const formattedTime = timestamp
    ? typeof timestamp === 'number'
      ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : timestamp
    : null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const bgColors = {
    yellow: 'var(--color-primary)',
    surface: 'var(--color-surface)',
    white: 'var(--color-surface-card)',
  };

  return (
    <div
      className="nb-message-bubble-wrapper"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '100%',
        margin: '12px 0',
      }}
    >
      <div
        className="nb-message-bubble"
        style={{
          backgroundColor: bgColors[variant],
          border: 'var(--border-thick)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-standard)',
          padding: '16px 20px',
          position: 'relative',
          color: 'var(--color-ink)',
        }}
      >
        {/* Header / Badges */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isLink ? (
              <Badge variant="link" size="sm">
                LINK
              </Badge>
            ) : type === 'code' ? (
              <Badge variant="dark" size="sm">
                CODE
              </Badge>
            ) : (
              <Badge variant="text" size="sm">
                NOTE
              </Badge>
            )}
            {formattedTime && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'rgba(0, 0, 0, 0.6)',
                }}
              >
                {formattedTime}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              title="Copy to clipboard"
              style={{
                background: 'var(--color-surface-card)',
                border: '2px solid var(--color-ink)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: '1.5px 1.5px 0px var(--color-ink)',
                padding: '4px 8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'var(--font-display)',
                color: copied ? 'var(--color-success)' : 'var(--color-ink)',
              }}
            >
              {copied ? <CheckCircleIcon size={14} /> : <CopyIcon size={14} />}
              <span>{copied ? 'COPIED!' : 'COPY'}</span>
            </button>

            {/* Delete Button (if authorized) */}
            {canDelete && onDelete && (
              <button
                onClick={onDelete}
                title="Delete note"
                style={{
                  background: 'var(--color-error)',
                  border: '2px solid var(--color-ink)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: '1.5px 1.5px 0px var(--color-ink)',
                  padding: '4px 8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-display)',
                }}
              >
                DEL
              </button>
            )}
          </div>
        </div>

        {/* Content with 3-Line Clamp & Neo-Brutalist Arrowhead Toggle */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              fontFamily: type === 'code' ? 'monospace' : 'var(--font-body)',
              fontSize: '15px',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontWeight: 500,
              ...(isLargeText && !isExpanded
                ? {
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }
                : {}),
            }}
          >
            {isLink ? (
              <a
                href={text}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--color-ink)',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 600,
                }}
              >
                {text}
                <ExternalLinkIcon size={14} />
              </a>
            ) : (
              text
            )}
          </div>

          {/* Neo-brutalist Arrowhead expand/collapse toggle */}
          {isLargeText && (
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Collapse note to 3 lines' : 'Expand full note'}
                style={{
                  background: isExpanded ? 'var(--color-ink)' : '#FFFFFF',
                  color: isExpanded ? '#FFFFFF' : 'var(--color-ink)',
                  border: '2px solid var(--color-ink)',
                  borderRadius: '6px',
                  boxShadow: isExpanded ? '1px 1px 0px var(--color-ink)' : '2.5px 2.5px 0px var(--color-ink)',
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontWeight: 900,
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '0.6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  textTransform: 'uppercase',
                  transform: isExpanded ? 'translate(1.5px, 1.5px)' : 'none',
                  transition: 'all 0.1s ease',
                }}
              >
                <span>{isExpanded ? 'COLLAPSE' : 'SHOW MORE'}</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '18px',
                    height: '18px',
                    backgroundColor: isExpanded ? '#FFFFFF' : 'var(--color-primary)',
                    color: 'var(--color-ink)',
                    border: '1.5px solid var(--color-ink)',
                    borderRadius: '4px',
                    boxShadow: '1px 1px 0px var(--color-ink)',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <svg
                    width={10}
                    height={10}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    style={{ display: 'block' }}
                  >
                    <polygon points="12,18 4,8 20,8" />
                  </svg>
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Comic tail for speech bubble */}
        <div
          className="nb-bubble-tail"
          style={{
            position: 'absolute',
            bottom: '-12px',
            left: '28px',
            width: '0',
            height: '0',
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderTop: `12px solid ${bgColors[variant]}`,
            filter: 'drop-shadow(0px 3px 0px var(--color-ink))',
            zIndex: 1,
          }}
        />
      </div>
    </div>
  );
};

export default MessageBubble;
