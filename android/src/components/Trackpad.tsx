import React, { useRef, useState, useCallback } from 'react';
import { MousePointer2, ArrowUpDown, Minimize2, Maximize2, Keyboard, Delete, CornerDownLeft, X } from 'lucide-react';
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
  onLiveInput?: (char: string) => void;
  onLiveBackspace?: () => void;
  onLiveEnter?: () => void;
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
  onLiveInput,
  onLiveBackspace,
  onLiveEnter,
}) => {
  const haptics = useHaptics();
  const surfaceRef = useRef<HTMLDivElement>(null);

  // State tracking
  const [isTouching, setIsTouching] = useState(false);
  const [ripples, setRipples] = useState<TouchRipple[]>([]);
  const [activeButton, setActiveButton] = useState<string | null>(null);

  // Keyboard integration state
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);
  const [typedBuffer, setTypedBuffer] = useState('');
  const [autoKbOnClick, setAutoKbOnClick] = useState<boolean>(() => {
    return localStorage.getItem('kursor_auto_kb') === 'true';
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevValueRef = useRef('');

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

  // Keyboard activation (must be called directly inside user touch/click gesture)
  const activateKeyboard = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      setIsKeyboardActive(true);
      haptics.click();
    }
  }, [haptics]);

  const deactivateKeyboard = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.blur();
    }
    setIsKeyboardActive(false);
    setTypedBuffer('');
    prevValueRef.current = '';
  }, []);

  const toggleAutoKb = () => {
    const next = !autoKbOnClick;
    setAutoKbOnClick(next);
    localStorage.setItem('kursor_auto_kb', next ? 'true' : 'false');
    haptics.tick();
  };

  // Handle typing inside trackpad
  const handleKeyboardInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;

    const current = el.value;
    const prev = prevValueRef.current;

    if (current.length > prev.length) {
      const added = current.slice(prev.length);
      for (const char of added) {
        if (onLiveInput) onLiveInput(char);
      }
      setTypedBuffer((b) => (b + added).slice(-30));
      haptics.tick();
    } else if (current.length < prev.length) {
      const deleted = prev.length - current.length;
      for (let i = 0; i < deleted; i++) {
        if (onLiveBackspace) onLiveBackspace();
      }
      setTypedBuffer((b) => b.slice(0, -deleted));
      haptics.tick();
    }

    prevValueRef.current = current;

    if (current.length > 200) {
      el.value = current.slice(-50);
      prevValueRef.current = el.value;
    }
  }, [onLiveInput, onLiveBackspace, haptics]);

  const handleKeyboardKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (onLiveEnter) onLiveEnter();
      setTypedBuffer('');
      haptics.click();
      if (textareaRef.current) {
        textareaRef.current.value = '';
        prevValueRef.current = '';
      }
    }
  }, [onLiveEnter, haptics]);

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

        // If Auto-Keyboard on click is enabled, summon keyboard synchronously inside tap gesture
        if (autoKbOnClick && textareaRef.current) {
          textareaRef.current.focus();
          setIsKeyboardActive(true);
        }
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
      {/* Hidden textarea for live mobile keyboard input from the trackpad */}
      <textarea
        ref={textareaRef}
        className="trackpad-hidden-input"
        onInput={handleKeyboardInput}
        onKeyDown={handleKeyboardKeyDown}
        onFocus={() => setIsKeyboardActive(true)}
        onBlur={() => setIsKeyboardActive(false)}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="send"
        inputMode="text"
        aria-label="Trackpad keyboard input"
      />

      {/* Floating Action Bar: Fullscreen & Keyboard Controls */}
      <div className="floating-action-bar">
        {/* Toggle On-Screen Keyboard */}
        <button
          className={`icon-button ${isKeyboardActive ? 'active' : ''}`}
          style={{ width: '32px', height: '32px' }}
          onClick={isKeyboardActive ? deactivateKeyboard : activateKeyboard}
          title={isKeyboardActive ? 'Close Keyboard' : 'Open Keyboard'}
        >
          <Keyboard size={16} />
        </button>

        {/* Auto-Open Keyboard on Click toggle */}
        <button
          className="key-chip"
          style={{
            padding: '3px 7px',
            fontSize: '0.65rem',
            background: autoKbOnClick ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.06)',
            borderColor: autoKbOnClick ? '#10b981' : 'var(--border-subtle)',
            color: autoKbOnClick ? '#34d399' : 'var(--text-muted)',
          }}
          onClick={toggleAutoKb}
          title="Toggle Auto-Open Keyboard when clicking on PC"
        >
          Auto-KB: {autoKbOnClick ? 'ON' : 'OFF'}
        </button>

        {/* Fullscreen Toggle */}
        {onToggleFullscreen && (
          <button
            className="icon-button"
            style={{ width: '32px', height: '32px' }}
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Browser Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        )}
      </div>

      {/* Active Live Typing Banner */}
      {isKeyboardActive && (
        <div className="trackpad-live-keyboard-bar">
          <div className="trackpad-live-text">
            <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>Sent:</span>
            <span>{typedBuffer || 'Type on phone keyboard...'}</span>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              className="key-chip"
              style={{ padding: '4px 8px', fontSize: '0.7rem' }}
              onClick={() => { if (onLiveBackspace) onLiveBackspace(); haptics.tick(); }}
              title="Backspace"
            >
              <Delete size={12} style={{ verticalAlign: 'middle' }} />
            </button>
            <button
              className="key-chip"
              style={{ padding: '4px 8px', fontSize: '0.7rem' }}
              onClick={() => { if (onLiveEnter) onLiveEnter(); haptics.click(); setTypedBuffer(''); }}
              title="Enter"
            >
              <CornerDownLeft size={12} style={{ verticalAlign: 'middle' }} />
            </button>
            <button
              className="key-chip"
              style={{ padding: '4px 8px', fontSize: '0.7rem', color: '#f87171' }}
              onClick={deactivateKeyboard}
              title="Dismiss Keyboard"
            >
              <X size={12} style={{ verticalAlign: 'middle' }} />
            </button>
          </div>
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
          onTouchStart={(e) => {
            e.preventDefault();
            setActiveButton('left');
            onClick('left', 'down');
            haptics.click();
            if (autoKbOnClick && textareaRef.current) {
              textareaRef.current.focus();
              setIsKeyboardActive(true);
            }
          }}
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
