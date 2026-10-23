import React, { useState, useEffect } from 'react';
import DropletLogo from '../brand/DropletLogo';
import { ArrowRightIcon, QrCodeIcon, ShareIcon } from '../icons';

export interface NavbarProps {
  activeTab?: 'home' | 'room' | 'info';
  onSelectTab?: (tab: 'home' | 'room' | 'info') => void;
  onCreateRoom?: () => void;
  onJoinRoom?: () => void;
  roomCode?: string | null;
}

type NavSection = 'features' | 'how-it-works' | 'why-droplet' | 'faq';

export const Navbar: React.FC<NavbarProps> = ({
  activeTab = 'home',
  onSelectTab,
  onCreateRoom,
  onJoinRoom,
  roomCode,
}) => {
  const [activeSection, setActiveSection] = useState<NavSection | null>(null);

  // Track scroll position to update active pill on home view
  useEffect(() => {
    if (activeTab !== 'home') {
      setActiveSection(null);
      return;
    }

    const handleScroll = () => {
      const scrollY = window.scrollY;
      if (scrollY < 200) {
        setActiveSection(null);
        return;
      }

      const sections: NavSection[] = ['faq', 'why-droplet', 'how-it-works', 'features'];
      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 260 && rect.bottom >= 100) {
            setActiveSection(sectionId);
            return;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab]);

  const handleHomeClick = () => {
    setActiveSection(null);
    if (activeTab !== 'home' && onSelectTab) {
      onSelectTab('home');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (sectionId: NavSection) => {
    setActiveSection(sectionId);

    if (activeTab !== 'home' && onSelectTab) {
      onSelectTab('home');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      return;
    }

    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleJoinRoom = () => {
    if (onJoinRoom) {
      onJoinRoom();
    } else {
      if (activeTab !== 'home' && onSelectTab) {
        onSelectTab('home');
      }
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('droplet:open-join-room'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
    }
  };

  const navLinks: { id: NavSection; label: string }[] = [
    { id: 'features', label: 'Features' },
    { id: 'how-it-works', label: 'How it works' },
    { id: 'why-droplet', label: 'Why Droplet' },
    { id: 'faq', label: 'FAQ' },
  ];

  return (
    <div
      style={{
        padding: '0 24px',
        position: 'fixed',
        top: '16px',
        left: 0,
        right: 0,
        zIndex: 100,
        pointerEvents: 'none',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <header
        className="nb-navbar"
        style={{
          pointerEvents: 'auto',
          width: '100%',
          maxWidth: '1232px',
          minHeight: '68px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px 10px 22px',
          backgroundColor: '#FFFDF0',
          border: '2.5px solid #000000',
          borderRadius: '18px',
          boxShadow: '4px 4px 0px #000000',
          gap: '12px',
          boxSizing: 'border-box',
        }}
      >
        {/* Brand Horizontal Logo on Left (Functions as Home Button) */}
        <div
          onClick={handleHomeClick}
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            userSelect: 'none',
            flexShrink: 0,
            transition: 'transform 0.12s ease',
          }}
          title="Droplet Home"
        >
          <DropletLogo layout="horizontal" height={40} priority={true} />
        </div>

        {/* Center Navigation Links (Features, How it works, Why Droplet, FAQ) */}
        <nav className="nb-nav-links">
          {navLinks.map(({ id, label }) => {
            const isActive = activeTab === 'home' && activeSection === id;
            return (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                style={{
                  padding: isActive ? '8px 18px' : '8px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: isActive ? '#FFE000' : 'transparent',
                  fontFamily: 'var(--font-display)',
                  fontWeight: isActive ? 800 : 700,
                  fontSize: '14px',
                  color: '#000000',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease, padding 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </button>
            );
          })}

          {roomCode && activeTab !== 'room' && (
            <button
              onClick={() => onSelectTab && onSelectTab('room')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '10px',
                border: '2px dashed #000000',
                backgroundColor: '#FFFFFF',
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: '13.5px',
                color: '#000000',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              title="Return to active room"
            >
              <ShareIcon size={14} />
              <span>Resume Room {roomCode}</span>
            </button>
          )}
        </nav>

        {/* Right Actions: Join Room & Create a Room (Hidden when inside an active room session) */}
        {activeTab !== 'room' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {/* Join Room Secondary Button */}
            <button
              onClick={handleJoinRoom}
              className="nb-button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#FFFFFF',
                border: '2.5px solid #000000',
                borderRadius: '12px',
                boxShadow: '2.5px 2.5px 0px #000000',
                padding: '10px 18px',
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: '14px',
                color: '#000000',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.12s ease',
              }}
            >
              <QrCodeIcon size={17} />
              <span className="nb-btn-text-full">Join Room</span>
              <span className="nb-btn-text-short">Join</span>
            </button>

            {/* Create a Room Primary Button */}
            <button
              onClick={() => {
                if (onCreateRoom) {
                  onCreateRoom();
                } else if (onSelectTab) {
                  onSelectTab('home');
                }
              }}
              className="nb-button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#FFE000',
                border: '2.5px solid #000000',
                borderRadius: '12px',
                boxShadow: '2.5px 2.5px 0px #000000',
                padding: '10px clamp(12px, 2.5vw, 22px)',
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: '14px',
                color: '#000000',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.12s ease',
              }}
            >
              <span className="nb-btn-text-full">Create a Room</span>
              <span className="nb-btn-text-short">Create</span>
              <ArrowRightIcon size={16} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          /* When in an active room: show clean session indicator, no duplicate create/join buttons */
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 14px',
                backgroundColor: '#FFFFFF',
                border: '2px solid #000000',
                borderRadius: '10px',
                boxShadow: '2px 2px 0px #000000',
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: '13px',
                color: '#000000',
                userSelect: 'none',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#00A86B',
                  display: 'inline-block',
                }}
              />
              <span>In Room #{roomCode}</span>
            </div>
          </div>
        )}
      </header>
    </div>
  );
};

export default Navbar;
