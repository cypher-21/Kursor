import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Crosshair,
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
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.6px' }}>
            Presentation Time
          </div>
          <div className="timer-digits">{formatTime(seconds)}</div>
        </div>

        <div className="timer-controls" style={{ display: 'flex', gap: '8px' }}>
          <button
            className="icon-button"
            onClick={() => {
              setTimerRunning(!timerRunning);
              haptics.click();
            }}
            title={timerRunning ? 'Pause' : 'Start'}
          >
            {timerRunning ? <Pause size={16} /> : <Play size={16} />}
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
            <RotateCcw size={16} />
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
            <ChevronLeft size={44} strokeWidth={2} color="var(--text-secondary)" />
            <span className="slide-btn-label" style={{ color: 'var(--text-primary)' }}>
              Previous
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Page Up</span>
          </button>

          {/* Next Slide Button (Dominant) */}
          <button
            className="slide-btn next-slide"
            onClick={() => {
              haptics.success();
              onAction('next');
            }}
          >
            <ChevronRight size={44} strokeWidth={2.4} color="#ffffff" />
            <span className="slide-btn-label" style={{ color: '#ffffff' }}>
              Next Slide
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Page Down</span>
          </button>
        </div>

        {/* Laser Pointer Touch Track Area */}
        <div
          ref={laserPadRef}
          style={{
            height: '96px',
            borderRadius: 'var(--radius-lg)',
            border: laserActive ? '1px solid rgba(255, 255, 255, 0.4)' : '1px dashed var(--border-subtle)',
            background: laserActive ? 'rgba(255, 255, 255, 0.05)' : 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '6px',
            position: 'relative',
            touchAction: 'none',
            transition: 'all 0.15s ease',
          }}
          onTouchMove={handleLaserTouchMove}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Crosshair size={18} color={laserActive ? '#ffffff' : 'var(--text-muted)'} />
            <span
              style={{
                fontWeight: 600,
                fontSize: '0.86rem',
                color: laserActive ? '#ffffff' : 'var(--text-secondary)',
              }}
            >
              {laserActive ? (gyroActive ? 'Air-Mouse Active (Tilt Phone)' : 'Laser Pad (Drag to aim)') : 'Digital Pointer Off'}
            </span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {laserActive ? 'Beam visible on presentation display' : 'Tap Pointer button below to activate'}
          </span>
        </div>

        {/* Secondary Presentation Tools */}
        <div className="presentation-quick-tools">
          <button
            className={`tool-btn ${laserActive ? 'active' : ''}`}
            onClick={toggleLaser}
          >
            <Crosshair size={16} />
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
            <Sparkles size={16} />
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
            <Compass size={16} />
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
            <Maximize2 size={16} />
            <span>F5 Start</span>
          </button>
        </div>
      </div>
    </div>
  );
};
