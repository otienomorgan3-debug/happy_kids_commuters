Happy Kids Commuter System — Developer Guide

Purpose

This guide helps new developers understand, run, debug, and contribute to HKCS locally and in production.

Repository layout (high level)

- `backend/` — Express API, Socket.IO, PostgreSQL access (see `backend/server.js` and `backend/controllers`).
- `admin-dashboard/` — React + Vite admin UI.
- `parent-app/` — Expo React Native app (web and mobile).
- `ai-service/` — Optional Python FastAPI microservice for ETA and route optimization.
- `database/migrations/initial_schema.sql` — Canonical DB schema and table names.
- `docs/` — Project documentation (user manuals, API reference, deployment instructions, developer guide).

Prerequisites

- Node.js 18+ and npm
- Python 3.10+ (for `ai-service` if used)
- Docker & Docker Compose (recommended for full-stack local runs)
- PostgreSQL 15+ (or run via Docker)
- git

Environment configuration

- Copy `.env.example` into appropriate service folders (e.g. `backend/.env`) and set values.
- Important variables (backend):
  - `PORT` (5000)
  - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
  - `JWT_SECRET`, `JWT_EXPIRES_IN`
  - `MPESA_*` credentials if payments enabled

Quick local development (Docker)

- Build & run everything with Docker Compose:

```bash
docker compose up -d --build
```

- Check logs:

```bash
docker compose logs -f backend
```

Run services individually

- Backend (dev):

```bash
cd backend
npm install
cp .env.example .env  # edit values
npm run dev
```

- Admin dashboard:

```bash
cd admin-dashboard
npm install
npm run dev
```

- Parent app (Expo web dev):

```bash
cd parent-app
npm install
npx expo start --web
```

- AI service (optional):

```bash
cd ai-service
python -m venv venv
venv\Scripts\activate     # Windows
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

Database

- Use `database/migrations/initial_schema.sql` to create schema if not using Sequelize migrations.
- The backend uses `pg` and `Pool` in `backend/config/db.js` — ensure `.env` DB_* values point at a running Postgres instance.

Authentication and Tokens

- Login via `POST /api/auth/login` returns a JWT signed with `JWT_SECRET`.
- Protected routes use `Authorization: Bearer <token>` header verified by `backend/middleware/authMiddleware.js`.
- Frontend stores token in `AsyncStorage` (parent-app) and Axios request interceptor adds `Authorization` header (see `parent-app/constants/api.js`).

Socket.IO / Real-time

- Socket server is started inside `backend/server.js`. Use `SOCKET_URL` from `parent-app/constants/api.js` to connect.
- Important socket events:
  - `user:register` — map socket to user_id
  - `driver:location` — driver emits location updates
  - `bus:location` — server emits location updates to rooms

Testing

- Backend unit tests use Jest. Run from `backend`:

```bash
cd backend
npm test
```

- API integration tests use `supertest` where present. Keep tests focused on a single module when possible.

Debugging tips

- 401 Unauthorized on login: confirm the client sends `email` or `phone` and `password` in request body; confirm DB has a matching user and hashed password. See `backend/controllers/authController.js`.
- Verify `JWT_SECRET` matches between running backend process and token issuer.
- Socket problems: check CORS and host resolution (Expo web or Android emulator may require `localhost` vs `10.0.2.2`).
- DB connection errors: inspect `backend/config/db.js` console messages; ensure Postgres accepts connections from the host.

Run on Any Expo Go Version (use Dev Client)

- Why: You cannot guarantee a random Expo Go app on a user's phone will support the native modules or SDK your project uses. The reliable solution is to build a custom development client (EAS dev client) or a production build for Android that you install on the device. A custom client bundles native modules matching your project so it runs regardless of the installed Expo Go version.

- Quick commands (parent-app):

```bash
cd parent-app
# 1) install EAS CLI if not installed
npm install -g eas-cli

# 2) login to Expo
eas login

# 3) build a development client APK (fast path for testing)
npm run eas:build:dev

# 4) when the build completes, download and install the APK on your phone
# or use `npx expo install:android` for local client installation when available
```

- Notes:
  - The `eas:build:dev` script uses `parent-app/eas.json` development profile (a dev client APK). Install that APK on your phone and it will run your app without needing the Play Store Expo Go version.
  - For production distribution use `npm run eas:build:prod` to create an AAB to upload to Play Store or an APK for testers.
  - If you must rely on the Play Store Expo Go app, ensure the Expo SDK in `parent-app/package.json` (currently `~54.0.35`) matches the Expo Go app version on the device. Otherwise prefer the dev client approach above.

Coding conventions

- Backend: CommonJS (`module.exports`) and ES2018 features supported; follow existing style.
- Admin: React components with Vite + Tailwind. Follow existing patterns in `admin-dashboard/src/components`.
- Parent app: React Native + Expo; prefer hooks and context (`parent-app/context`).

Adding a feature

1. Fork repo and create a branch: `git checkout -b feature/your-feature`.
2. Add/modify backend controllers, routes, and tests.
3. Update frontend endpoints and UI components.
4. Run tests and manual smoke tests.
5. Submit PR with clear description and test coverage.

CI / Deployment

- The repo includes `docker-compose.yml` for deployments. For production, build images, push to registry, and deploy via orchestration (Docker Swarm, Kubernetes, or cloud provider).
- Use a reverse proxy (NGINX) with TLS in front of services. Keep `JWT_SECRET` and DB credentials in secure secret store.

Useful file references

- Server entry: `backend/server.js`
- Auth controller: `backend/controllers/authController.js`
- API client (parent app): `parent-app/constants/api.js`
- DB schema: `database/migrations/initial_schema.sql`

Support & Contacts

- When opening issues include logs, env values (sanitized), and reproduction steps.
- For urgent production incidents include timestamps and request IDs from logs.


