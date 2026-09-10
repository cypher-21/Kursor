import { useState, useEffect, useRef, useCallback } from 'react';

export interface SystemStatus {
  volume: number;
  muted: boolean;
  dnd: boolean;
  battery: number | null;
  charging: boolean;
}

export interface UseSocketReturn {
  connected: boolean;
  latency: number | null;
  serverName: string;
  systemStatus: SystemStatus;
  host: string;
  port: number;
  connect: (customHost?: string, customPort?: number) => void;
  disconnect: () => void;
  sendMove: (dx: number, dy: number) => void;
  sendClick: (button?: 'left' | 'right' | 'middle', state?: 'click' | 'down' | 'up') => void;
  sendScroll: (dx: number, dy: number) => void;
  sendGesture: (action: string) => void;
  sendPresenter: (action: 'next' | 'prev' | 'start' | 'exit' | 'black' | 'white') => void;
  sendLaser: (active: boolean, x?: number, y?: number, mode?: string) => void;
  sendMedia: (action: 'vol_up' | 'vol_down' | 'mute' | 'set_vol' | 'play_pause' | 'next' | 'prev', value?: number) => void;
  sendText: (content: string) => void;
  sendKey: (key: string) => void;
  sendLiveInput: (char: string) => void;
  sendLiveBackspace: () => void;
  sendLiveEnter: () => void;
  toggleDnd: () => void;
}

export function useSocket(): UseSocketReturn {
  const [connected, setConnected] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [serverName, setServerName] = useState('Kursor');
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    volume: 50,
    muted: false,
    dnd: false,
    battery: null,
    charging: false
  });

  // Determine initial host & port
  const getInitialHost = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mousely_host');
      if (saved) return saved;
      const host = window.location.hostname;
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return host;
      }
    }
    return '192.168.1.100';
  };

  const getInitialPort = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mousely_port');
      if (saved) return parseInt(saved, 10);
      const port = window.location.port;
      if (port && port !== '5173') {
        return parseInt(port, 10);
      }
    }
    return 8765;
  };

  const [host, setHost] = useState<string>(getInitialHost);
  const [port, setPort] = useState<number>(getInitialPort);

  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const sendRaw = useCallback((obj: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(obj));
    }
  }, []);

  const connect = useCallback((targetHost?: string, targetPort?: number) => {
    const h = targetHost || host;
    const p = targetPort || port;

    if (targetHost) setHost(targetHost);
    if (targetPort) setPort(targetPort);

    localStorage.setItem('mousely_host', h);
    localStorage.setItem('mousely_port', p.toString());

    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = `ws://${h}:${p}/ws`;
    console.log(`[Mousely] Connecting to ${wsUrl}...`);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Mousely] Connected to receiver!');
        setConnected(true);

        // Start ping loop for latency tracking
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', t: Date.now() }));
          }
        }, 2000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong' && data.t) {
            const rtt = Date.now() - data.t;
            setLatency(rtt);
          } else if (data.type === 'init') {
            if (data.server_name) setServerName(data.server_name);
            if (data.status) setSystemStatus(data.status);
          } else if (data.type === 'dnd_state') {
            setSystemStatus((prev) => ({ ...prev, dnd: data.active }));
          }
        } catch (err) {
          console.error('[Mousely] Message parse error:', err);
        }
      };

      ws.onclose = () => {
        console.log('[Mousely] WebSocket closed.');
        setConnected(false);
        setLatency(null);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      };

      ws.onerror = (err) => {
        console.warn('[Mousely] WebSocket error:', err);
      };
    } catch (e) {
      console.error('[Mousely] Failed to open WebSocket:', e);
    }
  }, [host, port]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, []);

  const sendMove = useCallback((dx: number, dy: number) => {
    sendRaw({ type: 'move', dx, dy });
  }, [sendRaw]);

  const sendClick = useCallback((button: 'left' | 'right' | 'middle' = 'left', state: 'click' | 'down' | 'up' = 'click') => {
    sendRaw({ type: 'click', button, state });
  }, [sendRaw]);

  const sendScroll = useCallback((dx: number, dy: number) => {
    sendRaw({ type: 'scroll', dx, dy });
  }, [sendRaw]);

  const sendGesture = useCallback((action: string) => {
    sendRaw({ type: 'gesture', action });
  }, [sendRaw]);

  const sendPresenter = useCallback((action: 'next' | 'prev' | 'start' | 'exit' | 'black' | 'white') => {
    sendRaw({ type: 'presenter', action });
  }, [sendRaw]);

  const sendLaser = useCallback((active: boolean, x?: number, y?: number, mode: string = 'laser') => {
    sendRaw({ type: 'laser', active, x, y, mode });
  }, [sendRaw]);

  const sendMedia = useCallback((action: 'vol_up' | 'vol_down' | 'mute' | 'set_vol' | 'play_pause' | 'next' | 'prev', value?: number) => {
    sendRaw({ type: 'media', action, value });
  }, [sendRaw]);

  const sendText = useCallback((content: string) => {
    sendRaw({ type: 'text', content });
  }, [sendRaw]);

  const sendKey = useCallback((key: string) => {
    sendRaw({ type: 'key', key });
  }, [sendRaw]);

  const toggleDnd = useCallback(() => {
    sendRaw({ type: 'dnd' });
  }, [sendRaw]);

  const sendLiveInput = useCallback((char: string) => {
    sendRaw({ type: 'live_input', char });
  }, [sendRaw]);

  const sendLiveBackspace = useCallback(() => {
    sendRaw({ type: 'live_backspace' });
  }, [sendRaw]);

  const sendLiveEnter = useCallback(() => {
    sendRaw({ type: 'live_enter' });
  }, [sendRaw]);

  return {
    connected,
    latency,
    serverName,
    systemStatus,
    host,
    port,
    connect,
    disconnect,
    sendMove,
    sendClick,
    sendScroll,
    sendGesture,
    sendPresenter,
    sendLaser,
    sendMedia,
    sendText,
    sendKey,
    sendLiveInput,
    sendLiveBackspace,
    sendLiveEnter,
    toggleDnd
  };
}
