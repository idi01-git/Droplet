import React from 'react';
import { HomeIcon, QrCodeIcon, SparklesIcon } from '../components/icons';

export interface NotFoundViewProps {
  onGoHome: () => void;
  onJoinRoom?: () => void;
  onCreateRoom?: () => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({
  onGoHome,
  onJoinRoom,
  onCreateRoom,
}) => {
  return (
    <div className="nb-notfound-container">
      <div className="nb-notfound-card">
        {/* Status Badge */}
        <div className="nb-notfound-badge">
          <span className="nb-notfound-badge-dot" />
          <span>ERROR 404 • DROPLET MISSED</span>
        </div>

        {/* Optimized Mascot with WebP primary & PNG fallback */}
        <div className="nb-notfound-mascot-wrapper">
          <picture>
            <source srcSet="/assets/404_Mascot.webp" type="image/webp" />
            <img
              src="/assets/404_Mascot.png"
              alt="404 Page Not Found - Droplet Mascot"
              width={240}
              height={240}
              decoding="async"
              loading="eager"
              className="nb-notfound-mascot-img"
            />
          </picture>
        </div>

        {/* Headings */}
        <h1 className="nb-notfound-title">Page Dropped Off the Map!</h1>
        <p className="nb-notfound-desc">
          The link you followed might be broken, or the temporary room dissolved into thin air.
          Remember, Droplet rooms strictly self-destruct after 24 hours to keep your data private!
        </p>

        {/* Action Buttons */}
        <div className="nb-notfound-actions">
          <button
            onClick={onGoHome}
            className="nb-button nb-notfound-btn nb-notfound-btn-primary"
            aria-label="Return to Droplet home"
          >
            <HomeIcon size={18} />
            <span>Return Home</span>
          </button>

          {onJoinRoom && (
            <button
              onClick={onJoinRoom}
              className="nb-button nb-notfound-btn nb-notfound-btn-secondary"
              aria-label="Join a room with 4-digit code"
            >
              <QrCodeIcon size={18} />
              <span>Join a Room</span>
            </button>
          )}

          {onCreateRoom && (
            <button
              onClick={onCreateRoom}
              className="nb-button nb-notfound-btn nb-notfound-btn-accent"
              aria-label="Create a brand new room"
            >
              <SparklesIcon size={18} />
              <span>Create Room</span>
            </button>
          )}
        </div>

        {/* Micro-hint */}
        <div className="nb-notfound-hint">
          <span>
            Looking for an active room? Click <strong>Join a Room</strong> and enter your 4-digit code.
          </span>
        </div>
      </div>
    </div>
  );
};

export default NotFoundView;
