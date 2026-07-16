-- HKCS Seed Data
-- Single school: Sunshine Primary School
-- 1 admin, 2 parents, 2 drivers, 6 students
-- Passwords are shown in plain text here; they get hashed when inserted into the database

-- Insert school
INSERT INTO schools (school_name, address) VALUES
('Sunshine School', '123 Education Lane, Nairobi');

-- Insert users
INSERT INTO users (role, name, email, phone, password_hash) VALUES
('admin', 'System Administrator', 'admin@hkcs.com', '+254700000001', 'Admin1234'),
('driver', 'John Driver', 'driver@hkcs.com', '+254798765432', 'Driver1234'),
('driver', 'James Driver', 'driver2@hkcs.com', '+254745678978', 'Driver5678'),
('parent', 'Morgan Otieno', 'morgan@hkcs.com', '+254712345678', 'Test1234'),
('parent', 'Jane Smith', 'jane@hkcs.com', '+254700000006', 'Test5678');

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

-- Insert students (6 total, 3 per parent, all at Sunshine Primary School)
INSERT INTO students (name, parent_id, school_id, pickup_location, dropoff_location) VALUES
-- Morgan Otieno's children (parent_id = 1, user_id = 4) — picked up on Karen Morning Route at Kabwagi
('Brian Otieno', 1, 1, 'Kabwagi, Karen', 'Kabwagi, Nairobi'),
('Dalia Otieno', 1, 1, 'Karen Stage, Karen', 'Karen, Nairobi'),
('Carol Otieno', 1, 1, 'Kabwagi, Karen', 'Kabwagi, Nairobi'),

-- Jane Smith's children (parent_id = 2, user_id = 5) — picked up on Kitengela Evening Route at Kitengela Stage
('John Smith', 2, 1, 'Kitengela Stage', 'Kitengela, Kajiado'),
('Ethan Smith', 2, 1, 'Kitengela Stage', 'Kitengela, Kajiado'),
('Diana Smith', 2, 1, 'Kitengela Stage', 'Kitengela, Kajiado');

-- Insert routes
INSERT INTO routes (route_name, estimated_time) VALUES
('Karen Morning Route', 45),
('Kitengela Evening Route', 50);

-- Insert route stops
INSERT INTO route_stops (route_id, stop_name, location, latitude, longitude, stop_order) VALUES
-- Karen Morning Route: Karen Stage → Kabwagi (pickup) → Sunshine Primary School
(1, 'Karen Stage', 'Karen, Nairobi', -1.3197, 36.7258, 1),
(1, 'Kabwagi', 'Kabwagi, Karen, Nairobi', -1.3120, 36.7280, 2),
(1, 'Sunshine Primary School', '123 Education Lane, Nairobi', -1.2550, 36.8200, 3),
-- Kitengela Evening Route: Kitengela Estate → Kitengela Stage (pickup) → Sunshine Primary School
(2, 'Kitengela Estate', 'Kitengela, Nairobi', -1.4833, 36.9667, 1),
(2, 'Kitengela Stage', 'Kitengela, Nairobi', -1.4750, 36.9700, 2),
(2, 'Sunshine Primary School', '123 Education Lane, Nairobi', -1.2550, 36.8200, 3);

-- Insert trips
INSERT INTO trips (bus_id, route_id, driver_id, start_time, end_time, status) VALUES
(1, 1, 1, '2024-01-15 06:30:00', '2024-01-15 07:15:00', 'completed'),
(2, 2, 2, '2024-01-15 15:45:00', '2024-01-15 16:35:00', 'completed'),
(1, 1, 1, '2024-01-16 06:30:00', NULL, 'active');

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
(4, 'Bus has arrived at Kabwagi pickup point', 'arrival', false),
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

-- Insert payments
INSERT INTO payments (parent_id, amount, mpesa_receipt, status) VALUES
(1, 1500.00, 'QJK9X7Y2Z1', 'paid'),       -- Morgan Otieno
(1, 1500.00, NULL, 'pending'),             -- Morgan Otieno
(1, 1500.00, 'MPE123ABC', 'paid'),         -- Morgan Otieno
(2, 1200.00, 'ABC123DEF4', 'paid'),        -- Jane Smith
(2, 1200.00, NULL, 'pending'),             -- Jane Smith
(2, 1200.00, 'MPE456DEF', 'paid');         -- Jane Smith

-- Insert emergency alerts
INSERT INTO emergency_alerts (bus_id, location, status) VALUES
(1, '-1.3120, 36.7280', 'resolved'),
(2, '-1.4750, 36.9700', 'resolved');