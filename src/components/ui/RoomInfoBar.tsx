import React, { useState } from 'react';
import {
  CopyIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowLeftIcon,
  TrashIcon,
  WifiIcon,
  ShareIcon,
} from '../icons';
import confetti from 'canvas-confetti';

export interface RoomInfoBarProps {
  roomCode: string;
  expiresAt: number; // Unix timestamp ms
  isConnected?: boolean;
  onLeave?: () => void;
  isOwner?: boolean;
  onDelete?: () => void;
  onShare?: () => void;
  onShowQr?: () => void; // Supported for backward compatibility
  className?: string;
}

export const RoomInfoBar: React.FC<RoomInfoBarProps> = ({
  roomCode,
  expiresAt,
  isConnected = true,
  onLeave,
  isOwner = false,
  onDelete,
  onShare,
  onShowQr,
  className = '',
}) => {
  const [copiedCode, setCopiedCode] = useState(false);

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

  const handleShareClick = () => {
    if (onShare) {
      onShare();
    } else if (onShowQr) {
      onShowQr();
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
        backgroundColor: '#FFFFFF',
        border: '2.5px solid #000000',
        borderRadius: '16px',
        boxShadow: '4px 4px 0px #000000',
        padding: '10px 16px',
        gap: '12px',
      }}
    >
      {/* Left Cluster: Leave + Wifi Status Logo (Green/Red) + Divider + Room Code Button + Single Share Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        {/* Leave Room Action */}
        {onLeave && (
          <button
            onClick={onLeave}
            className="nb-button"
            title="Leave this room and return home"
            aria-label="Leave room"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FFFFFF',
              border: '2px solid #000000',
              borderRadius: '10px',
              boxShadow: '2px 2px 0px #000000',
              padding: '7px 12px',
              fontFamily: 'var(--font-display)',
              fontSize: '13px',
              fontWeight: 800,
              color: '#000000',
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
          >
            <ArrowLeftIcon size={14} />
            <span>Leave</span>
          </button>
        )}

        {/* Wifi Realtime Status Logo (Green if live, Red if not live - NO noisy text) */}
        <div
          title={
            isConnected
              ? 'Realtime Sync: Connected (Live)'
              : 'Realtime Sync: Disconnected / Reconnecting...'
          }
          aria-label={isConnected ? 'Realtime Sync Connected' : 'Realtime Sync Disconnected'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            backgroundColor: isConnected ? '#E6F9F0' : '#FFF0F0',
            border: '2px solid #000000',
            boxShadow: '1.5px 1.5px 0px #000000',
            color: isConnected ? '#00875A' : '#DE350B',
            cursor: 'help',
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
        >
          <WifiIcon size={18} color={isConnected ? '#00875A' : '#DE350B'} strokeWidth={2.4} />
        </div>

        {/* Subtle Divider */}
        <div
          style={{
            width: '1.5px',
            height: '22px',
            backgroundColor: 'rgba(0, 0, 0, 0.18)',
            margin: '0 2px',
          }}
        />

        {/* Hero Interactive Room Code Badge (Click to Copy 4-Digit Code) */}
        <button
          onClick={handleCopyCode}
          title="Click to copy 4-digit room code"
          aria-label={`Copy room code ${roomCode}`}
          className="nb-button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: copiedCode ? '#E6F9F0' : '#FFE000',
            border: '2px solid #000000',
            borderRadius: '10px',
            boxShadow: '2.5px 2.5px 0px #000000',
            padding: '6px 14px',
            cursor: 'pointer',
            fontFamily: 'var(--font-display)',
            color: '#000000',
            transition: 'all 0.15s ease',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              opacity: 0.65,
            }}
          >
            ROOM
          </span>
          <span
            style={{
              fontSize: '18px',
              fontWeight: 900,
              letterSpacing: '2.5px',
            }}
          >
            {roomCode}
          </span>
          {copiedCode ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '11.5px',
                fontWeight: 800,
                color: '#00875A',
              }}
            >
              <CheckCircleIcon size={14} /> Copied!
            </span>
          ) : (
            <CopyIcon size={14} style={{ opacity: 0.55 }} />
          )}
        </button>

        {/* Unified Single Share Button (Opens modal with QR code & Copy Link) */}
        {(onShare || onShowQr) && (
          <button
            onClick={handleShareClick}
            title="Share room via QR code or direct link"
            aria-label="Share room"
            className="nb-button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FFFFFF',
              border: '2px solid #000000',
              borderRadius: '10px',
              boxShadow: '2px 2px 0px #000000',
              padding: '7px 14px',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              fontSize: '13px',
              fontWeight: 800,
              color: '#000000',
              transition: 'all 0.12s ease',
            }}
          >
            <ShareIcon size={15} />
            <span>Share</span>
          </button>
        )}
      </div>

      {/* Right Cluster: Expiry Countdown + Delete Room Danger Action */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        {/* Expiry Countdown */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#FFF8B8',
            border: '2px solid #000000',
            borderRadius: 'var(--radius-full)',
            padding: '5px 12px',
            fontFamily: 'var(--font-display)',
            fontSize: '12.5px',
            fontWeight: 800,
            color: '#000000',
          }}
        >
          <ClockIcon size={14} />
          <span>Expires in {calculateRemaining()}</span>
        </div>

        {/* Delete Room Button (Owner Only) */}
        {isOwner && onDelete && (
          <button
            onClick={onDelete}
            title="Permanently delete this room"
            aria-label="Delete this room"
            className="nb-button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FFE6E6',
              border: '2px solid #000000',
              borderRadius: '10px',
              boxShadow: '2px 2px 0px #000000',
              padding: '6px 12px',
              fontFamily: 'var(--font-display)',
              fontSize: '12.5px',
              fontWeight: 800,
              color: '#D32F2F',
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
          >
            <TrashIcon size={14} />
            <span>Delete Room</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default RoomInfoBar;
