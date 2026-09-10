import React, { useState, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Volume1,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  BellOff,
  Bell,
  Keyboard,
  CornerDownLeft,
  Delete,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Copy,
  Clipboard,
  Undo2,
  XSquare,
  Send,
} from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics';
import type { SystemStatus } from '../hooks/useSocket';

interface QuickControlsProps {
  status: SystemStatus;
  onMedia: (action: 'vol_up' | 'vol_down' | 'mute' | 'set_vol' | 'play_pause' | 'next' | 'prev', value?: number) => void;
  onDnd: () => void;
  onSendText: (text: string) => void;
  onSendKey: (key: string) => void;
  onLiveInput: (char: string) => void;
  onLiveBackspace: () => void;
  onLiveEnter: () => void;
}

export const QuickControls: React.FC<QuickControlsProps> = ({
  status,
  onMedia,
  onDnd,
  onSendText,
  onSendKey,
  onLiveInput,
  onLiveBackspace,
  onLiveEnter,
}) => {
  const haptics = useHaptics();
  const [isPlaying, setIsPlaying] = useState(false);
  const [liveBuffer, setLiveBuffer] = useState('');
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevValueRef = useRef('');

  // Focus the hidden textarea when user taps the keyboard card
  const activateKeyboard = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Handle input events from the hidden textarea.
  // This approach works reliably with mobile IME keyboards (Gboard, Samsung, SwiftKey)
  // because we use an uncontrolled textarea and detect changes via the input event.
  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;

    const current = el.value;
    const prev = prevValueRef.current;

    if (current.length > prev.length) {
      // Characters were added
      const added = current.slice(prev.length);
      for (const char of added) {
        onLiveInput(char);
      }
      setLiveBuffer((b) => (b + added).slice(-40));
      haptics.tick();
    } else if (current.length < prev.length) {
      // Characters were deleted (backspace)
      const deleted = prev.length - current.length;
      for (let i = 0; i < deleted; i++) {
        onLiveBackspace();
      }
      setLiveBuffer((b) => b.slice(0, -(deleted)));
      haptics.tick();
    }

    prevValueRef.current = current;

    // Periodically trim the textarea value to prevent unbounded growth
    if (current.length > 200) {
      el.value = current.slice(-50);
      prevValueRef.current = el.value;
    }
  }, [onLiveInput, onLiveBackspace, haptics]);

  // Handle Enter key specifically
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onLiveEnter();
      setLiveBuffer('');
      haptics.click();
      // Reset textarea
      if (textareaRef.current) {
        textareaRef.current.value = '';
        prevValueRef.current = '';
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      onSendKey('tab');
      haptics.tick();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onSendKey('escape');
      haptics.tick();
    }
  }, [onLiveEnter, onSendKey, haptics]);

  const handleFocus = useCallback(() => {
    setIsLiveActive(true);
    // Reset state on focus
    if (textareaRef.current) {
      textareaRef.current.value = '';
      prevValueRef.current = '';
    }
  }, []);

  const handleBlur = useCallback(() => {
    setIsLiveActive(false);
  }, []);

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText) return;
    haptics.tick();
    onSendText(bulkText);
    setBulkText('');
  };

  return (
    <div className="controls-container">
      {/* Live Real-Time Keyboard Card */}
      <div className="control-card" onClick={activateKeyboard} style={{ cursor: 'text' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="control-card-title">
            <Keyboard size={15} />
            <span>Real-Time Keyboard</span>
          </div>
          {isLiveActive && (
            <span className="status-badge connected" style={{ fontSize: '0.65rem' }}>
              Active
            </span>
          )}
        </div>

        {/* Hidden textarea that captures all mobile keyboard input */}
        <div className="live-keyboard-wrapper">
          <textarea
            ref={textareaRef}
            className="live-keyboard-textarea"
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="send"
            inputMode="text"
            aria-label="Live keyboard input"
          />
          <div
            className={`live-keyboard-display ${isLiveActive ? 'focused' : ''}`}
            onClick={activateKeyboard}
          >
            {isLiveActive
              ? (liveBuffer || 'Typing... (keyboard open)')
              : 'Tap here to open keyboard and type live...'
            }
          </div>
        </div>

        {liveBuffer && (
          <div className="live-buffer-display">
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Sent: {liveBuffer}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setLiveBuffer(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.72rem' }}
            >
              clear
            </button>
          </div>
        )}

        {/* Essential PC Keys Toolbar */}
        <div className="key-toolbar" onClick={(e) => e.stopPropagation()}>
          <button className="key-chip" onClick={() => { haptics.tick(); onSendKey('escape'); }}>Esc</button>
          <button className="key-chip" onClick={() => { haptics.tick(); onSendKey('tab'); }}>Tab</button>
          <button className="key-chip" onClick={() => { haptics.tick(); onSendKey('ctrl'); }}>Ctrl</button>
          <button className="key-chip" onClick={() => { haptics.tick(); onSendKey('alt'); }}>Alt</button>
          <button className="key-chip" onClick={() => { haptics.heavy(); onSendKey('super'); }}>Win</button>
          <button className="key-chip" onClick={() => { haptics.tick(); onSendKey('delete'); }}>Del</button>
          <button className="key-chip" onClick={() => { haptics.tick(); onLiveBackspace(); }}>
            <Delete size={13} style={{ verticalAlign: 'middle' }} /> Bksp
          </button>
          <button className="key-chip" onClick={() => { haptics.click(); onLiveEnter(); }}>
            <CornerDownLeft size={13} style={{ verticalAlign: 'middle' }} /> Enter
          </button>
        </div>

        {/* Directional & Nav Keys */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
          <button className="key-chip" style={{ flex: 1 }} onClick={() => { haptics.tick(); onSendKey('up'); }}>
            <ArrowUp size={14} style={{ margin: '0 auto' }} />
          </button>
          <button className="key-chip" style={{ flex: 1 }} onClick={() => { haptics.tick(); onSendKey('down'); }}>
            <ArrowDown size={14} style={{ margin: '0 auto' }} />
          </button>
          <button className="key-chip" style={{ flex: 1 }} onClick={() => { haptics.tick(); onSendKey('left'); }}>
            <ArrowLeft size={14} style={{ margin: '0 auto' }} />
          </button>
          <button className="key-chip" style={{ flex: 1 }} onClick={() => { haptics.tick(); onSendKey('right'); }}>
            <ArrowRight size={14} style={{ margin: '0 auto' }} />
          </button>
        </div>

        {/* Common PC Shortcuts */}
        <div className="key-toolbar" onClick={(e) => e.stopPropagation()}>
          <button className="key-chip" onClick={() => { haptics.click(); onSendKey('ctrl_c'); }}>
            <Copy size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Copy
          </button>
          <button className="key-chip" onClick={() => { haptics.click(); onSendKey('ctrl_v'); }}>
            <Clipboard size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Paste
          </button>
          <button className="key-chip" onClick={() => { haptics.click(); onSendKey('ctrl_z'); }}>
            <Undo2 size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Undo
          </button>
          <button className="key-chip" onClick={() => { haptics.click(); onSendKey('ctrl_a'); }}>
            Sel All
          </button>
          <button className="key-chip" onClick={() => { haptics.heavy(); onSendKey('alt_f4'); }}>
            <XSquare size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Close
          </button>
        </div>
      </div>

      {/* Paste Long Text Card */}
      <div className="control-card">
        <div className="control-card-title">
          <Clipboard size={15} />
          <span>Send Full Text or URL</span>
        </div>

        <form onSubmit={handleBulkSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Paste or type complete message..."
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
          />
          <button type="submit" className="icon-button" style={{ width: '42px', flexShrink: 0 }}>
            <Send size={15} />
          </button>
        </form>
      </div>

      {/* Audio Volume Card */}
      <div className="control-card">
        <div className="control-card-title">
          <Volume2 size={15} />
          <span>System Volume ({status.volume}%)</span>
        </div>

        <div className="volume-slider-row">
          <button
            className="icon-button"
            onClick={() => {
              haptics.click();
              onMedia('mute');
            }}
            title={status.muted ? 'Unmute' : 'Mute'}
          >
            {status.muted ? <VolumeX size={17} color="#ef4444" /> : <Volume1 size={17} />}
          </button>

          <input
            type="range"
            min="0"
            max="100"
            value={status.muted ? 0 : status.volume}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              onMedia('set_vol', val);
            }}
            className="custom-range"
          />

          <button
            className="icon-button"
            onClick={() => {
              haptics.tick();
              onMedia('vol_up');
            }}
            title="Volume Up"
          >
            <Volume2 size={17} />
          </button>
        </div>
      </div>

      {/* Media Playback Card */}
      <div className="control-card">
        <div className="control-card-title">
          <Play size={15} />
          <span>Media Playback</span>
        </div>

        <div className="media-deck">
          <button
            className="icon-button"
            style={{ width: '44px', height: '44px', borderRadius: '50%' }}
            onClick={() => {
              haptics.click();
              onMedia('prev');
            }}
            title="Previous Track"
          >
            <SkipBack size={18} />
          </button>

          <button
            className="media-play-btn"
            onClick={() => {
              haptics.success();
              setIsPlaying(!isPlaying);
              onMedia('play_pause');
            }}
            title="Play / Pause"
          >
            {isPlaying ? <Pause size={22} /> : <Play size={22} style={{ marginLeft: '2px' }} />}
          </button>

          <button
            className="icon-button"
            style={{ width: '44px', height: '44px', borderRadius: '50%' }}
            onClick={() => {
              haptics.click();
              onMedia('next');
            }}
            title="Next Track"
          >
            <SkipForward size={18} />
          </button>
        </div>
      </div>

      {/* Do Not Disturb Card */}
      <div className="control-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="control-card-title">
            <BellOff size={15} />
            <span>Do Not Disturb</span>
          </div>

          <button
            className="tool-btn"
            style={{
              padding: '6px 14px',
              flexDirection: 'row',
              borderRadius: 'var(--radius-full)',
              background: status.dnd ? 'rgba(255, 255, 255, 0.12)' : 'var(--bg-surface)',
              borderColor: status.dnd ? 'var(--border-medium)' : 'var(--border-subtle)',
              color: status.dnd ? '#ffffff' : 'var(--text-secondary)',
            }}
            onClick={() => {
              haptics.click();
              onDnd();
            }}
          >
            {status.dnd ? <BellOff size={14} /> : <Bell size={14} />}
            <span>{status.dnd ? 'Active' : 'Enable'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
