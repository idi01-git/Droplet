import React, { useState } from 'react';
import { Copy, Check, QrCode, Clock, Link as LinkIcon } from 'lucide-react';
import confetti from 'canvas-confetti';

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
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Calculate remaining time
  const calculateRemaining = () => {
    const diff = Math.max(0, expiresAt - Date.now());
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours === 0 && minutes === 0) return 'Expiring now';
    return `${hours}h ${minutes}m`;
  };

  const triggerMicroBurst = () => {
    try {
      confetti({
        particleCount: 28,
        spread: 45,
        origin: { y: 0.25 },
        colors: ['#FFE000', '#000000', '#00D084'],
        disableForReducedMotion: true,
      });
    } catch {
      // Graceful fallback if canvas is unavailable
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
    } catch {
      // Fallback
    }
    setCopiedCode(true);
    triggerMicroBurst();
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = async () => {
    try {
      const shareUrl = `${window.location.origin}/?room=${roomCode}`;
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Fallback
    }
    setCopiedLink(true);
    triggerMicroBurst();
    setTimeout(() => setCopiedLink(false), 2000);
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
      {/* Room Code Badge & Direct Action Strip */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
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

        {/* Copy 4-Digit Code Button */}
        <button
          onClick={handleCopyCode}
          title="Copy room code"
          aria-label="Copy 4-digit room code"
          className="nb-button"
          style={{
            backgroundColor: copiedCode ? '#E6F9F0' : 'transparent',
            border: '2px solid var(--color-ink)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'var(--font-display)',
            fontSize: '12px',
            fontWeight: 700,
            color: copiedCode ? '#00875A' : 'var(--color-ink)',
            transition: 'background-color 0.15s ease',
          }}
        >
          {copiedCode ? <Check size={15} strokeWidth={3} /> : <Copy size={15} strokeWidth={2.5} />}
          <span>{copiedCode ? 'Copied!' : 'Code'}</span>
        </button>

        {/* 1-Click Copy Share Link Button (Priority Delight Item) */}
        <button
          onClick={handleCopyLink}
          title="Copy direct share link to room"
          aria-label="Copy direct share link to room"
          className="nb-button"
          style={{
            backgroundColor: copiedLink ? '#E6F9F0' : 'var(--color-surface)',
            border: '2px solid var(--color-ink)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'var(--font-display)',
            fontSize: '12px',
            fontWeight: 700,
            color: copiedLink ? '#00875A' : 'var(--color-ink)',
            transition: 'all 0.15s ease',
          }}
        >
          {copiedLink ? <Check size={15} strokeWidth={3} /> : <LinkIcon size={15} strokeWidth={2.5} />}
          <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
        </button>

        {/* QR Code toggle */}
        {onShowQr && (
          <button
            onClick={onShowQr}
            title="Show Room QR Code for mobile scanning"
            aria-label="Show Room QR Code for mobile scanning"
            className="nb-button"
            style={{
              backgroundColor: 'transparent',
              border: '2px solid var(--color-ink)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--font-display)',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--color-ink)',
            }}
          >
            <QrCode size={15} strokeWidth={2.5} />
            <span>QR</span>
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
