import React from 'react';
import DropletLogo from '../brand/DropletLogo';
import { Home, Share2, Info, Sparkles } from 'lucide-react';

export interface NavbarProps {
  activeTab?: 'home' | 'room' | 'info';
  onSelectTab?: (tab: 'home' | 'room' | 'info') => void;
  roomCode?: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab = 'home',
  onSelectTab,
  roomCode,
}) => {
  return (
    <header
      className="nb-navbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 24px',
        backgroundColor: 'var(--color-surface-card)',
        borderBottom: 'var(--border-thick)',
        boxShadow: 'var(--shadow-small)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Brand Logo */}
      <div
        onClick={() => onSelectTab && onSelectTab('home')}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
      >
        <DropletLogo size="sm" layout="horizontal" />
      </div>

      {/* Navigation Pills */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--color-surface)',
          padding: '4px',
          borderRadius: 'var(--radius-full)',
          border: '2px solid var(--color-ink)',
        }}
      >
        <button
          onClick={() => onSelectTab && onSelectTab('home')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            border: activeTab === 'home' ? '2px solid var(--color-ink)' : '2px solid transparent',
            backgroundColor: activeTab === 'home' ? 'var(--color-primary)' : 'transparent',
            boxShadow: activeTab === 'home' ? '1.5px 1.5px 0px var(--color-ink)' : 'none',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '13px',
            color: 'var(--color-ink)',
            cursor: 'pointer',
          }}
        >
          <Home size={14} strokeWidth={2.5} />
          <span>Home</span>
        </button>

        {roomCode && (
          <button
            onClick={() => onSelectTab && onSelectTab('room')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              border: activeTab === 'room' ? '2px solid var(--color-ink)' : '2px solid transparent',
              backgroundColor: activeTab === 'room' ? 'var(--color-primary)' : 'transparent',
              boxShadow: activeTab === 'room' ? '1.5px 1.5px 0px var(--color-ink)' : 'none',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '13px',
              color: 'var(--color-ink)',
              cursor: 'pointer',
            }}
          >
            <Share2 size={14} strokeWidth={2.5} />
            <span>Room {roomCode}</span>
          </button>
        )}

        <button
          onClick={() => onSelectTab && onSelectTab('info')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            border: activeTab === 'info' ? '2px solid var(--color-ink)' : '2px solid transparent',
            backgroundColor: activeTab === 'info' ? 'var(--color-primary)' : 'transparent',
            boxShadow: activeTab === 'info' ? '1.5px 1.5px 0px var(--color-ink)' : 'none',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '13px',
            color: 'var(--color-ink)',
            cursor: 'pointer',
          }}
        >
          <Info size={14} strokeWidth={2.5} />
          <span>About</span>
        </button>
      </nav>

      {/* Feature Badge */}
      <div style={{ display: 'none' }} className="nb-navbar-desktop-badge">
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '12px',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            color: 'var(--color-ink)',
          }}
        >
          <Sparkles size={14} strokeWidth={2.5} color="var(--color-primary)" />
          NO LOGIN REQUIRED
        </span>
      </div>
    </header>
  );
};

export default Navbar;
