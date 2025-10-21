-- Fix missing work_revision_requested state in flow_state constraint
-- This is critical for the work submission flow to work properly

-- Drop existing constraint
ALTER TABLE conversations 
DROP CONSTRAINT IF EXISTS check_flow_state;

-- Add updated constraint with work_revision_requested state
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
  'work_in_progress',        -- Work has started
  'work_submitted',          -- Influencer submitted work
  'work_revision_requested', -- Brand owner requested revision (MISSING STATE!)
  'work_approved',           -- Brand owner approved work
  'real_time',               -- Real-time chat enabled
  'completed',
  'connection_rejected',
  'chat_closed',
  'closed'
));

-- Add comment explaining the work submission flow
COMMENT ON CONSTRAINT check_flow_state ON conversations IS 'Work submission flow: work_in_progress -> work_submitted -> work_revision_requested (if revision needed) -> work_submitted (resubmit) -> work_approved -> closed';
