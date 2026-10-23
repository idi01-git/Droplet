import React, { useState } from 'react';
import { CopyIcon, CheckCircleIcon, ExternalLinkIcon, TrashIcon } from '../icons';
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

  const handleCopy = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
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
        onClick={() => {
          if (isLargeText) {
            const selection = window.getSelection()?.toString();
            if (selection && selection.length > 0) return;
            setIsExpanded(!isExpanded);
          }
        }}
        title={isLargeText ? (isExpanded ? 'Click anywhere to collapse' : 'Click anywhere to show full note') : undefined}
        style={{
          backgroundColor: bgColors[variant],
          border: 'var(--border-thick)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: isExpanded ? 'var(--shadow-prominent)' : 'var(--shadow-standard)',
          padding: '16px 20px',
          position: 'relative',
          color: 'var(--color-ink)',
          cursor: isLargeText ? 'pointer' : 'default',
          transition: 'all 0.15s ease',
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
              onClick={(e) => handleCopy(e)}
              title="Copy to clipboard"
              className="nb-bubble-btn"
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
              <span className="hide-on-mobile">{copied ? 'COPIED!' : 'COPY'}</span>
            </button>

            {/* Delete Button (if authorized) */}
            {canDelete && onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                title="Delete note"
                className="nb-bubble-btn"
                style={{
                  background: 'var(--color-error)',
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
                }}
              >
                <TrashIcon size={14} />
                <span className="hide-on-mobile">DEL</span>
              </button>
            )}
          </div>
        </div>

        {/* Content with 3-Line Clamp & FAQ-Style Arrowhead Toggle */}
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
                onClick={(e) => e.stopPropagation()}
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

          {/* FAQ-Style Neo-brutalist collapse toggle bar */}
          {isLargeText && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '10px',
                paddingTop: '8px',
                borderTop: '2px dashed rgba(0, 0, 0, 0.2)',
                color: 'var(--color-ink)',
                fontFamily: 'var(--font-display)',
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '0.5px',
                userSelect: 'none',
              }}
            >
              <span>{isExpanded ? 'COLLAPSE' : 'SHOW MORE'}</span>
              <span
                style={{
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                  fontSize: '16px',
                  fontWeight: 900,
                  display: 'inline-block',
                  lineHeight: 1,
                }}
              >
                ▼
              </span>
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
