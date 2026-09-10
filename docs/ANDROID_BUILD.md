# Kursor Mobile Web Remote & PWA Guide

Kursor runs as a zero-installation Web Remote and Progressive Web App (PWA) compatible with both **Android** and **iOS** devices.

---

## 🚀 How to Connect

1. Start the Kursor server on your computer:
   - **Windows**: Run `start-windows.bat` or `python main.py` inside `server/`
   - **Linux**: Run `./start-linux.sh`
2. Ensure your phone is connected to the same Wi-Fi network (or phone personal hotspot).
3. Scan the QR code displayed on your monitor or terminal using your phone camera.
4. The remote opens instantly in your mobile browser with zero installation required!

---

## 📱 Fullscreen "Add to Home Screen" Setup

To run Kursor full-screen without browser address bars:

### Android (Google Chrome, Brave, Edge, Samsung Internet)
1. Tap Chrome's menu button (three vertical dots **⋮** at the top right).
2. Tap **"Add to Home screen"** or **"Install app"**.
3. Tap **"Add"** to confirm.
4. Launch Kursor directly from your home screen icon. It will open in standalone fullscreen mode.

### iPhone & iPad (Apple Safari)
1. Tap the **Share** icon at the bottom of Safari (the square with an upward arrow).
2. Scroll down and tap **"Add to Home Screen"**.
3. Tap **"Add"** in the top-right corner.
4. Launch Kursor from your iOS home screen in fullscreen mode.

---

## ⚡ Performance & Mobile Features

The mobile web remote uses standard web platform APIs for maximum performance and compatibility:

- **Touch & Multi-Touch Gestures**: High-frequency 120Hz/60Hz touch listener events with relative cursor delta calculation and smooth acceleration curves.
- **Haptic Feedback**: Uses the browser's `navigator.vibrate()` API for tactile physical clicks when tapping the trackpad or buttons.
- **Screen Wake Lock**: Uses `navigator.wakeLock.request("screen")` to prevent your phone screen from dimming or going to sleep during presentations.
- **Gyroscope & Air-Mouse**: Uses the W3C `DeviceOrientationEvent` to translate phone physical tilt into presentation pointer motion.
- **Low-Latency WebSocket**: Direct local LAN connection with 1ms–3ms response time.
