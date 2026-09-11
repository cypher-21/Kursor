import React from 'react';
import { X, Sliders } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sensitivity: number;
  setSensitivity: (val: number) => void;
  scrollSensitivity: number;
  setScrollSensitivity: (val: number) => void;
  invertScroll: boolean;
  setInvertScroll: (val: boolean) => void;
  hapticsEnabled: boolean;
  setHapticsEnabled: (val: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  sensitivity,
  setSensitivity,
  scrollSensitivity,
  setScrollSensitivity,
  invertScroll,
  setInvertScroll,
  hapticsEnabled,
  setHapticsEnabled,
}) => {
  const haptics = useHaptics(hapticsEnabled);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} />
            <h3 className="modal-title">Preferences</h3>
          </div>
          <button className="icon-button" style={{ width: '30px', height: '30px' }} onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Cursor Sensitivity */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                Cursor Sensitivity
              </label>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {sensitivity.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.4"
              max="3.0"
              step="0.1"
              value={sensitivity}
              onChange={(e) => setSensitivity(parseFloat(e.target.value))}
              className="custom-range"
            />
          </div>

          {/* Scroll Sensitivity */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                Scroll Sensitivity
              </label>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {scrollSensitivity.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.1"
              value={scrollSensitivity}
              onChange={(e) => setScrollSensitivity(parseFloat(e.target.value))}
              className="custom-range"
            />
          </div>

          {/* Invert Scroll */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>Natural Scrolling</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Content follows finger direction</div>
            </div>
            <button
              className={`tool-btn ${invertScroll ? 'active' : ''}`}
              style={{ padding: '6px 14px', borderRadius: 'var(--radius-full)' }}
              onClick={() => {
                haptics.click();
                setInvertScroll(!invertScroll);
              }}
            >
              {invertScroll ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Haptic Feedback */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>Haptic Vibration</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Vibrate on taps, clicks and slides</div>
            </div>
            <button
              className={`tool-btn ${hapticsEnabled ? 'active' : ''}`}
              style={{ padding: '6px 14px', borderRadius: 'var(--radius-full)' }}
              onClick={() => {
                const next = !hapticsEnabled;
                setHapticsEnabled(next);
                if (next) haptics.click();
              }}
            >
              {hapticsEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {/* Cross-Platform Receiver Badge */}
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.025)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.74rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.4,
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Cross-Platform Desktop Engine
            </div>
            Windows (Direct Win32 API) and Linux (/dev/uinput kernel driver, Wayland, X11) with zero driver installation required.
          </div>

          <button className="primary-button" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
