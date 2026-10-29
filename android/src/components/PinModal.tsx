import React, { useState, useEffect, useRef } from 'react';
import { Lock, ShieldAlert } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics';

interface PinModalProps {
  isOpen: boolean;
  serverName: string;
  attemptsRemaining: number | null;
  onSubmitPin: (pin: string) => void;
}

/**
 * Mandatory PIN pairing screen shown when the receiver has
 * `pin_required: true` in ~/.config/kursor/config.json.
 */
export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  serverName,
  attemptsRemaining,
  onSubmitPin,
}) => {
  const haptics = useHaptics();
  const [pin, setPin] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      // Auto-focus when the prompt appears
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = pin.trim();
    if (!value) return;
    haptics.success();
    onSubmitPin(value);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.preventDefault()}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={18} />
            <h3 className="modal-title">PIN Required</h3>
          </div>
        </div>

        <div
          style={{
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <ShieldAlert size={18} color="#60a5fa" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#93c5fd' }}>
              {serverName} is protected
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              This computer requires a pairing PIN before accepting touchpad input.
              Find it in <b>~/.config/kursor/config.json</b> (Briefly shown on the desktop GUI / terminal).
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
          <div>
            <label style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
              Pairing PIN
            </label>
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="input-field"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
              style={{ letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.2rem' }}
            />
          </div>

          {attemptsRemaining !== null && attemptsRemaining !== undefined && (
            <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>
              Incorrect PIN. {attemptsRemaining} attempt{attemptsRemaining === 1 ? '' : 's'} remaining.
            </div>
          )}

          <button type="submit" className="primary-button">
            Unlock Receiver
          </button>
        </form>
      </div>
    </div>
  );
};
