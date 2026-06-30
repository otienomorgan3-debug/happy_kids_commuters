-- Fix missing columns for admin dashboard functionality

-- 1. Add is_active column to users table (required for parent status management)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. Add driver_id column to emergency_alerts table (required for incident management)
ALTER TABLE emergency_alerts
    ADD COLUMN IF NOT EXISTS driver_id INT REFERENCES drivers(id);

-- 3. Ensure student columns from migration 003 exist
ALTER TABLE students
    ADD COLUMN IF NOT EXISTS transport_fee DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS outstanding_balance DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMP;

-- 4. Ensure payment columns from migration 003 exist
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS student_id INT REFERENCES students(id),
    ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
    ADD COLUMN IF NOT EXISTS account_reference VARCHAR(100),
    ADD COLUMN IF NOT EXISTS merchant_request_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS checkout_request_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS result_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS result_desc TEXT,
    ADD COLUMN IF NOT EXISTS transaction_date TIMESTAMP,
    ADD COLUMN IF NOT EXISTS balance_before DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS balance_after DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS callback_payload JSONB,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_driver ON emergency_alerts(driver_id);
CREATE INDEX IF NOT EXISTS idx_payments_checkout_request_id ON payments(checkout_request_id);

-- 6. Update existing users to have is_active = TRUE if NULL
UPDATE users SET is_active = TRUE WHERE is_active IS NULL;

COMMENT ON COLUMN users.is_active IS 'Whether the user account is active';
COMMENT ON COLUMN emergency_alerts.driver_id IS 'Reference to the driver who triggered the alert';