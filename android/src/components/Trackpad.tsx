import React, { useRef, useState, useCallback } from 'react';
import { MousePointer2, ArrowUpDown, Minimize2 } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics';

interface TrackpadProps {
  onMove: (dx: number, dy: number) => void;
  onClick: (button?: 'left' | 'right' | 'middle', state?: 'click' | 'down' | 'up') => void;
  onScroll: (dx: number, dy: number) => void;
  onGesture: (action: string) => void;
  sensitivity?: number;
  invertScroll?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

interface TouchRipple {
  id: number;
  x: number;
  y: number;
}

export const Trackpad: React.FC<TrackpadProps> = ({
  onMove,
  onClick,
  onScroll,
  onGesture,
  sensitivity = 1.0,
  invertScroll = false,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const haptics = useHaptics();
  const surfaceRef = useRef<HTMLDivElement>(null);

  // State tracking
  const [isTouching, setIsTouching] = useState(false);
  const [ripples, setRipples] = useState<TouchRipple[]>([]);
  const [activeButton, setActiveButton] = useState<string | null>(null);

  // Refs for tracking touch dynamics
  const touchStartPosRef = useRef<{ x: number; y: number; time: number; count: number }>({
    x: 0,
    y: 0,
    time: 0,
    count: 0,
  });
  const prevCentroidRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const totalTravelRef = useRef<number>(0);
  const swipeHandledRef = useRef<boolean>(false);

  // Compute centroid of touches
  const getCentroid = (touches: React.TouchList) => {
    let x = 0;
    let y = 0;
    for (let i = 0; i < touches.length; i++) {
      x += touches[i].clientX;
      y += touches[i].clientY;
    }
    return { x: x / touches.length, y: y / touches.length };
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsTouching(true);
    swipeHandledRef.current = false;
    totalTravelRef.current = 0;

    const centroid = getCentroid(e.touches);
    prevCentroidRef.current = centroid;
    touchStartPosRef.current = {
      x: centroid.x,
      y: centroid.y,
      time: Date.now(),
      count: e.touches.length,
    };

    // Add visual ripples for touches
    if (surfaceRef.current) {
      const rect = surfaceRef.current.getBoundingClientRect();
      const newRipples: TouchRipple[] = [];
      for (let i = 0; i < e.touches.length; i++) {
        newRipples.push({
          id: Math.random(),
          x: e.touches[i].clientX - rect.left,
          y: e.touches[i].clientY - rect.top,
        });
      }
      setRipples(newRipples);
      setTimeout(() => setRipples([]), 300);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const count = e.touches.length;
    const centroid = getCentroid(e.touches);

    const dx = (centroid.x - prevCentroidRef.current.x) * sensitivity;
    const dy = (centroid.y - prevCentroidRef.current.y) * sensitivity;

    totalTravelRef.current += Math.hypot(dx, dy);
    prevCentroidRef.current = centroid;

    if (count === 1) {
      // 1 Finger: Smooth cursor motion
      onMove(dx, dy);
    } else if (count === 2) {
      // 2 Fingers: Smooth vertical & horizontal scrolling
      const scrollMul = invertScroll ? 1 : -1;
      onScroll(dx * 0.8, dy * scrollMul * 0.8);
    } else if (count === 3 && !swipeHandledRef.current) {
      // 3 Fingers: Desktop Gestures
      const totalDx = centroid.x - touchStartPosRef.current.x;
      const totalDy = centroid.y - touchStartPosRef.current.y;
      const threshold = 50;

      if (Math.abs(totalDy) > threshold && Math.abs(totalDy) > Math.abs(totalDx)) {
        swipeHandledRef.current = true;
        if (totalDy < 0) {
          // Swipe Up -> Overview / Task View (Super key)
          haptics.heavy();
          onGesture('overview');
        } else {
          // Swipe Down -> Show Desktop (Super+D)
          haptics.heavy();
          onGesture('desktop');
        }
      } else if (Math.abs(totalDx) > threshold) {
        swipeHandledRef.current = true;
        if (totalDx < 0) {
          // Swipe Left -> Next Workspace
          haptics.click();
          onGesture('workspace_next');
        } else {
          // Swipe Right -> Prev Workspace
          haptics.click();
          onGesture('workspace_prev');
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsTouching(false);

    const touchDuration = Date.now() - touchStartPosRef.current.time;
    const travel = totalTravelRef.current;
    const count = touchStartPosRef.current.count;

    // Detect tap: low travel and short duration
    if (travel < 15 && touchDuration < 280 && !swipeHandledRef.current) {
      if (count === 1) {
        // 1-finger tap = Left Click
        haptics.click();
        onClick('left', 'click');
      } else if (count === 2) {
        // 2-finger tap = Right Click
        haptics.click();
        onClick('right', 'click');
      }
    }
  };

  // Dedicated scroll ribbon handler
  const handleScrollRibbon = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      if (!prevCentroidRef.current) {
        prevCentroidRef.current = { x: touch.clientX, y: touch.clientY };
        return;
      }
      const dy = touch.clientY - prevCentroidRef.current.y;
      prevCentroidRef.current = { x: touch.clientX, y: touch.clientY };
      const mul = invertScroll ? -1.5 : 1.5;
      onScroll(0, dy * mul);
      haptics.tick();
    },
    [onScroll, invertScroll, haptics]
  );

  return (
    <div className={`trackpad-container ${isFullscreen ? 'trackpad-fullscreen' : ''}`}>
      {/* Floating Exit Fullscreen Pill */}
      {isFullscreen && onToggleFullscreen && (
        <div className="floating-action-bar">
          <button
            className="icon-button"
            style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.1)' }}
            onClick={onToggleFullscreen}
            title="Exit Fullscreen"
          >
            <Minimize2 size={16} />
          </button>
        </div>
      )}

      {/* Main Gesture Area */}
      <div style={{ flex: 1, display: 'flex', gap: '8px', minHeight: 0, width: '100%' }}>
        <div
          ref={surfaceRef}
          className={`trackpad-surface ${isTouching ? 'touching' : ''}`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          {/* Animated touch ripples */}
          {ripples.map((rip) => (
            <div
              key={rip.id}
              className="touch-indicator"
              style={{ left: rip.x, top: rip.y }}
            />
          ))}

          {/* Minimalist subtle crosshair/pointer watermark */}
          <div className="trackpad-watermark">
            <MousePointer2 size={32} strokeWidth={1.2} style={{ opacity: 0.15 }} />
          </div>
        </div>

        {/* Scroll Ribbon on edge */}
        <div
          style={{
            width: '40px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: 'var(--text-muted)',
            cursor: 'ns-resize',
            touchAction: 'none',
            flexShrink: 0,
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            prevCentroidRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          }}
          onTouchMove={handleScrollRibbon}
          title="Scroll Ribbon"
        >
          <ArrowUpDown size={16} />
          <span style={{ fontSize: '0.62rem', writingMode: 'vertical-rl', fontWeight: 600, letterSpacing: '1px' }}>
            SCROLL
          </span>
        </div>
      </div>

      {/* Mouse Buttons Bar */}
      <div className="mouse-buttons-bar">
        <button
          className={`mouse-btn ${activeButton === 'left' ? 'active' : ''}`}
          onMouseDown={() => { setActiveButton('left'); onClick('left', 'down'); haptics.click(); }}
          onMouseUp={() => { setActiveButton(null); onClick('left', 'up'); }}
          onTouchStart={(e) => { e.preventDefault(); setActiveButton('left'); onClick('left', 'down'); haptics.click(); }}
          onTouchEnd={(e) => { e.preventDefault(); setActiveButton(null); onClick('left', 'up'); }}
        >
          Left Click
        </button>

        <button
          className={`mouse-btn ${activeButton === 'middle' ? 'active' : ''}`}
          style={{ flex: 0.6 }}
          onMouseDown={() => { setActiveButton('middle'); onClick('middle', 'down'); haptics.click(); }}
          onMouseUp={() => { setActiveButton(null); onClick('middle', 'up'); }}
          onTouchStart={(e) => { e.preventDefault(); setActiveButton('middle'); onClick('middle', 'down'); haptics.click(); }}
          onTouchEnd={(e) => { e.preventDefault(); setActiveButton(null); onClick('middle', 'up'); }}
        >
          Middle
        </button>

        <button
          className={`mouse-btn ${activeButton === 'right' ? 'active' : ''}`}
          onMouseDown={() => { setActiveButton('right'); onClick('right', 'down'); haptics.click(); }}
          onMouseUp={() => { setActiveButton(null); onClick('right', 'up'); }}
          onTouchStart={(e) => { e.preventDefault(); setActiveButton('right'); onClick('right', 'down'); haptics.click(); }}
          onTouchEnd={(e) => { e.preventDefault(); setActiveButton(null); onClick('right', 'up'); }}
        >
          Right Click
        </button>
      </div>
    </div>
  );
};
