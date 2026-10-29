import { useState, useEffect, useRef, useCallback } from 'react';

export interface SystemStatus {
  volume: number;
  muted: boolean;
  dnd: boolean;
  battery: number | null;
  charging: boolean;
  /** Actual playback state reported by the receiver (when detectable) */
  playing?: boolean;
}

const MAX_RECONNECT_DELAY_MS = 10_000;

export interface UseSocketReturn {
  connected: boolean;
  /** True while an automatic reconnect attempt is pending */
  reconnecting: boolean;
  /** True when the receiver requires a PIN that the remote cannot provide yet */
  needsAuth: boolean;
  /** Attempts remaining after the last failed PIN entry (null until a failure) */
  authError: number | null;
  latency: number | null;
  serverName: string;
  systemStatus: SystemStatus;
  host: string;
  port: number;
  connect: (customHost?: string, customPort?: number) => void;
  disconnect: () => void;
  sendAuth: (pin: string) => void;
  sendMove: (dx: number, dy: number) => void;
  sendClick: (button?: 'left' | 'right' | 'middle', state?: 'click' | 'down' | 'up') => void;
  sendScroll: (dx: number, dy: number) => void;
  sendGesture: (action: string) => void;
  sendPresenter: (action: 'next' | 'prev' | 'start' | 'exit') => void;
  sendMedia: (action: 'vol_up' | 'vol_down' | 'mute' | 'set_vol' | 'play_pause' | 'next' | 'prev', value?: number) => void;
  sendText: (content: string) => void;
  sendKey: (key: string) => void;
  sendLiveInput: (char: string) => void;
  sendLiveBackspace: () => void;
  sendLiveEnter: () => void;
  sendPower: (action: 'lock' | 'sleep') => void;
  requestClipboard: () => void;
  serverClipboard: string | null;
  clipboardLoading: boolean;
  powerResult: { action: 'lock' | 'sleep'; ok: boolean } | null;
  toggleDnd: () => void;
}

