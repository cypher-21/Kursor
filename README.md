# Kursor - Universal Wireless Trackpad & Presentation Remote

Turn your Android or iOS smartphone into a high-precision wireless trackpad, presentation clicker, and media controller for your Windows or Linux PC over local Wi-Fi.

An open-source desktop control system engineered for **Windows** (10/11) and **Linux** (Wayland & X11) with a companion **zero-install Web Remote / PWA** that runs directly in any modern mobile browser.

---

## ✨ Features

- **Multi-Touch Trackpad**:
  - **1-Finger Drag**: Smooth, responsive cursor motion with natural acceleration curves.
  - **1-Finger Tap**: Instant left-click with tactile haptic vibration.
  - **2-Finger Tap**: Right-click context menu.
  - **Calibrated Scrolling**: Smooth two-finger scrolling and dedicated edge **Scroll Ribbon** calibrated to feel like a real mouse wheel (~25px per notch) without wild skipping.
  - **Configurable Sensitivity**: Real-time adjustable Cursor Sensitivity and Scroll Sensitivity sliders.
  - **Natural vs. Traditional Scrolling**: 1-tap toggle for reverse or natural scroll direction.
  - **3-Finger Desktop Gestures**:
    - Swipe Up: Task View / Overview (Super / Win key).
    - Swipe Down: Show Desktop (Win+D / Super+D).
    - Swipe Left / Right: Switch virtual workspaces.
  - **Physical Buttons Bar**: Dedicated Left, Middle, and Right mouse buttons.

- **Presentation Remote**:
  - Compact ergonomic **Next Slide** and **Previous Slide** buttons (PageDown / PageUp).
  - Integrated **Mouse Touchpad**: Large dedicated touch area on the presenter screen allowing seamless mouse control and slide navigation simultaneously.
  - **Stopwatch Timer**: Clean countdown/presentation timer with start, pause, and reset.
  - **Quick Presentation Keys**: Start Slideshow (F5), Exit (Esc), Blank Screen (Black/White).
  - **Air-Mouse & Laser Pointer**: Tilt-to-move pointer overlay using phone gyroscope sensors.

- **System Controls & Live Typing**:
  - Master volume slider with instant mute toggle.
  - Media player deck: Previous, Play/Pause, Next track.
  - Do Not Disturb (DND) notification toggle.
  - **Live Keyboard Input**: Keystrokes, backspaces, and enters transmit immediately to the active PC window with exact casing and Unicode support (bypasses host Caps Lock).
  - Virtual PC Modifier Keys: Esc, Tab, Ctrl, Alt, Win, Del, navigation arrows, and common shortcuts (Ctrl+C, Ctrl+V, Ctrl+Z, Ctrl+A, Alt+F4).

- **High-Performance Desktop Engines**:
  - **Windows**: Native Win32 API (`ctypes.windll.user32`) input driver with sub-notch wheel delta accumulation for lag-free cursor tracking.
  - **Linux**: Direct kernel-level `/dev/uinput` virtual device driver, operating natively across Wayland (GNOME, KDE Plasma, Sway, Hyprland) and X11 without root privileges at runtime. Fallback drivers for `ydotool` and `pynput` included.

- **Zero-Config LAN Pairing**:
  - Automatic local network discovery via UDP broadcast beacon.
  - High-contrast visual QR code on desktop GUI and ASCII QR code in terminal for headless/SSH setups.
  - Self-hosted Web Remote served directly on port `8765`. Zero app installation required on the phone.

---

## 🚀 Quick Start

### Windows

#### 1. Standard Launch (Clean GUI)
Simply double-click **`start-windows.bat`** in the project folder.
- Launches the sleek **Kursor Desktop** pairing window.
- The command prompt closes automatically—no lingering black console window.
- Includes **Quick Settings** sliders to adjust Pointer Speed and Scroll Speed in real-time.

#### 2. Terminal Mode (With Live Logs)
Double-click **`start-cli.bat`** or run:
```cmd
start-windows.bat --cli
```
Displays live connection logs, client IP notifications, and an ASCII QR code directly in the terminal.

---

### Linux

