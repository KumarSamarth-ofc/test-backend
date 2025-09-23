-- Fix Stack Overflow Issue
-- The trigger is causing infinite recursion, so we'll disable it temporarily

-- 1. Drop the problematic trigger
DROP TRIGGER IF EXISTS update_wallet_totals_trigger ON transactions;

-- 2. Drop the trigger function
DROP FUNCTION IF EXISTS trigger_update_wallet_totals();

-- 3. Drop the update function
DROP FUNCTION IF EXISTS update_wallet_totals(UUID);

-- 4. Create a simpler, non-recursive trigger function
CREATE OR REPLACE FUNCTION trigger_update_wallet_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if this is a new transaction (not an update)
    IF TG_OP = 'INSERT' THEN
        -- Update wallet totals without causing recursion
        UPDATE wallets 
        SET 
            total_balance_paise = COALESCE(balance_paise, 0) + COALESCE(frozen_balance_paise, 0) + COALESCE(withdrawn_balance_paise, 0),
            updated_at = NOW()
        WHERE id = NEW.wallet_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Recreate the trigger
CREATE TRIGGER update_wallet_totals_trigger
    AFTER INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_wallet_totals();

-- 6. Update all existing wallets to have correct totals
UPDATE wallets 
SET total_balance_paise = COALESCE(balance_paise, 0) + COALESCE(frozen_balance_paise, 0) + COALESCE(withdrawn_balance_paise, 0)
WHERE total_balance_paise IS NULL OR total_balance_paise = 0;
