import React from 'react';
import { Wifi, WifiOff, Settings, Battery, BatteryCharging, Zap, Maximize2, Minimize2 } from 'lucide-react';
import type { SystemStatus } from '../hooks/useSocket';

interface HeaderProps {
  connected: boolean;
  serverName: string;
  latency: number | null;
  status: SystemStatus;
  onOpenConnect: () => void;
  onOpenSettings: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  connected,
  serverName,
  latency,
  status,
  onOpenConnect,
  onOpenSettings,
  isFullscreen,
  onToggleFullscreen,
}) => {
  // Truncate server name for compact display
  const displayName = serverName.length > 8 ? serverName.slice(0, 7) + '..' : serverName;

  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-logo" title="Kursor">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="7" />
            <path d="M12 6v4" />
          </svg>
        </div>
        <div className="brand-name">Kursor</div>
      </div>

      <div className="header-actions">
        {/* Connection status pill */}
        <button
          onClick={onOpenConnect}
          className={`status-badge ${connected ? 'connected' : 'disconnected'}`}
          style={{ cursor: 'pointer' }}
          title={connected ? `Connected to ${serverName}` : 'Disconnected. Tap to connect'}
        >
          <span className="pulse-dot" />
          <span>{connected ? displayName : 'Offline'}</span>
          {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
        </button>

        {/* Latency badge */}
        {connected && latency !== null && (
          <div className="status-badge">
            <Zap size={11} />
            <span>{latency}ms</span>
          </div>
        )}

        {/* Host Laptop Battery */}
        {status.battery !== null && (
          <div className="status-badge">
            {status.charging ? <BatteryCharging size={13} color="#10b981" /> : <Battery size={13} />}
            <span>{status.battery}%</span>
          </div>
        )}

        {/* Fullscreen Toggle */}
        {onToggleFullscreen && (
          <button
            className="icon-button"
            style={{ width: '32px', height: '32px' }}
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Trackpad'}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        )}

        {/* Settings Button */}
        <button
          className="icon-button"
          style={{ width: '32px', height: '32px' }}
          onClick={onOpenSettings}
          title="Settings"
        >
          <Settings size={15} />
        </button>
      </div>
    </header>
  );
};
