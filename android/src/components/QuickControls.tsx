import React, { useState, useRef } from 'react';
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
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle Mobile Virtual Keyboard (Gboard, Samsung, SwiftKey)
  const handleBeforeInput = (e: any) => {
    const inputType = e.inputType;
    if (inputType === 'insertText' && e.data) {
      e.preventDefault();
      for (const char of e.data) {
        onLiveInput(char);
      }
      setLiveBuffer((prev) => (prev + e.data).slice(-30));
      haptics.tick();
    } else if (inputType === 'deleteContentBackward') {
      e.preventDefault();
      onLiveBackspace();
      setLiveBuffer((prev) => prev.slice(0, -1));
      haptics.tick();
    } else if (inputType === 'insertLineBreak' || inputType === 'insertParagraph') {
      e.preventDefault();
      onLiveEnter();
      setLiveBuffer('');
      haptics.click();
    }
  };

  // Handle Physical Keyboard & desktop fallback keys
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      onLiveBackspace();
      setLiveBuffer((prev) => prev.slice(0, -1));
      haptics.tick();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onLiveEnter();
      setLiveBuffer('');
      haptics.click();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      onSendKey('tab');
      haptics.tick();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onSendKey('escape');
      haptics.tick();
    }
  };

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
      <div className="control-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="control-card-title">
            <Keyboard size={15} />
            <span>Real-Time Live Keyboard</span>
          </div>
          {isLiveActive && (
            <span className="status-badge connected" style={{ fontSize: '0.65rem' }}>
              Active
            </span>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <input
            ref={inputRef}
            type="text"
            className="live-keyboard-input"
            placeholder="Tap here to open keyboard and type live..."
            value=""
            onFocus={() => setIsLiveActive(true)}
            onBlur={() => setIsLiveActive(false)}
            onBeforeInput={handleBeforeInput}
            onKeyDown={handleKeyDown}
            onChange={() => {}}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
        </div>

        {liveBuffer && (
          <div
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Transmitted: {liveBuffer}
            </span>
            <button
              onClick={() => setLiveBuffer('')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              clear
            </button>
          </div>
        )}

        {/* Essential PC Keys Toolbar */}
        <div className="key-toolbar">
          <button className="key-chip" onClick={() => { haptics.tick(); onSendKey('escape'); }}>Esc</button>
          <button className="key-chip" onClick={() => { haptics.tick(); onSendKey('tab'); }}>Tab</button>
          <button className="key-chip" onClick={() => { haptics.tick(); onSendKey('ctrl'); }}>Ctrl</button>
          <button className="key-chip" onClick={() => { haptics.tick(); onSendKey('alt'); }}>Alt</button>
          <button className="key-chip" onClick={() => { haptics.heavy(); onSendKey('super'); }}>Win</button>
          <button className="key-chip" onClick={() => { haptics.tick(); onSendKey('delete'); }}>Del</button>
          <button className="key-chip" onClick={() => { haptics.tick(); onLiveBackspace(); }}>
            <Delete size={13} style={{ verticalAlign: 'middle' }} /> Backspace
          </button>
          <button className="key-chip" onClick={() => { haptics.click(); onLiveEnter(); }}>
            <CornerDownLeft size={13} style={{ verticalAlign: 'middle' }} /> Enter
          </button>
        </div>

        {/* Directional & Nav Keys */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
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
        <div className="key-toolbar">
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
            Select All
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
