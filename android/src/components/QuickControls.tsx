import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Camera,
  Monitor,
  Lock,
  Power,
  Moon,
  RefreshCw,
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
  onSendPower: (action: 'lock' | 'sleep') => void;
  onRequestClipboard: () => void;
  serverClipboard: string | null;
  clipboardLoading: boolean;
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
  onSendPower,
  onRequestClipboard,
  serverClipboard,
  clipboardLoading,
}) => {
  const haptics = useHaptics();
  const [isPlaying, setIsPlaying] = useState(false);
  // Trust receiver-reported state when available; `isPlaying` stays as an
  // optimistic default for receivers that cannot detect playback (Windows).
  const playing = status.playing ?? isPlaying;
  const [liveBuffer, setLiveBuffer] = useState('');
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkEnter, setBulkEnter] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevValueRef = useRef('');

  // Power actions need a confirming second tap (destructive-ish guard)
  const [confirmPower, setConfirmPower] = useState<'lock' | 'sleep' | null>(null);
  const confirmTimerRef = useRef<any>(null);
  const handlePowerTap = (action: 'lock' | 'sleep') => {
    haptics.heavy();
    if (confirmPower === action) {
      // Confirmed: fire & disarm
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      setConfirmPower(null);
      onSendPower(action);
      return;
    }
    setConfirmPower(action);
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    confirmTimerRef.current = setTimeout(() => setConfirmPower(null), 3000);
  };

  // Voice dictation removed: the Web Speech API needs a secure (HTTPS) context,
  // so the mic was unreliable on the plain-HTTP LAN server. Feature dropped.

  useEffect(() => () => {
    // unmount cleanup: no stray timers
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
  }, []);

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
    if (bulkEnter) {
      // Type the text, then press Enter (e.g. open a URL in the browser)
      setTimeout(() => onLiveEnter(), 300);
    }
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

        {/* Live keyboard: a real, visible textarea -> native caret stays visible,
            fixed height so the card never reflows while typing */}
        <textarea
          ref={textareaRef}
          className={`live-keyboard-input ${isLiveActive ? 'focused' : ''}`}
          rows={2}
          onClick={(e) => e.stopPropagation()}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Tap here and type — every keystroke lands on the PC as you type…"
          aria-label="Live keyboard input"
        />

        {liveBuffer && (
          <div className="live-buffer-display">
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Last sent: {liveBuffer}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setLiveBuffer(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.72rem' }}
            >
              clear
            </button>
          </div>
        )}

        {/* ── System keys ─────────────────────────────────────────── */}
        <div className="kb-section">
          <div className="kb-section-label">System keys</div>
          <div className="key-toolbar" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.preventDefault()}>
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
        </div>

        {/* ── Navigation ──────────────────────────────────────────── */}
        <div className="kb-section">
          <div className="kb-section-label">Navigation</div>
          <div className="key-toolbar" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.preventDefault()}>
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
        </div>

        {/* ── Editing & shortcuts ─────────────────────────────────── */}
        <div className="kb-section">
          <div className="kb-section-label">Editing &amp; shortcuts</div>
          <div className="key-toolbar" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.preventDefault()}>
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

        {/* ── Function keys ───────────────────────────────────────── */}
        <div className="kb-section">
          <div className="kb-section-label">Function keys</div>
          <div className="fn-grid" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.preventDefault()}>
            {['F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'].map((fn) => (
              <button key={fn} className="key-chip" onClick={() => { haptics.tick(); onSendKey(fn.toLowerCase()); }}>
                {fn}
              </button>
            ))}
          </div>
        </div>

        {/* ── Zoom & capture ──────────────────────────────────────── */}
        <div className="kb-section">
          <div className="kb-section-label">Zoom &amp; capture</div>
          <div className="key-toolbar" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.preventDefault()}>
            <button className="key-chip" onClick={() => { haptics.tick(); onSendKey('zoom_out'); }} title="Zoom out (Ctrl -)">
              <ZoomOut size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Zoom −
            </button>
            <button className="key-chip" onClick={() => { haptics.tick(); onSendKey('zoom_in'); }} title="Zoom in (Ctrl +)">
              <ZoomIn size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Zoom +
            </button>
            <button className="key-chip" onClick={() => { haptics.tick(); onSendKey('zoom_reset'); }} title="Reset zoom (Ctrl 0)">
              <RotateCcw size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />100%
            </button>
            <button className="key-chip" onClick={() => { haptics.heavy(); onSendKey('win_shift_s'); }} title="Snipping overlay (Win+Shift+S)">
              <Camera size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Snip
            </button>
            <button className="key-chip" onClick={() => { haptics.heavy(); onSendKey('print'); }} title="Full screen (PrtSc)">
              <Monitor size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />PrtSc
            </button>
          </div>
        </div>
      </div>

      {/* Paste Long Text Card */}
      <div className="control-card">
        <div className="control-card-title">
          <Send size={15} />
          <span>Send Text / URL</span>
        </div>
        <div className="card-hint">
          Types the whole message on the PC at once — much faster than live typing for long text.
        </div>

        <form onSubmit={handleBulkSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Paste or type complete text..."
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" className="icon-button" style={{ width: '42px', flexShrink: 0 }} title="Send to PC">
            <Send size={15} />
          </button>
        </form>

        <button
          className={`key-chip ${bulkEnter ? 'active' : ''}`}
          onClick={() => { setBulkEnter(!bulkEnter); haptics.tick(); }}
          title="After sending, also press Enter on the PC (opens URLs)"
        >
          <CornerDownLeft size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
          Press Enter after sending {bulkEnter ? 'ON' : 'OFF'}
        </button>
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
              setIsPlaying(!playing);
              onMedia('play_pause');
            }}
            title="Play / Pause"
          >
            {playing ? <Pause size={22} /> : <Play size={22} style={{ marginLeft: '2px' }} />}
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

      {/* Power Card (confirm-guarded) */}
      <div className="control-card">
        <div className="control-card-title">
          <Power size={15} />
          <span>Power</span>
        </div>
        <div className="card-hint">
          Second tap within 3 seconds confirms.
        </div>
        <div className="power-row">
          <button
            className={`tool-btn ${confirmPower === 'lock' ? 'active confirm' : ''}`}
            onClick={() => handlePowerTap('lock')}
            onMouseDown={(e) => e.preventDefault()}
            title={confirmPower === 'lock' ? 'Tap again to LOCK the PC now' : 'Lock the PC screen'}
          >
            <Lock size={16} />
            <span>{confirmPower === 'lock' ? 'Tap again to lock' : 'Lock'}</span>
          </button>
          <button
            className={`tool-btn ${confirmPower === 'sleep' ? 'active confirm' : ''}`}
            onClick={() => handlePowerTap('sleep')}
            onMouseDown={(e) => e.preventDefault()}
            title={confirmPower === 'sleep' ? 'Tap again to SUSPEND the PC now' : 'Put the PC to sleep'}
          >
            <Moon size={16} />
            <span>{confirmPower === 'sleep' ? 'Tap again to sleep' : 'Sleep'}</span>
          </button>
        </div>
      </div>

      {/* PC Clipboard Card */}
      <div className="control-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="control-card-title">
            <Clipboard size={15} />
            <span>PC Clipboard</span>
          </div>
          <button
            className="icon-button"
            style={{ width: '30px', height: '30px' }}
            onClick={(e) => { e.stopPropagation(); onRequestClipboard(); haptics.tick(); }}
            title="Read the PC clipboard"
            disabled={clipboardLoading}
          >
            <RefreshCw size={14} className={clipboardLoading ? 'spin' : ''} />
          </button>
        </div>

        <div className="clipboard-view">
          {clipboardLoading
            ? 'Reading PC clipboard…'
            : serverClipboard
              ? serverClipboard.slice(0, 400)
              : 'Empty (or unreadable). Copy something on the PC, then tap refresh.'}
        </div>

        <div className="key-toolbar" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.preventDefault()}>
          <button
            className={`key-chip ${serverClipboard ? '' : 'dimmed'}`}
            disabled={clipboardLoading}
            onClick={() => { haptics.click(); onSendKey('ctrl_v'); }}
            title="Paste the clipboard content on the PC (Ctrl+V)"
          >
            <Clipboard size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Paste on PC
          </button>
          <button
            className={`key-chip ${serverClipboard ? '' : 'dimmed'}`}
            onClick={() => {
              if (serverClipboard) {
                navigator.clipboard?.writeText(serverClipboard).then(() => haptics.click());
              }
            }}
            title="Save this text to the phone's clipboard"
          >
            <Copy size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Copy to phone
          </button>
          <button
            className={`key-chip ${serverClipboard ? '' : 'dimmed'}`}
            onClick={() => { if (serverClipboard) { haptics.click(); onSendText(serverClipboard); } }}
            title="Type the clipboard text out (works where Ctrl+V is blocked)"
          >
            <Send size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Type it
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
