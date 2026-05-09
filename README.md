# Happy Kids Commuter System (HKCS)

A smart school transportation management platform built for Kenyan schools. HKCS allows parents to track their children in real-time, drivers to manage routes and attendance, and school administrators to oversee the entire transport operation.

---

## Table of Contents

- [System Overview](#system-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Development Progress](#development-progress)
- [What Remains](#what-remains)
- [Contributors](#contributors)

---

## System Overview

HKCS is a multi-platform system consisting of:

| Platform | Technology | Purpose |
|---|---|---|
| Parent Mobile App | React Native (Expo) | Track child, receive alerts, pay fees |
| Driver Mobile App | React Native (Expo) | GPS broadcast, attendance marking |
| Admin Web Dashboard | React + Vite + Tailwind | Manage entire transport operation |
| Backend API | Node.js + Express | Core business logic and REST APIs |
| Real-Time Engine | Socket.IO | Live GPS tracking and notifications |
| AI Service | Python FastAPI | Route optimization and ETA prediction |
| Database | PostgreSQL + Firebase | Persistent and real-time data storage |

---

## Tech Stack

### Frontend
- React Native (Expo) — Parent and Driver mobile apps
- React.js + Vite + Tailwind CSS — Admin web dashboard

### Backend
- Node.js + Express.js — Main API server
- Socket.IO — Real-time GPS and notifications
- Python FastAPI — AI route optimization service

### Database
- PostgreSQL — Primary database (users, trips, payments)
- Firebase Realtime Database — Live GPS, alerts, presence

### Services
- Firebase Authentication — User auth and OTP
- Firebase Cloud Messaging — Push notifications
- Africa's Talking — SMS notifications (Kenya)
- Safaricom Daraja API — M-Pesa payments
- Google Maps Platform — Maps, directions, geocoding

### Security
- JWT Authentication
- bcrypt password hashing
- Role-based access control (RBAC)
- HTTPS + API rate limiting

---

## Project Structure

```
happy_kids_commuters/
│
├── parent-app/                  ← React Native (Expo) - Parent mobile app
│   ├── app.json
│   ├── google-services.json
│   └── App.js
│
├── driver-app/                  ← React Native (Expo) - Driver mobile app
│   ├── app.json
│   ├── google-services.json
│   └── App.js
│
├── admin-dashboard/             ← React + Vite + Tailwind - Web dashboard
│   ├── src/
│   └── package.json
│
├── backend/                     ← Node.js + Express - Main API server
│   ├── config/
│   │   ├── db.js                ← PostgreSQL connection
│   │   └── sms.js               ← Africa's Talking SMS config
│   ├── controllers/
│   │   ├── authController.js    ← Register, login, JWT
│   │   ├── trackingController.js← GPS location updates
│   │   ├── studentController.js ← Student management
│   │   ├── attendanceController.js ← Trip and attendance
│   │   ├── notificationController.js ← Notifications
│   │   └── adminController.js   ← Admin operations
│   ├── middleware/
│   │   └── authMiddleware.js    ← JWT + role-based access
│   ├── routes/
│   │   ├── auth.js
│   │   ├── tracking.js
│   │   ├── students.js
│   │   ├── attendance.js
│   │   ├── notifications.js
│   │   └── admin.js
│   ├── .env
│   ├── server.js                ← Entry point
│   └── package.json
│
├── ai-service/                  ← Python FastAPI - Route optimization
│   ├── main.py
│   ├── venv/
│   └── requirements.txt
│
└── database/
    └── migrations/
        └── 001_initial_schema.sql ← All PostgreSQL tables
```

---

## Getting Started

### Prerequisites

Make sure you have these installed:
- Node.js v20+
- Python 3.12+
- PostgreSQL 15+
- Expo CLI (`npm install -g expo-cli`)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/happy_kids_commuters.git
cd happy_kids_commuters
```

### 2. Set up the database

Open pgAdmin, connect to PostgreSQL and run:

```sql
CREATE USER hkcs_user WITH PASSWORD 'hkcs1234';
CREATE DATABASE hkcs_db OWNER hkcs_user;
GRANT ALL PRIVILEGES ON DATABASE hkcs_db TO hkcs_user;
```

Then run the schema:
```bash
# Open pgAdmin → hkcs_db → Query Tool → paste and run:
database/migrations/001_initial_schema.sql
```

### 3. Start the backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on: `http://localhost:5000`

### 4. Start the AI service

```bash
cd ai-service
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

AI service runs on: `http://localhost:8000`

### 5. Start the admin dashboard

```bash
cd admin-dashboard
npm install
npm run dev
```

Dashboard runs on: `http://localhost:5173`

### 6. Start the mobile apps

```bash
cd parent-app
npx expo start
```

Scan the QR code with Expo Go on your phone.

---

## Environment Variables

Create a `.env` file inside the `backend/` folder:

```env
PORT=5000

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hkcs_db
DB_USER=hkcs_user
DB_PASSWORD=hkcs1234

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=21d

# Africa's Talking SMS (add when account is created)
AT_USERNAME=sandbox
AT_API_KEY=your_api_key_here

# M-Pesa Daraja (add when account is created)
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://your-domain.com/api/payments/callback
```

---

## API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication
All protected routes require:
```
Authorization: Bearer <token>
```

### Roles
| Role | Access Level |
|---|---|
| `parent` | Own students, notifications, payments |
| `driver` | Assigned students, trips, GPS, attendance |
| `admin` | Full system management |
| `superadmin` | Multi-school, subscriptions, audit logs |

---

### Auth Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register new user |
| POST | `/auth/login` | Public | Login and get token |
| GET | `/auth/me` | All roles | Get current user |

### Tracking Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/tracking/update-location` | Driver | Update GPS location |
| GET | `/tracking/bus/:bus_id` | Parent | Get bus live location |
| GET | `/tracking/all` | Admin | Get all buses locations |

### Student Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/students` | Parent | Add a student |
| GET | `/students/my` | Parent | Get my students |
| PUT | `/students/:id` | Parent | Update student |
| DELETE | `/students/:id` | Parent | Delete student |
| GET | `/students/assigned` | Driver | Get assigned students |
| GET | `/students/all` | Admin | Get all students |

### Attendance Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/attendance/trip/start` | Driver | Start a trip |
| POST | `/attendance/trip/end` | Driver | End a trip |
| POST | `/attendance/boarded` | Driver | Mark student boarded |
| POST | `/attendance/dropped` | Driver | Mark student dropped |
| GET | `/attendance/trip/:id` | All roles | Get trip attendance |

### Notification Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/notifications` | All roles | Get my notifications |
| PUT | `/notifications/:id/read` | All roles | Mark as read |
| PUT | `/notifications/read-all` | All roles | Mark all as read |
| DELETE | `/notifications/:id` | All roles | Delete notification |

### Admin Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/admin/stats` | Admin | Dashboard statistics |
| POST | `/admin/buses` | Admin | Add a bus |
| GET | `/admin/buses` | Admin | Get all buses |
| PUT | `/admin/buses/:id` | Admin | Update bus |
| DELETE | `/admin/buses/:id` | Admin | Delete bus |
| GET | `/admin/drivers` | Admin | Get all drivers |
| POST | `/admin/drivers/assign` | Admin | Assign driver to bus |
| PUT | `/admin/drivers/:id/unassign` | Admin | Unassign driver |
| POST | `/admin/routes` | Admin | Add route |
| GET | `/admin/routes` | Admin | Get all routes |
| PUT | `/admin/routes/:id` | Admin | Update route |
| DELETE | `/admin/routes/:id` | Admin | Delete route |
| POST | `/admin/schools` | Admin | Add school |
| GET | `/admin/schools` | Admin | Get all schools |
| GET | `/admin/reports/attendance` | Admin | Attendance report |
| GET | `/admin/reports/trips` | Admin | Trip report |

---

## Database Schema

### Core Tables
- `users` — all system users (parents, drivers, admins)
- `parents` — parent profiles linked to users
- `drivers` — driver profiles with license and bus assignment
- `students` — children registered by parents
- `schools` — registered schools
- `buses` — school buses with GPS device info
- `routes` — transport routes with estimated times
- `trips` — active and completed bus trips
- `attendance` — student boarding and drop-off records
- `bus_locations` — latest GPS coordinates per bus
- `payments` — M-Pesa transport fee payments
- `notifications` — in-app and SMS notification log
- `emergency_alerts` — SOS incidents and status

---

## Development Progress

### Completed
- [x] Project structure and environment setup
- [x] PostgreSQL database with full schema
- [x] Firebase project setup (Authentication + Realtime DB)
- [x] Backend API server (Node.js + Express + Socket.IO)
- [x] JWT authentication with role-based access control
- [x] User registration and login (parent, driver, admin)
- [x] Real-time GPS tracking via Socket.IO
- [x] REST GPS location endpoints
- [x] Student management (CRUD)
- [x] Trip management (start, end)
- [x] Attendance tracking (boarded, dropped off)
- [x] Attendance and trip reports
- [x] Notification system (database + real-time)
- [x] SMS notification structure (Africa's Talking — pending credentials)
- [x] Admin dashboard stats
- [x] Bus management
- [x] Driver management and bus assignment
- [x] Route management
- [x] School management
- [x] SOS emergency alert system via Socket.IO

---

## What Remains

### Next Session
- [ ] Africa's Talking account setup and SMS integration
- [ ] M-Pesa Daraja account setup
- [ ] M-Pesa STK Push payment endpoint
- [ ] Payment callback handler
- [ ] Payment history and outstanding balances

### After That
- [ ] AI route optimization (Python FastAPI)
- [ ] Geofencing alerts (bus enters school/pickup zone)
- [ ] Offline support with SQLite caching
- [ ] Parent mobile app screens
- [ ] Driver mobile app screens
- [ ] Admin web dashboard (React)
- [ ] Driver behavior monitoring
- [ ] Analytics charts and graphs
- [ ] Security hardening and rate limiting
- [ ] Docker containerization
- [ ] Cloud deployment (Render / Railway / GCP)
- [ ] Unit and integration testing
- [ ] Full system documentation

---

## Real-Time Socket.IO Events

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `user:register` | `{ user_id }` | Register socket on login |
| `driver:join` | `{ bus_id }` | Driver joins bus room |
| `driver:location` | `{ bus_id, latitude, longitude }` | GPS update |
| `parent:watch` | `{ bus_id }` | Parent watches a bus |
| `driver:sos` | `{ bus_id, latitude, longitude }` | Emergency alert |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `bus:location` | `{ bus_id, latitude, longitude, timestamp }` | Live GPS update |
| `emergency:alert` | `{ bus_id, latitude, longitude, message }` | SOS broadcast |

---

## Contributors

- **Donnelly Amaitsa**

---

## License

This project is built for academic purposes at university level.

---

*Last updated: May 9, 2026*
*Current completion: ~60%*