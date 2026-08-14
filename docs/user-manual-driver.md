Happy Kids Commuter System — Driver User Manual

Overview

This manual explains how drivers use the HKCS Driver interface (web/mobile) to receive assignment, send real-time locations, manage trips, and raise SOS alerts.

Getting Started

- Sign in: Use the driver login screen with email or phone and password.
- Account provisioning: Driver accounts are created by school administrators and linked to a Driver record that includes `license_number` and `bus_id`.

Main Features

- Driver Dashboard: Shows current assignment, route stops, assigned students, and trip controls.
- Real-time Location Broadcast: The driver app sends GPS updates via Socket.IO (`driver:location` event) to the backend. The backend persists the latest location and broadcasts to subscribed clients.
- Trip Controls: Start and end a trip (`attendance/trip/start`, `attendance/trip/end`).
- Mark Boarded/Dropped: Mark student attendance when boarding/dropping off.
- SOS/Emergency: Send an SOS (`driver:sos`) via Socket.IO; admin and parents receive alerts.
- Chat: Send messages to admin or parents via the driver chat endpoints.

Typical Flows

- Real-time location
  1. Driver app establishes a Socket.IO connection to the server.
  2. On login, the app registers the user socket with `user:register` containing `user_id`.
  3. Periodically, the driver emits `driver:location` events with `bus_id`, `latitude`, `longitude`.
  4. Server updates `bus_locations` and emits `bus:location` to `bus_<bus_id>` room and global channel.

- Start Trip
  1. Driver hits `POST /api/attendance/trip/start` (protected, Authorization: Bearer token).
  2. Server creates an active trip record and assigns start timestamp.

- SOS
  1. Driver emits `driver:sos` with `bus_id`, `latitude`, `longitude`.
  2. Server broadcasts `emergency:alert` to admin and subscribed parents; stores emergency record if enabled.

Troubleshooting

- Socket connection issues: Ensure network and socket server URL configured correctly. If using emulators, check hostname resolution (Android emulator uses `10.0.2.2` in dev).
- Login 401: Confirm driver record exists in DB and account is active. Reach out to admin to confirm license and user mapping.

Security

- All driver API calls require JWT authentication. Keep tokens private and log out when device is decommissioned.

Support

- For vehicle or student assignment changes contact school admin.
- For app issues include driver id, bus id, and a brief log of events.
