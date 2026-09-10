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
  onMove: (dx: number, dy: number) => void;
}

export const Presenter: React.FC<PresenterProps> = ({ onAction, onLaser, onMove }) => {
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

  // Handle Gyro air-mouse: sends RELATIVE move deltas to move the host cursor
  const { requestPermission } = useOrientation(laserActive && gyroActive, (dx, dy) => {
    onMove(dx, dy);
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
          <div className="timer-label">Presentation Time</div>
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
      <div className="slide-nav-row">
        {/* Previous Slide Button */}
        <button
          className="slide-btn prev-slide"
          onClick={() => {
            haptics.click();
            onAction('prev');
          }}
        >
          <ChevronLeft size={36} strokeWidth={2} color="var(--text-secondary)" />
          <span className="slide-btn-label">Previous</span>
          <span className="slide-btn-sub">Page Up</span>
        </button>

        {/* Next Slide Button (Dominant) */}
        <button
          className="slide-btn next-slide"
          onClick={() => {
            haptics.success();
            onAction('next');
          }}
        >
          <ChevronRight size={36} strokeWidth={2.4} color="#ffffff" />
          <span className="slide-btn-label" style={{ color: '#ffffff' }}>
            Next Slide
          </span>
          <span className="slide-btn-sub" style={{ color: 'var(--text-secondary)' }}>Page Down</span>
        </button>
      </div>

      {/* Laser Pointer Touch Track Area */}
      <div
        ref={laserPadRef}
        className={`laser-pad ${laserActive ? 'active' : ''}`}
        onTouchMove={handleLaserTouchMove}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Crosshair size={16} color={laserActive ? '#ffffff' : 'var(--text-muted)'} />
          <span className="laser-pad-label">
            {laserActive ? (gyroActive ? 'Air-Mouse Active (Tilt Phone)' : 'Laser Pad (Drag to aim)') : 'Digital Pointer Off'}
          </span>
        </div>
        <span className="laser-pad-hint">
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
          <span>{laserMode === 'spotlight' ? 'Spotlight' : 'Dot'}</span>
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
  );
};
