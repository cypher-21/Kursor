# Kursor for Android - Build & Deployment Guide

Kursor for Android offers **two deployment methods**:
1. **Instant Web Remote / PWA (Zero Install)**: Open directly in your Android phone's browser (Chrome, Firefox, Samsung Internet) or tap "Add to Home screen" for a full-screen standalone experience with haptic vibration and offline caching.
2. **Native Android APK (Capacitor / Gradle)**: Build a standalone `.apk` or `.aab` package with Android Studio or the command line.

---

## Method 1: Instant PWA / Web Remote (Zero Installation)

1. Start the Kursor server on your computer:
   ```bash
   python main.py
   ```
2. Make sure your Android phone is connected to the same Wi-Fi network (or phone hotspot).
3. Scan the QR code displayed on your computer monitor or terminal using your phone camera.
4. **Install as App**:
   - In Chrome on Android: Tap the three dots menu button > tap **"Add to Home screen"** or **"Install app"**.
   - The Kursor icon will appear on your phone's home screen and launch like a native application with fullscreen display and zero browser address bars.

---

## Method 2: Building the Native Android APK

### Prerequisites
- Node.js 18+
- Android Studio with Android SDK (API 33+)
- Java JDK 17+

### Step-by-Step Build Instructions

1. **Navigate to the Android project folder**:
   ```bash
   cd android
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the web bundle**:
   ```bash
   npm run build
   ```

4. **Sync with the Android native project**:
   ```bash
   npx cap sync android
   ```

5. **Build Debug APK via Gradle (Command Line)**:
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
   The compiled APK will be located at:
   `android/app/build/outputs/apk/debug/app-debug.apk`

6. **Install directly onto your connected Android phone via ADB**:
   ```bash
   adb install app/build/outputs/apk/debug/app-debug.apk
   ```

7. **Or open in Android Studio**:
   ```bash
   npx cap open android
   ```
   In Android Studio, click **Build > Build Bundle(s) / APK(s) > Build APK(s)** or click the **Run** button with your phone connected.

---

## Android Permissions & Features

The native Android project is pre-configured with:
- `android.permission.INTERNET`: For low-latency local network WebSocket communication.
- `android.permission.ACCESS_NETWORK_STATE` & `ACCESS_WIFI_STATE`: For local network discovery.
- `android.permission.VIBRATE`: For tactile haptic click feedback on gestures.
- `android.permission.WAKE_LOCK`: Keeps screen awake during presentations so the display doesn't dim mid-slide.
