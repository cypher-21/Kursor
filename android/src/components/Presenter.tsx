import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Flame,
  Compass,
  Sparkles,
} from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics';
import { useOrientation } from '../hooks/useOrientation';

interface PresenterProps {
  onAction: (action: 'next' | 'prev' | 'start' | 'exit' | 'black' | 'white') => void;
  onLaser: (active: boolean, x?: number, y?: number, mode?: string) => void;
}

export const Presenter: React.FC<PresenterProps> = ({ onAction, onLaser }) => {
  const haptics = useHaptics();

  // Timer State
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Laser Pointer State
  const [laserActive, setLaserActive] = useState(false);
  const [laserMode, setLaserMode] = useState<'laser' | 'spotlight'>('laser');
  const [gyroActive, setGyroActive] = useState(false);

  const laserPadRef = useRef<HTMLDivElement>(null);

  // Handle Gyro air-mouse
  const { requestPermission } = useOrientation(laserActive && gyroActive, (dx, dy) => {
    onLaser(true, dx, dy, laserMode);
  });

  const toggleLaser = async () => {
    const next = !laserActive;
    setLaserActive(next);
    haptics.heavy();
    onLaser(next, undefined, undefined, laserMode);
  };

  const handleLaserTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!laserActive || !laserPadRef.current) return;
    const rect = laserPadRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;

    // Normalize coordinates 0.0 -> 1.0 mapped to target screen coordinates
    const normX = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height));

    const screenW = window.screen.width || 1920;
    const screenH = window.screen.height || 1080;

    onLaser(true, Math.round(normX * screenW), Math.round(normY * screenH), laserMode);
  };

  return (
    <div className="presenter-container">
      {/* Stopwatch Timer Card */}
      <div className="timer-card">
        <div>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.8px' }}>
            Presentation Time
          </div>
          <div className="timer-digits">{formatTime(seconds)}</div>
        </div>

        <div className="timer-controls">
          <button
            className="icon-button"
            onClick={() => {
              setTimerRunning(!timerRunning);
              haptics.click();
            }}
            title={timerRunning ? 'Pause' : 'Start'}
          >
            {timerRunning ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button
            className="icon-button"
            onClick={() => {
              setTimerRunning(false);
              setSeconds(0);
              haptics.tick();
            }}
            title="Reset"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {/* Main Slide Navigation Row (Big Buttons) */}
      <div className="slide-actions-grid">
        <div className="slide-nav-row">
          {/* Previous Slide Button */}
          <button
            className="slide-btn"
            onClick={() => {
              haptics.click();
              onAction('prev');
            }}
          >
            <ChevronLeft size={52} strokeWidth={2.5} color="#94a3b8" />
            <span className="slide-btn-label" style={{ color: '#cbd5e1' }}>
              Previous
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Page Up</span>
          </button>

          {/* Next Slide Button (Dominant) */}
          <button
            className="slide-btn next-slide"
            onClick={() => {
              haptics.success();
              onAction('next');
            }}
          >
            <ChevronRight size={56} strokeWidth={3} color="#00f0ff" />
            <span className="slide-btn-label" style={{ color: '#ffffff' }}>
              Next Slide
            </span>
            <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>Page Down</span>
          </button>
        </div>

        {/* Laser Pointer Touch Track Area */}
        <div
          ref={laserPadRef}
          style={{
            height: '110px',
            borderRadius: 'var(--radius-lg)',
            border: laserActive ? '1.5px solid #ff2a5f' : '1px dashed var(--border-subtle)',
            background: laserActive
              ? 'radial-gradient(circle at 50% 50%, rgba(255, 42, 95, 0.12) 0%, rgba(15, 16, 26, 0.9) 100%)'
              : 'rgba(19, 20, 29, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '6px',
            position: 'relative',
            touchAction: 'none',
            boxShadow: laserActive ? '0 0 25px rgba(255, 42, 95, 0.25)' : 'none',
            transition: 'all 0.2s ease',
          }}
          onTouchMove={handleLaserTouchMove}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame size={20} color={laserActive ? '#ff2a5f' : '#64748b'} />
            <span
              style={{
                fontWeight: 600,
                fontSize: '0.9rem',
                color: laserActive ? '#ff2a5f' : '#94a3b8',
              }}
            >
              {laserActive ? (gyroActive ? 'Air-Mouse Active (Tilt Phone)' : 'Laser Pad (Drag to aim)') : 'Digital Pointer Off'}
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            {laserActive ? 'Pointer beam visible on presenter screen' : 'Tap Pointer button below to activate'}
          </span>
        </div>

        {/* Secondary Presentation Tools */}
        <div className="presentation-quick-tools">
          <button
            className={`tool-btn ${laserActive ? 'laser-active-btn' : ''}`}
            onClick={toggleLaser}
          >
            <Flame size={18} />
            <span>{laserActive ? 'Pointer ON' : 'Pointer'}</span>
          </button>

          <button
            className={`tool-btn ${laserMode === 'spotlight' ? 'active' : ''}`}
            onClick={() => {
              const next = laserMode === 'laser' ? 'spotlight' : 'laser';
              setLaserMode(next);
              haptics.click();
              if (laserActive) {
                onLaser(true, undefined, undefined, next);
              }
            }}
            title="Switch Pointer Style"
          >
            <Sparkles size={18} />
            <span>{laserMode === 'laser' ? 'Dot' : 'Spotlight'}</span>
          </button>

          <button
            className={`tool-btn ${gyroActive ? 'active' : ''}`}
            onClick={async () => {
              const res = await requestPermission();
              if (res) {
                setGyroActive(!gyroActive);
                haptics.click();
              }
            }}
          >
            <Compass size={18} />
            <span>Air-Mouse</span>
          </button>

          <button
            className="tool-btn"
            onClick={() => {
              haptics.click();
              onAction('start');
            }}
            title="Start Slideshow (F5)"
          >
            <Maximize2 size={18} />
            <span>F5 Start</span>
          </button>
        </div>
      </div>
    </div>
  );
};
