-- =====================================================
-- WALLET ENHANCEMENT - CLEAN MIGRATION
-- =====================================================
-- This script adds ONLY essential columns for proper wallet tracking
-- and removes any unnecessary columns that were added

-- Step 1: Add essential columns to wallets table
-- =====================================================
ALTER TABLE wallets 
ADD COLUMN IF NOT EXISTS withdrawn_balance_paise INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_balance_paise INTEGER DEFAULT 0;

-- Migrate existing balance data to paise if not already done
UPDATE wallets 
SET balance_paise = COALESCE(balance * 100, 0) 
WHERE balance_paise = 0;

-- Calculate total balance for existing wallets
UPDATE wallets 
SET total_balance_paise = COALESCE(balance_paise, 0) + COALESCE(frozen_balance_paise, 0) + COALESCE(withdrawn_balance_paise, 0)
WHERE total_balance_paise = 0;

-- Step 2: Add essential columns to transactions table
-- =====================================================
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS amount_paise INTEGER,
ADD COLUMN IF NOT EXISTS direction VARCHAR(10) CHECK (direction IN ('debit', 'credit')),
ADD COLUMN IF NOT EXISTS withdrawal_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Migrate existing amount data to paise
UPDATE transactions 
SET amount_paise = COALESCE(amount * 100, 0) 
WHERE amount_paise IS NULL AND amount IS NOT NULL;

-- Step 3: Add essential transaction types
-- =====================================================
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'withdrawal';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'payment_sent';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'payment_received';

-- Step 4: Update existing transactions with proper direction
-- =====================================================
UPDATE transactions 
SET direction = CASE 
    WHEN type = 'credit' THEN 'credit'
    WHEN type = 'debit' THEN 'debit'
    WHEN type = 'withdrawal' THEN 'debit'
    WHEN type = 'payment_sent' THEN 'debit'
    WHEN type = 'payment_received' THEN 'credit'
    ELSE direction
END
WHERE direction IS NULL;

-- Step 5: Remove unnecessary functions and views FIRST
-- =====================================================
-- Drop dependent objects before dropping columns
-- Drop triggers first, then functions
DROP TRIGGER IF EXISTS update_wallet_totals_trigger ON transactions;
DROP FUNCTION IF EXISTS calculate_wallet_totals(UUID);
DROP FUNCTION IF EXISTS get_transaction_summary(UUID, INTEGER);
DROP FUNCTION IF EXISTS update_wallet_totals(UUID);
DROP FUNCTION IF EXISTS trigger_update_wallet_totals();
DROP VIEW IF EXISTS wallet_balance_view;
DROP VIEW IF EXISTS transaction_history_view;

-- Step 6: Remove unnecessary columns from transactions table
-- =====================================================
-- Remove columns that are not being used in the current system
-- Use CASCADE to handle any remaining dependencies
ALTER TABLE transactions 
DROP COLUMN IF EXISTS related_conversation_id CASCADE,
DROP COLUMN IF EXISTS related_escrow_hold_id CASCADE,
DROP COLUMN IF EXISTS balance_after_paise CASCADE,
DROP COLUMN IF EXISTS frozen_balance_after_paise CASCADE,
DROP COLUMN IF EXISTS withdrawn_balance_after_paise CASCADE,
DROP COLUMN IF EXISTS stage CASCADE,
DROP COLUMN IF EXISTS related_payment_order_id CASCADE;

-- Step 7: Remove unnecessary indexes
-- =====================================================
DROP INDEX IF EXISTS idx_transactions_stage;
DROP INDEX IF EXISTS idx_transactions_conversation_id;
DROP INDEX IF EXISTS idx_transactions_escrow_hold_id;

-- Step 8: Create essential indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_direction ON transactions(direction);
CREATE INDEX IF NOT EXISTS idx_transactions_withdrawal_id ON transactions(withdrawal_id);

-- Step 9: Create simple function to update wallet totals
-- =====================================================
CREATE OR REPLACE FUNCTION update_wallet_totals(wallet_id UUID)
RETURNS VOID AS $$
DECLARE
    total_balance INTEGER;
BEGIN
    SELECT 
        COALESCE(balance_paise, 0) + COALESCE(frozen_balance_paise, 0) + COALESCE(withdrawn_balance_paise, 0)
    INTO total_balance
    FROM wallets 
    WHERE id = wallet_id;
    
    UPDATE wallets 
    SET 
        total_balance_paise = total_balance,
        updated_at = NOW()
    WHERE id = wallet_id;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create simple trigger to auto-update wallet totals
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_update_wallet_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update totals for the affected wallet
    PERFORM update_wallet_totals(NEW.wallet_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_wallet_totals_trigger ON transactions;
CREATE TRIGGER update_wallet_totals_trigger
    AFTER INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_wallet_totals();

-- Step 11: Update all existing wallets to have correct totals
-- =====================================================
UPDATE wallets 
SET total_balance_paise = COALESCE(balance_paise, 0) + COALESCE(frozen_balance_paise, 0) + COALESCE(withdrawn_balance_paise, 0);

-- Step 12: Add comments for documentation
-- =====================================================
COMMENT ON COLUMN wallets.withdrawn_balance_paise IS 'Total amount withdrawn by user in paise';
COMMENT ON COLUMN wallets.total_balance_paise IS 'Total balance = available + frozen + withdrawn in paise';
COMMENT ON COLUMN transactions.withdrawal_id IS 'Unique identifier for withdrawal transaction';

-- Step 13: Verify the migration
-- =====================================================
-- Check essential columns in wallets table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'wallets' 
AND column_name IN ('balance_paise', 'frozen_balance_paise', 'withdrawn_balance_paise', 'total_balance_paise')
ORDER BY column_name;

-- Check essential columns in transactions table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN ('user_id', 'amount_paise', 'direction', 'withdrawal_id', 'notes')
ORDER BY column_name;

-- Check essential transaction types
SELECT unnest(enum_range(NULL::transaction_type)) as transaction_types;
