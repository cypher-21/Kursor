# Kursor Web Remote (Frontend Client)

The mobile web client for Kursor, built with **React 19**, **TypeScript**, and **Vite**. It functions as a zero-install responsive web application and Progressive Web App (PWA) served directly from the PC host over local Wi-Fi.

---

## 📱 Features

- **Modes & Tabs**:
  - **Trackpad**: Full-surface multi-touch trackpad with animated touch ripples, left/middle/right mouse click buttons, calibrated two-finger scrolling, and dedicated right-edge **Scroll Ribbon**.
  - **Presenter**: Slide advance/back controls, built-in large touchpad for simultaneous cursor control, presentation stopwatch timer, presentation shortcuts (F5, Esc, Blank), and gyro air-mouse.
  - **Quick Controls**: Volume slider, media playback controls, DND toggle, and real-time live typing keyboard with Unicode support and PC modifier keys.
- **Top Header**:
  - Live connection status badge ("Online" / "Offline") with server name tooltip.
  - Live ping latency readout in milliseconds (RTT).
  - Host battery level indicator with charging status.
  - Browser-native Fullscreen toggle (hides mobile browser URL bar).
  - Preferences modal.
- **Preferences Modal**:
  - **Cursor Sensitivity** slider (`0.4x` to `3.0x`).
  - **Scroll Sensitivity** slider (`0.2x` to `3.0x`).
  - **Natural Scrolling** toggle (content follows finger vs. traditional).
  - **Haptic Feedback** toggle (uses device vibration API).

---

## 🛠️ Development & Building

### Prerequisites
- Node.js 18+ and npm

### Local Development Server
```bash
cd android
npm install
npm run dev
```
By default, Vite runs the development server on `http://localhost:5173`. When testing in dev mode against a running Kursor desktop server, enter your PC's LAN IP in the Connection modal (`Settings -> Connection`).

### Production Build
```bash
npm run build
```
This compiles the TypeScript code and bundles the production assets into `android/dist/`:
- `dist/index.html`
- `dist/assets/*.js`
- `dist/assets/*.css`
- `dist/manifest.json`, `dist/sw.js`, and icons.

### Serving with Kursor Desktop Server
The Python server automatically serves assets from `android/dist` (or `server/kursor/static/`). To sync built assets:
```powershell
Copy-Item -Path "android\dist\*" -Destination "server\kursor\static" -Recurse -Force
```

---

## 📂 Architecture

```
android/src/
├── components/
│   ├── Header.tsx            # Connection pill, latency, battery, fullscreen, preferences
│   ├── Trackpad.tsx          # Multi-touch surface, scroll ribbon, left/middle/right buttons
│   ├── Presenter.tsx         # Slide navigation buttons, pointer pad, stopwatch timer, quick keys
│   ├── QuickControls.tsx     # Volume slider, media deck, DND, live keyboard input
│   ├── SettingsModal.tsx     # Cursor & scroll sensitivity, natural scroll, haptics
│   └── ConnectionModal.tsx   # Manual IP/port connection modal
│
├── hooks/
│   ├── useSocket.ts          # WebSocket communication, latency ping-pong, state sync
│   ├── useHaptics.ts         # Vibration haptic feedback abstraction (tick, click, heavy)
│   └── useOrientation.ts     # Device orientation sensor reader for air-mouse
│
├── index.css                 # Dark theme design system, CSS variables, mobile responsiveness
├── App.tsx                   # Main state container and navigation shell
└── main.tsx                  # React DOM entrypoint
```

---

## 📦 PWA & Offline Support

- Registered service worker in `public/sw.js` for asset caching.
- Web app manifest in `public/manifest.json` configured with `display: "standalone"` and dark background themes for home screen installation on Android and iOS.
