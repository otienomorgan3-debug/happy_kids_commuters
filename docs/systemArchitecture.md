# HKCS System Architecture

## Overview

Happy Kids Commuter System (HKCS) is a multi-service platform for managing school transportation. The system consists of four main services communicating via REST APIs and WebSockets.

## Architecture Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Parent App    │     │  Driver App     │     │ Admin Dashboard │
│  (React Native) │     │ (React Native)  │     │   (React/Vite)  │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                         ┌────────▼────────┐
                         │   Backend API   │
                         │  (Node/Express) │
                         └────────┬────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
              ┌─────▼─────┐ ┌────▼────┐ ┌─────▼─────┐
              │ PostgreSQL│ │ Socket.IO│ │   AI      │
              │ Database  │ │ (Real-time)│ │ Service   │
              └───────────┘ └──────────┘ │ (Python)  │
                                            └───────────┘
```

## Services

### 1. Backend API (`backend/`)

**Technology:** Node.js + Express + Socket.IO  
**Port:** 5000  
**Purpose:** Core business logic, authentication, and real-time communication

**Key Components:**
- **Routes:** RESTful API endpoints organized by domain (auth, students, tracking, routes, attendance, notifications, payments, admin)
- **Controllers:** Business logic for each domain
- **Middleware:** Authentication (JWT), role-based access control, validation
- **Socket.IO:** Real-time GPS tracking, emergency alerts, live notifications
- **Services:** External integrations (M-Pesa, Firebase, SMS)

**Database:** PostgreSQL via Sequelize ORM

### 2. AI Service (`ai-service/`)

**Technology:** Python + FastAPI  
**Port:** 8000  
**Purpose:** Route optimization and ETA prediction

**Key Components:**
- **Route Optimizer:** Calculates optimal bus routes based on student locations
- **ETA Predictor:** Predicts arrival times considering traffic patterns
- **ML Models:** Traffic-aware routing (expandable)

### 3. Parent App (`parent-app/`)

**Technology:** React Native + Expo  
**Purpose:** Parent interface for child tracking and management

**Key Features:**
- View children's information
- Live bus tracking on map
- Trip history and attendance
- Payment initiation
- Notifications

### 4. Driver App (`driver-app/`)

**Technology:** React Native + Expo  
**Purpose:** Driver interface for trip management

**Key Features:**
- Start/end trips
- GPS location sharing
- Attendance marking (board/drop)
- Emergency SOS button
- Route guidance

### 5. Admin Dashboard (`admin-dashboard/`)

**Technology:** React + Vite + Tailwind CSS  
**Purpose:** School administration interface

**Key Features:**
- Manage schools, buses, drivers, students
- Create and assign routes
- View trip history and attendance
- Monitor payments
- Emergency alert management

## Data Flow

### Authentication Flow

```
1. User submits credentials (email/password)
2. Backend validates credentials
3. Backend generates JWT token
4. Token returned to client
5. Client includes token in Authorization header for subsequent requests
6. Backend middleware validates token on each request
```

### Real-time Tracking Flow

```
1. Driver app starts trip
2. Driver joins Socket.IO room: bus_{bus_id}
3. Driver sends GPS updates every N seconds
4. Backend broadcasts location to room
5. Parent apps in same room receive updates
6. Map UI updates in real-time
```

### Payment Flow

```
1. Parent initiates payment via app
2. Backend calls M-Pesa STK Push
3. M-Pesa sends prompt to parent's phone
4. Parent enters PIN
5. M-Pesa sends callback to backend
6. Backend updates payment status
7. Backend sends notification to parent
```

## Database Schema

### Core Tables

- **users** - All system users (parents, drivers, admins)
- **parents** - Parent-specific data
- **drivers** - Driver-specific data (license, bus assignment)
- **students** - Student information linked to parents and schools
- **buses** - Bus information and GPS device IDs
- **schools** - School information
- **routes** - Route definitions
- **route_stops** - Ordered stops for each route
- **trips** - Trip records (start/end times, status)
- **attendance** - Student boarding/dropping records
- **payments** - Payment transactions
- **notifications** - In-app notifications
- **emergency_alerts** - SOS alerts

## Security

### Current Implementation

- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- CORS configuration
- Environment variable management

### Planned Security Enhancements

- API rate limiting
- Input validation and sanitization
- SQL injection prevention (parameterized queries via Sequelize)
- XSS protection
- HTTPS enforcement
- Audit logging
- Request signing for webhooks

## Communication Protocols

### REST API
- Used for CRUD operations
- Request/Response pattern
- JSON payloads
- JWT authentication

### WebSocket (Socket.IO)
- Real-time GPS tracking
- Emergency alerts
- Live notifications
- Bi-directional communication

### External APIs
- M-Pesa Daraja API (payments)
- Firebase Cloud Messaging (push notifications)
- SMS gateway (notifications)

## Deployment Architecture

### Development
- All services run locally
- PostgreSQL on localhost
- Environment variables in `.env` files

### Production (Planned)
- Docker containers for each service
- Docker Compose for orchestration
- PostgreSQL in container or managed service
- Nginx reverse proxy
- SSL/TLS termination
- Environment-specific configs

## Scalability Considerations

- **Horizontal Scaling:** Backend API can be scaled behind load balancer
- **Socket.IO:** Requires sticky sessions or Redis adapter for multi-instance
- **Database:** Connection pooling, read replicas for heavy read workloads
- **AI Service:** Can be scaled independently based on demand
- **Caching:** Redis for frequently accessed data (routes, notifications)

## Monitoring and Logging

- Application logs (console/file)
- Error tracking (to be integrated)
- Performance monitoring (to be integrated)
- Database query logging
- Socket.IO connection metrics

## Technology Choices Rationale

- **Node.js/Express:** Fast development, large ecosystem, good for I/O operations
- **Socket.IO:** Reliable WebSocket implementation with fallbacks
- **PostgreSQL:** Robust relational database, good for complex queries
- **Sequelize:** ORM for database operations, migrations support
- **React Native:** Cross-platform mobile development
- **Python/FastAPI:** High performance, easy ML integration
- **Docker:** Consistent deployment across environments