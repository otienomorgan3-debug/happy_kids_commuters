-- Advanced Features: Geofencing, Offline Support, Driver Behavior Monitoring

-- 1. Geofences table
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

-- 2. Geofence alerts table
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

-- 3. Driver behavior logs table
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

-- 4. Driver behavior scores table
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

-- 5. Offline sync queue table
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_geofence_alerts_bus ON geofence_alerts(bus_id);
CREATE INDEX IF NOT EXISTS idx_geofence_alerts_status ON geofence_alerts(status);
CREATE INDEX IF NOT EXISTS idx_driver_behavior_driver ON driver_behavior_logs(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_behavior_trip ON driver_behavior_logs(trip_id);
CREATE INDEX IF NOT EXISTS idx_driver_behavior_type ON driver_behavior_logs(behavior_type);
CREATE INDEX IF NOT EXISTS idx_offline_sync_user ON offline_sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_sync_status ON offline_sync_queue(status);

-- Insert default geofences for demo
INSERT INTO geofences (name, type, latitude, longitude, radius_meters, alert_message) VALUES
('Westlands School Zone', 'school_zone', -1.2675, 36.8108, 150, 'Entering school zone - reduce speed'),
('CBD Pickup Point', 'route_stop', -1.2921, 36.8219, 100, 'Arrived at pickup point'),
('Karen Drop-off', 'route_stop', -1.3197, 36.6897, 100, 'Arrived at drop-off point'),
('Restricted Area - Industrial', 'restricted', -1.3150, 36.8500, 200, 'Entering restricted area')
ON CONFLICT DO NOTHING;