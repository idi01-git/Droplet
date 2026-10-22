import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { DropletLogo, DropletMascot } from '../components/brand';
import { Button, Card, RoomCodeInput, Alert } from '../components/ui';
import { ArrowRight, Sparkles, Shield, Clock, Zap } from 'lucide-react';
import { api } from '../services/api';
import { RoomSummary } from '../../shared/types';

export interface HomeViewProps {
  onRoomJoined: (room: RoomSummary, sessionToken: string) => void;
  initialCode?: string;
}

export const HomeView: React.FC<HomeViewProps> = ({ onRoomJoined, initialCode = '' }) => {
  const [code, setCode] = useState(initialCode);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const result = await api.createRoom();

      // Launch joyful confetti burst!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFE000', '#000000', '#00D084', '#3B82F6', '#A855F7'],
      });

      onRoomJoined(result.room, result.sessionToken);
    } catch (err: any) {
      setError(err.message || 'Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (code.length !== 4) {
      setError('Please enter a 4-digit room code.');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const result = await api.joinRoom(code);
      onRoomJoined(result.room, result.sessionToken);
    } catch (err: any) {
      setError(err.message || 'Room not found or has expired.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '36px 20px' }}>
      {/* Hero Banner */}
      <div
        style={{
          backgroundColor: 'var(--color-primary)',
          border: 'var(--border-thick)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-standard)',
          padding: '36px 32px',
          marginBottom: '36px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ flex: '1 1 480px' }}>
          <DropletLogo size="lg" layout="horizontal" />
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 5vw, 42px)',
              fontWeight: 800,
              color: 'var(--color-ink)',
              marginTop: '16px',
              lineHeight: 1.15,
            }}
          >
            Create a room. Drop anything.
            <br />
            Pick it up anywhere. Let it disappear.
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '16px',
              color: 'var(--color-ink)',
              marginTop: '12px',
              fontWeight: 600,
              maxWidth: '520px',
            }}
          >
            Instant peer transfer for student labs, borrowed devices, and quick snippets.
            No logins, no persistent accounts, automatic 24-hour expiration.
          </p>

          {/* Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '18px' }}>
            <span className="nb-badge" style={{ backgroundColor: '#FFF', border: '2px solid #000', padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontWeight: 800, fontSize: '12px' }}>
              ⚡ FAST
            </span>
            <span className="nb-badge" style={{ backgroundColor: '#FFF', border: '2px solid #000', padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontWeight: 800, fontSize: '12px' }}>
              ✨ SIMPLE
            </span>
            <span className="nb-badge" style={{ backgroundColor: '#FFF', border: '2px solid #000', padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontWeight: 800, fontSize: '12px' }}>
              ⏳ 24H EXPIRY
            </span>
            <span className="nb-badge" style={{ backgroundColor: '#000', color: '#FFF', border: '2px solid #000', padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontWeight: 800, fontSize: '12px' }}>
              🔒 NO LOGIN
            </span>
          </div>
        </div>

        {/* Mascot */}
        <div
          className="droplet-float"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            userSelect: 'none',
          }}
        >
          <DropletMascot size={150} mood="waving" withSparkles={true} />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: '15px',
              letterSpacing: '0.04em',
              color: 'var(--color-ink)',
              backgroundColor: '#FFFFFF',
              border: '2px solid #000000',
              borderRadius: 'var(--radius-md)',
              boxShadow: '2px 2px 0px #000000',
              padding: '4px 12px',
              marginTop: '8px',
            }}
          >
            DROP • SHARE • DONE
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{ marginBottom: '24px' }}>
          <Alert variant="error" message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {/* Main Action Cards: Create vs Join */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          marginBottom: '36px',
        }}
      >
        {/* Create Room Card */}
        <Card variant="default" padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Sparkles size={22} strokeWidth={2.5} color="var(--color-ink)" />
            <h2 style={{ fontSize: '24px' }}>New Room</h2>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '24px', lineHeight: 1.4 }}>
            Get a 4-digit code to share with other devices. Drop notes, links, or files up to 50 MiB each.
          </p>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isCreating}
            rightIcon={<ArrowRight size={20} strokeWidth={2.5} />}
            onClick={handleCreateRoom}
          >
            Create Room
          </Button>
        </Card>

        {/* Join Room Card */}
        <Card variant="surface" padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Zap size={22} strokeWidth={2.5} color="var(--color-ink)" />
            <h2 style={{ fontSize: '24px' }}>Join Room</h2>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '18px', lineHeight: 1.4 }}>
            Enter the 4-digit code from your other device to connect and pick up shared items.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <RoomCodeInput
              value={code}
              onChange={setCode}
              onSubmit={handleJoinRoom}
              disabled={isJoining}
            />

            <Button
              variant="black"
              size="md"
              fullWidth
              isLoading={isJoining}
              disabled={code.length !== 4}
              onClick={handleJoinRoom}
            >
              Join Room
            </Button>
          </div>
        </Card>
      </div>

      {/* Privacy Guarantee Footer Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
        }}
      >
        <Card variant="default" padding="sm">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={20} strokeWidth={2.5} />
            <div>
              <h3 style={{ fontSize: '15px' }}>24-Hour Expiration</h3>
              <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                Rooms and uploads expire strictly 24 hours after creation.
              </p>
            </div>
          </div>
        </Card>

        <Card variant="default" padding="sm">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={20} strokeWidth={2.5} />
            <div>
              <h3 style={{ fontSize: '15px' }}>Account-Free & Private</h3>
              <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                No tracking, no sign-ins, and high-entropy device sessions.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default HomeView;
