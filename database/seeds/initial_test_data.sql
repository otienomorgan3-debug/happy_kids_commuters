-- HKCS Seed Data
-- Single school: Sunshine School
-- 1 admin, 2 parents, 2 drivers, 6 students
-- Passwords are shown in plain text here; they get hashed when inserted into the database

-- Insert school
INSERT INTO schools (school_name, address) VALUES
('Sunshine School', 'Karen');

-- Insert users
-- Passwords are pre-hashed with bcrypt (cost 12) to match the backend's
-- bcrypt.compare() login check. Plain text: Admin1234, Driver1234, Driver5678, Test1234, Test5678
INSERT INTO users (role, name, email, phone, password_hash) VALUES
('admin', 'System Administrator', 'admin@hkcs.com', '+254700000001', '$2b$12$ebUCSM6EcM6Jk4/wCfAo9eaRjVayNesxaXb5pMtfKJmBVuMsA3nGm'),
('driver', 'John Driver', 'driver@hkcs.com', '+254798765432', '$2b$12$v6LdGEYuXrQk0pd4YXlO0eIE3OeT3ANULiaicNnohPT/RwEE0lcZG'),
('driver', 'James Driver', 'driver2@hkcs.com', '+254745678978', '$2b$12$ZWB/9/wZU5V2fGK2j/paVuq1QYjcQ3435VGn7I0b5KbcKiMMfBqz.'),
('parent', 'Morgan Otieno', 'morgan@hkcs.com', '+254712345678', '$2b$12$GFrFYg7ELUmTgtibuFcmvOHNG85c/WDIerz4jI2VcMSpV/OiPjIXe'),
('parent', 'Jane Smith', 'jane@hkcs.com', '+254700000006', '$2b$12$mxMqFiQGvErQJ7P9iUhozu8ju.E4I0nSxObW2AUVeGuhV652LPW9m');

-- Insert buses
INSERT INTO buses (plate_number, capacity, gps_device_id) VALUES
('KCA 123A', 40, 'GPS_DEVICE_001'),
('KCB 456B', 40, 'GPS_DEVICE_002');

-- Insert drivers (linked to users, assigned to buses)
INSERT INTO drivers (user_id, license_number, bus_id) VALUES
(2, 'DL_123456', 1),
(3, 'DL_789101', 2);

-- Insert parents (linked to users)
INSERT INTO parents (user_id, address) VALUES
(4, 'Kitengela, Kajiado'),
(5, 'Karen, Nairobi');

-- Insert students (6 total, 3 per parent, all at Sunshine School)
INSERT INTO students (name, parent_id, school_id, pickup_location, dropoff_location) VALUES
-- Morgan Otieno's children (parent_id = 1, user_id = 4) — all picked up at Karen Stage
('Brian Otieno', 1, 1, 'Karen Stage', 'Karen, Nairobi'),
('Dalia Otieno', 1, 1, 'Karen Stage', 'Karen, Nairobi'),
('Carol Otieno', 1, 1, 'Karen Stage', 'Karen, Nairobi'),

-- Jane Smith's children (parent_id = 2, user_id = 5) — all picked up at Kitengela Stage
('John Smith', 2, 1, 'Kitengela Stage', 'Kitengela, Kajiado'),
('Ethan Smith', 2, 1, 'Kitengela Stage', 'Kitengela, Kajiado'),
('Diana Smith', 2, 1, 'Kitengela Stage', 'Kitengela, Kajiado');

-- Insert routes
INSERT INTO routes (route_name, estimated_time) VALUES
('Karen Morning Route', 45),
('Kitengela Evening Route', 50);

-- Insert route stops
INSERT INTO route_stops (route_id, stop_name, location, latitude, longitude, stop_order) VALUES
-- Karen Morning Route: Karen Stage (unified pickup) → Sunshine School
(1, 'Karen Stage', 'Karen, Nairobi', -1.3197, 36.7258, 1),
(1, 'Sunshine School', 'Karen', -1.3120, 36.7280, 2),
-- Kitengela Evening Route: Kitengela Estate → Kitengela Stage (unified pickup) → Sunshine School
(2, 'Kitengela Estate', 'Kitengela, Nairobi', -1.4833, 36.9667, 1),
(2, 'Kitengela Stage', 'Kitengela, Nairobi', -1.4750, 36.9700, 2),
(2, 'Sunshine School', 'Karen', -1.3120, 36.7280, 3);

