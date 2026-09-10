import React from 'react';
import { Wifi, WifiOff, Settings, Battery, BatteryCharging, Zap, Download, Maximize2, Minimize2 } from 'lucide-react';
import type { SystemStatus } from '../hooks/useSocket';

interface HeaderProps {
  connected: boolean;
  serverName: string;
  latency: number | null;
  status: SystemStatus;
  onOpenInstall: () => void;
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
  onOpenInstall,
  onOpenConnect,
  onOpenSettings,
  isFullscreen,
  onToggleFullscreen,
}) => {
  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-logo" title="Kursor">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="7" />
            <path d="M12 6v4" />
          </svg>
        </div>
        <div>
          <div className="brand-name">Kursor</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Connection status pill */}
        <button
          onClick={onOpenConnect}
          className={`status-badge ${connected ? 'connected' : 'disconnected'}`}
          style={{ cursor: 'pointer' }}
          title={connected ? `Connected to ${serverName}` : 'Disconnected. Tap to connect'}
        >
          <span className="pulse-dot" />
          <span>{connected ? (serverName.length > 12 ? serverName.slice(0, 10) + '...' : serverName) : 'Offline'}</span>
          {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
        </button>

        {/* Latency badge */}
        {connected && latency !== null && (
          <div className="status-badge" style={{ color: '#e4e4e7' }}>
            <Zap size={11} />
            <span>{latency}ms</span>
          </div>
        )}

        {/* Host Laptop Battery */}
        {status.battery !== null && (
          <div className="status-badge" style={{ color: '#e4e4e7' }}>
            {status.charging ? <BatteryCharging size={13} color="#10b981" /> : <Battery size={13} />}
            <span>{status.battery}%</span>
          </div>
        )}

        {/* Install App / APK Button (Always Visible) */}
        <button
          className="status-badge"
          style={{
            cursor: 'pointer',
            background: 'rgba(255, 255, 255, 0.12)',
            borderColor: 'var(--border-medium)',
            color: '#ffffff',
            fontWeight: 700,
          }}
          onClick={onOpenInstall}
          title="Install App / Download APK"
        >
          <Download size={13} />
          <span>Install</span>
        </button>

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
