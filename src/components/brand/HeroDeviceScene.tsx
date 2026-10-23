import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  FileIcon,
  LinkIcon,
  ImageIcon,
  FolderIcon,
  CopyIcon,
  CheckCircleIcon,
  DownloadIcon,
  ArchiveIcon,
} from '../icons';

export interface HeroDeviceSceneProps {
  roomCodePreview?: string;
  onCodeClick?: () => void;
}

export const HeroDeviceScene: React.FC<HeroDeviceSceneProps> = ({
  roomCodePreview = 'AX7K9',
  onCodeClick,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(roomCodePreview);
      confetti({
        particleCount: 25,
        spread: 40,
        origin: { y: 0.5 },
        colors: ['#FFE000', '#000000', '#00D084'],
        disableForReducedMotion: true,
      });
    } catch {
      // Fallback
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onCodeClick) onCodeClick();
  };

  return (
    <div
      className="hero-device-scene-container"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '560px',
        margin: '0 auto',
        userSelect: 'none',
      }}
    >
      {/* 1. Flying Mascot at Top */}
      <div
        className="droplet-float"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '-20px',
          position: 'relative',
          zIndex: 3,
        }}
      >
        <picture>
          <source srcSet="/assets/Happy.webp" type="image/webp" />
          <img
            src="/assets/Happy.png"
            alt="Droplet Mascot Transferring Files"
            width={160}
            height={160}
            fetchPriority="high"
            decoding="async"
            style={{
              width: '150px',
              height: '150px',
              objectFit: 'contain',
              display: 'block',
              transform: 'rotate(-2deg)',
            }}
          />
        </picture>
      </div>

      {/* 2. Arched Dotted Transfer Path with Floating Icon Cards */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '60px',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Curved dashed line SVG */}
        <svg
          viewBox="0 0 460 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            position: 'absolute',
            top: 0,
            left: '5%',
            width: '90%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          <path
            d="M 20 45 Q 230 -10 440 45"
            stroke="#000000"
            strokeWidth="2.5"
            strokeDasharray="6 6"
            strokeLinecap="round"
          />
          {/* Arrow heads at ends */}
          <path d="M 16 35 L 20 45 L 30 45" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 430 45 L 440 45 L 444 35" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
        </svg>

        {/* 4 Floating Transfer Icon Cards */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            position: 'relative',
            zIndex: 4,
            transform: 'translateY(-6px)',
          }}
        >
          <div
            title="Notes & Text"
            style={{
              width: '36px',
              height: '36px',
              backgroundColor: '#FFFFFF',
              border: '2px solid #000000',
              borderRadius: '8px',
              boxShadow: '2px 2px 0px #000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'rotate(-5deg)',
            }}
          >
            <FileIcon size={20} />
          </div>

          <div
            title="Links & URLs"
            style={{
              width: '36px',
              height: '36px',
              backgroundColor: '#FFFFFF',
              border: '2px solid #000000',
              borderRadius: '8px',
              boxShadow: '2px 2px 0px #000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'translateY(-8px)',
            }}
          >
            <LinkIcon size={20} />
          </div>

          <div
            title="Images & Photos"
            style={{
              width: '36px',
              height: '36px',
              backgroundColor: '#FFFFFF',
              border: '2px solid #000000',
              borderRadius: '8px',
              boxShadow: '2px 2px 0px #000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'translateY(-8px)',
            }}
          >
            <ImageIcon size={20} />
          </div>

          <div
            title="Folders & Documents"
            style={{
              width: '36px',
              height: '36px',
              backgroundColor: '#FFFFFF',
              border: '2px solid #000000',
              borderRadius: '8px',
              boxShadow: '2px 2px 0px #000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'rotate(5deg)',
            }}
          >
            <FolderIcon size={20} />
          </div>
        </div>
      </div>

      {/* 3. Devices Row: "My Laptop" (Left) + "Room Code" (Center) + "My PC" (Right) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1.15fr',
          alignItems: 'end',
          gap: '12px',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Device A: My Laptop */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Yellow Device Badge */}
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '11px',
              backgroundColor: '#FFE000',
              color: '#000000',
              border: '2px solid #000000',
              borderRadius: '6px',
              padding: '2px 8px',
              marginBottom: '-6px',
              zIndex: 3,
            }}
          >
            My Laptop
          </span>

          {/* Laptop Screen */}
          <div
            style={{
              width: '100%',
              maxWidth: '190px',
              backgroundColor: '#1C212A',
              border: '2.5px solid #000000',
              borderRadius: '8px 8px 0 0',
              padding: '8px 10px',
              color: '#FFFFFF',
              fontFamily: 'var(--font-body)',
              boxShadow: '2px 2px 0px #000000',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px', fontWeight: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <FileIcon size={13} color="#FFFFFF" />
                <span>Notes.txt</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <FileIcon size={13} color="#FFFFFF" />
                <span>Project.pdf</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ImageIcon size={13} color="#FFFFFF" />
                <span>Image.png</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <LinkIcon size={13} color="#FFFFFF" />
                <span>Link.url</span>
              </div>
              <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px' }}>
                and more...
              </div>
            </div>
          </div>

          {/* Laptop Base / Keyboard */}
          <div
            style={{
              width: '105%',
              maxWidth: '205px',
              height: '14px',
              backgroundColor: '#2D3442',
              border: '2.5px solid #000000',
              borderRadius: '0 0 8px 8px',
              boxShadow: '0 3px 0px #000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Trackpad notch */}
            <div style={{ width: '30px', height: '3px', backgroundColor: '#475569', borderRadius: '1px' }} />
          </div>
        </div>

        {/* Center Floating "Room Code" Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '2px solid #000000',
            borderRadius: '10px',
            boxShadow: '3px 3px 0px #000000',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            marginBottom: '28px',
            zIndex: 4,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--color-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Room Code
          </span>

          <div
            onClick={handleCopy}
            title="Click to copy room code"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FFE000',
              border: '2px solid #000000',
              borderRadius: '6px',
              padding: '3px 8px',
              cursor: 'pointer',
              transition: 'transform 0.1s ease',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: '15px',
                letterSpacing: '1px',
                color: '#000000',
              }}
            >
              {roomCodePreview}
            </span>
            {copied ? <CheckCircleIcon size={14} /> : <CopyIcon size={14} />}
          </div>
        </div>

        {/* Device B: My PC */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Yellow Device Badge */}
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '11px',
              backgroundColor: '#FFE000',
              color: '#000000',
              border: '2px solid #000000',
              borderRadius: '6px',
              padding: '2px 8px',
              marginBottom: '-6px',
              zIndex: 3,
            }}
          >
            My PC
          </span>

          {/* Desktop Monitor Frame */}
          <div
            style={{
              width: '100%',
              maxWidth: '215px',
              backgroundColor: '#1E232D',
              border: '2.5px solid #000000',
              borderRadius: '10px',
              padding: '8px',
              boxShadow: '3px 3px 0px #000000',
            }}
          >
            {/* Screen Inner */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '6px',
                padding: '6px 8px',
                border: '1.5px solid #000000',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#000000',
                  marginBottom: '2px',
                }}
              >
                Receiving...
              </span>

              {/* Received Items list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '10px', fontWeight: 600 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FileIcon size={12} />
                    <span>Notes.txt</span>
                  </div>
                  <DownloadIcon size={12} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FileIcon size={12} />
                    <span>Project.pdf</span>
                  </div>
                  <DownloadIcon size={12} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ImageIcon size={12} />
                    <span>Image.png</span>
                  </div>
                  <DownloadIcon size={12} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <LinkIcon size={12} />
                    <span>Link.url</span>
                  </div>
                  <DownloadIcon size={12} />
                </div>
              </div>

              {/* Download All (ZIP) button */}
              <div
                style={{
                  marginTop: '4px',
                  backgroundColor: '#000000',
                  color: '#FFFFFF',
                  borderRadius: '5px',
                  padding: '3px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  fontSize: '9px',
                  fontWeight: 800,
                  fontFamily: 'var(--font-display)',
                }}
              >
                <ArchiveIcon size={11} color="#FFFFFF" accentColor="#FFE000" />
                <span>Download All (ZIP)</span>
              </div>
            </div>
          </div>

          {/* Monitor Stand, Keyboard & Mouse */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '2px', position: 'relative' }}>
            {/* Stand neck */}
            <div style={{ width: '22px', height: '14px', backgroundColor: '#1E232D', borderLeft: '2.5px solid #000', borderRight: '2.5px solid #000' }} />
            {/* Stand foot */}
            <div style={{ width: '72px', height: '8px', backgroundColor: '#1E232D', border: '2.5px solid #000', borderRadius: '4px', boxShadow: '1.5px 1.5px 0px #000' }} />
            
            {/* Keyboard & Mouse on Desk */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              {/* Mechanical Keyboard with keycaps */}
              <div
                style={{
                  width: '130px',
                  height: '24px',
                  backgroundColor: '#1E232D',
                  border: '2px solid #000',
                  borderRadius: '5px',
                  padding: '2px 4px',
                  boxShadow: '2px 2px 0px #000',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                {/* Keycaps row 1 */}
                <div style={{ display: 'flex', gap: '2px', width: '100%' }}>
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: '7px',
                        backgroundColor: '#374151',
                        borderRadius: '1.5px',
                        border: '0.5px solid #111827',
                      }}
                    />
                  ))}
                </div>
                {/* Keycaps row 2 with spacebar */}
                <div style={{ display: 'flex', gap: '2px', width: '100%' }}>
                  <div style={{ width: '16px', height: '7px', backgroundColor: '#374151', borderRadius: '1.5px', border: '0.5px solid #111827' }} />
                  <div style={{ flex: 1, height: '7px', backgroundColor: '#4B5563', borderRadius: '1.5px', border: '0.5px solid #111827' }} />
                  <div style={{ width: '16px', height: '7px', backgroundColor: '#374151', borderRadius: '1.5px', border: '0.5px solid #111827' }} />
                  <div style={{ width: '16px', height: '7px', backgroundColor: '#374151', borderRadius: '1.5px', border: '0.5px solid #111827' }} />
                </div>
              </div>

              {/* Desk Mouse */}
              <div
                style={{
                  width: '18px',
                  height: '24px',
                  backgroundColor: '#1E232D',
                  border: '2px solid #000',
                  borderRadius: '9px',
                  boxShadow: '1.5px 1.5px 0px #000',
                  position: 'relative',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                {/* Mouse wheel slot */}
                <div style={{ width: '2px', height: '6px', backgroundColor: '#9CA3AF', borderRadius: '1px', marginTop: '3px' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroDeviceScene;
