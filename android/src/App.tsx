import { useState, useEffect } from 'react';
import { MousePointer2, Presentation, SlidersHorizontal } from 'lucide-react';
import { Header } from './components/Header';
import { Trackpad } from './components/Trackpad';
import { Presenter } from './components/Presenter';
import { QuickControls } from './components/QuickControls';
import { ConnectionModal } from './components/ConnectionModal';
import { SettingsModal } from './components/SettingsModal';
import { useSocket } from './hooks/useSocket';
import { useHaptics } from './hooks/useHaptics';

export function App() {
  const [activeTab, setActiveTab] = useState<'trackpad' | 'presenter' | 'controls'>('trackpad');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Settings
  const [sensitivity, setSensitivity] = useState<number>(() => {
    const saved = localStorage.getItem('mousely_sensitivity');
    return saved ? parseFloat(saved) : 1.2;
  });

  const [invertScroll, setInvertScroll] = useState<boolean>(() => {
    return localStorage.getItem('mousely_invert_scroll') === 'true';
  });

  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('mousely_haptics') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('mousely_sensitivity', sensitivity.toString());
  }, [sensitivity]);

  useEffect(() => {
    localStorage.setItem('mousely_invert_scroll', invertScroll ? 'true' : 'false');
  }, [invertScroll]);

  useEffect(() => {
    localStorage.setItem('mousely_haptics', hapticsEnabled ? 'true' : 'false');
  }, [hapticsEnabled]);

  // PWA Installation prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const haptics = useHaptics(hapticsEnabled);

  // Socket communication
  const socket = useSocket();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
      {/* Top Header */}
      <Header
        connected={socket.connected}
        serverName={socket.serverName}
        latency={socket.latency}
        status={socket.systemStatus}
        canInstall={Boolean(deferredPrompt)}
        onInstall={handleInstallApp}
        onOpenConnect={() => setShowConnectModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
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
          <MousePointer2 size={16} />
          <span>Trackpad</span>
        </button>

        <button
          className={`nav-tab ${activeTab === 'presenter' ? 'active' : ''}`}
          onClick={() => {
            haptics.tick();
            setActiveTab('presenter');
          }}
        >
          <Presentation size={16} />
          <span>Presenter</span>
        </button>

        <button
          className={`nav-tab ${activeTab === 'controls' ? 'active' : ''}`}
          onClick={() => {
            haptics.tick();
            setActiveTab('controls');
          }}
        >
          <SlidersHorizontal size={16} />
          <span>Controls</span>
        </button>
      </nav>

      {/* Main View Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {activeTab === 'trackpad' && (
          <Trackpad
            onMove={socket.sendMove}
            onClick={socket.sendClick}
            onScroll={socket.sendScroll}
            onGesture={socket.sendGesture}
            sensitivity={sensitivity}
            invertScroll={invertScroll}
          />
        )}

        {activeTab === 'presenter' && (
          <Presenter
            onAction={socket.sendPresenter}
            onLaser={socket.sendLaser}
          />
        )}

        {activeTab === 'controls' && (
          <QuickControls
            status={socket.systemStatus}
            onMedia={socket.sendMedia}
            onDnd={socket.toggleDnd}
            onSendText={socket.sendText}
            onSendKey={socket.sendKey}
          />
        )}
      </main>

      {/* Modals */}
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
        invertScroll={invertScroll}
        setInvertScroll={setInvertScroll}
        hapticsEnabled={hapticsEnabled}
        setHapticsEnabled={setHapticsEnabled}
      />
    </div>
  );
}

export default App;
