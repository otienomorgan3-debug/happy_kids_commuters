# Happy Kids Commuter System - Backend API

This is the core Node.js + Express backend API for the Happy Kids Commuter System (HKCS). It handles the main business logic, authentication, real-time GPS tracking via Socket.IO, and integration with the PostgreSQL database.

## Technologies Used
- **Runtime:** Node.js v20+
- **Framework:** Express.js
- **Database:** PostgreSQL
- **Real-Time:** Socket.IO for GPS and notifications
- **Authentication:** JWT (JSON Web Tokens)

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Create a `.env` file in the root of the `backend` folder. Refer to the root `README.md` for the required environment variables (e.g., `PORT`, `DB_HOST`, `DB_USER`, `JWT_SECRET`, etc.).

3. **Start the server (Development):**
   ```bash
   npm run dev
   ```
   The server will start on `http://localhost:5000` (or your configured port).

## Project Structure
- `config/` - Database and third-party service configurations
- `controllers/` - Request handlers for various routes
- `middleware/` - Custom Express middlewares (e.g., auth, RBAC)
- `routes/` - API route definitions
- `server.js` - Main entry point of the application
