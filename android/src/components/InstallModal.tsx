import React, { useState } from 'react';
import { X, Smartphone, MoreVertical, PlusSquare, CheckCircle2, Share, Compass, Sparkles } from 'lucide-react';
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
  const [platform, setPlatform] = useState<'android' | 'ios'>(() => {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent || '';
      if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    }
    return 'android';
  });

  if (!isOpen) return null;

  const handlePromptClick = () => {
    haptics.click();
    onPromptInstall();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Smartphone size={18} />
            <h3 className="modal-title">Add to Home Screen</h3>
          </div>
          <button className="icon-button" style={{ width: '30px', height: '30px' }} onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Direct Install Button if supported */}
          {canPrompt && (
            <button
              type="button"
              className="primary-button"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                fontWeight: 600,
              }}
              onClick={handlePromptClick}
            >
              <Sparkles size={16} />
              <span>Install Web App Now</span>
            </button>
          )}

          {/* Platform Switcher */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-surface-elevated)',
              padding: '3px',
              borderRadius: 'var(--radius-sm)',
              border: '1.5px solid var(--border-medium)',
              gap: '4px',
            }}
          >
            <button
              type="button"
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: 'calc(var(--radius-sm) - 2px)',
                background: platform === 'android' ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
                border: 'none',
                color: platform === 'android' ? '#ffffff' : 'var(--text-muted)',
                fontWeight: platform === 'android' ? 600 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
              onClick={() => {
                haptics.tick();
                setPlatform('android');
              }}
            >
              <Compass size={14} />
              <span>Android (Chrome)</span>
            </button>
            <button
              type="button"
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: 'calc(var(--radius-sm) - 2px)',
                background: platform === 'ios' ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
                border: 'none',
                color: platform === 'ios' ? '#ffffff' : 'var(--text-muted)',
                fontWeight: platform === 'ios' ? 600 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
              onClick={() => {
                haptics.tick();
                setPlatform('ios');
              }}
            >
              <Share size={14} />
              <span>iPhone (Safari)</span>
            </button>
          </div>

          {/* Step-by-step instructions */}
          <div
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1.5px solid var(--border-medium)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {platform === 'android' ? (
              <>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  Chrome on Android:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'var(--bg-surface-elevated)',
                        border: '1.5px solid var(--border-medium)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: '#ffffff',
                      }}
                    >
                      <MoreVertical size={14} />
                    </div>
                    <span>1. Tap Chrome's menu (three dots <strong>⋮</strong> at top right)</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'var(--bg-surface-elevated)',
                        border: '1.5px solid var(--border-medium)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: '#ffffff',
                      }}
                    >
                      <PlusSquare size={14} />
                    </div>
                    <span>2. Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'var(--bg-surface-elevated)',
                        border: '1.5px solid var(--border-medium)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: '#10b981',
                      }}
                    >
                      <CheckCircle2 size={14} />
                    </div>
                    <span>3. Tap <strong>"Add"</strong> to create the icon</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  Safari on iOS:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'var(--bg-surface-elevated)',
                        border: '1.5px solid var(--border-medium)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: '#ffffff',
                      }}
                    >
                      <Share size={14} />
                    </div>
                    <span>1. Tap the <strong>Share</strong> button at the bottom bar</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'var(--bg-surface-elevated)',
                        border: '1.5px solid var(--border-medium)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: '#ffffff',
                      }}
                    >
                      <PlusSquare size={14} />
                    </div>
                    <span>2. Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'var(--bg-surface-elevated)',
                        border: '1.5px solid var(--border-medium)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: '#10b981',
                      }}
                    >
                      <CheckCircle2 size={14} />
                    </div>
                    <span>3. Tap <strong>"Add"</strong> in the top right</span>
                  </div>
                </div>
              </>
            )}

            <div
              style={{
                marginTop: '6px',
                paddingTop: '10px',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '0.74rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.4,
              }}
            >
              Once added, Kursor opens instantly in true fullscreen without browser bars.
            </div>
          </div>

          <button className="tool-btn" style={{ padding: '10px' }} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
