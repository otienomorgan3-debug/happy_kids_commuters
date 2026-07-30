-- Migration: Fix existing tables for updated backend schema
-- Run this if you see errors about missing columns or check constraint violations.

-- Fix chat_messages: add sender columns and extend chat_type constraint
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS sender_name VARCHAR(100);
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS sender_role VARCHAR(20);
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_chat_type_check;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_chat_type_check CHECK (chat_type IN ('parent_driver', 'parent_admin', 'driver_parent', 'driver_admin', 'admin_parent', 'admin_driver'));

-- Fix drivers: add availability/dispatch columns if missing from old schema
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS availability_status VARCHAR(20) NOT NULL DEFAULT 'available'
    CHECK (availability_status IN ('available', 'unavailable', 'on_leave', 'sick', 'offline'));
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS dispatch_status VARCHAR(30) NOT NULL DEFAULT 'idle'
    CHECK (dispatch_status IN ('idle', 'on_trip', 'reassignment_pending'));
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS availability_reason TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS availability_until TIMESTAMP;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS next_available_at TIMESTAMP;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS is_dispatchable BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS last_status_update_at TIMESTAMP DEFAULT NOW();
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS last_status_updated_by INT REFERENCES users(id);

-- Fix trips: add status columns if missing from old schema
ALTER TABLE trips ADD COLUMN IF NOT EXISTS status_reason TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE trips ADD COLUMN IF NOT EXISTS do_not_reassign BOOLEAN DEFAULT FALSE;

-- Fix trips: extend status check constraint if it was from old schema
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_status_check;
ALTER TABLE trips ADD CONSTRAINT trips_status_check CHECK (status IN ('pending', 'active', 'completed', 'delayed', 'reassignment_pending', 'cancelled'));
