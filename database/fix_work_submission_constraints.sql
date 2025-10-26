-- Fix awaiting_role constraint to include 'admin'
-- This fixes the work submission flow issue where admin_final_payment_pending state requires awaiting_role = 'admin'

-- Drop the existing constraint
ALTER TABLE conversations 
DROP CONSTRAINT IF EXISTS check_awaiting_role;

-- Add the updated constraint that includes 'admin'
ALTER TABLE conversations 
ADD CONSTRAINT check_awaiting_role 
CHECK (awaiting_role IN ('brand_owner', 'influencer', 'admin') OR awaiting_role IS NULL);

-- Also update flow_state constraint to include all work submission states
ALTER TABLE conversations 
DROP CONSTRAINT IF EXISTS check_flow_state;

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

-- Add comment for documentation
COMMENT ON CONSTRAINT check_awaiting_role ON conversations IS 'Allows brand_owner, influencer, admin, or NULL for work submission flow';
COMMENT ON CONSTRAINT check_flow_state ON conversations IS 'Includes all work submission flow states including admin payment states';
