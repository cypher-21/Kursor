# Kursor for Windows - Setup & Usage Guide

Kursor supports Windows 10 & 11 natively with direct Win32 API cursor injection (`user32.dll`) for minimal input latency and sub-notch smooth wheel delta accumulation.

---

## 🚀 Quick Start on Windows

### Option 1: Clean GUI Launch (Recommended)
Double-click **`start-windows.bat`** in the repository root.
- Runs Python via `pythonw.exe`.
- The command prompt window automatically closes immediately, leaving only the sleek **Kursor Desktop** pairing window.
- Displays the graphical QR code and quick sensitivity adjustment sliders.

### Option 2: Terminal Mode (With Logs)
Double-click **`start-cli.bat`** or run from PowerShell / CMD:
```cmd
start-windows.bat --cli
```
- Keeps the terminal window open.
- Displays live connection timestamps, connected client IP addresses, and an ASCII QR code.

---

## 🎛️ Desktop Quick Settings

The **Kursor Desktop** window includes real-time controls:
- **Pointer Speed Slider** (`0.5x` to `3.0x`): Instantly scales remote cursor movement speed across all connected devices in real time.
- **Scroll Speed Slider** (`0.2x` to `3.0x`): Instantly scales mouse wheel scroll speed.
- Clickable pairing URL link (`http://<your-ip>:8765`) to open the remote in your desktop browser for testing.

---

## ⌨️ Windows Key Mappings & Gestures

| Mobile Action | Windows System Action |
|---|---|
| **1-Finger Drag** | Moves Windows mouse cursor |
| **1-Finger Tap** | Left click |
| **2-Finger Tap** | Right click context menu |
| **2-Finger Drag / Ribbon** | Calibrated mouse wheel scroll (`WHEEL_DELTA` with sub-notch accumulation) |
| **3-Finger Swipe Up** | Opens Windows **Task View** (`Win + Tab`) |
| **3-Finger Swipe Down** | **Show Desktop** (`Win + D`) |
| **3-Finger Swipe Left / Right** | Switch **Virtual Desktops** (`Win + Ctrl + Left / Right`) |
| **Next Slide** | Advance presentation slide (`PageDown`) |
| **Prev Slide** | Previous presentation slide (`PageUp`) |
| **F5 Start** | Start PowerPoint / Google Slides fullscreen (`F5`) |
| **Esc Exit** | Exit presentation slideshow (`Escape`) |
| **Black Screen** | Blank PowerPoint screen (`B`) |
| **White Screen** | White PowerPoint screen (`W`) |
| **Volume Slider** | Windows system master volume |
| **Media Buttons** | Play/Pause, Next Track, Previous Track |
| **Live Keyboard** | Real-time Unicode keystroke injection directly into active window |

---

## 🔧 Troubleshooting

- **Firewall Prompt**: On first launch, Windows Firewall may ask to allow Python on Private Networks. Click **Allow access** so your phone can reach port `8765`.
- **IP Address**: Ensure your phone is connected to the same Wi-Fi network (or computer's mobile hotspot).
