# Happy Kids Commuter System (HKCS)

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-ISC-green)

HKCS is a comprehensive school transport management platform for parents, drivers, and administrators. It provides real-time bus tracking, student management, route optimization, attendance tracking, and secure payment processing.

## Features

### Core Features
- **Real-time GPS Tracking**: Live bus location sharing via Socket.IO
- **Student Management**: Parent-child relationship management
- **Trip Management**: Driver trip start/end with attendance marking
- **Route Optimization**: AI-powered route planning and ETA prediction
- **Attendance Tracking**: Board/drop recording with timestamps
- **Payment Integration**: M-Pesa STK Push for secure payments
- **Notifications**: In-app and SMS notifications
- **Emergency Alerts**: SOS button for driver emergencies
- **Admin Dashboard**: Complete school management interface

### Security Features
- JWT-based authentication
- Role-based access control (RBAC)
- API rate limiting
- Input validation and sanitization
- XSS protection
- Security headers

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Real-time**: Socket.IO
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT + bcrypt

### Frontend
- **Admin Dashboard**: React + Vite + Tailwind CSS
- **Mobile Apps**: React Native + Expo

### AI Service
- **Framework**: FastAPI
- **Language**: Python
- **ML**: Route optimization and ETA prediction

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL 15

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- PostgreSQL 15+
- Docker & Docker Compose (optional)

### Option 1: Docker (Recommended)

The fastest way to get started:

```bash
# Clone the repository
git clone <repository-url>
cd happy_kids_commuters

# Copy environment file
cp .env.example backend/.env

# Edit backend/.env with your configuration
# At minimum, change JWT_SECRET to a secure random string

# Start all services
docker-compose up -d

# Run the demo script
chmod +x scripts/demo.sh
./scripts/demo.sh
```

Access the services:
- Backend API: http://localhost:5000
- AI Service: http://localhost:8000
- Admin Dashboard: http://localhost:3000
- PostgreSQL: localhost:5432

### Option 2: Manual Setup

#### 1. Database Setup

```bash
# Create PostgreSQL database
createdb hkcs_db

# Run migrations
psql -U postgres -d hkcs_db -f database/migrations/001_initial_schema.sql
psql -U postgres -d hkcs_db -f database/migrations/002_route_stops.sql
psql -U postgres -d hkcs_db -f database/migrations/003_payments_and_billing.sql

# Optional: Load seed data
psql -U postgres -d hkcs_db -f database/seeds/001_initial_data.sql
```

#### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your database credentials and JWT secret

# Run database migrations (if using Sequelize CLI)
npm run migrate

# Start development server
npm run dev
```

#### 3. AI Service Setup

```bash
cd ai-service

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start server
uvicorn main:app --reload --port 8000
```

#### 4. Admin Dashboard Setup

```bash
cd admin-dashboard

# Install dependencies
npm install

# Start development server
npm run dev
```

#### 5. Mobile Apps Setup

```bash
# Parent App
cd parent-app
npm install
npx expo start

# Driver App (if exists)
cd ../driver-app
npm install
npx expo start
```

## Environment Variables

Create `backend/.env` based on `.env.example`:

```env
# Required
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hkcs_db
DB_USER=hkcs_user
DB_PASSWORD=your_password
JWT_SECRET=your_secure_jwt_secret_here

