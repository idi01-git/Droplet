import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { DropletLogo } from '../components/brand';
import { RoomCodeInput, Alert } from '../components/ui';
import {
  ZapIcon,
  ShieldIcon,
  ClockIcon,
  DownloadIcon,
  ArrowRightIcon,
  QrCodeIcon,
  CloseIcon,
} from '../components/icons';
import { api } from '../services/api';
import { RoomSummary } from '../../shared/types';
import { recentRoomsService, RecentRoom, MAX_ACTIVE_CREATED_ROOMS } from '../services/recentRooms';

export interface HomeViewProps {
  onRoomJoined: (room: RoomSummary, sessionToken: string) => void;
  initialCode?: string;
}

export const HomeView: React.FC<HomeViewProps> = ({ onRoomJoined, initialCode = '' }) => {
  const [code, setCode] = useState(initialCode);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(!!initialCode);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);

  // Load ONLY user-created rooms and verify against server to prune any deleted rooms
  React.useEffect(() => {
    // 1. Instantly display cached user-created rooms
    setRecentRooms(recentRoomsService.getCreatedRooms());

    // 2. Asynchronously verify with server: remove rooms that are deleted/expired
    let isSubscribed = true;
    recentRoomsService
      .verifyAndPruneDeletedRooms((id, token) => api.getRoom(id, token))
      .then((verified) => {
        if (isSubscribed) {
          setRecentRooms(verified);
        }
      })
      .catch(() => {});

    return () => {
      isSubscribed = false;
    };
  }, [showJoinModal]);

  // Listen for Navbar 'Join Room' click & Escape key
  React.useEffect(() => {
    const handleOpenJoin = () => {
      setModalError(null);
      setShowJoinModal(true);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowJoinModal(false);
        setModalError(null);
      }
    };
    window.addEventListener('droplet:open-join-room', handleOpenJoin);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('droplet:open-join-room', handleOpenJoin);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Pause background scroll when the modal is active
  React.useEffect(() => {
    if (showJoinModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showJoinModal]);

  const handleOpenCreatedRoom = async (roomItem: RecentRoom) => {
    if (roomItem.token) {
      try {
        const details = await api.getRoom(roomItem.id, roomItem.token);
        onRoomJoined(details.room, roomItem.token);
        return;
      } catch {
        recentRoomsService.removeRecentRoom(roomItem.code);
        setRecentRooms(recentRoomsService.getCreatedRooms());
      }
    }
    setCode(roomItem.code);
    setModalError(null);
    setShowJoinModal(true);
  };

  const handleCreateRoom = async () => {
    // Limit without DB: enforce active created rooms threshold per browser
    const activeCreated = recentRoomsService.getCreatedRooms();
    if (activeCreated.length >= MAX_ACTIVE_CREATED_ROOMS) {
      setError(
        `Active room limit reached (${MAX_ACTIVE_CREATED_ROOMS} rooms max). Please close an existing room or wait for it to expire before creating a new one.`
      );
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const result = await api.createRoom();

      // Launch joyful confetti burst!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFE000', '#000000', '#00D084', '#3B82F6'],
      });

      onRoomJoined(result.room, result.sessionToken);
    } catch (err: any) {
      setError(err.message || 'Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (modalError) {
      setModalError(null); // Clear error on keystroke!
    }
  };

  const handleConnectClick = () => {
    if (code.length < 4) {
      setModalError('Please enter all 4 digits of the room code.');
      return;
    }
    handleJoinRoom();
  };

  const handleJoinRoom = async () => {
    if (code.length !== 4) {
      setModalError('Please enter all 4 digits of the room code.');
      return;
    }

    setIsJoining(true);
    setModalError(null);

    try {
      const result = await api.joinRoom(code);
      onRoomJoined(result.room, result.sessionToken);
    } catch (err: any) {
      setModalError(err.message || 'Room not found or has expired.');
    } finally {
      setIsJoining(false);
    }
  };

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <div style={{ position: 'relative', overflowX: 'hidden' }}>
      {/* =========================================================================
          HERO SECTION (Matching Mockup with 2-Column Neo-Brutalist Layout)
          ========================================================================= */}
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#FFFDF0',
          borderBottom: '2.5px solid #000000',
          width: '100%',
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          paddingTop: '64px',
        }}
      >
        {/* Background Image Layer from Asset Folder - 100% Viewport */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            zIndex: 0,
            pointerEvents: 'none',
            userSelect: 'none',
            overflow: 'hidden',
          }}
        >
          <picture style={{ display: 'block', width: '100%', height: '100%' }}>
            <source srcSet="/assets/Cheerful_Yellow_Abstract_Wave_Background.webp" type="image/webp" />
            <img
              src="/assets/Cheerful_Yellow_Abstract_Wave_Background.png"
              alt=""
              aria-hidden="true"
              width={1672}
              height={941}
              fetchPriority="high"
              loading="eager"
              decoding="async"
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center bottom',
              }}
            />
          </picture>
        </div>

        {/* Hero Content Container - 2 Columns (Content Left 45%, Mascot Right) */}
        <div
          className="hero-grid-layout"
          style={{
            width: '100%',
            maxWidth: '1280px',
            margin: '0 auto',
            height: '100%',
            flex: 1,
            padding: 'clamp(76px, 9vh, 92px) 24px clamp(20px, 3vh, 32px) 24px',
            position: 'relative',
            zIndex: 2,
            boxSizing: 'border-box',
          }}
        >
          {/* Left Column: Hero Content & Features (Max 48% VW for balance) */}
          <div
            className="hero-content-column"
            style={{
              width: '100%',
              maxWidth: 'clamp(360px, 48vw, 610px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              textAlign: 'left',
              flexShrink: 0,
            }}
          >
            {/* Error Alert Display */}
            {error && (
              <div style={{ width: '100%', marginBottom: '14px' }}>
                <Alert variant="error" message={error} onDismiss={() => setError(null)} />
              </div>
            )}



            {/* 2. Bold Neo-Brutalist Title (15% Larger, Strict 2-Line Punchy Presentation) */}
            <h1
              className="hero-headline"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(39px, 4.4vw, 58px)',
                fontWeight: 900,
                color: '#000000',
                lineHeight: 1.08,
                letterSpacing: '-0.025em',
                margin: '0 0 16px 0',
                textAlign: 'left',
              }}
            >
              <span style={{ display: 'block', whiteSpace: 'nowrap' }}>
                Transfer Anything
              </span>
              <span
                style={{
                  display: 'block',
                  whiteSpace: 'nowrap',
                  color: '#FFE000',
                  WebkitTextStroke: '2.5px #000000',
                  textShadow: '4px 4px 0px #000000',
                  marginTop: '8px',
                }}
              >
                Between Your Devices
              </span>
            </h1>

            {/* 3. Subtitle with Yellow Highlight Pill */}
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'clamp(14.5px, 1.25vw, 16.5px)',
                color: '#18181B',
                fontWeight: 500,
                lineHeight: 1.55,
                marginBottom: '24px',
                textAlign: 'left',
              }}
            >
              Share text, links and files instantly using a simple{' '}
              <span
                style={{
                  backgroundColor: '#FFE000',
                  border: '1.5px solid #000000',
                  borderRadius: '9999px',
                  padding: '2px 10px',
                  fontWeight: 800,
                  color: '#000000',
                  whiteSpace: 'nowrap',
                  display: 'inline-block',
                }}
              >
                temporary room code
              </span>
              . No account. No hassle. Just drop it.
            </p>

            {/* 4. Action Buttons & Micro-Features Group (Anchored to Bottom on Mobile) */}
            <div className="hero-bottom-actions" style={{ width: '100%', marginTop: 'auto' }}>
              <div
                className="hero-cta-group"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '0',
                  width: '100%',
                }}
              >
                {/* Primary CTA: Create a Room */}
                <button
                  onClick={handleCreateRoom}
                  disabled={isCreating}
                  className="nb-button"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    backgroundColor: '#FFE000',
                    border: '2.5px solid #000000',
                    borderRadius: '14px',
                    boxShadow: '4px 4px 0px #000000',
                    padding: '13px 28px',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 900,
                    fontSize: '17px',
                    color: '#000000',
                    cursor: isCreating ? 'not-allowed' : 'pointer',
                    opacity: isCreating ? 0.8 : 1,
                    transition: 'all 0.12s ease',
                  }}
                >
                  <span>{isCreating ? 'Creating Room...' : 'Create a Room'}</span>
                  <ArrowRightIcon size={18} />
                </button>

                {/* Secondary CTA: Join a Room */}
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="nb-button"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#FFFFFF',
                    border: '2.5px solid #000000',
                    borderRadius: '14px',
                    boxShadow: '4px 4px 0px #000000',
                    padding: '13px 24px',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 900,
                    fontSize: '17px',
                    color: '#000000',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                >
                  <QrCodeIcon size={20} />
                  <span>Join a Room</span>
                </button>
              </div>

              {/* Discreet Recent Active Rooms Quick Access - No # symbol, strictly valid 4 digits */}
              {recentRooms.filter((r) => r.code && /^\d{4}$/.test(r.code.trim())).length > 0 && (
                <div
                  className="hero-active-rooms"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginTop: '12px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-display)',
                    color: '#52525B',
                  }}
                >
                  <span style={{ fontWeight: 800, color: '#18181B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Your Active Rooms:
                  </span>
                  {recentRooms
                    .filter((r) => r.code && /^\d{4}$/.test(r.code.trim()))
                    .map((r) => (
                      <button
                        key={r.code}
                        onClick={() => handleOpenCreatedRoom(r)}
                        title={`Reopen your room ${r.code}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          backgroundColor: '#FFFFFF',
                          border: '1.5px solid #000000',
                          borderRadius: '6px',
                          padding: '3px 9px',
                          fontSize: '12px',
                          fontFamily: 'var(--font-display)',
                          fontWeight: 800,
                          color: '#000000',
                          boxShadow: '1.5px 1.5px 0px #000000',
                          cursor: 'pointer',
                          transition: 'transform 0.1s ease, background-color 0.1s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#FFE000';
                          e.currentTarget.style.transform = 'translate(-1px, -1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                          e.currentTarget.style.transform = 'none';
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#00D084', display: 'inline-block' }} />
                        <span>{r.code}</span>
                      </button>
                    ))}
                </div>
              )}

              {/* 5. Feature Strip - In Very Small Manner Just Below Buttons */}
              <div className="nb-features-micro-strip">
                <div className="nb-micro-feature">
                  <ZapIcon size={13} color="#000000" />
                  <span>Instant Transfer</span>
                </div>
                <div className="nb-micro-divider" aria-hidden="true">•</div>
                <div className="nb-micro-feature">
                  <ShieldIcon size={13} color="#000000" />
                  <span>End-to-End Private</span>
                </div>
                <div className="nb-micro-divider" aria-hidden="true">•</div>
                <div className="nb-micro-feature">
                  <ClockIcon size={13} color="#000000" />
                  <span>24h Auto-Expiry</span>
                </div>
                <div className="nb-micro-divider" aria-hidden="true">•</div>
                <div className="nb-micro-feature">
                  <DownloadIcon size={13} color="#000000" />
                  <span>Single or ZIP</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Mascot Artwork (Happy.webp) */}
          <div
            className="hero-mascot-wrapper"
            style={{
              flex: '1 1 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          >
            <div
              className="hero-mascot-inner"
              style={{
                position: 'relative',
                width: 'clamp(360px, 42vw, 560px)',
                height: 'clamp(360px, 42vw, 560px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <picture style={{ display: 'block', width: '100%', height: '100%' }}>
                <source srcSet="/assets/Happy.webp" type="image/webp" />
                <img
                  src="/assets/Happy.png"
                  alt="Happy Droplet Mascot"
                  width={512}
                  height={512}
                  fetchPriority="high"
                  loading="eager"
                  decoding="async"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              </picture>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION: FEATURES (#features)
          ========================================================================= */}
      <section
        id="features"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '60px 20px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 3.5vw, 40px)',
              fontWeight: 900,
              color: '#000000',
              marginBottom: '10px',
            }}
          >
            Built for Quick Transfers, Not Eternal Storage
          </h2>
          <p style={{ fontSize: '15px', color: '#52525B', margin: 0 }}>
            Everything you need to move notes and files between your screens in seconds.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Card 1 */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '2.5px solid #000000',
              borderRadius: '16px',
              boxShadow: '4px 4px 0px #000000',
              padding: '24px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                backgroundColor: '#FFE000',
                border: '2px solid #000000',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <ZapIcon size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '8px' }}>
              Zero Accounts or Logins
            </h3>
            <p style={{ fontSize: '14px', color: '#52525B', lineHeight: 1.5 }}>
              No email verification, passwords, or personal account sign-in on borrowed or public devices.
            </p>
          </div>

          {/* Card 2 */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '2.5px solid #000000',
              borderRadius: '16px',
              boxShadow: '4px 4px 0px #000000',
              padding: '24px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                backgroundColor: '#FFE000',
                border: '2px solid #000000',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <ClockIcon size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '8px' }}>
              24-Hour Ephemeral Lifespan
            </h3>
            <p style={{ fontSize: '14px', color: '#52525B', lineHeight: 1.5 }}>
              Every room, message, and file automatically self-destructs after 24 hours. Nothing lingers on disk.
            </p>
          </div>

          {/* Card 3 */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '2.5px solid #000000',
              borderRadius: '16px',
              boxShadow: '4px 4px 0px #000000',
              padding: '24px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                backgroundColor: '#FFE000',
                border: '2px solid #000000',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <DownloadIcon size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '8px' }}>
              Individual or 1-Click ZIP
            </h3>
            <p style={{ fontSize: '14px', color: '#52525B', lineHeight: 1.5 }}>
              Download any file on the fly, or grab all files at once in an automatically compressed archive.
            </p>
          </div>

          {/* Card 4 */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '2.5px solid #000000',
              borderRadius: '16px',
              boxShadow: '4px 4px 0px #000000',
              padding: '24px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                backgroundColor: '#FFE000',
                border: '2px solid #000000',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <ShieldIcon size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '8px' }}>
              High-Entropy Session Security
            </h3>
            <p style={{ fontSize: '14px', color: '#52525B', lineHeight: 1.5 }}>
              Rooms require session bearer tokens. 4-digit codes are rate-limited with constant-time verification.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION: HOW IT WORKS (#how-it-works)
          ========================================================================= */}
      <section
        id="how-it-works"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '60px 20px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 3.5vw, 40px)',
              fontWeight: 900,
              color: '#000000',
              marginBottom: '10px',
            }}
          >
            How Droplet Works
          </h2>
          <p style={{ fontSize: '15px', color: '#52525B', margin: 0 }}>
            Three simple actions from room creation to automated destruction.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Step 1 */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '2.5px solid #000000',
              borderRadius: '16px',
              boxShadow: '4px 4px 0px #000000',
              padding: '28px 24px',
              position: 'relative',
            }}
          >
            <div
              style={{
                display: 'inline-block',
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: '11px',
                letterSpacing: '0.04em',
                backgroundColor: '#FFE000',
                color: '#000000',
                border: '1.5px solid #000000',
                borderRadius: '6px',
                padding: '3px 8px',
                marginBottom: '14px',
              }}
            >
              Step 1
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '8px' }}>Create a Room</h3>
            <p style={{ fontSize: '14px', color: '#52525B', lineHeight: 1.5 }}>
              Click <strong>Create a Room</strong> to generate a temporary 4-digit code. Share the code or scan the QR code.
            </p>
          </div>

          {/* Step 2 */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '2.5px solid #000000',
              borderRadius: '16px',
              boxShadow: '4px 4px 0px #000000',
              padding: '28px 24px',
              position: 'relative',
            }}
          >
            <div
              style={{
                display: 'inline-block',
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: '11px',
                letterSpacing: '0.04em',
                backgroundColor: '#FFE000',
                color: '#000000',
                border: '1.5px solid #000000',
                borderRadius: '6px',
                padding: '3px 8px',
                marginBottom: '14px',
              }}
            >
              Step 2
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '8px' }}>Drop Notes & Files</h3>
            <p style={{ fontSize: '14px', color: '#52525B', lineHeight: 1.5 }}>
              Type notes, paste links, or drag and drop files up to 50 MiB each. Items sync instantly via WebSockets.
            </p>
          </div>

          {/* Step 3 */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '2.5px solid #000000',
              borderRadius: '16px',
              boxShadow: '4px 4px 0px #000000',
              padding: '28px 24px',
              position: 'relative',
            }}
          >
            <div
              style={{
                display: 'inline-block',
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: '11px',
                letterSpacing: '0.04em',
                backgroundColor: '#FFE000',
                color: '#000000',
                border: '1.5px solid #000000',
                borderRadius: '6px',
                padding: '3px 8px',
                marginBottom: '14px',
              }}
            >
              Step 3
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '8px' }}>Pick Up & Let Go</h3>
            <p style={{ fontSize: '14px', color: '#52525B', lineHeight: 1.5 }}>
              On your other computer or phone, enter the code to download everything. In 24 hours, all evidence disappears.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION: WHY DROPLET (#why-droplet)
          ========================================================================= */}
      <section
        id="why-droplet"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '80px 20px',
        }}
      >
        <div style={{ marginBottom: '36px' }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(30px, 3.8vw, 44px)',
              fontWeight: 900,
              color: '#000000',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              marginBottom: '12px',
            }}
          >
            No Logins on Borrowed Screens
          </h2>
          <p
            style={{
              fontSize: 'clamp(15px, 1.2vw, 17px)',
              color: '#52525B',
              lineHeight: 1.55,
              maxWidth: '680px',
              margin: 0,
            }}
          >
            AirDrop only works between Apple devices. Emailing yourself leaves passwords behind in computer labs, hotels, and print shops. Droplet is an ephemeral peer bridge for every browser.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            alignItems: 'stretch',
          }}
        >
          {/* Column 1: The Friction of Common Workarounds */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '2.5px solid #000000',
              borderRadius: '16px',
              boxShadow: '4px 4px 0px #000000',
              padding: '32px 28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 900,
                  fontSize: '20px',
                  color: '#000000',
                  marginBottom: '6px',
                }}
              >
                The Usual Workarounds
              </div>
              <p style={{ fontSize: '15px', color: '#71717A', marginBottom: '24px', lineHeight: 1.5 }}>
                How people move files today when AirDrop isn't an option:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Item 1: Emailing Yourself */}
                <div
                  style={{
                    borderLeft: '3px solid #DC2626',
                    paddingLeft: '14px',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '15px', color: '#000000', marginBottom: '4px' }}>
                    Emailing files to yourself
                  </div>
                  <div style={{ fontSize: '14px', color: '#52525B', lineHeight: 1.55 }}>
                    Clogs your personal inbox and leaves active Google or Microsoft sessions saved in browser history on lab or borrowed computers.
                  </div>
                </div>

                {/* Item 2: USB Flash Drives */}
                <div
                  style={{
                    borderLeft: '3px solid #DC2626',
                    paddingLeft: '14px',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '15px', color: '#000000', marginBottom: '4px' }}>
                    USB flash drives and dongles
                  </div>
                  <div style={{ fontSize: '14px', color: '#52525B', lineHeight: 1.55 }}>
                    Modern laptops lack legacy USB-A ports, dongles get misplaced, and thumb drives risk transferring malware across school workstations.
                  </div>
                </div>

                {/* Item 3: Cloud Storage Links */}
                <div
                  style={{
                    borderLeft: '3px solid #DC2626',
                    paddingLeft: '14px',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '15px', color: '#000000', marginBottom: '4px' }}>
                    Public cloud storage links
                  </div>
                  <div style={{ fontSize: '14px', color: '#52525B', lineHeight: 1.55 }}>
                    Requires signing into Google Drive or Dropbox, toggling link permissions, and manually deleting stale folders weeks later.
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: '28px',
                paddingTop: '16px',
                borderTop: '1.5px dashed #E4E4E7',
                fontSize: '13.5px',
                fontWeight: 700,
                color: '#DC2626',
              }}
            >
              Result: Permanent digital footprints, account exposure, and clutter.
            </div>
          </div>

          {/* Column 2: The Droplet Standard */}
          <div
            style={{
              backgroundColor: '#FFE000',
              border: '2.5px solid #000000',
              borderRadius: '16px',
              boxShadow: '5px 5px 0px #000000',
              padding: '32px 28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 900,
                  fontSize: '22px',
                  color: '#000000',
                  marginBottom: '6px',
                }}
              >
                The Droplet Standard
              </div>
              <p style={{ fontSize: '15px', color: '#18181B', fontWeight: 600, marginBottom: '24px', lineHeight: 1.5 }}>
                Purpose-built for temporary handoffs with zero residue:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Feature 1: Ephemeral 4-Digit Code */}
                <div
                  style={{
                    borderLeft: '3px solid #000000',
                    paddingLeft: '14px',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '15px', color: '#000000', marginBottom: '4px' }}>
                    Instant 4-digit room code
                  </div>
                  <div style={{ fontSize: '14px', color: '#18181B', lineHeight: 1.55 }}>
                    Open any browser, type a 4-digit code, and start transferring. Zero accounts, zero passwords, and zero personal information ever requested.
                  </div>
                </div>

                {/* Feature 2: High-Entropy Token Isolation */}
                <div
                  style={{
                    borderLeft: '3px solid #000000',
                    paddingLeft: '14px',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '15px', color: '#000000', marginBottom: '4px' }}>
                    High-entropy session isolation
                  </div>
                  <div style={{ fontSize: '14px', color: '#18181B', lineHeight: 1.55 }}>
                    Each device receives a cryptographic bearer token. Verification is rate-limited and executed in constant time to prevent brute-force probing.
                  </div>
                </div>

                {/* Feature 3: Guaranteed 24h Erasure */}
                <div
                  style={{
                    borderLeft: '3px solid #000000',
                    paddingLeft: '14px',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '15px', color: '#000000', marginBottom: '4px' }}>
                    Guaranteed self-destruction
                  </div>
                  <div style={{ fontSize: '14px', color: '#18181B', lineHeight: 1.55 }}>
                    All rooms and uploaded files permanently vanish after 24 hours. Files are wiped from server disk with no lingering archives.
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: '28px',
                paddingTop: '16px',
                borderTop: '1.5px dashed rgba(0, 0, 0, 0.25)',
                fontSize: '13.5px',
                fontWeight: 800,
                color: '#000000',
              }}
            >
              Result: Drop it, pick it up on any screen, and let it disappear.
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION: FAQ (#faq)
          ========================================================================= */}
      <section
        id="faq"
        style={{
          maxWidth: '860px',
          margin: '0 auto',
          padding: '60px 20px 80px 20px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 3.5vw, 38px)',
              fontWeight: 900,
              color: '#000000',
              marginBottom: '10px',
            }}
          >
            Frequently Asked Questions
          </h2>
          <p style={{ fontSize: '15px', color: '#52525B', margin: 0 }}>
            Everything you need to know about rooms, limits, and security.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[
            {
              q: 'Do I need an account or email to use Droplet?',
              a: 'No! Droplet requires zero accounts, emails, or personal identification. You simply click "Create a Room", get a 4-digit code, and share whatever you need.',
            },
            {
              q: 'How long do files and messages stay stored?',
              a: 'All rooms and their contents automatically self-destruct exactly 24 hours after room creation. Files are completely removed from the server disk.',
            },
            {
              q: 'What is the maximum file size supported?',
              a: 'You can upload individual files up to 50 MiB each, and up to 20 files (or 200 MiB total) per room. All major file formats (PDFs, images, archives, code) are supported.',
            },
            {
              q: 'Can I download all shared files together?',
              a: 'Yes! Simply click the "Download All (ZIP)" button inside any active room to download all uploaded files in a single compressed ZIP archive.',
            },
            {
              q: 'Is Droplet private and secure?',
              a: 'Every device that joins receives a unique cryptographic bearer token. All traffic uses HTTPS/WSS encryption. Codes are checked in constant time and rate-limited against brute-force attacks.',
            },
          ].map((item, idx) => {
            const isOpen = expandedFaq === idx;
            return (
              <div
                key={idx}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '2px solid #000000',
                  borderRadius: '12px',
                  boxShadow: isOpen ? '4px 4px 0px #000000' : '2px 2px 0px #000000',
                  overflow: 'hidden',
                  transition: 'all 0.15s ease',
                }}
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: '16px',
                    color: '#000000',
                  }}
                >
                  <span>{item.q}</span>
                  <span
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      fontSize: '18px',
                      fontWeight: 900,
                    }}
                  >
                    ▼
                  </span>
                </button>
                {isOpen && (
                  <div
                    style={{
                      padding: '0 20px 18px 20px',
                      fontSize: '14px',
                      color: '#52525B',
                      lineHeight: 1.55,
                      borderTop: '1px dashed #E4E4E7',
                      paddingTop: '12px',
                    }}
                  >
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          FOOTER
          ========================================================================= */}
      <footer
        style={{
          borderTop: '2.5px solid #000000',
          backgroundColor: '#FFFFFF',
          padding: '36px 20px',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <DropletLogo size="sm" layout="horizontal" />
            <span style={{ fontSize: '13px', color: '#71717A', fontWeight: 600 }}>
              — Temporary peer sharing without accounts.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', fontWeight: 700 }}>
            <a href="#features" style={{ color: '#000000', textDecoration: 'none' }}>
              Features
            </a>
            <a href="#how-it-works" style={{ color: '#000000', textDecoration: 'none' }}>
              How it works
            </a>
            <a href="#why-droplet" style={{ color: '#000000', textDecoration: 'none' }}>
              Why Droplet
            </a>
            <a href="#faq" style={{ color: '#000000', textDecoration: 'none' }}>
              FAQ
            </a>
          </div>

          <div style={{ fontSize: '12px', color: '#71717A', fontWeight: 600 }}>
            Drop it. Pick it up. Let it disappear.
          </div>
        </div>
      </footer>

      {/* Centered Join Room Modal */}
      {showJoinModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 9999,
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => setShowJoinModal(false)}
        >
          <div
            className="nb-modal-content"
            style={{
              width: '100%',
              maxWidth: '400px',
              backgroundColor: '#FFFFFF',
              border: '2.5px solid #000000',
              borderRadius: '20px',
              boxShadow: '6px 6px 0px #000000',
              padding: '24px',
              textAlign: 'left',
              position: 'relative',
              animation: 'droplet-drawer-unfold 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Brand Icon + Title + Tactile Close Button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: '#FFE000',
                    border: '2px solid #000000',
                    boxShadow: '2px 2px 0px #000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <ZapIcon size={20} color="#000000" />
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 900,
                      fontSize: '19px',
                      color: '#000000',
                      margin: 0,
                      lineHeight: 1.2,
                    }}
                  >
                    Join a Room
                  </h3>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '12.5px',
                      color: '#71717A',
                      margin: '2px 0 0 0',
                      fontWeight: 500,
                    }}
                  >
                    Enter the 4-digit code to connect
                  </p>
                </div>
              </div>

              {/* Tactile Close Button */}
              <button
                onClick={() => setShowJoinModal(false)}
                aria-label="Close modal"
                className="nb-button"
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#FFFFFF',
                  border: '2px solid #000000',
                  borderRadius: '8px',
                  boxShadow: '2px 2px 0px #000000',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000000',
                  transition: 'all 0.12s ease',
                  padding: 0,
                }}
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <RoomCodeInput
                value={code}
                onChange={handleCodeChange}
                onSubmit={handleJoinRoom}
                disabled={isJoining}
                autoFocus={true}
                error={modalError}
              />

              {/* Quick Rejoin Chips for Recent Rooms */}
              {recentRooms.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    gap: '6px',
                    padding: '2px 0',
                  }}
                >
                  <span style={{ fontSize: '11.5px', color: '#71717A', fontWeight: 700 }}>
                    Your rooms:
                  </span>
                  {recentRooms
                    .filter((r) => r.code && /^\d{4}$/.test(r.code.trim()))
                    .map((r) => (
                      <button
                        key={r.code}
                        type="button"
                        onClick={() => handleCodeChange(r.code)}
                        style={{
                          padding: '2px 8px',
                          fontSize: '12px',
                          fontFamily: 'var(--font-display)',
                          fontWeight: 800,
                          backgroundColor: code === r.code ? '#FFE000' : '#FFFFFF',
                          border: '1.5px solid #000000',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          boxShadow: '1.5px 1.5px 0px #000000',
                          transition: 'all 0.1s ease',
                        }}
                      >
                        {r.code}
                      </button>
                    ))}
                </div>
              )}

              {/* Toast message shown ONLY when user attempts to submit with < 4 digits */}
              {modalError && (
                <div
                  role="alert"
                  style={{
                    backgroundColor: '#FFF0F0',
                    border: '2px solid #DE350B',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontFamily: 'var(--font-display)',
                    fontSize: '13px',
                    fontWeight: 800,
                    color: '#DE350B',
                    textAlign: 'center',
                    boxShadow: '2px 2px 0px #000000',
                  }}
                >
                  {modalError}
                </div>
              )}

              {/* Dynamic Action Button */}
              <button
                onClick={handleConnectClick}
                disabled={isJoining}
                className="nb-button"
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: code.length === 4 ? '#FFE000' : '#F4F4F5',
                  border: code.length === 4 ? '2.5px solid #000000' : '2px dashed #000000',
                  borderRadius: '12px',
                  boxShadow: code.length === 4 ? '3px 3px 0px #000000' : '2px 2px 0px rgba(0, 0, 0, 0.2)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 900,
                  fontSize: '15.5px',
                  color: code.length === 4 ? '#000000' : '#71717A',
                  cursor: isJoining ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{isJoining ? 'Connecting...' : 'Connect & Join Room'}</span>
                {code.length === 4 && !isJoining && <ArrowRightIcon size={16} />}
              </button>

              {/* Sub-hint */}
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '12px',
                  fontFamily: 'var(--font-body)',
                  color: '#71717A',
                  fontWeight: 500,
                  marginTop: '2px',
                }}
              >
                Tip: Joining from a phone? You can also scan the host's QR code.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeView;
