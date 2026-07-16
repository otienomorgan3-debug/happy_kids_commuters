# HKCS - Parent Mobile App

This is the React Native (Expo) mobile application designed for parents. It allows parents to track their children's school bus in real-time, receive boarding/drop-off notifications, and manage fee payments.

## Technologies Used
- **Framework:** React Native + Expo
- **Routing:** Expo Router (File-based routing)
- **Maps:** React Native Maps (Google Maps)
- **Notifications:** Expo Push Notifications / Firebase Cloud Messaging

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npx expo start
   ```

3. **Run on a device:**
   - Download the **Expo Go** app on your iOS or Android device.
   - Scan the QR code presented in the terminal to open the app.
   - Alternatively, press `a` for Android emulator or `i` for iOS simulator.
   - If you are using a physical device on the same Wi-Fi network, set `EXPO_PUBLIC_API_HOST` to your computer's LAN IP before starting Expo so the app can reach the backend.

## Key Features
- **Real-time Tracking:** See exactly where the bus is.
- **Live ETA:** See the estimated arrival time to your child’s stop when the route is active.
- **Alerts:** Get notified when your child boards or drops off.
- **Student Management:** Manage your children's profiles.
