import React, { useRef, useState } from 'react';

export interface RoomCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (code?: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: string | null;
  hideLabel?: boolean;
}

export const RoomCodeInput: React.FC<RoomCodeInputProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
  autoFocus = true,
  error,
  hideLabel = true,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only accept numeric digits up to 4 characters
    const numeric = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    onChange(numeric);
    if (numeric.length === 4 && onSubmit) {
      onSubmit(numeric);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (onSubmit) {
        onSubmit(value);
      }
    }
  };

  return (
    <div className="nb-room-code-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {!hideLabel && (
        <label
          htmlFor="room-code-input"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '13px',
            color: 'var(--color-ink, #000000)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          Room Code
        </label>
      )}

      <div style={{ position: 'relative', width: '100%' }}>
        {/* Native input overlay capturing touches, clicks, typing, pasting, and numeric keypad */}
        <input
          id="room-code-input"
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          autoComplete="one-time-code"
          autoFocus={autoFocus}
          disabled={disabled}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            zIndex: 2,
            cursor: disabled ? 'not-allowed' : 'text',
          }}
          aria-label="4-digit room code"
        />

        {/* 4 Tactile Segmented Box Digit Tiles */}
        <div
          aria-hidden="true"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {[0, 1, 2, 3].map((index) => {
            const digit = value[index] || '';
            const isCurrentTarget =
              isInputFocused && (value.length === index || (index === 3 && value.length === 4));
            const hasValue = digit !== '';

            return (
              <div
                key={index}
                style={{
                  height: '66px',
                  backgroundColor: hasValue ? '#FFE000' : '#FFFFFF',
                  border: error
                    ? '2.5px solid #DE350B'
                    : '2.5px solid #000000',
                  borderRadius: '12px',
                  boxShadow: isCurrentTarget
                    ? '3px 3px 0px #000000'
                    : hasValue
                    ? '2.5px 2.5px 0px #000000'
                    : '2px 2px 0px #000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.12s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: isCurrentTarget ? 'translateY(-2px)' : 'none',
                }}
              >
                {hasValue ? (
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '30px',
                      fontWeight: 900,
                      color: '#000000',
                      lineHeight: 1,
                    }}
                  >
                    {digit}
                  </span>
                ) : (
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '22px',
                      fontWeight: 700,
                      color: isCurrentTarget ? '#000000' : '#A1A1AA',
                      lineHeight: 1,
                      userSelect: 'none',
                    }}
                  >
                    –
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RoomCodeInput;
