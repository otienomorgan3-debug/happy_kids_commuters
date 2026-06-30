-- Fix missing latitude and longitude columns in route_stops table

-- Add latitude and longitude columns if they don't exist
ALTER TABLE route_stops
    ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7),
    ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_route_stops_location 
    ON route_stops(route_id, stop_order);

-- Verify the columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'route_stops' 
AND column_name IN ('latitude', 'longitude');