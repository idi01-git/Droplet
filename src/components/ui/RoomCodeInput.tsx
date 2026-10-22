import React, { useRef } from 'react';
import { X } from 'lucide-react';

export interface RoomCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: string | null;
}

export const RoomCodeInput: React.FC<RoomCodeInputProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
  autoFocus = true,
  error,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only accept numeric digits up to 4 characters
    const numeric = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    onChange(numeric);
    if (numeric.length === 4 && onSubmit) {
      onSubmit();
    }
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.length === 4 && onSubmit) {
      onSubmit();
    }
  };

  return (
    <div className="nb-room-code-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label
        htmlFor="room-code-input"
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '14px',
          color: 'var(--color-ink)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        Room Code
      </label>

      <div
        className="nb-room-code-container"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--color-surface-card)',
          border: error ? '3px solid var(--color-error)' : 'var(--border-thick)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-standard)',
          padding: '4px 16px',
        }}
      >
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
          placeholder="••••"
          style={{
            width: '100%',
            height: '52px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '32px',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            letterSpacing: '14px',
            textAlign: 'center',
            color: 'var(--color-ink)',
            paddingLeft: '14px', // Balance the letter spacing
          }}
        />

        {value.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            aria-label="Clear room code"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-ink)',
              borderRadius: '50%',
            }}
          >
            <X size={20} strokeWidth={3} />
          </button>
        )}
      </div>

      {error && (
        <span
          role="alert"
          style={{
            color: 'var(--color-error)',
            fontFamily: 'var(--font-display)',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
};

export default RoomCodeInput;
