# Kursor for Windows - Setup & Usage Guide

Kursor supports Windows 10 & 11 natively with direct Win32 API cursor injection (`user32.dll`) for minimal input latency.

---

## Quick Start on Windows

### Option 1: Double-Click Launcher
Double-click `start-windows.bat` in the repository root.

### Option 2: Command Line (PowerShell or Command Prompt)
```powershell
cd server
python -m pip install -r requirements.txt
python main.py
```

This will:
1. Open the desktop pairing window with a crisp QR code.
2. Print the local IP link (`http://<your-ip>:8765`) and ASCII QR code in your console.
3. Broadcast UDP discovery beacons on your LAN so your Android phone connects immediately.

---

## Windows Key Mappings & Gestures

| Android Gesture / Action | Windows Shortcut Executed |
|---|---|
| **1-Finger Drag** | Moves Windows mouse cursor |
| **1-Finger Tap** | Left click |
| **2-Finger Tap** | Right click context menu |
| **2-Finger Scroll** | Smooth mouse wheel scrolling |
| **3-Finger Swipe Up** | Opens Windows **Task View** (`Win + Tab`) |
| **3-Finger Swipe Down** | **Show Desktop** (`Win + D`) |
| **3-Finger Swipe Left / Right** | Switch **Virtual Desktops** (`Win + Ctrl + Left / Right`) |
| **Next Slide** | Advance slide (`PageDown`) |
| **Prev Slide** | Previous slide (`PageUp`) |
| **F5 Start** | Start PowerPoint / Google Slides fullscreen (`F5`) |
| **Black Screen** | Blank PowerPoint screen (`B`) |
| **Volume Up / Down / Mute** | Windows system master volume |
| **Media Play / Next / Prev** | Windows media player control |
| **Live Keyboard** | Real-time keystrokes transmitted directly into active window |
