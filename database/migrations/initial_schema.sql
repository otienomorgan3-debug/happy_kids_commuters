-- HKCS Database Schema (Consolidated)
-- Happy Kids Commuter System - Complete Database Schema
-- Run this in pgAdmin or psql to set up all tables, columns, indexes, and seed data

-- ============================================================
-- CORE TABLES
-- ============================================================

-- Users (all roles: parent, driver, admin)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    role VARCHAR(20) NOT NULL CHECK (role IN ('parent', 'driver', 'admin', 'superadmin')),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Schools
CREATE TABLE IF NOT EXISTS schools (
    id SERIAL PRIMARY KEY,
    school_name VARCHAR(150) NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Parents
CREATE TABLE IF NOT EXISTS parents (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    address TEXT
);

-- Buses
CREATE TABLE IF NOT EXISTS buses (
    id SERIAL PRIMARY KEY,
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    capacity INT NOT NULL,
    gps_device_id VARCHAR(100),
    fuel_consumption_rate DECIMAL(5,2) DEFAULT 10.00,
    fuel_price_per_liter DECIMAL(10,2) DEFAULT 175.00,
    last_fuel_check DATE DEFAULT CURRENT_DATE
);

-- Drivers
CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    bus_id INT REFERENCES buses(id)
);

-- Students
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id INT REFERENCES parents(id) ON DELETE CASCADE,
    school_id INT REFERENCES schools(id),
    pickup_location TEXT,
    dropoff_location TEXT,
    transport_fee DECIMAL(10,2) DEFAULT 0,
    outstanding_balance DECIMAL(10,2) DEFAULT 0,
    last_payment_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Routes
CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    route_name VARCHAR(100) NOT NULL,
    estimated_time INT -- in minutes
);

-- Route stops
CREATE TABLE IF NOT EXISTS route_stops (
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
CREATE TABLE IF NOT EXISTS trips (
    id SERIAL PRIMARY KEY,
    bus_id INT REFERENCES buses(id),
    route_id INT REFERENCES routes(id),
    driver_id INT REFERENCES drivers(id),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed'))
);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id),
    trip_id INT REFERENCES trips(id),
    boarded_at TIMESTAMP,
    dropped_at TIMESTAMP
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    parent_id INT REFERENCES parents(id),
    student_id INT REFERENCES students(id),
    amount DECIMAL(10,2) NOT NULL,
    mpesa_receipt VARCHAR(100),
    phone_number VARCHAR(20),
    account_reference VARCHAR(100),
    merchant_request_id VARCHAR(100),
    checkout_request_id VARCHAR(100),
    result_code VARCHAR(20),
    result_desc TEXT,
    transaction_date TIMESTAMP,
    balance_before DECIMAL(10,2),
    balance_after DECIMAL(10,2),
    callback_payload JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    message TEXT NOT NULL,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Emergency Alerts
