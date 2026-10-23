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
    <div className={`nb-room-info-bar ${className}`}>
      {/* Left Cluster: Leave Action + Desktop Wifi + Divider + Room Code Badge */}
      <div className="nb-room-bar-left">
        {onLeave && (
          <button
            onClick={onLeave}
            className="nb-button nb-room-btn-leave"
            title="Leave this room and return home"
            aria-label="Leave room"
          >
            <ArrowLeftIcon size={16} />
            <span className="nb-room-btn-text">Leave</span>
          </button>
        )}

        {/* Desktop-only dedicated Wifi indicator */}
        <div
          className="nb-room-wifi-desktop"
          title={
            isConnected
              ? 'Realtime Sync: Connected (Live)'
              : 'Realtime Sync: Disconnected / Reconnecting...'
          }
          aria-label={isConnected ? 'Realtime Sync Connected' : 'Realtime Sync Disconnected'}
          style={{
            backgroundColor: isConnected ? '#E6F9F0' : '#FFF0F0',
            color: isConnected ? '#00875A' : '#DE350B',
          }}
        >
          <WifiIcon size={17} color={isConnected ? '#00875A' : '#DE350B'} strokeWidth={2.4} />
        </div>

        {/* Desktop Divider */}
        <div className="nb-room-divider" aria-hidden="true" />

        {/* Hero Interactive Room Code Badge (Click to Copy 4-Digit Code) */}
        <button
          onClick={handleCopyCode}
          title="Click to copy 4-digit room code"
          aria-label={`Copy room code ${roomCode}`}
          className="nb-button nb-room-code-badge"
          style={{
            backgroundColor: copiedCode ? '#E6F9F0' : '#FFE000',
          }}
        >
          <span className="nb-room-badge-tag">ROOM</span>
          <span className="nb-room-badge-code">{roomCode}</span>

          {/* Realtime Live Dot Indicator */}
          <span
            className="nb-room-live-dot"
            title={isConnected ? 'Live: Realtime sync active' : 'Reconnecting...'}
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#00A86B' : '#DE350B',
              boxShadow: isConnected ? '0 0 0 2px rgba(0, 168, 107, 0.25)' : 'none',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />

          {copiedCode ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '11px',
                fontWeight: 800,
                color: '#00875A',
              }}
            >
              <CheckCircleIcon size={13} />
              <span className="nb-room-btn-text">Copied!</span>
            </span>
          ) : (
            <CopyIcon size={13} style={{ opacity: 0.6 }} />
          )}
        </button>
      </div>

      {/* Right Cluster: Expiry Countdown + Share Button + Delete Room Danger Button */}
      <div className="nb-room-bar-right">
        {/* Expiry Countdown Chip */}
        <div className="nb-room-expiry-chip" title={`Room expires in ${calculateRemaining()} (24h auto-expiry)`}>
          <ClockIcon size={13} />
          <span className="nb-room-expiry-prefix">Expires in </span>
          <span>{calculateRemaining()}</span>
        </div>

        {/* Unified Single Share Button (Opens modal with QR code & Copy Link) */}
        {(onShare || onShowQr) && (
          <button
            onClick={handleShareClick}
            title="Share room via QR code or direct link"
            aria-label="Share room"
            className="nb-button nb-room-btn-share"
          >
            <ShareIcon size={15} />
            <span className="nb-room-btn-text">Share</span>
          </button>
        )}

        {/* Delete Room Button (Owner Only) */}
        {isOwner && onDelete && (
          <button
            onClick={onDelete}
            title="Permanently delete this room"
            aria-label="Delete this room"
            className="nb-button nb-room-btn-delete"
          >
            <TrashIcon size={15} />
            <span className="nb-room-btn-text">Delete Room</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default RoomInfoBar;
