-- HKCS Seed Data
-- This file contains sample data for development and testing

-- Insert sample schools
INSERT INTO schools (school_name, address) VALUES
('Sunshine Primary School', '123 Education Lane, Nairobi'),
('Greenfield Academy', '456 Learning Avenue, Nairobi'),
('Bright Future School', '789 Knowledge Road, Nairobi');

-- Insert sample users
-- Password for all users: password123 (hashed with bcrypt)
INSERT INTO users (role, name, email, phone, password_hash) VALUES
('admin', 'System Administrator', 'admin@hkcs.com', '+254700000001', '$2a$10$rQ7H8p9X2Yz3AbCdEfGhIjKlMnOpQrStUvWxYz1234567890'),
('superadmin', 'Super Admin', 'superadmin@hkcs.com', '+254700000002', '$2a$10$rQ7H8p9X2Yz3AbCdEfGhIjKlMnOpQrStUvWxYz1234567890'),
('driver', 'James Kamau', 'james@hkcs.com', '+254700000003', '$2a$10$rQ7H8p9X2Yz3AbCdEfGhIjKlMnOpQrStUvWxYz1234567890'),
('driver', 'Mary Wanjiku', 'mary@hkcs.com', '+254700000004', '$2a$10$rQ7H8p9X2Yz3AbCdEfGhIjKlMnOpQrStUvWxYz1234567890'),
('parent', 'John Doe', 'john@example.com', '+254700000005', '$2a$10$rQ7H8p9X2Yz3AbCdEfGhIjKlMnOpQrStUvWxYz1234567890'),
('parent', 'Jane Smith', 'jane@example.com', '+254700000006', '$2a$10$rQ7H8p9X2Yz3AbCdEfGhIjKlMnOpQrStUvWxYz1234567890');

-- Insert sample buses
INSERT INTO buses (plate_number, capacity, gps_device_id) VALUES
('KCA 123A', 40, 'GPS_DEVICE_001'),
('KCB 456B', 40, 'GPS_DEVICE_002'),
('KCC 789C', 30, 'GPS_DEVICE_003');

-- Insert sample drivers (linked to users)
INSERT INTO drivers (user_id, license_number, bus_id) VALUES
(3, 'DL_12345', 1),
(4, 'DL_67890', 2);

-- Insert sample parents (linked to users)
INSERT INTO parents (user_id, address) VALUES
(5, '123 Parent Street, Nairobi'),
(6, '456 Family Avenue, Nairobi');

-- Insert sample students
INSERT INTO students (name, parent_id, school_id, pickup_location, dropoff_location) VALUES
('Alice Doe', 1, 1, '123 Parent Street, Nairobi', '123 Education Lane, Nairobi'),
('Bob Doe', 1, 1, '123 Parent Street, Nairobi', '123 Education Lane, Nairobi'),
('Charlie Smith', 2, 2, '456 Family Avenue, Nairobi', '456 Learning Avenue, Nairobi');

-- Insert sample routes
INSERT INTO routes (route_name, estimated_time) VALUES
('Route A - Westlands', 45),
('Route B - Karen', 50),
('Route C - CBD', 35);

-- Insert sample route stops
INSERT INTO route_stops (route_id, stop_name, location, latitude, longitude, stop_order) VALUES
(1, 'Westlands Stage', 'Westlands, Nairobi', -1.2676, 36.8108, 1),
(1, 'Parklands', 'Parklands, Nairobi', -1.2625, 36.8123, 2),
(1, 'Sunshine Primary School', '123 Education Lane, Nairobi', -1.2550, 36.8200, 3),
(2, 'Karen Shopping Centre', 'Karen, Nairobi', -1.3197, 36.7258, 1),
(2, 'Karen C', 'Karen C, Nairobi', -1.3150, 36.7300, 2),
(2, 'Greenfield Academy', '456 Learning Avenue, Nairobi', -1.3100, 36.7350, 3),
(3, 'CBD Stage', 'Nairobi CBD', -1.2921, 36.8219, 1),
(3, 'Bright Future School', '789 Knowledge Road, Nairobi', -1.2950, 36.8250, 2);

-- Insert sample trips
INSERT INTO trips (bus_id, route_id, driver_id, start_time, end_time, status) VALUES
(1, 1, 1, '2024-01-15 06:30:00', '2024-01-15 07:15:00', 'completed'),
(2, 2, 2, '2024-01-15 06:45:00', '2024-01-15 07:35:00', 'completed'),
(1, 1, 1, '2024-01-16 06:30:00', NULL, 'active');

-- Insert sample attendance
INSERT INTO attendance (student_id, trip_id, boarded_at, dropped_at) VALUES
(1, 1, '2024-01-15 06:45:00', '2024-01-15 07:10:00'),
(2, 1, '2024-01-15 06:50:00', '2024-01-15 07:12:00'),
(3, 2, '2024-01-15 07:00:00', '2024-01-15 07:30:00');

-- Insert sample notifications
INSERT INTO notifications (user_id, message, type, is_read) VALUES
(5, 'Bus has arrived at pickup point', 'arrival', false),
(5, 'Alice has boarded the bus', 'boarding', true),
(6, 'Trip completed successfully', 'trip_complete', true);

-- Insert sample payments
INSERT INTO payments (parent_id, amount, mpesa_receipt, status) VALUES
(1, 1500.00, 'QJK9X7Y2Z1', 'paid'),
(1, 1500.00, NULL, 'pending'),
(2, 1200.00, 'ABC123DEF4', 'paid');

-- Insert sample emergency alerts
INSERT INTO emergency_alerts (bus_id, location, status) VALUES
(1, '-1.2676, 36.8108', 'resolved'),
(2, '-1.3197, 36.7258', 'resolved');