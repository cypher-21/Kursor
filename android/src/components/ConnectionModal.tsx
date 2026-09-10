import React, { useState } from 'react';
import { X, Monitor, CheckCircle, AlertCircle } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentHost: string;
  currentPort: number;
  connected: boolean;
  serverName: string;
  onConnect: (host: string, port: number) => void;
  onDisconnect: () => void;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isOpen,
  onClose,
  currentHost,
  currentPort,
  connected,
  serverName,
  onConnect,
  onDisconnect,
}) => {
  const haptics = useHaptics();
  const [hostInput, setHostInput] = useState(currentHost);
  const [portInput, setPortInput] = useState(currentPort.toString());

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const portNum = parseInt(portInput, 10) || 8765;
    haptics.success();
    onConnect(hostInput.trim(), portNum);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Monitor size={18} />
            <h3 className="modal-title">Connect to Computer</h3>
          </div>
          <button className="icon-button" style={{ width: '30px', height: '30px' }} onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        {/* Current Connection Status */}
        <div
          style={{
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            background: connected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            border: `1px solid ${connected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          {connected ? <CheckCircle size={18} color="#10b981" /> : <AlertCircle size={18} color="#ef4444" />}
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: connected ? '#34d399' : '#f87171' }}>
              {connected ? `Connected: ${serverName}` : 'No Active Connection'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              {connected ? `ws://${currentHost}:${currentPort}` : 'Enter your computer local IP below'}
            </div>
          </div>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
              Host IP Address or Domain
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. 192.168.1.100"
              value={hostInput}
              onChange={(e) => setHostInput(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
              Port
            </label>
            <input
              type="number"
              className="input-field"
              placeholder="8765"
              value={portInput}
              onChange={(e) => setPortInput(e.target.value)}
              required
            />
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Ensure your phone and computer are on the same Wi-Fi network. You can scan the QR code displayed in the Kursor terminal or GUI.
          </div>

          <button type="submit" className="primary-button">
            {connected ? 'Reconnect' : 'Connect Now'}
          </button>

          {connected && (
            <button
              type="button"
              className="tool-btn"
              style={{ padding: '10px', color: '#ef4444' }}
              onClick={() => {
                haptics.click();
                onDisconnect();
                onClose();
              }}
            >
              Disconnect
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
