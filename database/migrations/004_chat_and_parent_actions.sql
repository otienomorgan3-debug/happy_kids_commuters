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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver ON chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_trip ON chat_messages(trip_id);
CREATE INDEX IF NOT EXISTS idx_absence_requests_student ON absence_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_absence_requests_date ON absence_requests(date);
CREATE INDEX IF NOT EXISTS idx_pickup_change_requests_student ON pickup_change_requests(student_id);