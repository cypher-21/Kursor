import React from 'react';
import { X, Sliders } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sensitivity: number;
  setSensitivity: (val: number) => void;
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
            <Sliders size={20} color="#8b5cf6" />
            <h3 className="modal-title">Preferences</h3>
          </div>
          <button className="icon-button" style={{ width: '32px', height: '32px' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Sensitivity */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                Cursor Sensitivity
              </label>
              <span style={{ fontSize: '0.85rem', color: '#00f0ff', fontFamily: 'var(--font-mono)' }}>
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

          {/* Invert Scroll */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Natural Scrolling</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Content follows finger direction</div>
            </div>
            <button
              className={`tool-btn ${invertScroll ? 'active' : ''}`}
              style={{ padding: '8px 16px', borderRadius: 'var(--radius-full)' }}
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
              <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Haptic Vibration</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Vibrate on taps, clicks & slides</div>
            </div>
            <button
              className={`tool-btn ${hapticsEnabled ? 'active' : ''}`}
              style={{ padding: '8px 16px', borderRadius: 'var(--radius-full)' }}
              onClick={() => {
                const next = !hapticsEnabled;
                setHapticsEnabled(next);
                if (next) haptics.click();
              }}
            >
              {hapticsEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {/* Linux Architecture Badge */}
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.74rem',
              color: '#94a3b8',
              lineHeight: 1.4,
            }}
          >
            <div style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
              Universal Linux Support
            </div>
            Powered by kernel-level <code>/dev/uinput</code>. Fully compatible with Wayland (GNOME Shell, KDE Plasma, Sway, Hyprland) and X11.
          </div>

          <button className="primary-button" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
