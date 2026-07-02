# Happy Kids Commuter System (HKCS)

> A comprehensive school transport management platform connecting parents, drivers, and administrators with real-time tracking, payments, and communication.

---

## Overview

HKCS is a full-stack platform that simplifies school commute management. Parents can track their child's bus in real time, make M-Pesa payments, request absences or pickup changes, and chat with drivers. Drivers get route guidance, attendance tools, and an SOS emergency button. Administrators manage everything from a central dashboard — students, drivers, buses, routes, payments, and analytics.

**Who it's for:** Schools, transport operators, parents, and school bus drivers.

---

## Demo

<!-- Add a GIF, screenshot, or link to a live demo here -->
<!-- Example: ![HKCS Dashboard](docs/screenshots/dashboard.png) -->

> **Coming soon** — screenshots and live demo link.

---

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Python](https://python.org/) 3.10+
- [PostgreSQL](https://www.postgresql.org/) 15+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (optional but recommended)
- [Git](https://git-scm.com/)

### Quick Start (Docker)

```bash
# 1. Clone the repo
git clone https://github.com/donnellyCodes/happy_kids_commuter_system.git
cd happy_kids_commuter_system

# 2. Start everything
docker compose up -d --build
```

### Manual Setup

See the full **[Setup Guide →](docs/setup.md)** for step-by-step instructions covering:

- Database creation and schema migration
- Backend environment configuration
- AI service setup
- Admin dashboard and mobile app startup

---

## Usage

### Start the Backend

```bash
cd backend
npm install
cp .env.example .env   # Edit with your database credentials
npm run dev            # Development (auto-reload)
```

### Start the Admin Dashboard

```bash
cd admin-dashboard
npm install
npm run dev
```

### Start the Parent Mobile App

```bash
cd parent-app
npm install
npx expo start
```

### Start the AI Service (optional)

```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Verify It's Working

```bash
curl http://localhost:5000/api/health
# → {"status":"ok","timestamp":"...","uptime":...}
```

---

## Features

### For Parents
- **Live GPS Tracking** — See the bus location in real time
- **M-Pesa Payments** — Pay transport fees via STK Push
- **Attendance History** — View board/drop timestamps
- **Absence Requests** — Notify the school when your child won't ride
- **Pickup Changes** — Request temporary pickup location changes
- **Chat** — Message drivers or administrators
- **Notifications** — Receive alerts for arrivals, payments, and emergencies

### For Drivers
- **Route Guidance** — Turn-by-turn navigation with optimized routes
- **Attendance Marking** — Board and drop students with one tap
- **SOS Emergency** — One-tap alert to administrators
- **Trip Management** — Start/end trips with automatic tracking

### For Administrators
- **Dashboard** — Real-time overview of all operations
- **Student Management** — Register and manage students
- **Driver Management** — Assign drivers to buses and routes
- **Route Planning** — Create and optimize bus routes with stops
- **Payment Monitoring** — Track M-Pesa transactions and balances
- **Geofencing** — Set up school zones and restricted areas
- **Driver Behavior** — Monitor speeding, braking, and route deviations
- **Incident Management** — View and resolve emergency alerts
- **Analytics & Reports** — Financial reports and operational insights

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js, Express.js, Socket.IO |
| **Database** | PostgreSQL 15, Sequelize ORM |
| **Admin Frontend** | React, Vite, Tailwind CSS |
| **Mobile App** | React Native, Expo |
| **AI Service** | Python, FastAPI |
| **Payments** | M-Pesa STK Push API |
| **Real-time** | WebSockets (Socket.IO) |
| **Auth** | JWT, bcrypt |
| **Containerization** | Docker, Docker Compose |

---

## Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`cd backend && npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

---

## License

This project is licensed under the **ISC License** — see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Built with inspiration from real-world school transport challenges in Kenya
- M-Pesa integration powered by the Safaricom Daraja API
- Route optimization algorithms inspired by open-source vehicle routing research

---

## sDocumentation

| Resource | Description |
|----------|-------------|
| [Setup Guide](docs/setup.md) | Complete setup instructions for new machines |
| [API Reference](docs/API.md) | All API endpoints with examples |
| [Architecture](docs/ARCHITECTURE.md) | System design and data flow |
| [Database Schema](database/migrations/initial_schema.sql) | Complete PostgreSQL schema |
| [Ngrok Setup](docs/ngroksetup.md) | Exposing local server for mobile testing |