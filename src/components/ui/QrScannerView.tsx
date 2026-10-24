import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CameraIcon } from '../icons';

export interface QrScannerViewProps {
  onScanSuccess: (code: string) => void;
  onSwitchToManual?: () => void;
}

/**
 * Extracts a 4-digit Droplet room code from raw text, query parameters, or URL paths.
 */
export function extractRoomCodeFromQr(text: string): string | null {
  const trimmed = text.trim();
  // 1. Raw 4 digits (e.g. "4821")
  if (/^\d{4}$/.test(trimmed)) {
    return trimmed;
  }
  // 2. Query param (e.g. "https://droplet.uno/?join=4821" or "?code=4821")
  const queryMatch = trimmed.match(/[?&](?:join|code)=(\d{4})/i);
  if (queryMatch) {
    return queryMatch[1];
  }
  // 3. Path parameter (e.g. "https://droplet.uno/4821" or "/join/4821")
  const pathMatch = trimmed.match(/\/(?:join\/|room\/)?(\d{4})(?:\/|\?|$)/i);
  if (pathMatch) {
    return pathMatch[1];
  }
  return null;
}

export const QrScannerView: React.FC<QrScannerViewProps> = ({
  onScanSuccess,
  onSwitchToManual,
}) => {
  const [cameraState, setCameraState] = useState<'loading' | 'active' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [invalidScanWarning, setInvalidScanWarning] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStoppedRef = useRef<boolean>(false);
  const elementIdRef = useRef<string>(`droplet-qr-reader-${Math.random().toString(36).slice(2, 7)}`);

  useEffect(() => {
    isStoppedRef.current = false;
    let scannerInstance: Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        setCameraState('loading');
        setErrorMessage(null);

        // Ensure DOM element is mounted
        const targetEl = document.getElementById(elementIdRef.current);
        if (!targetEl) return;

        scannerInstance = new Html5Qrcode(elementIdRef.current);
        scannerRef.current = scannerInstance;

        const handleSuccess = (decodedText: string) => {
          if (isStoppedRef.current) return;

          const detectedCode = extractRoomCodeFromQr(decodedText);
          if (detectedCode) {
            isStoppedRef.current = true;
            try {
              navigator.vibrate?.([40, 30, 40]);
            } catch {
              // Haptic feedback optional
            }

            // Stop camera cleanly before triggering transition
            if (scannerInstance && scannerInstance.isScanning) {
              scannerInstance.stop().then(() => {
                scannerInstance?.clear();
              }).catch(() => {});
            }

            onScanSuccess(detectedCode);
          } else {
            setInvalidScanWarning('Unrecognized QR code. Point at a Droplet room QR.');
            setTimeout(() => setInvalidScanWarning(null), 3000);
          }
        };

        const config = {
          fps: 12,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const edge = Math.min(viewfinderWidth, viewfinderHeight) * 0.72;
            return { width: Math.max(160, Math.floor(edge)), height: Math.max(160, Math.floor(edge)) };
          },
          aspectRatio: 1.0,
        };

        // Try environment (back) camera first
        try {
          await scannerInstance.start(
            { facingMode: 'environment' },
            config,
            handleSuccess,
            () => {} // Ignore per-frame non-match notifications
          );
          if (!isStoppedRef.current) {
            setCameraState('active');
          }
        } catch {
          // Fall back to front / default webcam
          if (isStoppedRef.current) return;
          await scannerInstance.start(
            { facingMode: 'user' },
            config,
            handleSuccess,
            () => {}
          );
          if (!isStoppedRef.current) {
            setCameraState('active');
          }
        }
      } catch (err: any) {
        if (isStoppedRef.current) return;
        setCameraState('error');
        const msg = err?.message || '';
        if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
          setErrorMessage('Camera access was denied. Please grant camera permission in your browser.');
        } else {
          setErrorMessage('Unable to access camera. Please enter the 4-digit code manually.');
        }
      }
    };

    // Small delay to allow modal unfold animation to finish
    const timer = setTimeout(startScanner, 120);

    return () => {
      isStoppedRef.current = true;
      clearTimeout(timer);
      if (scannerInstance && scannerInstance.isScanning) {
        scannerInstance.stop().then(() => {
          scannerInstance?.clear();
        }).catch(() => {});
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="nb-qr-scanner-wrapper">
      {/* Viewfinder Frame with Neo-Brutalist Border & Shadows */}
      <div className="nb-qr-viewfinder-box">
        {/* html5-qrcode video viewport container */}
        <div id={elementIdRef.current} className="nb-qr-reader-target" />

        {/* Viewfinder HUD Overlay (Brackets & Scanning Beam) */}
        {cameraState === 'active' && (
          <div className="nb-qr-hud-overlay">
            <div className="nb-qr-corner top-left" />
            <div className="nb-qr-corner top-right" />
            <div className="nb-qr-corner bottom-left" />
            <div className="nb-qr-corner bottom-right" />
            <div className="nb-qr-scan-line" />
          </div>
        )}

        {/* Loading Overlay */}
        {cameraState === 'loading' && (
          <div className="nb-qr-state-overlay">
            <div className="nb-qr-loading-spinner" />
            <p className="nb-qr-state-text">Starting camera...</p>
          </div>
        )}

        {/* Error State */}
        {cameraState === 'error' && (
          <div className="nb-qr-state-overlay error">
            <CameraIcon size={36} color="#000000" accentColor="#FF6B6B" />
            <p className="nb-qr-error-text">{errorMessage || 'Camera unavailable.'}</p>
            {onSwitchToManual && (
              <button
                type="button"
                onClick={onSwitchToManual}
                className="nb-qr-manual-fallback-btn"
              >
                Enter Code Instead
              </button>
            )}
          </div>
        )}
      </div>

      {/* Dynamic scan warning if an unrecognized QR is held */}
      {invalidScanWarning && (
        <div className="nb-qr-invalid-banner">
          {invalidScanWarning}
        </div>
      )}

      {/* Helper text */}
      <p className="nb-qr-helper-text">
        Point your camera at the host's QR code to join instantly
      </p>
    </div>
  );
};
