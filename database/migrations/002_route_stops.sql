-- Route stops support for admin-managed multi-stop routes
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

ALTER TABLE route_stops
    ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7);

ALTER TABLE route_stops
    ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7);
