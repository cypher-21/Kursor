# Kursor - Wireless Trackpad & Presentation Remote

Turn your Android smartphone into a high-precision wireless trackpad, presentation remote, and media controller for your Windows or Linux PC.

An open-source desktop control system engineered for **Windows** (10/11) and **Linux** (Wayland & X11) with a companion **Android** client (Web App & Native APK).

---

## Features

- **Multi-Touch Trackpad**:
  - **1-Finger Drag**: Smooth cursor motion with natural acceleration curves.
  - **1-Finger Tap**: Left-click with instant haptic feedback.
  - **2-Finger Tap**: Right-click context menu.
  - **2-Finger Drag & Edge Ribbon**: Precise vertical and horizontal scrolling.
  - **Dedicated Fullscreen Mode**: 1-tap dedicated canvas mode utilizing 100% of your phone display in portrait or landscape.
  - **3-Finger Gestures**:
    - Swipe Up: Task View / Overview (Super / Win key).
    - Swipe Down: Show Desktop (Win+D / Super+D).
    - Swipe Left / Right: Switch virtual desktops.
  - **Tactile Buttons**: Dedicated Left, Middle, and Right click buttons.

- **Real-Time Live Keyboard**:
  - Direct live keystroke transmission from Android virtual keyboard (Gboard, Samsung Keyboard, etc.) and physical keyboards.
  - Characters, backspaces, and enters transmit immediately without needing a separate submit button.
  - Virtual PC modifier keys: Esc, Tab, Ctrl, Alt, Win, Del, arrow navigation keys, and common shortcuts (Ctrl+C, Ctrl+V, Ctrl+Z, Ctrl+A, Alt+F4).
  - Bulk text paste option for transmitting complete messages or URLs.

- **Presentation Remote**:
  - Ergonomic Next Slide and Previous Slide buttons (PageDown / PageUp).
  - Presentation stopwatch timer with pause and reset controls.
  - Slideshow shortcuts: Start (F5), Exit (Esc), Blank screen (B/W).
  - Digital Laser Pointer & Spotlight: On-screen real-time pointer reticle or spotlight overlay.
  - Air-Mouse Mode: Control the pointer by tilting your smartphone using the gyroscope.

- **System Controls**:
  - Master volume slider with mute toggle.
  - Media player deck: Previous, Play/Pause, Next.
  - Do Not Disturb (DND) toggle.

- **Cross-Platform Desktop Engines**:
  - **Windows**: Native Win32 API integration (`ctypes.windll.user32.mouse_event`) ensuring zero-lag cursor and click response.
  - **Linux**: Direct kernel-level `/dev/uinput` virtual device driver, operating natively across Wayland (GNOME, KDE Plasma, Sway, Hyprland) and X11 without display server dependencies.

- **Instant Zero-Config Pairing**:
  - Automatic LAN discovery via UDP beacon.
  - Visual QR code displayed in the desktop GUI and directly in the terminal (for headless or SSH sessions).
  - Self-hosted Web Remote: Served directly by the PC on port 8765. Zero app installation required.
  - Native standalone Android APK project ready to compile with Gradle.

---

## Quick Start

### Windows

Double-click `start-windows.bat` in the repository root, or run:

```cmd
cd server
pip install -r requirements.txt
python main.py
```

### Linux

From the repository root, simply run:

```bash
chmod +x start-linux.sh
./start-linux.sh
```

Or run headless / custom port:

```bash
./start-linux.sh --cli
./start-linux.sh --port 9000
```

### Connect from Phone (Android & iOS)

1. Ensure your phone and computer are connected to the same Wi-Fi network.
2. Scan the QR code displayed in the Kursor window or terminal with your phone camera.
3. The Kursor remote opens immediately in your mobile browser with zero installation required.
4. Tap **"Install"** or **"Add to Home screen"** in the header to run it full-screen without browser URL bars!

---

## Linux Kernel /dev/uinput Configuration

To run Kursor on Linux without requiring `sudo` on every launch:

```bash
cd server
sudo ./setup-uinput.sh
```

This loads the `uinput` kernel module and configures udev rules for the `input` group. See [docs/LINUX_SETUP.md](docs/LINUX_SETUP.md) for detailed distributions instructions.

---

## Project Structure

```
mouse/
├── android/                         # Web Remote Client (React 19, TypeScript, Vite, PWA)
│   ├── src/
│   │   ├── components/              # Trackpad, QuickControls, Presenter, Header, Modals
│   │   ├── hooks/                   # useSocket, useHaptics, useOrientation
│   │   └── index.css                # High-contrast OLED dark theme & crisp outlines
│   ├── public/                      # App icons, manifest.json, sw.js
│   └── dist/                        # Production compiled web assets
│
├── server/                          # Cross-Platform Desktop Server (Windows & Linux)
│   ├── kursor/
│   │   ├── server.py                # WebSocket & HTTP server
│   │   ├── discovery.py             # UDP beacon & auto-discovery responder
│   │   ├── input_engine/            # Win32, kernel uinput (Wayland), X11/pynput
│   │   ├── system_controls.py       # Audio, media, and notification controls
│   │   ├── laser_overlay.py         # On-screen transparent laser pointer / spotlight
│   │   ├── gui.py                   # Desktop GUI with QR code pairing
│   │   └── config.py                # Configuration and settings persistence
│   ├── setup-uinput.sh              # Linux kernel uinput permissions script
│   ├── kursor.service               # Linux systemd service unit
│   ├── install.sh                   # Linux installer script
│   ├── start-linux.sh               # Linux launcher script
│   └── main.py                      # Server entrypoint
├── docs/
│   ├── WINDOWS_SETUP.md             # Windows setup instructions
│   ├── LINUX_SETUP.md               # Linux distribution and permissions guide
│   ├── ANDROID_BUILD.md             # Native APK build & PWA guide
│   └── PROTOCOL.md                  # Protocol specification
│
├── start-windows.bat                # 1-click Windows launcher
└── start-linux.sh                  # 1-click Linux launcher
```

---

## Protocol

Kursor uses a low-latency binary/JSON WebSocket protocol on port `8765` and a lightweight UDP discovery beacon on port `8766`. For packet structures and message flows, see [docs/PROTOCOL.md](docs/PROTOCOL.md).
