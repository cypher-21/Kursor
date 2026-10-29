import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Moon,
  Sun,
  X,
  MousePointer2,
} from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics';

interface PresenterProps {
  onAction: (action: 'next' | 'prev' | 'start' | 'exit' | 'black' | 'white') => void;
  onMove: (dx: number, dy: number) => void;
  onClick?: (button?: 'left' | 'right' | 'middle', state?: 'click' | 'down' | 'up') => void;
}

export const Presenter: React.FC<PresenterProps> = ({ onAction, onMove, onClick }) => {
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

  const pointerPadRef = useRef<HTMLDivElement>(null);
  const prevTouchRef = useRef<{ x: number; y: number } | null>(null);
  const touchStartRef = useRef<{ x: number, y: number, time: number }>({ x: 0, y: 0, time: 0 });

  // Tap-and-drag state (mirrors the trackpad surface: tap-click, then hold-drag)
  const dragArmedRef = useRef(false);
  const draggingRef = useRef(false);
  const dragTimerRef = useRef<any>(null);

  const handlePointerTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;

    if (dragArmedRef.current) {
      // Tap-and-a-half engaged: button is held down, this stroke drags
      clearTimeout(dragTimerRef.current);
      dragArmedRef.current = false;
      draggingRef.current = true;
      haptics.heavy();
    }

    prevTouchRef.current = { x: touch.clientX, y: touch.clientY };
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  };

  const handlePointerTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;

    const prev = prevTouchRef.current;
    if (!draggingRef.current && !prev) return;
    const dx = (touch.clientX - (prev ? prev.x : touch.clientX)) * 1.3;
    const dy = (touch.clientY - (prev ? prev.y : touch.clientY)) * 1.3;
    prevTouchRef.current = { x: touch.clientX, y: touch.clientY };

    onMove(dx, dy);
  };

  const handlePointerTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (draggingRef.current) {
      // End of selection stroke: release the held button
      draggingRef.current = false;
      haptics.click();
      if (onClick) onClick('left', 'up');
      prevTouchRef.current = null;
      return;
    }

    if (dragArmedRef.current) {
      // Simple tap completed: release the pending button press -> normal click
      dragArmedRef.current = false;
      if (dragTimerRef.current) {
        clearTimeout(dragTimerRef.current);
        dragTimerRef.current = null;
      }
      if (onClick) onClick('left', 'up');
      prevTouchRef.current = null;
      return;
    }

    prevTouchRef.current = null;
    const touchDuration = Date.now() - touchStartRef.current.time;

    // Quick tap = arm a press-and-hold (tap AND a half supports drag/select)
    if (touchDuration < 250 && onClick) {
      haptics.click();
      onClick('left', 'down');
      dragArmedRef.current = true;
      if (dragTimerRef.current) clearTimeout(dragTimerRef.current);
      dragTimerRef.current = setTimeout(() => {
        // No follow-up stroke: release button -> single click
        dragArmedRef.current = false;
        dragTimerRef.current = null;
        if (onClick) onClick('left', 'up');
      }, 320);
    }
  };

  // Cleanup (trailing press when component unmounts)
  useEffect(() => {
    return () => {
      if (dragTimerRef.current) clearTimeout(dragTimerRef.current);
    };
  }, []);

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

      {/* Pointer Pad (flex: 1 dominant) - ALWAYS controls the mouse cursor */}
      <div
        ref={pointerPadRef}
        className="presenter-pad expanded"
        onTouchStart={handlePointerTouchStart}
        onTouchMove={handlePointerTouchMove}
        onTouchEnd={handlePointerTouchEnd}
        onTouchCancel={handlePointerTouchEnd}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MousePointer2 size={20} color="var(--text-muted)" />
          <span className="presenter-pad-label" style={{ fontSize: '0.96rem' }}>
            Pointer Pad
          </span>
        </div>
        <span className="presenter-pad-hint">
          Swipe to move the cursor • Quick tap = click • Tap, then tap-and-hold to drag (select text)
        </span>
      </div>

      {/* PowerPoint-style Quick Keys */}
      <div className="presentation-quick-tools">
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

        <button
          className="tool-btn"
          onClick={() => {
            haptics.click();
            onAction('black');
          }}
          title="Blank Screen (B)"
        >
          <Moon size={16} />
          <span>Black (B)</span>
        </button>

        <button
          className="tool-btn"
          onClick={() => {
            haptics.click();
            onAction('white');
          }}
          title="White Screen (W)"
        >
          <Sun size={16} />
          <span>White (W)</span>
        </button>

        <button
          className="tool-btn"
          onClick={() => {
            haptics.click();
            onAction('exit');
          }}
          title="Exit Presentation (Esc)"
        >
          <X size={16} />
          <span>Exit (Esc)</span>
        </button>
      </div>
    </div>
  );
};
