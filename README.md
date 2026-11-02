# Song ID — Mobile Client (Expo)

A React Native Expo mobile app for the Song ID service, implementing the VisionOS / iOS ethereal glass aesthetic with the 3D iridescent bubble orb and ripple microphone trigger.

## Features
- **3D Iridescent Optical Orb**: Interactive floating orb with breathing animation and specular caustics.
- **VisionOS Glass Microphone Trigger**: Animated concentric ripple waves pulse when listening.
- **Audio Capture & Identification**: Records high-quality audio through `expo-av` and POSTs to `/identify`.
- **Mode Switching**: Toggle between `Auto` (fingerprint with melody fallback), `Exact Clip` (fingerprint only), and `Hum / Melody` (pYIN + DTW).
- **Match Result & Audio Preview**: Displays confidence score, identified track, and plays the R2 audio stream directly in-app.
- **Library Drawer**: Browse all indexed songs from the backend with instant streaming preview.

---

## Getting Started

### 1. Start the Backend API
Make sure the Python FastAPI server is running:
```powershell
cd ..\song-id-app
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Configure Backend Host (For Physical Devices)
If testing on a physical phone via **Expo Go**:
- Open `mobile/src/config.ts` (or set `EXPO_PUBLIC_API_URL` in `.env`).
- Change `http://localhost:8000` to your computer's local Wi-Fi IP (e.g. `http://192.168.1.50:8000`).

### 3. Run the Mobile App
```bash
cd mobile
npx expo start
```
- Scan the QR code with the **Expo Go** app on your iPhone or Android.
- Or press `a` for Android Emulator, `i` for iOS Simulator.