CREATE TABLE IF NOT EXISTS emergency_alerts (
    id SERIAL PRIMARY KEY,
    bus_id INT REFERENCES buses(id),
    driver_id INT REFERENCES drivers(id),
    location TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- CHAT & PARENT ACTIONS TABLES
-- ============================================================

-- Bus live locations (latest GPS coordinates per bus)
CREATE TABLE IF NOT EXISTS bus_locations (
    bus_id INT PRIMARY KEY REFERENCES buses(id),
    driver_id INT REFERENCES drivers(id),
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- Chat messages table for parent-driver/admin communication
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id),
    receiver_id INTEGER REFERENCES users(id), -- NULL if broadcast to all admins
    message TEXT NOT NULL,
    chat_type VARCHAR(20) NOT NULL DEFAULT 'parent_driver' CHECK (chat_type IN ('parent_driver', 'parent_admin')),
    trip_id INTEGER REFERENCES trips(id),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Parent absence requests
CREATE TABLE IF NOT EXISTS absence_requests (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id),
    parent_id INTEGER NOT NULL REFERENCES parents(id),
    trip_id INTEGER REFERENCES trips(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Pickup change requests
CREATE TABLE IF NOT EXISTS pickup_change_requests (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id),
    parent_id INTEGER NOT NULL REFERENCES parents(id),
    old_pickup_location TEXT NOT NULL,
    new_pickup_location TEXT NOT NULL,
    effective_date DATE,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('approved', 'pending', 'rejected')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- ADVANCED FEATURES TABLES
-- ============================================================

-- Geofences table
CREATE TABLE IF NOT EXISTS geofences (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('school_zone', 'route_stop', 'restricted', 'custom')),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 100,
    alert_message TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Geofence alerts table
CREATE TABLE IF NOT EXISTS geofence_alerts (
    id SERIAL PRIMARY KEY,
    geofence_id INTEGER REFERENCES geofences(id),
    bus_id INTEGER REFERENCES buses(id),
    driver_id INTEGER REFERENCES drivers(id),
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('enter', 'exit', 'inside')),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
    acknowledged_by INTEGER REFERENCES users(id),
    acknowledged_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Driver behavior logs table
CREATE TABLE IF NOT EXISTS driver_behavior_logs (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES drivers(id),
    bus_id INTEGER REFERENCES buses(id),
    trip_id INTEGER REFERENCES trips(id),
    behavior_type VARCHAR(50) NOT NULL CHECK (behavior_type IN ('speeding', 'harsh_braking', 'rapid_acceleration', 'idle_time', 'route_deviation')),
    severity VARCHAR(50) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    speed_kmh DECIMAL(5, 2),
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Driver behavior scores table
CREATE TABLE IF NOT EXISTS driver_behavior_scores (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES drivers(id) UNIQUE,
    overall_score INTEGER DEFAULT 100 CHECK (overall_score >= 0 AND overall_score <= 100),
    speeding_count INTEGER DEFAULT 0,
    harsh_braking_count INTEGER DEFAULT 0,
    rapid_acceleration_count INTEGER DEFAULT 0,
    idle_time_minutes INTEGER DEFAULT 0,
    route_deviations INTEGER DEFAULT 0,
    total_trips INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Offline sync queue table
CREATE TABLE IF NOT EXISTS offline_sync_queue (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    device_id VARCHAR(255),
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    payload JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed')),
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    synced_at TIMESTAMP
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Payment indexes
CREATE INDEX IF NOT EXISTS idx_payments_parent_created_at ON payments(parent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_student_created_at ON payments(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_checkout_request_id ON payments(checkout_request_id);

-- Chat indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver ON chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_trip ON chat_messages(trip_id);

-- Absence request indexes
CREATE INDEX IF NOT EXISTS idx_absence_requests_student ON absence_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_absence_requests_date ON absence_requests(date);

-- Pickup change request indexes
CREATE INDEX IF NOT EXISTS idx_pickup_change_requests_student ON pickup_change_requests(student_id);

-- Geofence indexes
CREATE INDEX IF NOT EXISTS idx_geofence_alerts_bus ON geofence_alerts(bus_id);
CREATE INDEX IF NOT EXISTS idx_geofence_alerts_status ON geofence_alerts(status);

-- Driver behavior indexes
CREATE INDEX IF NOT EXISTS idx_driver_behavior_driver ON driver_behavior_logs(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_behavior_trip ON driver_behavior_logs(trip_id);
CREATE INDEX IF NOT EXISTS idx_driver_behavior_type ON driver_behavior_logs(behavior_type);

-- Offline sync indexes
CREATE INDEX IF NOT EXISTS idx_offline_sync_user ON offline_sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_sync_status ON offline_sync_queue(status);

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Emergency alert indexes
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_driver ON emergency_alerts(driver_id);

-- Route stops index
CREATE INDEX IF NOT EXISTS idx_route_stops_location ON route_stops(route_id, stop_order);

-- ============================================================
-- DATA MIGRATIONS (idempotent updates)
-- ============================================================

-- Set is_active to TRUE for existing users where NULL
UPDATE users SET is_active = TRUE WHERE is_active IS NULL;

-- Add fuel efficiency fields to existing buses table (idempotent)
ALTER TABLE buses ADD COLUMN IF NOT EXISTS fuel_consumption_rate DECIMAL(5,2) DEFAULT 10.00;
ALTER TABLE buses ADD COLUMN IF NOT EXISTS fuel_price_per_liter DECIMAL(10,2) DEFAULT 175.00;
ALTER TABLE buses ADD COLUMN IF NOT EXISTS last_fuel_check DATE DEFAULT CURRENT_DATE;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON COLUMN users.is_active IS 'Whether the user account is active';
COMMENT ON COLUMN emergency_alerts.driver_id IS 'Reference to the driver who triggered the alert';