-- Insert trips
INSERT INTO trips (bus_id, route_id, driver_id, start_time, end_time, status) VALUES
-- Completed demo trips
(1, 1, 1, '2024-01-15 06:30:00', '2024-01-15 07:15:00', 'completed'),
(2, 2, 2, '2024-01-15 15:45:00', '2024-01-15 16:35:00', 'completed'),
-- Active trips for demonstration (driver@hkcs on Karen, driver2@hkcs on Kitengela)
(1, 1, 1, NOW() - INTERVAL '20 minutes', NULL, 'active'),
(2, 2, 2, NOW() - INTERVAL '15 minutes', NULL, 'active');

-- Insert attendance records
INSERT INTO attendance (student_id, trip_id, boarded_at, dropped_at) VALUES
-- Trip 1 (John Driver, Karen Morning Route): Morgan Otieno's children
(1, 1, '2024-01-15 06:45:00', '2024-01-15 07:10:00'),  -- Brian Otieno
(2, 1, '2024-01-15 06:48:00', '2024-01-15 07:12:00'),  -- Dalia Otieno
(3, 1, '2024-01-15 06:50:00', '2024-01-15 07:13:00'),  -- Carol Otieno
-- Trip 2 (James Driver, Kitengela Evening Route): Jane Smith's children
(4, 2, '2024-01-15 16:00:00', '2024-01-15 16:30:00'),  -- John Smith
(5, 2, '2024-01-15 16:03:00', '2024-01-15 16:32:00'),  -- Ethan Smith
(6, 2, '2024-01-15 16:05:00', '2024-01-15 16:33:00');  -- Diana Smith

-- Insert notifications
INSERT INTO notifications (user_id, message, type, is_read) VALUES
-- Notifications for Morgan Otieno (user_id = 4)
(4, 'Bus has arrived at Karen Stage pickup point', 'arrival', false),
(4, 'Brian Otieno has boarded the bus', 'boarding', true),
(4, 'Dalia Otieno has boarded the bus', 'boarding', true),
(4, 'Carol Otieno has boarded the bus', 'boarding', false),
(4, 'All children dropped off at school safely', 'dropoff', false),
-- Notifications for Jane Smith (user_id = 5)
(5, 'Bus has arrived at Kitengela Stage pickup point', 'arrival', false),
(5, 'John Smith has boarded the bus', 'boarding', true),
(5, 'Ethan Smith has boarded the bus', 'boarding', false),
(5, 'Diana Smith has boarded the bus', 'boarding', false),
(5, 'All children dropped off at school safely', 'dropoff', true);

-- Update all students to have outstanding balances
UPDATE students SET transport_fee = 1500.00, outstanding_balance = 1500.00 WHERE parent_id = 1;
UPDATE students SET transport_fee = 1200.00, outstanding_balance = 1200.00 WHERE parent_id = 2;

-- Insert payments
INSERT INTO payments (parent_id, student_id, amount, mpesa_receipt, status, created_at) VALUES
-- Morgan Otieno (parent_id=1) - 1 paid, 2 pending
(1, 1, 1500.00, 'QJK9X7Y2Z1', 'paid', NOW() - INTERVAL '10 days'),
(1, 1, 1500.00, NULL, 'pending', NOW() - INTERVAL '5 days'),
(1, 2, 1500.00, NULL, 'pending', NOW() - INTERVAL '2 days'),
-- Jane Smith (parent_id=2) - 1 paid, 2 pending
(2, 4, 1200.00, 'ABC123DEF4', 'paid', NOW() - INTERVAL '8 days'),
(2, 5, 1200.00, NULL, 'pending', NOW() - INTERVAL '3 days'),
(2, 6, 1200.00, NULL, 'pending', NOW() - INTERVAL '1 day');

-- Insert emergency alerts
INSERT INTO emergency_alerts (bus_id, location, status) VALUES
(1, '-1.3120, 36.7280', 'resolved'),
(2, '-1.4750, 36.9700', 'resolved');