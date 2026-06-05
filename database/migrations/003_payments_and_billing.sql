-- HKCS Payments and Billing Migration
-- Adds the data needed for M-Pesa STK push, balance tracking, and receipts.

ALTER TABLE students
    ADD COLUMN IF NOT EXISTS transport_fee DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS outstanding_balance DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMP;

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

CREATE INDEX IF NOT EXISTS idx_payments_parent_created_at
    ON payments(parent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_student_created_at
    ON payments(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_checkout_request_id
    ON payments(checkout_request_id);
