import React from 'react';
import { HomeIcon } from '../components/icons';

export interface NotFoundViewProps {
  onGoHome: () => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ onGoHome }) => {
  return (
    <div className="nb-notfound-page">
      {/* Mascot covering ~70% of viewport height with aspect ratio locked */}
      <div className="nb-notfound-hero">
        <picture>
          <source srcSet="/assets/404_Mascot.webp" type="image/webp" />
          <img
            src="/assets/404_Mascot.png"
            alt="404 Page Not Found"
            className="nb-notfound-mascot-hero"
            width={512}
            height={512}
            decoding="async"
            loading="eager"
          />
        </picture>
      </div>

      {/* Single line text */}
      <p className="nb-notfound-single-line">
        Oops! Looks like this droplet dissolved into thin air.
      </p>

      {/* Single Return Home button */}
      <div className="nb-notfound-action-wrapper">
        <button
          onClick={onGoHome}
          className="nb-button nb-notfound-home-btn"
          aria-label="Return to Droplet home"
        >
          <HomeIcon size={19} />
          <span>Return Home</span>
        </button>
      </div>
    </div>
  );
};

export default NotFoundView;
