# HKCS Setup Guide

> Complete setup instructions for setting up the Happy Kids Commuter System on a new machine after cloning the repository.

## Prerequisites

Install these tools first (skip any already installed):

| Tool | Version | Download |
|------|---------|----------|
| **Node.js** | v18+ | [nodejs.org](https://nodejs.org/) |
| **Python** | 3.10+ | [python.org](https://python.org/) |
| **PostgreSQL** | 15+ | [postgresql.org](https://www.postgresql.org/download/) |
| **Docker Desktop** | Latest | [docker.com](https://www.docker.com/products/docker-desktop/) |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |
| **Expo CLI** | Latest | `npm install -g expo-cli` |

---

## 1. Clone the Repository

```bash
git clone https://github.com/donnellyCodes/happy_kids_commuter_system.git
cd happy_kids_commuter_system
```

---

## 2. Database Setup

### Option A: Using Docker (Recommended - Fastest)

```bash
# Start only the PostgreSQL container
docker compose up -d postgres

# Wait for it to be ready, then run the schema
docker compose exec postgres psql -U hkcs_user -d hkcs_db -f /docker-entrypoint-initdb.d/initial_schema.sql
```

### Option B: Local PostgreSQL Installation

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE hkcs_db;"
psql -U postgres -c "CREATE USER hkcs_user WITH PASSWORD 'hkcs1234';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE hkcs_db TO hkcs_user;"

# Run the consolidated schema (single file - all tables, indexes, and fixes)
psql -U hkcs_user -d hkcs_db -f database/migrations/initial_schema.sql

# (Optional) Seed test data
psql -U hkcs_user -d hkcs_db -f database/seeds/initial_test_data.sql
```

> **Note:** The `initial_schema.sql` file is a single consolidated migration that replaces the old 7 separate migration files. It includes all tables, columns, indexes, and data migrations.

---

## 3. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Edit `backend/.env` with your configuration:

```env
PORT=5000
DB_HOST=localhost          # Use 'postgres' if using Docker
DB_PORT=5432
DB_NAME=hkcs_db
DB_USER=hkcs_user
DB_PASSWORD=hkcs1234
JWT_SECRET=your_secure_jwt_secret_here_change_in_production
JWT_EXPIRES_IN=21d

# M-Pesa (optional - skip if not testing payments)
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=174379
MPESA_PASSKEY=
MPESA_ENV=sandbox
```

### Start Backend

```bash
# Development mode (with auto-reload)
npm run dev

# OR production mode
npm start
```

Backend runs on **http://localhost:5000**

---

## 4. AI Service Setup (Optional)

```bash
cd ai-service

# Create virtual environment (recommended)
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the service
uvicorn main:app --host 0.0.0.0 --port 8000
```

AI Service runs on **http://localhost:8000**

> The backend will fall back gracefully if the AI service is unavailable.

---

## 5. Admin Dashboard Setup

```bash
cd admin-dashboard

# Install dependencies
npm install

# Start development server
npm run dev
```

Admin Dashboard runs on **http://localhost:5173**

---

## 6. Parent Mobile App Setup

```bash
cd parent-app

# Install dependencies
npm install

# Start Expo
npx expo start
```

Scan the QR code with Expo Go on your phone, or press `a` for Android emulator / `i` for iOS simulator.

---

## 7. Docker (Full Stack - Fastest Setup)

For the quickest full-stack setup on a new machine:

```bash
# From the project root
docker compose up -d --build
```

This starts all services:
- **PostgreSQL** on port 5432
- **Backend API** on port 5000
- **AI Service** on port 8000
- **Admin Dashboard** on port 3000

> The database schema is automatically applied via the `./database/migrations` volume mount in the PostgreSQL container.

---

## Performance Optimization Tips

### Backend

1. **Use PM2 for production** (instead of `node server.js`):
   ```bash
   npm install -g pm2
   pm2 start server.js -i max --name hkcs-backend
   pm2 save
   pm2 startup
   ```

2. **Enable database connection pooling** (already configured in Sequelize)

3. **Set NODE_ENV=production** for faster Express routing:
   ```bash
   # Windows
   set NODE_ENV=production
   # Mac/Linux
   export NODE_ENV=production
   ```

### Database

1. **Run ANALYZE** after initial data load to update query planner stats:
   ```sql
   ANALYZE;
   ```

2. **Configure PostgreSQL for your machine** - edit `postgresql.conf`:
   ```ini
   # Use ~25% of your RAM
   shared_buffers = 1GB        # For 8GB RAM machine
   effective_cache_size = 3GB  # For 8GB RAM machine
   
   # Use number of CPU cores
   max_parallel_workers = 4
   max_parallel_workers_per_gather = 2
   ```

3. **Indexes are already created** by `initial_schema.sql` for all common query patterns.

### Docker

1. **Increase Docker resources** (Docker Desktop → Settings → Resources):
   - CPUs: 4+
   - Memory: 4GB+
   - Swap: 1GB

2. **Use build cache** for faster rebuilds:
   ```bash
   docker compose build --no-cache  # Only when dependencies change
   docker compose up -d             # Normal restart uses cache
   ```

### General

1. **Install dependencies with `--prefer-offline`** on slow connections:
   ```bash
   npm install --prefer-offline
   ```

2. **Use a local npm registry mirror** if in a region with slow npm access:
   ```bash
   npm config set registry https://registry.npmmirror.com
   ```

---

## Quick Verification

After setup, verify everything is working:

```bash
# 1. Check backend health
curl http://localhost:5000/api/health

# 2. Check database connection (via backend)
curl http://localhost:5000/api/health/db

# 3. Run backend tests
cd backend && npm test

# 4. Check AI service (if running)
curl http://localhost:8000/health
```

Expected response from health endpoint:
```json
{
  "status": "ok",
  "timestamp": "2026-07-02T12:00:00.000Z",
  "uptime": 123.45
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `port 5432 already in use` | Stop local PostgreSQL: `net stop postgresql-x64-15` (Windows) or `sudo systemctl stop postgresql` (Linux) |
| `ECONNREFUSED` on database | Ensure PostgreSQL is running and credentials in `.env` match |
| `Module not found` errors | Run `npm install` in the respective project directory |
| Docker `permission denied` | Add user to docker group: `sudo usermod -aG docker $USER` (Linux/Mac) |
| Expo QR code not working | Ensure phone and laptop are on the same WiFi network |
| Socket.IO connection failed | Check CORS settings in `backend/server.js` and verify port 5000 is accessible |

---

## File Structure Reference

```
happy_kids_commuters/
├── backend/                 # Node.js API (Express + Socket.IO)
├── admin-dashboard/         # React admin panel (Vite)
├── parent-app/              # React Native mobile app (Expo)
├── ai-service/              # Python AI service (FastAPI)
├── database/
│   ├── migrations/
│   │   └── initial_schema.sql   # <-- Single consolidated schema
│   └── seeds/
│       └── initial_test_data.sql
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── ngroksetup.md
│   └── setup.md             # <-- This file
├── docker-compose.yml
└── README.md