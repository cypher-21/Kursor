import { useState, useEffect, useCallback } from 'react';
import { MousePointer2, Presentation, SlidersHorizontal } from 'lucide-react';
import { Header } from './components/Header';
import { Trackpad } from './components/Trackpad';
import { Presenter } from './components/Presenter';
import { QuickControls } from './components/QuickControls';
import { ConnectionModal } from './components/ConnectionModal';
import { PinModal } from './components/PinModal';
import { SettingsModal } from './components/SettingsModal';
import { useSocket } from './hooks/useSocket';
import { useHaptics } from './hooks/useHaptics';

export function App() {
  const [activeTab, setActiveTab] = useState<'trackpad' | 'presenter' | 'controls'>('trackpad');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);

  // Settings
  const [sensitivity, setSensitivity] = useState<number>(() => {
    const saved = localStorage.getItem('kursor_sensitivity') || localStorage.getItem('mousely_sensitivity');
    return saved ? parseFloat(saved) : 1.2;
  });

  const [scrollSensitivity, setScrollSensitivity] = useState<number>(() => {
    const saved = localStorage.getItem('kursor_scroll_sensitivity');
    return saved ? parseFloat(saved) : 1.0;
  });

  const [invertScroll, setInvertScroll] = useState<boolean>(() => {
    const saved = localStorage.getItem('kursor_invert_scroll') || localStorage.getItem('mousely_invert_scroll');
    return saved === 'true';
  });

  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('kursor_haptics') || localStorage.getItem('mousely_haptics');
    return saved !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('kursor_sensitivity', sensitivity.toString());
  }, [sensitivity]);

  useEffect(() => {
    localStorage.setItem('kursor_scroll_sensitivity', scrollSensitivity.toString());
  }, [scrollSensitivity]);

  useEffect(() => {
    localStorage.setItem('kursor_invert_scroll', invertScroll ? 'true' : 'false');
  }, [invertScroll]);

  useEffect(() => {
    localStorage.setItem('kursor_haptics', hapticsEnabled ? 'true' : 'false');
  }, [hapticsEnabled]);

  // Track browser native fullscreen state (Chrome / Safari)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      const isFs = Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setIsBrowserFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const haptics = useHaptics(hapticsEnabled);

  // Socket communication
  const socket = useSocket();

  // HTML5 Fullscreen API toggle for Chrome browser
  const toggleBrowserFullscreen = useCallback(async () => {
    haptics.click();
    try {
      const doc = document as any;
      const isFs = Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );

      if (!isFs) {
        const docEl = document.documentElement as any;
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        } else if (docEl.msRequestFullscreen) {
          await docEl.msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Browser fullscreen request failed:', err);
    }
  }, [haptics]);

  return (
    <div className="app-shell">
      {/* Top Header */}
      <Header
        connected={socket.connected}
        serverName={socket.serverName}
        latency={socket.latency}
        status={socket.systemStatus}
        reconnecting={socket.reconnecting}
        onOpenConnect={() => setShowConnectModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        isFullscreen={isBrowserFullscreen}
        onToggleFullscreen={toggleBrowserFullscreen}
      />

      {/* Navigation Mode Tabs */}
      <nav className="nav-tab-container">
        <button
          className={`nav-tab ${activeTab === 'trackpad' ? 'active' : ''}`}
          onClick={() => {
            haptics.tick();
            setActiveTab('trackpad');
          }}
        >
          <MousePointer2 size={15} />
          <span>Trackpad</span>
        </button>

        <button
          className={`nav-tab ${activeTab === 'presenter' ? 'active' : ''}`}
          onClick={() => {
            haptics.tick();
            setActiveTab('presenter');
          }}
        >
          <Presentation size={15} />
          <span>Presenter</span>
        </button>

        <button
          className={`nav-tab ${activeTab === 'controls' ? 'active' : ''}`}
          onClick={() => {
            haptics.tick();
            setActiveTab('controls');
          }}
        >
          <SlidersHorizontal size={15} />
          <span>Controls</span>
        </button>
      </nav>

      {/* Main View Area */}
      <main className="main-content">
        {activeTab === 'trackpad' && (
          <Trackpad
            onMove={socket.sendMove}
            onClick={socket.sendClick}
            onScroll={socket.sendScroll}
            onGesture={socket.sendGesture}
            sensitivity={sensitivity}
            scrollSensitivity={scrollSensitivity}
            invertScroll={invertScroll}
          />
        )}

        {activeTab === 'presenter' && (
          <Presenter
            onAction={socket.sendPresenter}
            onMove={socket.sendMove}
            onClick={socket.sendClick}
          />
        )}

        {activeTab === 'controls' && (
          <QuickControls
            status={socket.systemStatus}
            onMedia={socket.sendMedia}
            onDnd={socket.toggleDnd}
            onSendText={socket.sendText}
            onSendKey={socket.sendKey}
            onLiveInput={socket.sendLiveInput}
            onLiveBackspace={socket.sendLiveBackspace}
            onLiveEnter={socket.sendLiveEnter}
            onSendPower={socket.sendPower}
            onRequestClipboard={socket.requestClipboard}
            serverClipboard={socket.serverClipboard}
            clipboardLoading={socket.clipboardLoading}
          />
        )}
      </main>

      {/* Modals */}
      <PinModal
        isOpen={socket.needsAuth}
        serverName={socket.serverName}
        attemptsRemaining={socket.authError}
        onSubmitPin={socket.sendAuth}
      />

      <ConnectionModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        currentHost={socket.host}
        currentPort={socket.port}
        connected={socket.connected}
        serverName={socket.serverName}
        onConnect={(h, p) => socket.connect(h, p)}
        onDisconnect={socket.disconnect}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        sensitivity={sensitivity}
        setSensitivity={setSensitivity}
        scrollSensitivity={scrollSensitivity}
        setScrollSensitivity={setScrollSensitivity}
        invertScroll={invertScroll}
        setInvertScroll={setInvertScroll}
        hapticsEnabled={hapticsEnabled}
        setHapticsEnabled={setHapticsEnabled}
      />
    </div>
  );
}
export default App;
