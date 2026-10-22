import React, { useState } from 'react';
import { Copy, Check, QrCode, Clock } from 'lucide-react';

export interface RoomInfoBarProps {
  roomCode: string;
  expiresAt: number; // Unix timestamp ms
  onShowQr?: () => void;
  className?: string;
}

export const RoomInfoBar: React.FC<RoomInfoBarProps> = ({
  roomCode,
  expiresAt,
  onShowQr,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  // Calculate remaining time
  const calculateRemaining = () => {
    const diff = Math.max(0, expiresAt - Date.now());
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours === 0 && minutes === 0) return 'Expiring now';
    return `${hours}h ${minutes}m`;
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`nb-room-info-bar ${className}`}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--color-surface-card)',
        border: 'var(--border-thick)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-standard)',
        padding: '12px 18px',
        gap: '12px',
      }}
    >
      {/* Room Code Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--color-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          Room
        </span>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '22px',
            fontWeight: 800,
            letterSpacing: '3px',
            color: 'var(--color-ink)',
            backgroundColor: 'var(--color-primary)',
            padding: '2px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '2px solid var(--color-ink)',
          }}
        >
          {roomCode}
        </span>

        {/* Copy Code */}
        <button
          onClick={handleCopyCode}
          title="Copy room code"
          style={{
            backgroundColor: 'transparent',
            border: '2px solid var(--color-ink)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: copied ? 'var(--color-success)' : 'var(--color-ink)',
          }}
        >
          {copied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} strokeWidth={2.5} />}
        </button>

        {/* QR Code toggle */}
        {onShowQr && (
          <button
            onClick={onShowQr}
            title="Show Room QR Code"
            style={{
              backgroundColor: 'transparent',
              border: '2px solid var(--color-ink)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-ink)',
            }}
          >
            <QrCode size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Expiry Countdown */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: '#FFF8B8',
          border: '2px solid var(--color-ink)',
          borderRadius: 'var(--radius-full)',
          padding: '4px 12px',
          fontFamily: 'var(--font-display)',
          fontSize: '13px',
          fontWeight: 700,
          color: 'var(--color-ink)',
        }}
      >
        <Clock size={15} strokeWidth={2.5} />
        <span>Expires in {calculateRemaining()}</span>
      </div>
    </div>
  );
};

export default RoomInfoBar;
