import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { CloseIcon, CopyIcon, CheckCircleIcon } from '../icons';
import { Button } from './Button';

import confetti from 'canvas-confetti';

export interface QrCodeModalProps {
  roomCode: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ roomCode, isOpen, onClose }) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const roomUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?join=${roomCode}`
    : `https://droplet.uno/?join=${roomCode}`;

  useEffect(() => {
    if (isOpen && roomCode) {
      QRCode.toDataURL(roomUrl, {
        width: 260,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then((url) => setQrUrl(url))
        .catch((err) => console.error('Failed to generate QR code', err));
    }
  }, [isOpen, roomCode, roomUrl]);

  if (!isOpen) return null;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl);
    } catch {
      // Fallback
    }
    setCopied(true);
    try {
      confetti({
        particleCount: 24,
        spread: 40,
        origin: { y: 0.6 },
        colors: ['#FFE000', '#000000', '#00D084'],
        disableForReducedMotion: true,
      });
    } catch {
      // Ignore
    }
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 100,
        backdropFilter: 'blur(3px)',
      }}
      onClick={onClose}
    >
      <div
        className="nb-modal-content"
        style={{
          backgroundColor: 'var(--color-surface-card)',
          border: 'var(--border-thick)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-large)',
          maxWidth: '380px',
          width: '100%',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            background: 'none',
            border: '2px solid var(--color-ink)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <CloseIcon size={18} />
        </button>

        <div style={{ textAlign: 'center', width: '100%' }}>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '22px',
              fontWeight: 800,
              color: 'var(--color-ink)',
              margin: '0 0 4px 0',
            }}
          >
            Share Room
          </h3>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              color: 'var(--color-muted)',
              margin: 0,
            }}
          >
            Scan with your phone or copy the direct link below
          </p>
        </div>

        {/* QR Code Canvas */}
        <div
          style={{
            padding: '12px',
            backgroundColor: '#FFFFFF',
            border: 'var(--border-thick)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-small)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {qrUrl ? (
            <img
              src={qrUrl}
              alt={`QR code for Room ${roomCode}`}
              style={{ width: '220px', height: '220px', display: 'block' }}
            />
          ) : (
            <div style={{ width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span>Generating...</span>
            </div>
          )}
        </div>

        {/* Room Code Callout */}
        <div style={{ textAlign: 'center', width: '100%' }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--color-muted)',
              textTransform: 'uppercase',
            }}
          >
            Or use 4-digit code:
          </span>
          <div
            style={{
              fontSize: '28px',
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              letterSpacing: '6px',
              backgroundColor: 'var(--color-primary)',
              border: '2px solid var(--color-ink)',
              borderRadius: 'var(--radius-md)',
              padding: '6px 14px',
              marginTop: '6px',
              boxShadow: 'var(--shadow-small)',
            }}
          >
            {roomCode}
          </div>
        </div>

        {/* Copy Link Button */}
        <Button
          variant="surface"
          fullWidth
          size="sm"
          leftIcon={copied ? <CheckCircleIcon size={16} /> : <CopyIcon size={16} />}
          onClick={handleCopyUrl}
        >
          {copied ? 'Link Copied!' : 'Copy Direct Link'}
        </Button>
      </div>
    </div>
  );
};

export default QrCodeModal;
