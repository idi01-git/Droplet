import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Navbar, Card, Button } from './components/ui';
import { HomeView } from './views/HomeView';
import { RoomView } from './views/RoomView';
import { ExpiredView } from './views/ExpiredView';
import { NotFoundView } from './views/NotFoundView';
import { RoomSummary } from '../shared/types';
import { api } from './services/api';
import { recentRoomsService, MAX_ACTIVE_CREATED_ROOMS } from './services/recentRooms';

const STORAGE_KEY_ROOM = 'droplet_active_room';
const STORAGE_KEY_TOKEN = 'droplet_session_token';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'room' | 'info' | '404'>('home');
  const [currentRoom, setCurrentRoom] = useState<RoomSummary | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [expiredReason, setExpiredReason] = useState<string | null>(null);
  const [initialJoinCode, setInitialJoinCode] = useState<string>('');
  const [homeNotice, setHomeNotice] = useState<{
    variant: 'warning' | 'info' | 'error' | 'success';
    message: string;
  } | null>(null);

  // Check URL query parameter and pathname on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname !== '/' && pathname !== '' && pathname !== '/index.html') {
        setActiveTab('404');
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === '404' || params.get('preview') === '404') {
        setActiveTab('404');
      }
      const joinParam = params.get('join');
      if (joinParam && /^\d{4}$/.test(joinParam)) {
        setInitialJoinCode(joinParam);
      }

      // Handle popstate (browser back/forward button)
      const handlePopState = () => {
        const path = window.location.pathname;
        if (path !== '/' && path !== '' && path !== '/index.html') {
          setActiveTab('404');
        } else if (!currentRoom) {
          setActiveTab('home');
        }
      };
      window.addEventListener('popstate', handlePopState);

      // Check localStorage for persisted session
      const savedRoom = localStorage.getItem(STORAGE_KEY_ROOM);
      const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
      if (savedRoom && savedToken) {
        try {
          const parsed = JSON.parse(savedRoom) as RoomSummary;
          if (Date.now() < parsed.expiresAt) {
            // Recover room code from recent rooms cache if missing
            if (!parsed.code || !/^\d{4}$/.test(parsed.code.trim())) {
              const recent = recentRoomsService.getRecentRooms().find((r) => r.id === parsed.id);
              if (recent && recent.code) {
                parsed.code = recent.code;
              }
            }
            setCurrentRoom(parsed);
            setSessionToken(savedToken);
            setActiveTab('room');
          } else {
            localStorage.removeItem(STORAGE_KEY_ROOM);
            localStorage.removeItem(STORAGE_KEY_TOKEN);
          }
        } catch {
          // Ignore invalid json
        }
      }
    }
  }, []);

  const handleRoomJoined = (room: RoomSummary, token: string) => {
    // Recover room code from recent rooms or currentRoom if missing
    if (!room.code || !/^\d{4}$/.test(room.code.trim())) {
      const recent = recentRoomsService.getRecentRooms().find((r) => r.id === room.id);
      if (recent && recent.code) {
        room.code = recent.code;
      } else if (currentRoom && currentRoom.id === room.id && currentRoom.code) {
        room.code = currentRoom.code;
      }
    }
    setCurrentRoom(room);
    setSessionToken(token);
    setExpiredReason(null);
    setHomeNotice(null);
    setActiveTab('room');

    try {
      localStorage.setItem(STORAGE_KEY_ROOM, JSON.stringify(room));
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
      recentRoomsService.addRecentRoom(room, token);
    } catch {
      // Storage access blocked or quota exceeded
    }
  };

  const handleGoHome = () => {
    if (typeof window !== 'undefined' && window.location.pathname !== '/' && window.location.pathname !== '') {
      window.history.pushState({}, '', '/');
    }
    setExpiredReason(null);
    setHomeNotice(null);
    setActiveTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setSessionToken(null);
    setExpiredReason(null);
    setHomeNotice(null);
    if (typeof window !== 'undefined' && window.location.pathname !== '/' && window.location.pathname !== '') {
      window.history.pushState({}, '', '/');
    }
    setActiveTab('home');

    localStorage.removeItem(STORAGE_KEY_ROOM);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
  };

  const handleRoomExpired = (reason?: string) => {
    if (currentRoom) {
      recentRoomsService.removeRecentRoom(currentRoom.code);
    }
    setExpiredReason(reason || 'This room has reached its 24-hour expiration.');
    setCurrentRoom(null);
    setSessionToken(null);

    localStorage.removeItem(STORAGE_KEY_ROOM);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
  };

  const handleRoomDeleted = (reason?: string) => {
    if (currentRoom) {
      recentRoomsService.removeRecentRoom(currentRoom.code);
    }
    setCurrentRoom(null);
    setSessionToken(null);
    setExpiredReason(null);
    setActiveTab('home');

    localStorage.removeItem(STORAGE_KEY_ROOM);
    localStorage.removeItem(STORAGE_KEY_TOKEN);

    setHomeNotice({
      variant: 'warning',
      message: reason || 'The room was deleted by the owner.',
    });
  };

  const handleQuickCreate = async () => {
    const activeCreated = recentRoomsService.getCreatedRooms();
    if (activeCreated.length >= MAX_ACTIVE_CREATED_ROOMS) {
      alert(
        `Active room limit reached (${MAX_ACTIVE_CREATED_ROOMS} rooms max). Please close an existing room or wait for it to expire before creating a new one.`
      );
      return;
    }

    try {
      const result = await api.createRoom();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFE000', '#000000', '#00D084', '#3B82F6'],
      });
      handleRoomJoined(result.room, result.sessionToken);
    } catch (err: any) {
      alert(err.message || 'Failed to create room. Please try again.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'room' && !currentRoom) return;
          if (tab === 'home') {
            handleGoHome();
          } else {
            setActiveTab(tab);
          }
        }}
        onCreateRoom={handleQuickCreate}
        onJoinRoom={() => {
          if (activeTab !== 'home') handleGoHome();
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('droplet:open-join-room'));
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 50);
        }}
        roomCode={activeTab === 'room' && currentRoom ? currentRoom.code : null}
      />

      <main className={activeTab === 'home' ? undefined : 'nb-main-content'}>
        {activeTab === '404' ? (
          <NotFoundView
            onGoHome={handleGoHome}
            onJoinRoom={() => {
              handleGoHome();
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('droplet:open-join-room'));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }, 60);
            }}
            onCreateRoom={handleQuickCreate}
          />
        ) : expiredReason ? (
          <ExpiredView
            reason={expiredReason}
            onGoHome={handleGoHome}
          />
        ) : activeTab === 'room' && currentRoom && sessionToken ? (
          <RoomView
            room={currentRoom}
            sessionToken={sessionToken}
            onLeave={handleLeaveRoom}
            onExpired={handleRoomExpired}
            onDeleted={handleRoomDeleted}
          />
        ) : activeTab === 'info' ? (
          /* About & Architecture View */
          <div style={{ maxWidth: '840px', margin: '40px auto', padding: '0 20px' }}>
            <Card variant="default" padding="lg">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '20px',
                  marginBottom: '24px',
                  paddingBottom: '20px',
                  borderBottom: 'var(--border-standard)',
                }}
              >
                <div>
                  <picture>
                    <source srcSet="/assets/Horizontal_Logo.webp" type="image/webp" />
                    <img
                      src="/assets/Horizontal Logo.png"
                      alt="Droplet"
                      width={160}
                      height={53}
                      decoding="async"
                      style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
                    />
                  </picture>
                  <p
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '18px',
                      fontWeight: 800,
                      color: 'var(--color-ink)',
                      marginTop: '8px',
                    }}
                  >
                    Temporary Peer Sharing Without Accounts
                  </p>
                </div>

                <picture>
                  <source srcSet="/assets/Happy.webp" type="image/webp" />
                  <img
                    src="/assets/Happy.png"
                    alt="Droplet Mascot"
                    width={90}
                    height={90}
                    loading="lazy"
                    decoding="async"
                    style={{
                      width: '90px',
                      height: '90px',
                      objectFit: 'contain',
                    }}
                  />
                </picture>
              </div>

              <p style={{ fontSize: '15px', color: 'var(--color-ink)', lineHeight: 1.6, marginBottom: '24px' }}>
                Droplet was created to solve the real annoyance of transferring text, URLs, code snippets,
                and documents between personal laptops, borrowed machines, and lab PCs without having to sign into
                personal email, Slack, or messaging services on untrusted devices.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px',
                  marginBottom: '28px',
                }}
              >
                <div
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '2px solid var(--color-ink)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '14px', color: 'var(--color-ink)' }}>
                    24-HOUR LIFETIME
                  </span>
                  <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginTop: '4px' }}>
                    Rooms and all uploaded files strictly self-destruct after 24 hours.
                  </p>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '2px solid var(--color-ink)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '14px', color: 'var(--color-ink)' }}>
                    50 MiB PER FILE
                  </span>
                  <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginTop: '4px' }}>
                    Up to 20 files and 200 MiB total per room. Zip download supported.
                  </p>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '2px solid var(--color-ink)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '14px', color: 'var(--color-ink)' }}>
                    ZERO TRACKING
                  </span>
                  <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginTop: '4px' }}>
                    High-entropy cryptographic tokens. No cookies or personal accounts.
                  </p>
                </div>
              </div>

              <div>
                <Button variant="primary" size="md" onClick={() => setActiveTab(currentRoom ? 'room' : 'home')}>
                  {currentRoom ? 'Return to Room' : 'Get Started'}
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <HomeView
            initialCode={initialJoinCode}
            onRoomJoined={handleRoomJoined}
            notice={homeNotice}
            onDismissNotice={() => setHomeNotice(null)}
          />
        )}
      </main>
    </div>
  );
};

export default App;
