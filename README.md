# Happy Kids Commuter System (HKCS)

HKCS is a school transport platform for parents, drivers, and administrators. It covers student management, trip tracking, live bus location, route planning, attendance, and notifications.

## What It Does

- Parent mobile app for child tracking and live trip updates
- Driver app for trip start/end, GPS sharing, and attendance
- Admin dashboard for schools, buses, routes, drivers, and students
- Backend API for authentication, business logic, and notifications
- AI service for route optimization and ETA support

## Tech Stack

- `parent-app/` and `driver-app/`: React Native + Expo
- `admin-dashboard/`: React + Vite + Tailwind CSS
- `backend/`: Node.js + Express + Socket.IO
- `ai-service/`: Python + FastAPI
- `database/`: PostgreSQL migrations

## Quick Start

1. Install dependencies in each app folder.
2. Set up PostgreSQL and run `database/migrations/001_initial_schema.sql`.
3. Start the backend:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
4. Start the AI service:
   ```bash
   cd ai-service
   venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```
5. Start the admin dashboard:
   ```bash
   cd admin-dashboard
   npm install
   npm run dev
   ```
6. Start the mobile app:
   ```bash
   cd parent-app
   npx expo start
   ```

If you test on a physical device, set `EXPO_PUBLIC_API_HOST` to your computer's LAN IP first.

## Environment Variables

Create `backend/.env` with the values your setup needs:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hkcs_db
DB_USER=hkcs_user
DB_PASSWORD=hkcs1234
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=21d
AT_USERNAME=sandbox
AT_API_KEY=your_api_key_here
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://your-domain.com/api/payments/callback
```

## Project Layout

- `backend/`: API, sockets, controllers, and routes
- `admin-dashboard/`: admin web interface
- `parent-app/`: parent mobile app
- `driver-app/`: driver mobile app
- `ai-service/`: route optimization service
- `database/migrations/`: SQL schema files

## More Details

For app-specific setup and notes, see:

- `admin-dashboard/README.md`
- `parent-app/README.md`
- `ai-service/README.md`

## License

This project is for internal/product use unless a license is added.
