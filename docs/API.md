# HKCS API Documentation

Base URL: `http://localhost:5000/api`

## Authentication

All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Auth

#### POST /api/auth/register
Register a new user.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+254700000000",
  "password": "password123",
  "role": "parent"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "parent",
  "token": "jwt_token_here"
}
```

#### POST /api/auth/login
Login user.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "parent",
  "token": "jwt_token_here"
}
```

### Students

#### GET /api/students
Get all students for the authenticated parent.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  {
    "id": 1,
    "name": "Jane Doe",
    "school_id": 1,
    "pickup_location": "123 Main St",
    "dropoff_location": "456 School Rd"
  }
]
```

#### POST /api/students
Create a new student.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "Jane Doe",
  "school_id": 1,
  "pickup_location": "123 Main St",
  "dropoff_location": "456 School Rd"
}
```

### Tracking

#### GET /api/tracking/bus/:busId
Get current bus location.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "bus_id": 1,
  "latitude": -1.2921,
  "longitude": 36.8219,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Routes

#### GET /api/routes
Get all routes.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  {
    "id": 1,
    "route_name": "Route A",
    "estimated_time": 45
  }
]
```

### Attendance

#### GET /api/attendance/student/:studentId
Get attendance history for a student.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  {
    "id": 1,
    "student_id": 1,
    "trip_id": 1,
    "boarded_at": "2024-01-15T08:00:00Z",
    "dropped_at": "2024-01-15T15:00:00Z"
  }
]
```

### Notifications

#### GET /api/notifications
Get notifications for the authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  {
    "id": 1,
    "user_id": 1,
    "message": "Bus has arrived",
    "type": "arrival",
    "is_read": false,
    "created_at": "2024-01-15T08:00:00Z"
  }
]
```

### Payments

#### POST /api/payments/initiate
Initiate M-Pesa payment.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "amount": 1000,
  "phone_number": "+254700000000"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment initiated",
  "checkout_request_id": "ws_CO_123456"
}
```

### Admin

#### GET /api/admin/dashboard
Get admin dashboard statistics.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "total_students": 150,
  "total_buses": 10,
  "total_drivers": 12,
  "active_trips": 5
}
```

## Socket.IO Events

### Client -> Server

- `user:register` - Register user socket
  ```json
  { "user_id": 1 }
  ```

- `driver:join` - Driver joins bus room
  ```json
  { "bus_id": 1 }
  ```

- `driver:location` - Driver sends GPS update
  ```json
  {
    "bus_id": 1,
    "latitude": -1.2921,
    "longitude": 36.8219
  }
  ```

- `parent:watch` - Parent watches bus
  ```json
  { "bus_id": 1 }
  ```

- `driver:sos` - Emergency SOS alert
  ```json
  {
    "bus_id": 1,
    "latitude": -1.2921,
    "longitude": 36.8219
  }
  ```

### Server -> Client

- `bus:location` - Bus location update
  ```json
  {
    "bus_id": 1,
    "latitude": -1.2921,
    "longitude": 36.8219,
    "timestamp": "2024-01-15T10:30:00Z"
  }
  ```

- `emergency:alert` - Emergency alert broadcast
  ```json
  {
    "bus_id": 1,
    "latitude": -1.2921,
    "longitude": 36.8219,
    "message": "EMERGENCY - Driver needs help!",
    "timestamp": "2024-01-15T10:30:00Z"
  }
  ```

## Error Responses

All errors follow this format:
```json
{
  "message": "Error description"
}
```

Common status codes:
- `400` - Bad request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not found
- `500` - Server error