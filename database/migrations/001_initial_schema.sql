-- HKCS Database Schema
-- Run this in pgAdmin or psql to set up all tables

-- Users (all roles: parent, driver, admin)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    role VARCHAR(20) NOT NULL CHECK (role IN ('parent', 'driver', 'admin', 'superadmin')),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Schools
CREATE TABLE schools (
    id SERIAL PRIMARY KEY,
    school_name VARCHAR(150) NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Parents
CREATE TABLE parents (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    address TEXT
);

-- Buses
CREATE TABLE buses (
    id SERIAL PRIMARY KEY,
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    capacity INT NOT NULL,
    gps_device_id VARCHAR(100)
);

-- Drivers
CREATE TABLE drivers (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    bus_id INT REFERENCES buses(id)
);

-- Students
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id INT REFERENCES parents(id) ON DELETE CASCADE,
    school_id INT REFERENCES schools(id),
    pickup_location TEXT,
    dropoff_location TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Routes
CREATE TABLE routes (
    id SERIAL PRIMARY KEY,
    route_name VARCHAR(100) NOT NULL,
    estimated_time INT -- in minutes
);

-- Route stops
CREATE TABLE route_stops (
    id SERIAL PRIMARY KEY,
    route_id INT REFERENCES routes(id) ON DELETE CASCADE,
    stop_name VARCHAR(150) NOT NULL,
    location TEXT,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    stop_order INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (route_id, stop_order)
);

-- Trips
CREATE TABLE trips (
    id SERIAL PRIMARY KEY,
    bus_id INT REFERENCES buses(id),
    route_id INT REFERENCES routes(id),
    driver_id INT REFERENCES drivers(id),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed'))
);

-- Attendance
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id),
    trip_id INT REFERENCES trips(id),
    boarded_at TIMESTAMP,
    dropped_at TIMESTAMP
);

-- Payments
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    parent_id INT REFERENCES parents(id),
    amount DECIMAL(10,2) NOT NULL,
    mpesa_receipt VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    message TEXT NOT NULL,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Emergency Alerts
CREATE TABLE emergency_alerts (
    id SERIAL PRIMARY KEY,
    bus_id INT REFERENCES buses(id),
    location TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
    created_at TIMESTAMP DEFAULT NOW()
);
