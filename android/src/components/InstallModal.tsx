import React from 'react';
import { X, Download, Smartphone, MoreVertical, PlusSquare, CheckCircle2 } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  canPrompt: boolean;
  onPromptInstall: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({
  isOpen,
  onClose,
  canPrompt,
  onPromptInstall,
}) => {
  const haptics = useHaptics();

  if (!isOpen) return null;

  const handlePromptClick = () => {
    haptics.click();
    onPromptInstall();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Smartphone size={18} />
            <h3 className="modal-title">Install Kursor on Android</h3>
          </div>
          <button className="icon-button" style={{ width: '30px', height: '30px' }} onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Method 1: Native APK Download */}
          <div
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface-elevated)',
              border: '1.5px solid var(--border-medium)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                Option 1: Download Native APK
              </div>
              <span className="status-badge connected" style={{ fontSize: '0.65rem' }}>Recommended</span>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Install the standalone Android application for offline launch, persistent full-screen, and zero address bars.
            </p>

            <a
              href="/api/download-apk"
              download="kursor-remote.apk"
              className="primary-button"
              style={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                textAlign: 'center',
                fontWeight: 600,
              }}
              onClick={() => haptics.success()}
            >
              <Download size={16} />
              <span>Download Kursor APK</span>
            </a>
          </div>

          {/* Method 2: Add to Home Screen (Instant PWA) */}
          <div
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
              Option 2: Add to Home Screen in Chrome
            </div>

            <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Turn this web page into an app directly from your mobile browser:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MoreVertical size={13} />
                </div>
                <span>1. Tap Chrome's three dots menu (top right)</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <PlusSquare size={13} />
                </div>
                <span>2. Select "Add to Home screen" or "Install app"</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={13} />
                </div>
                <span>3. Tap "Add" to install Kursor on your phone</span>
              </div>
            </div>

            {canPrompt && (
              <button
                type="button"
                className="tool-btn"
                style={{ padding: '9px', marginTop: '4px', color: 'var(--text-primary)' }}
                onClick={handlePromptClick}
              >
                Trigger Browser Install Prompt
              </button>
            )}
          </div>

          <button className="tool-btn" style={{ padding: '9px' }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
