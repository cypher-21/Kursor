import React from 'react';
import { Wifi, WifiOff, Settings, Battery, BatteryCharging, Zap, Download } from 'lucide-react';
import type { SystemStatus } from '../hooks/useSocket';

interface HeaderProps {
  connected: boolean;
  serverName: string;
  latency: number | null;
  status: SystemStatus;
  canInstall?: boolean;
  onInstall?: () => void;
  onOpenConnect: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  connected,
  serverName,
  latency,
  status,
  canInstall,
  onInstall,
  onOpenConnect,
  onOpenSettings,
}) => {
  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="7" />
            <path d="M12 6v4" />
          </svg>
        </div>
        <div>
          <div className="brand-name">Mousely</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

        {/* Latency */}
        {connected && latency !== null && (
          <div className="status-badge" style={{ color: '#00f0ff', borderColor: 'rgba(0, 240, 255, 0.25)' }}>
            <Zap size={11} style={{ fill: '#00f0ff' }} />
            <span>{latency}ms</span>
          </div>
        )}

        {/* Host Laptop Battery */}
        {status.battery !== null && (
          <div className="status-badge" style={{ color: '#94a3b8' }}>
            {status.charging ? <BatteryCharging size={13} color="#10b981" /> : <Battery size={13} />}
            <span>{status.battery}%</span>
          </div>
        )}

        {/* Install Native PWA Button */}
        {canInstall && onInstall && (
          <button
            className="status-badge"
            style={{
              cursor: 'pointer',
              background: 'rgba(59, 130, 246, 0.2)',
              borderColor: '#3b82f6',
              color: '#60a5fa',
              fontWeight: 600,
            }}
            onClick={onInstall}
            title="Install Mousely on your Android device"
          >
            <Download size={13} />
            <span>Install</span>
          </button>
        )}

        {/* Settings Button */}
        <button
          className="icon-button"
          style={{ width: '34px', height: '34px', borderRadius: '10px' }}
          onClick={onOpenSettings}
          title="Settings"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
};
