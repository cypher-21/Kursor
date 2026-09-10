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
  onClick?: (button?: 'left' | 'right' | 'middle', state?: 'click' | 'down' | 'up') => void;
}

export const Presenter: React.FC<PresenterProps> = ({ onAction, onLaser, onMove, onClick }) => {
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

  const pointerPadRef = useRef<HTMLDivElement>(null);
  const prevTouchRef = useRef<{ x: number; y: number } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });

  // Handle Gyro air-mouse: sends RELATIVE move deltas to move the host cursor
  const { requestPermission } = useOrientation(gyroActive, (dx, dy) => {
    onMove(dx, dy);
  });

  const toggleLaser = async () => {
    const next = !laserActive;
    setLaserActive(next);
    haptics.heavy();
    onLaser(next, undefined, undefined, laserMode);
  };

  // Pointer Pad touch handlers - acts like a mouse trackpad so user can "use it like a mouse"
  const handlePointerTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    prevTouchRef.current = { x: touch.clientX, y: touch.clientY };
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  };

  const handlePointerTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch || !prevTouchRef.current) return;

    const dx = (touch.clientX - prevTouchRef.current.x) * 1.3;
    const dy = (touch.clientY - prevTouchRef.current.y) * 1.3;
    prevTouchRef.current = { x: touch.clientX, y: touch.clientY };

    onMove(dx, dy);
  };

  const handlePointerTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    prevTouchRef.current = null;
    const touchDuration = Date.now() - touchStartRef.current.time;

    // Quick tap = Left Click (advance slide or click link)
    if (touchDuration < 250 && onClick) {
      haptics.click();
      onClick('left', 'click');
    }
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

      {/* Slide Navigation Row (Compact Cards) */}
      <div className="slide-nav-row compact">
        {/* Previous Slide Button */}
        <button
          className="slide-btn prev-slide"
          onClick={() => {
            haptics.click();
            onAction('prev');
          }}
        >
          <ChevronLeft size={28} strokeWidth={2.2} color="var(--text-secondary)" />
          <div>
            <div className="slide-btn-label">Previous</div>
            <div className="slide-btn-sub">Page Up</div>
          </div>
        </button>

        {/* Next Slide Button (Dominant) */}
        <button
          className="slide-btn next-slide"
          onClick={() => {
            haptics.success();
            onAction('next');
          }}
        >
          <ChevronRight size={28} strokeWidth={2.4} color="#ffffff" />
          <div>
            <div className="slide-btn-label" style={{ color: '#ffffff' }}>
              Next Slide
            </div>
            <div className="slide-btn-sub" style={{ color: 'var(--text-secondary)' }}>Page Down</div>
          </div>
        </button>
      </div>

      {/* Large Digital Pointer / Mouse Touch Area (flex: 1 dominant) */}
      <div
        ref={pointerPadRef}
        className={`laser-pad expanded ${laserActive ? 'active' : ''}`}
        onTouchStart={handlePointerTouchStart}
        onTouchMove={handlePointerTouchMove}
        onTouchEnd={handlePointerTouchEnd}
        onTouchCancel={handlePointerTouchEnd}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Crosshair size={20} color={laserActive ? '#ffffff' : 'var(--text-muted)'} />
          <span className="laser-pad-label" style={{ fontSize: '0.96rem' }}>
            {laserActive
              ? (gyroActive ? 'Air-Mouse Active (Tilt Phone or Drag)' : 'Digital Pointer Active (Drag to Aim)')
              : (gyroActive ? 'Air-Mouse Active (Tilt to Steer Mouse)' : 'Touch to Aim Pointer & Mouse')}
          </span>
        </div>
        <span className="laser-pad-hint">
          {laserActive
            ? 'Glowing beam visible on presentation display • Tap to click'
            : 'Swipe anywhere to move cursor • Tap Pointer ON below for glow beam'}
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
              const next = !gyroActive;
              setGyroActive(next);
              haptics.click();
              if (next && !laserActive) {
                // Also turn on pointer when air mouse is activated for visual feedback
                toggleLaser();
              }
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
