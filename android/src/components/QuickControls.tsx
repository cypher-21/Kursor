import React, { useState } from 'react';
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
  Send,
  CornerDownLeft,
  Delete,
  Terminal,
} from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics';
import type { SystemStatus } from '../hooks/useSocket';

interface QuickControlsProps {
  status: SystemStatus;
  onMedia: (action: 'vol_up' | 'vol_down' | 'mute' | 'set_vol' | 'play_pause' | 'next' | 'prev', value?: number) => void;
  onDnd: () => void;
  onSendText: (text: string) => void;
  onSendKey: (key: string) => void;
}

export const QuickControls: React.FC<QuickControlsProps> = ({
  status,
  onMedia,
  onDnd,
  onSendText,
  onSendKey,
}) => {
  const haptics = useHaptics();
  const [typedText, setTypedText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedText) return;
    haptics.tick();
    onSendText(typedText);
    setTypedText('');
  };

  return (
    <div className="controls-container">
      {/* Audio Volume Card */}
      <div className="control-card">
        <div className="control-card-title">
          <Volume2 size={16} color="#3b82f6" />
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
            {status.muted ? <VolumeX size={18} color="#ef4444" /> : <Volume1 size={18} />}
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
            <Volume2 size={18} />
          </button>
        </div>
      </div>

      {/* Media Playback Card */}
      <div className="control-card">
        <div className="control-card-title">
          <Play size={16} color="#8b5cf6" />
          <span>Media Playback</span>
        </div>

        <div className="media-deck">
          <button
            className="icon-button"
            style={{ width: '48px', height: '48px', borderRadius: '50%' }}
            onClick={() => {
              haptics.click();
              onMedia('prev');
            }}
            title="Previous Track"
          >
            <SkipBack size={20} />
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
            {isPlaying ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: '3px' }} />}
          </button>

          <button
            className="icon-button"
            style={{ width: '48px', height: '48px', borderRadius: '50%' }}
            onClick={() => {
              haptics.click();
              onMedia('next');
            }}
            title="Next Track"
          >
            <SkipForward size={20} />
          </button>
        </div>
      </div>

      {/* Notifications / DND Card */}
      <div className="control-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="control-card-title">
            <BellOff size={16} color="#ec4899" />
            <span>Silence Notifications</span>
          </div>

          <button
            className="tool-btn"
            style={{
              padding: '8px 16px',
              flexDirection: 'row',
              borderRadius: 'var(--radius-full)',
              background: status.dnd ? 'rgba(236, 72, 153, 0.2)' : 'var(--bg-surface)',
              borderColor: status.dnd ? '#ec4899' : 'var(--border-subtle)',
              color: status.dnd ? '#ec4899' : 'var(--text-secondary)',
            }}
            onClick={() => {
              haptics.click();
              onDnd();
            }}
          >
            {status.dnd ? <BellOff size={15} /> : <Bell size={15} />}
            <span>{status.dnd ? 'DND Active' : 'Enable DND'}</span>
          </button>
        </div>
      </div>

      {/* Virtual Keyboard & Quick Typing */}
      <div className="control-card">
        <div className="control-card-title">
          <Keyboard size={16} color="#10b981" />
          <span>Send Text & Keystrokes</span>
        </div>

        <form onSubmit={handleSendText} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Type text to send to computer..."
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
          />
          <button type="submit" className="icon-button" style={{ width: '46px', background: 'var(--accent-blue)', color: '#fff' }}>
            <Send size={18} />
          </button>
        </form>

        {/* Keystrokes bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '4px' }}>
          <button
            className="tool-btn"
            onClick={() => {
              haptics.tick();
              onSendKey('enter');
            }}
          >
            <CornerDownLeft size={16} />
            <span>Enter</span>
          </button>

          <button
            className="tool-btn"
            onClick={() => {
              haptics.tick();
              onSendKey('backspace');
            }}
          >
            <Delete size={16} />
            <span>Backspace</span>
          </button>

          <button
            className="tool-btn"
            onClick={() => {
              haptics.tick();
              onSendKey('tab');
            }}
          >
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>⇥</span>
            <span>Tab</span>
          </button>

          <button
            className="tool-btn"
            onClick={() => {
              haptics.heavy();
              onSendKey('super');
            }}
          >
            <Terminal size={16} />
            <span>Super</span>
          </button>
        </div>
      </div>
    </div>
  );
};
