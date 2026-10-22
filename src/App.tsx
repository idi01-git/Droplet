import React, { useState, useEffect } from 'react';
import { Navbar, Card, Button } from './components/ui';
import { HomeView } from './views/HomeView';
import { RoomView } from './views/RoomView';
import { ExpiredView } from './views/ExpiredView';
import { RoomSummary } from '../shared/types';
import { Sparkles } from 'lucide-react';

const STORAGE_KEY_ROOM = 'droplet_active_room';
const STORAGE_KEY_TOKEN = 'droplet_session_token';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'room' | 'info'>('home');
  const [currentRoom, setCurrentRoom] = useState<RoomSummary | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [expiredReason, setExpiredReason] = useState<string | null>(null);
  const [initialJoinCode, setInitialJoinCode] = useState<string>('');

  // Check URL query parameter on load (e.g., ?join=4827 from QR code)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const joinParam = params.get('join');
      if (joinParam && /^\d{4}$/.test(joinParam)) {
        setInitialJoinCode(joinParam);
      }

      // Check localStorage for persisted session
      const savedRoom = localStorage.getItem(STORAGE_KEY_ROOM);
      const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
      if (savedRoom && savedToken) {
        try {
          const parsed = JSON.parse(savedRoom) as RoomSummary;
          if (Date.now() < parsed.expiresAt) {
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
    setCurrentRoom(room);
    setSessionToken(token);
    setExpiredReason(null);
    setActiveTab('room');

    try {
      localStorage.setItem(STORAGE_KEY_ROOM, JSON.stringify(room));
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
    } catch {
      // Storage access blocked or quota exceeded
    }
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setSessionToken(null);
    setExpiredReason(null);
    setActiveTab('home');

    localStorage.removeItem(STORAGE_KEY_ROOM);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
  };

  const handleRoomExpired = (reason?: string) => {
    setExpiredReason(reason || 'This room has reached its 24-hour expiration or was deleted.');
    setCurrentRoom(null);
    setSessionToken(null);

    localStorage.removeItem(STORAGE_KEY_ROOM);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'room' && !currentRoom) return;
          setActiveTab(tab);
        }}
        roomCode={currentRoom ? currentRoom.code : null}
      />

      <main>
        {expiredReason ? (
          <ExpiredView
            reason={expiredReason}
            onGoHome={() => {
              setExpiredReason(null);
              setActiveTab('home');
            }}
          />
        ) : activeTab === 'room' && currentRoom && sessionToken ? (
          <RoomView
            room={currentRoom}
            sessionToken={sessionToken}
            onLeave={handleLeaveRoom}
            onExpired={handleRoomExpired}
          />
        ) : activeTab === 'info' ? (
          /* About & Architecture View */
          <div style={{ maxWidth: '840px', margin: '40px auto', padding: '0 20px' }}>
            <Card variant="default" padding="lg">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Sparkles size={24} strokeWidth={2.5} color="var(--color-primary)" />
                <h2 style={{ fontSize: '26px' }}>About Droplet</h2>
              </div>

              <p style={{ fontSize: '15px', color: 'var(--color-ink)', lineHeight: 1.6, marginBottom: '20px' }}>
                Droplet is built to solve the frustration of moving text, links, and documents between
                personal laptops, borrowed machines, and lab PCs without signing into personal email or
                messaging accounts.
              </p>

              <h3 style={{ fontSize: '18px', marginTop: '20px', marginBottom: '10px' }}>
                Core Guarantees & Limits (Spec §5)
              </h3>
              <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                <li><strong>24-Hour Lifetime:</strong> Rooms and uploaded files strictly expire 24 hours after creation.</li>
                <li><strong>Strict Quotas:</strong> Up to 20 files per room, 50 MiB per file, 200 MiB total per room.</li>
                <li><strong>Zero Logins:</strong> High-entropy cryptographic device credentials keep sessions private.</li>
                <li><strong>Owner Controls:</strong> Room creators can immediately delete rooms and revoke all access.</li>
              </ul>

              <div style={{ marginTop: '28px' }}>
                <Button variant="primary" onClick={() => setActiveTab(currentRoom ? 'room' : 'home')}>
                  {currentRoom ? 'Back to Room' : 'Get Started'}
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <HomeView
            initialCode={initialJoinCode}
            onRoomJoined={handleRoomJoined}
          />
        )}
      </main>
    </div>
  );
};

export default App;
