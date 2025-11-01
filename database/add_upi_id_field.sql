-- Add UPI ID field to users table
-- This field is required for payment processing

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS upi_id TEXT;

-- Add comment
COMMENT ON COLUMN users.upi_id IS 'UPI ID for receiving payments (e.g., username@paytm, phone@upi)';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_upi_id ON users(upi_id) WHERE upi_id IS NOT NULL;

