# Mousely for Windows - Setup & Usage Guide

Mousely supports Windows 10 & 11 natively out of the box using the same codebase.

---

## 🚀 Quick Start on Windows

### Option 1: Double-Click Launcher
Simply double-click [`start-windows.bat`](file:///c:/Users/paros/OneDrive/Desktop/mouse/start-windows.bat) in the project root directory.

### Option 2: Command Line (PowerShell or Command Prompt)
```powershell
cd linux-server
python -m pip install -r requirements.txt
python main.py
```

This will:
1. Open the desktop pairing window with a large QR code.
2. Print the local IP link (`http://<your-ip>:8765`) and ASCII QR code in your console.
3. Automatically broadcast on your Wi-Fi network so your Android phone auto-connects.

---

## 🎛️ Windows Key Mappings & Gestures

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
