Happy Kids Commuter System — API Reference

Base URL

- Development: `http://<HOST>:5000/api`
  - The client uses `parent-app/constants/api.js` to resolve host and port.

Authentication

- All protected endpoints require `Authorization: Bearer <JWT>` header.
- Obtain token via `POST /api/auth/login`.

Endpoints

- POST /api/auth/register
  - Body: { name, email, phone, password, role }
  - Response: 201 { message, token, user }

- POST /api/auth/login
  - Body: { email | phone | identifier, password }
  - Response: 200 { message, token, user }
  - Errors: 401 Invalid credentials

- GET /api/auth/me
  - Protected: returns current user profile
  - Response: 200 { user }

- Tracking
  - POST /api/tracking/update-location
    - Protected: driver or device posts latest location (fallback for HTTP clients).
    - Body: { bus_id, latitude, longitude }
    - Response: 200 { message }
  - GET /api/tracking/bus/:bus_id
    - Public: returns latest known location for a bus
    - Response: 200 { bus_id, latitude, longitude, recorded_at }

- Attendance / Driver
  - POST /api/attendance/trip/start
    - Protected: driver starts a trip. Body: { bus_id, route_id }
  - POST /api/attendance/trip/end
    - Protected: driver ends a trip.
  - POST /api/attendance/boarded
    - Protected: { student_id, trip_id, timestamp }
  - POST /api/attendance/dropped
    - Protected: { student_id, trip_id, timestamp }
  - GET /api/attendance/driver/assignment
    - Protected: returns current driver assignment

- Payments
  - POST /api/payments/mpesa/stkpush
    - Body: { phone, amount, account_reference }
    - Integration: the backend calls MPESA API and records the transaction.
  - GET /api/payments/history
    - Protected: returns payment records for the authenticated user

- Chat & Notifications
  - Various POST/GET endpoints under `/api/parent/*`, `/api/attendance/*`, `/api/admin/*` for sending and retrieving messages.

Error Codes

- 400 Bad Request: Missing/invalid parameters
- 401 Unauthorized: Missing/invalid token or invalid login credentials
- 403 Forbidden: Role-based restriction
- 500 Server Error: Unhandled server error

Example: Login (curl)

curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"driver@hkcs.com","password":"secret"}'

Response

{
  "message": "Login successful",
  "token": "<JWT>",
  "user": { "id": 12, "name": "John Driver", "email": "driver@hkcs.com", "role": "driver" }
}

Notes

- Socket.IO events (real-time):
  - `user:register` — register socket with `user_id` after login
  - `driver:location` — driver sends { bus_id, latitude, longitude }
  - `driver:sos` — emergency alert
  - `bus:location` — server emits updates to rooms `bus_<bus_id>` and global channel

- Database schema: see `database/migrations/initial_schema.sql` for key table names and columns.
