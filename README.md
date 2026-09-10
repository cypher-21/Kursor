# Mousely for Linux & Android

<p align="center">
  <strong>Turn your Android smartphone into a wireless trackpad, presentation remote, and media controller for your Linux PC.</strong>
</p>

<p align="center">
  An open-source recreation of <a href="https://mouse.ly/">mouse.ly</a> tailored specifically for <strong>Linux</strong> (with universal Wayland & X11 support) and <strong>Android</strong>.
</p>

---

## ✨ Features

- **Multi-Touch Trackpad**:
  - **1-Finger Drag**: Silky-smooth cursor motion with natural acceleration.
  - **1-Finger Tap**: Left-click with haptic vibration.
  - **2-Finger Tap**: Right-click context menu.
  - **2-Finger Drag & Edge Ribbon**: Smooth vertical & horizontal scroll wheel emulation.
  - **3-Finger Gestures**:
    - Swipe Up: GNOME Overview / KDE Application Launcher (Super key).
    - Swipe Down: Show Desktop (Super+D).
    - Swipe Left / Right: Switch virtual workspaces.
  - **Tactile Buttons**: Dedicated Left, Middle, and Right click buttons for thumb-friendly usage.
- **Presentation Remote**:
  - Big, ergonomic **Next Slide** and **Previous Slide** buttons (`PageDown` / `PageUp`).
  - Presentation stopwatch timer with pause and reset.
  - Slideshow shortcuts: Start (`F5`), Exit (`Esc`), Black screen (`B`), White screen (`W`).
  - **Digital Laser Pointer & Spotlight Overlay**: Real-time on-screen glowing laser reticle or dimming spotlight overlay.
  - **Air-Mouse Mode**: Guide the laser pointer by tilting your phone using the device gyroscope!
- **Quick Controls**:
  - Master volume slider with mute toggle (`pactl` / `pamixer`).
  - Media player deck: Previous, Play/Pause, Next (`playerctl` / MPRIS).
  - Silence notifications toggle (Do Not Disturb).
  - Virtual keyboard: Send typed text and system keys (`Enter`, `Backspace`, `Tab`, `Super`).
- **Universal Linux Kernel Integration**:
  - Uses native `/dev/uinput` kernel subsystem: Works on **both Wayland (GNOME, KDE Plasma, Sway, Hyprland) and X11** with zero display server dependency.
  - Graceful fallback to `ydotool` and `pynput`.
- **Instant Pairing**:
  - Automatic LAN discovery via UDP beacon.
  - Visual QR code displayed on the Linux desktop GUI and directly in the terminal (for headless/SSH sessions).
  - Web Remote (PWA) served directly from the Linux PC—zero app installation required to start controlling!
  - Native standalone Android APK project ready to compile with Gradle.

---

## 🚀 Quick Start

### 1. Start the Linux Receiver

```bash
cd linux-server
chmod +x install.sh setup-uinput.sh
./install.sh

# Start with pairing GUI
python3 main.py

# Or start headless (CLI / SSH)
python3 main.py --cli
```

### 2. Connect from Android

1. Ensure your phone is connected to the same Wi-Fi network as your Linux computer.
2. Scan the **QR Code** displayed on your Linux screen (or terminal) with your phone's camera.
3. The Mousely remote will open instantly in your browser!
4. *(Optional)* Tap **"Add to Home screen"** in your phone's browser to install it as a standalone, fullscreen PWA.

---

## 📱 Building the Native Android APK

If you prefer installing a standalone native `.apk`:

```bash
cd android
npm install
npm run build
npx cap sync android

# Build debug APK
cd android
./gradlew assembleDebug
```
The APK will be generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

See [docs/ANDROID_BUILD.md](docs/ANDROID_BUILD.md) for full instructions.

---

## 🛠️ Linux Kernel `/dev/uinput` Configuration

To run Mousely without requiring `sudo` every time:

```bash
cd linux-server
sudo ./setup-uinput.sh
```
This loads the kernel module and grants write permissions to users in the `input` group.

See [docs/LINUX_SETUP.md](docs/LINUX_SETUP.md) for distro-specific packages and systemd user service setup.

---

## 📂 Project Architecture

```
mouse/
├── android/                         # Android Mobile Remote (React + Vite + Capacitor + PWA)
│   ├── src/
│   │   ├── components/              # Trackpad, Presenter, QuickControls, Header, Modals
│   │   ├── hooks/                   # useSocket (WebSocket), useHaptics, useOrientation (Gyro)
│   │   ├── styles/theme.css         # Obsidian glassmorphism design matching mouse.ly
│   │   └── App.tsx
│   ├── android/                     # Full native Android Gradle project (Android Studio buildable)
│   └── capacitor.config.ts
│
├── linux-server/                    # Linux Host Receiver & Daemon
│   ├── mousely/
│   │   ├── server.py                # WebSocket & static HTTP server
│   │   ├── discovery.py             # UDP beacon & auto-discovery responder
│   │   ├── input_engine/            # Kernel /dev/uinput, ydotool (Wayland), x11/pynput
│   │   ├── system_controls.py       # Audio (pactl), Media (playerctl), DND
│   │   ├── laser_overlay.py         # On-screen transparent laser pointer / spotlight
│   │   ├── gui.py                   # Desktop GUI with QR code pairing
│   │   └── config.py                # Configuration and settings persistence
│   ├── setup-uinput.sh              # Kernel uinput permissions script
│   ├── mousely-linux.service        # Systemd user service unit
│   ├── install.sh                   # All-in-one Linux installer
│   └── main.py                      # Main entrypoint
│
└── docs/
    ├── LINUX_SETUP.md               # Detailed Linux guide (Wayland/X11/Distros)
    ├── ANDROID_BUILD.md             # Native APK build & PWA guide
    └── PROTOCOL.md                  # Protocol specification
```

---

## 📡 Protocol

Mousely uses a low-latency binary/JSON WebSocket protocol over port `8765` and a lightweight UDP beacon over port `8766`. For full packet schemas, see [docs/PROTOCOL.md](docs/PROTOCOL.md).
