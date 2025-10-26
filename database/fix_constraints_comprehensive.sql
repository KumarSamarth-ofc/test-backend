-- Comprehensive fix for work submission constraints
-- This addresses the specific constraint name issue

-- Drop ALL existing constraints that might be causing issues
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS check_awaiting_role;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_awaiting_role_check;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS awaiting_role_check;

-- Drop flow_state constraints as well
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS check_flow_state;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_flow_state_check;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS flow_state_check;

-- Add the correct constraints with proper names
ALTER TABLE conversations 
ADD CONSTRAINT check_awaiting_role 
CHECK (awaiting_role IN ('brand_owner', 'influencer', 'admin') OR awaiting_role IS NULL);

ALTER TABLE conversations 
ADD CONSTRAINT check_flow_state 
CHECK (flow_state IN (
  'initial',
  'influencer_responding',
  'brand_owner_details',
  'influencer_reviewing',
  'brand_owner_pricing',
  'influencer_price_response',
  'brand_owner_negotiation',
  'influencer_final_response',
  'negotiation_input',
  'payment_pending',
  'payment_completed',
  'work_in_progress',
  'work_submitted',
  'work_approved',
  'work_rejected',
  'admin_final_payment_pending',
  'admin_final_payment_complete',
  'real_time',
  'completed',
  'connection_rejected',
  'chat_closed',
  'closed'
));

-- Add comments for documentation
COMMENT ON CONSTRAINT check_awaiting_role ON conversations IS 'Allows brand_owner, influencer, admin, or NULL for work submission flow';
COMMENT ON CONSTRAINT check_flow_state ON conversations IS 'Includes all work submission flow states including admin payment states';