#### 1. One-Time Kernel Permission Setup
To allow Kursor to inject input events without running as `sudo`:
```bash
cd server
chmod +x setup-uinput.sh
./setup-uinput.sh
```
*(Log out and log back in once after running this script to apply the `input` group permissions).*

#### 2. Launching Kursor
```bash
./start-linux.sh
```
- If a desktop display is available, opens the **Kursor Desktop** pairing GUI.
- For headless servers, Raspberry Pi, or SSH sessions, run:
  ```bash
  ./start-linux.sh --cli
  ```

---

### Connecting Your Phone (Android & iOS)

1. Connect your smartphone to the same Wi-Fi network (or phone personal hotspot) as your computer.
2. Scan the QR code displayed on the Kursor desktop window using your phone's camera.
3. The Kursor remote opens immediately in your mobile browser.
4. **Fullscreen / PWA Mode**:
   - **Android (Chrome)**: Tap `⋮` (menu) -> **"Add to Home screen"** or **"Install app"**.
   - **iOS (Safari)**: Tap Share icon -> **"Add to Home Screen"**.
   - Or tap the dedicated **Fullscreen** icon in the header to expand 100% edge-to-edge!

---

## 📁 Project Structure

```
mouse/
├── android/                         # Web Remote Client (React 19, TypeScript, Vite, PWA)
│   ├── src/
│   │   ├── components/              # Trackpad, Presenter, QuickControls, Header, Modals
│   │   ├── hooks/                   # useSocket, useHaptics, useOrientation
│   │   └── index.css                # Dark theme design system & responsive layout
│   ├── public/                      # App icons, manifest.json, sw.js
│   ├── dist/                        # Production compiled web assets
│   └── README.md                    # Frontend documentation & development guide
│
├── server/                          # Cross-Platform Desktop Server (Windows & Linux)
│   ├── kursor/
│   │   ├── server.py                # WebSocket server & dynamic sensitivity engine
│   │   ├── gui.py                   # Desktop pairing GUI with live Quick Settings
│   │   ├── discovery.py             # UDP beacon & auto-discovery responder
│   │   ├── input_engine/            # Win32, kernel uinput (Wayland), ydotool, X11
│   │   ├── system_controls.py       # Volume, media, and notification controls
│   │   ├── laser_overlay.py         # On-screen transparent laser pointer / spotlight
│   │   └── config.py                # Configuration and settings persistence
│   ├── setup-uinput.sh              # Linux kernel uinput permissions setup
│   ├── kursor.service               # Linux systemd service unit
│   ├── install.sh                   # Linux automated installer
│   ├── start-linux.sh               # Linux launcher helper
│   ├── requirements.txt             # Python dependencies
│   └── main.py                      # Desktop application entrypoint
│
├── docs/
│   ├── WINDOWS_SETUP.md             # Windows setup & key mapping guide
│   ├── LINUX_SETUP.md               # Linux distributions & Wayland/X11 guide
│   ├── ANDROID_BUILD.md             # Mobile PWA & home screen guide
│   └── PROTOCOL.md                  # WebSocket & UDP protocol specification
│
├── start-windows.bat                # 1-click clean Windows GUI launcher (pythonw)
├── start-cli.bat                    # 1-click Windows Terminal/CLI launcher
└── start-linux.sh                  # 1-click Linux universal launcher
```

---

## ⚙️ Configuration & Customization

Settings are automatically saved to `~/.config/kursor/config.json`:

| Setting | Default | Description |
|---|---|---|
| `mouse_sensitivity` | `1.2` | Base cursor movement speed multiplier |
| `mouse_acceleration` | `1.15` | Cursor acceleration factor for fast finger flicks |
| `scroll_sensitivity` | `1.0` | Mouse wheel scroll speed multiplier |
| `invert_scroll` | `false` | Traditional vs. Natural scrolling direction |
| `port` | `8765` | WebSocket and HTTP listening port |
| `udp_discovery_port` | `8766` | UDP LAN beacon port |
| `preferred_backend` | `"auto"` | Input engine (`auto`, `uinput`, `ydotool`, `x11`) |

Sliders in the Desktop GUI and Mobile Web Remote adjust these parameters in real time without restarting the server.

---

## 📄 License

MIT License. Open source and free for personal and commercial use.