# Optional (for payments)
MPESA_CONSUMER_KEY=your_key
MPESA_CONSUMER_SECRET=your_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_passkey
MPESA_ENV=sandbox
```

See `.env.example` for all available options.

## Project Structure

```
happy_kids_commuters/
├── backend/                 # Node.js API server
│   ├── config/             # Database and app configuration
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Auth, validation, security
│   ├── routes/             # API route definitions
│   ├── services/           # External integrations (M-Pesa, SMS)
│   ├── tests/              # Jest test files
│   ├── Dockerfile          # Backend container config
│   └── server.js           # Entry point
│
├── admin-dashboard/        # React admin interface
│   ├── src/
│   └── Dockerfile
│
├── parent-app/             # React Native parent app
├── driver-app/             # React Native driver app
│
├── ai-service/             # Python FastAPI service
│   ├── route_optimizer.py
│   ├── eta_predictor.py
│   └── Dockerfile
│
├── database/               # Database schemas and seeds
│   ├── migrations/
│   └── seeds/
│
├── docs/                   # Documentation
│   ├── API.md             # API endpoint documentation
│   └── ARCHITECTURE.md    # System architecture
│
├── scripts/               # Utility scripts
│   └── demo.sh            # Demo setup script
│
├── docker-compose.yml     # Docker orchestration
└── .env.example           # Environment template
```

## Documentation

- **[API Documentation](docs/API.md)** - Complete API reference with endpoints and examples
- **[Architecture Guide](docs/ARCHITECTURE.md)** - System design and data flow
- **[Database Schema](database/migrations/001_initial_schema.sql)** - PostgreSQL schema
- **[Admin Dashboard README](admin-dashboard/README.md)**
- **[AI Service README](ai-service/README.md)**

## Testing

### Run All Tests

```bash
cd backend
npm test
```

### Run Specific Tests

```bash
# Auth tests only
npm run test:auth

# Tracking tests only
npm run test:tracking

# Watch mode
npm run test:watch
```

### Test Coverage

The test suite covers:
- User registration and login
- Authentication middleware
- Trip management (start/end)
- Attendance marking
- Role-based access control

## Development

### Available Scripts

```bash
# Backend
npm run dev          # Start with nodemon (auto-reload)
npm start            # Start production server
npm test             # Run tests with coverage
npm run test:watch   # Run tests in watch mode

# Database
npm run migrate      # Run Sequelize migrations
npm run seed         # Seed database with sample data
```

### Code Style

- Use ESLint configuration provided in each package
- Follow existing code patterns
- Write tests for new features

## Deployment

### Using Docker

```bash
# Production build
docker-compose -f docker-compose.yml up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Reset everything (including database)
docker-compose down -v
```

### Manual Deployment

1. Set `NODE_ENV=production` in environment
2. Run `npm install --production` in backend
3. Build admin dashboard: `npm run build` in admin-dashboard
4. Use a process manager like PM2 for the backend
5. Set up Nginx as reverse proxy
6. Configure SSL/TLS certificates

## Security

### Implemented Security Measures

- **Authentication**: JWT tokens with bcrypt password hashing
- **Rate Limiting**: 
  - General API: 100 requests/15min
  - Auth endpoints: 5 attempts/15min
  - Payment endpoints: 3 requests/min
- **Input Validation**: express-validator for all inputs
- **XSS Protection**: Input sanitization and security headers
- **CORS**: Configurable allowed origins
- **SQL Injection**: Prevented via Sequelize ORM

### Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` as template
2. **Use strong JWT secrets** - Minimum 32 characters, random
3. **Enable HTTPS** in production
4. **Regularly update dependencies** - Check for security patches
5. **Rotate credentials** periodically
6. **Monitor logs** for suspicious activity

## Troubleshooting

### Port Already in Use

```bash
# Change ports in docker-compose.yml or .env file
# Default ports: 5000 (backend), 8000 (AI), 3000 (admin), 5432 (DB)
```

### Database Connection Issues

```bash
# Ensure PostgreSQL is running
# Check credentials in .env match docker-compose.yml
# For Docker: use 'postgres' as DB_HOST, not 'localhost'
```

### Socket.IO Connection Failed

```bash
# Check CORS settings in server.js
# Ensure client is connecting to correct port
# Verify no firewall blocking WebSocket connections
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

ISC

## Support

For issues and questions:
- Check the [documentation](docs/)
- Review [API reference](docs/API.md)
- Open an issue in the repository

---

**Built with ❤️ for safer school commutes**
