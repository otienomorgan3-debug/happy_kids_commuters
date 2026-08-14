Happy Kids Commuter System — Deployment Instructions

This document describes how to deploy HKCS components: backend API, parent-app, admin-dashboard, and optional ai-service. Use Docker/Compose for a reproducible deployment or deploy services separately.

Prerequisites

- Docker and Docker Compose installed (recommended).
- Node.js (for local non-container runs), npm/yarn.
- PostgreSQL database (can run via Docker compose).
- Environment variables set (see `.env.example` or below).

Key Environment Variables (backend)

- `PORT` (default 5000)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `JWT_SECRET` — a secure signing secret
- `JWT_EXPIRES_IN` — e.g., `7d`
- MPESA credentials if payments enabled: `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, etc.

Quick Docker Compose (recommended)

1. Ensure `docker-compose.yml` at repo root is configured for services (db, backend, admin-dashboard, ai-service).
2. Create an `.env` file at repo root with required variables.
3. Start services:

```bash
docker compose up -d --build
```

4. Check logs:

```bash
docker compose logs -f backend
```

Manual: Backend (non-container)

```bash
cd backend
cp .env.example .env   # or create .env with real values
npm install
npm run migrate   # if using sequelize migrations
npm run dev       # nodemon server
```

Manual: Parent App (web)

- The parent-app is built with Expo; for web builds run:

```bash
cd parent-app
npm install
npm run web
```

- For mobile builds use `expo run:android` or `expo run:ios` or use the Expo build service.

Admin Dashboard

```bash
cd admin-dashboard
npm install
npm run dev   # or npm run build and serve static files
```

ai-service (optional)

- Python service that provides ETA and route optimization. Example:

```bash
cd ai-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Database

- If using Postgres manually, run the SQL schema in `database/migrations/initial_schema.sql`.
- Or use Sequelize migrations: `npm run migrate` from `backend` if configured.

Secrets & Production

- Use strong `JWT_SECRET` and secure DB credentials.
- Enable TLS/HTTPS via reverse proxy (NGINX, cloud load balancer).
- Configure CORS origins appropriately (backend uses `cors()` — lock this down in production).

Health checks & Logs

- Monitor container logs and set up alerts for error spikes.
- Periodic backups of the database are required for student data recovery.

Rollback

- Keep backups of DB and filesystem artifacts before migrating schema.
- Use tagged Docker images and deploy by tag to enable fast rollback.

Support

- Provide access to the server logs and `.env` (sanitized) when requesting support.
