import React from 'react';

export interface DropletMascotProps {
  size?: number;
  mood?: 'happy' | 'waving' | 'excited' | 'sleepy' | 'working';
  className?: string;
  withSparkles?: boolean;
}

export const DropletMascot: React.FC<DropletMascotProps> = ({
  size = 120,
  mood = 'happy',
  className = '',
  withSparkles = true,
}) => {
  return (
    <div
      className={`droplet-mascot-wrapper ${className}`}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        userSelect: 'none',
      }}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        {/* Motion Splash Accents */}
        {withSparkles && (
          <g className="droplet-sparkles" stroke="#000000" strokeWidth="3" strokeLinecap="round">
            {/* Left Splashes */}
            <path d="M 28 48 C 22 42, 16 38, 10 36" />
            <circle cx="16" cy="56" r="3.5" fill="#FFE000" stroke="#000000" strokeWidth="2.5" />
            <path d="M 22 72 C 14 74, 8 78, 6 82" />

            {/* Right Splashes */}
            <path d="M 132 48 C 138 42, 144 38, 150 36" />
            <circle cx="144" cy="56" r="3.5" fill="#FFE000" stroke="#000000" strokeWidth="2.5" />
            <path d="M 138 72 C 146 74, 152 78, 154 82" />
          </g>
        )}

        {/* Mascot Legs (if waving or excited) */}
        {(mood === 'waving' || mood === 'excited') && (
          <g className="droplet-legs" stroke="#000000" strokeWidth="4" strokeLinecap="round">
            {/* Left Leg & Shoe */}
            <path d="M 64 126 L 56 144 L 46 144" />
            <ellipse cx="46" cy="144" rx="7" ry="4" fill="#000000" />

            {/* Right Leg & Shoe */}
            <path d="M 96 126 L 104 144 L 114 144" />
            <ellipse cx="114" cy="144" rx="7" ry="4" fill="#000000" />
          </g>
        )}

        {/* Mascot Arms (if waving) */}
        {mood === 'waving' && (
          <g className="droplet-arms" stroke="#000000" strokeWidth="3.5" strokeLinecap="round">
            {/* Left Arm (waving up) */}
            <path d="M 44 86 Q 28 72 26 56" />
            <circle cx="26" cy="54" r="5" fill="#FFE000" stroke="#000000" strokeWidth="3" />

            {/* Right Arm (resting or reaching) */}
            <path d="M 116 86 Q 130 92 136 104" />
            <circle cx="137" cy="106" r="5" fill="#FFE000" stroke="#000000" strokeWidth="3" />
          </g>
        )}

        {/* Main Droplet Body */}
        {/* Hard Neo-Brutalist Shadow */}
        <path
          d="M 80 18 C 95 44, 130 84, 130 108 C 130 134, 107 148, 80 148 C 53 148, 30 134, 30 108 C 30 84, 65 44, 80 18 Z"
          fill="#000000"
          transform="translate(4, 4)"
        />

        {/* Droplet Fill & Stroke */}
        <path
          d="M 80 18 C 95 44, 130 84, 130 108 C 130 134, 107 148, 80 148 C 53 148, 30 134, 30 108 C 30 84, 65 44, 80 18 Z"
          fill="#FFE000"
          stroke="#000000"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* Cute Face Features */}
        <g className="droplet-face">
          {mood !== 'sleepy' ? (
            <>
              {/* Left Eye */}
              <ellipse cx="68" cy="98" rx="4.5" ry="6.5" fill="#000000" />
              {/* Left Eye Highlight */}
              <circle cx="66" cy="96" r="1.5" fill="#FFFFFF" />

              {/* Right Eye */}
              <ellipse cx="92" cy="98" rx="4.5" ry="6.5" fill="#000000" />
              {/* Right Eye Highlight */}
              <circle cx="90" cy="96" r="1.5" fill="#FFFFFF" />

              {/* Smile / Mouth */}
              <path
                d="M 73 108 Q 80 116 87 108"
                stroke="#000000"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />

              {/* Rosy Cheeks */}
              <ellipse cx="58" cy="106" rx="4" ry="2.5" fill="#FFB703" opacity="0.6" />
              <ellipse cx="102" cy="106" rx="4" ry="2.5" fill="#FFB703" opacity="0.6" />
            </>
          ) : (
            <>
              {/* Sleepy Eyes (two arches) */}
              <path
                d="M 64 98 Q 69 92 74 98"
                stroke="#000000"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 86 98 Q 91 92 96 98"
                stroke="#000000"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
              {/* Small 'o' mouth */}
              <circle cx="80" cy="112" r="3" fill="#000000" />
            </>
          )}
        </g>
      </svg>
    </div>
  );
};

export default DropletMascot;