export function useSocket(): UseSocketReturn {
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [authError, setAuthError] = useState<number | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [serverName, setServerName] = useState('Kursor');
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    volume: 50,
    muted: false,
    dnd: false,
    battery: null,
    charging: false
  });
  // Text fetched from the PC clipboard (null = requested but empty/unreadable)
  const [serverClipboard, setServerClipboard] = useState<string | null>(null);
  const [clipboardLoading, setClipboardLoading] = useState(false);
  // Outcome of the last lock/sleep command, as acknowledged by the PC
  const [powerResult, setPowerResult] = useState<{ action: 'lock' | 'sleep'; ok: boolean } | null>(null);

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
    return '';
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
  const hostRef = useRef(host);
  const portRef = useRef(port);
  // Guards against reconnect loops after an intentional disconnect
  const manualCloseRef = useRef(false);
  const retractAttemptRef = useRef(0);
  const authSentRef = useRef(false);

  const sendRaw = useCallback((obj: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(obj));
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (manualCloseRef.current) return;
    setReconnecting(true);
    const attempt = retractAttemptRef.current;
    retractAttemptRef.current = attempt + 1;
    const delay = Math.min(1000 * Math.pow(2, Math.min(attempt, 4)), MAX_RECONNECT_DELAY_MS);
    console.log(`[Kursor] Reconnecting in ${delay}ms (attempt ${attempt + 1})...`);
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    reconnectTimeoutRef.current = setTimeout(() => {
      connect(hostRef.current, portRef.current);
    }, delay);
  }, []);

  const connect = useCallback((customHost?: string, customPort?: number) => {
    const h = (customHost !== undefined ? customHost : hostRef.current) || '';
    const p = customPort ?? portRef.current;

    if (customHost !== undefined) hostRef.current = customHost;
    hostRef.current = h;
    portRef.current = p;

    localStorage.setItem('mousely_host', h);
    localStorage.setItem('mousely_port', p.toString());
    if (h) setHost(h);
    setPort(p);

    if (wsRef.current) {
      manualCloseRef.current = true;
      wsRef.current.close();
    }
    manualCloseRef.current = false;

    if (!h) {
      console.warn('[Kursor] No host to connect to.');
      return;
    }

    const wsUrl = `ws://${h}:${p}/ws`;
    console.log(`[Kursor] Connecting to ${wsUrl}...`);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Kursor] Connected to receiver!');
        setConnected(true);
        setReconnecting(false);
        retractAttemptRef.current = 0;
        authSentRef.current = false;
        setNeedsAuth(false);
        setAuthError(null);

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
            if (data.auth_required) {
              const savedPin = localStorage.getItem('kursor_pin');
              if (savedPin && !authSentRef.current) {
                // Silent auto-auth with the remembered PIN
                authSentRef.current = true;
                sendRaw({ type: 'auth', pin: savedPin });
              } else {
                setNeedsAuth(true);
              }
            }
          } else if (data.type === 'auth_ok') {
            // Remember the working PIN (from the silent attempt or the modal)
            const savedPin = localStorage.getItem('kursor_pin');
            const lastTyped = localStorage.getItem('kursor_pin_last');
            if (!savedPin && lastTyped) localStorage.setItem('kursor_pin', lastTyped);
            localStorage.removeItem('kursor_pin_last');
            setNeedsAuth(false);
            setAuthError(null);
            if (data.server_name) setServerName(data.server_name);
            if (data.status) setSystemStatus(data.status);
          } else if (data.type === 'status') {
            // Live state pushed by the receiver after media/DND changes
            if (data.status) setSystemStatus(data.status);
          } else if (data.type === 'auth_error') {
            setAuthError(data.attempts_remaining ?? null);
            setNeedsAuth(true);
            localStorage.removeItem('kursor_pin_last');
            localStorage.removeItem('kursor_pin');
            authSentRef.current = false;
          } else if (data.type === 'auth_denied') {
            setInputsLocked();
          } else if (data.type === 'auth_required') {
            // Server nudged: we sent input without completing auth
            if (!authSentRef.current) {
              const savedPin = localStorage.getItem('kursor_pin');
              if (savedPin) {
                authSentRef.current = true;
                sendRaw({ type: 'auth', pin: savedPin });
              } else {
                setNeedsAuth(true);
              }
            }
          } else if (data.type === 'dnd_state') {
            setSystemStatus((prev) => ({ ...prev, dnd: data.active }));
          } else if (data.type === 'clipboard_text') {
            // Reply to a requestClipboard() call (may be null = empty/unreadable)
            setServerClipboard(data.text ?? null);
            setClipboardLoading(false);
          } else if (data.type === 'power_result') {
            // PC acknowledges lock/sleep; ok=false means the PC refused it
            setPowerResult({ action: data.action, ok: !!data.ok });
          }
        } catch (err) {
          console.error('[Kursor] Message parse error:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('[Kursor] WebSocket closed.', event.code);
        if (!manualCloseRef.current) {
          setConnected(false);
          setLatency(null);
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          scheduleReconnect();
        }
      };

      ws.onerror = (err) => {
        console.warn('[Kursor] WebSocket error:', err);
      };
    } catch (e) {
      console.error('[Kursor] Failed to open WebSocket:', e);
      scheduleReconnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleReconnect, sendRaw]);

  const setInputsLocked = () => setNeedsAuth(true);

  const disconnect = useCallback(() => {
    manualCloseRef.current = true;
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    retractAttemptRef.current = 0;
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
    setReconnecting(false);
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, []);

  const sendAuth = useCallback((pin: string) => {
    localStorage.setItem('kursor_pin_last', pin);
    sendRaw({ type: 'auth', pin });
  }, [sendRaw]);

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

  const sendPresenter = useCallback((action: 'next' | 'prev' | 'start' | 'exit') => {
    sendRaw({ type: 'presenter', action });
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

  const sendPower = useCallback((action: 'lock' | 'sleep') => {
    sendRaw({ type: 'power', action });
  }, [sendRaw]);

  const requestClipboard = useCallback(() => {
    setClipboardLoading(true);
    sendRaw({ type: 'clipboard', action: 'get' });
  }, [sendRaw]);

  return {
    connected,
    reconnecting,
    needsAuth,
    authError,
    latency,
    serverName,
    systemStatus,
    host,
    port,
    connect,
    disconnect,
    sendAuth,
    sendMove,
    sendClick,
    sendScroll,
    sendGesture,
    sendPresenter,
    sendMedia,
    sendText,
    sendKey,
    sendLiveInput,
    sendLiveBackspace,
    sendLiveEnter,
    sendPower,
    requestClipboard,
    serverClipboard,
    clipboardLoading,
    powerResult,
    toggleDnd
  };
}
