-- Add negotiation counter tracking to conversations table
-- This enables proper multi-round negotiation with limits

-- Add negotiation tracking columns to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS negotiation_round INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_negotiation_rounds INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS negotiation_history JSONB DEFAULT '[]';

-- Add new flow state for influencer price input
-- First, drop existing constraint
ALTER TABLE conversations 
DROP CONSTRAINT IF EXISTS check_flow_state;

-- Add updated constraint with new influencer_price_input state
ALTER TABLE conversations 
ADD CONSTRAINT check_flow_state 
CHECK (flow_state IN (
  'initial',
  'influencer_responding',
  'brand_owner_details',
  'influencer_reviewing',
  'brand_owner_pricing',
  'influencer_price_response',
  'influencer_price_input',  -- NEW: For counter offer input
  'brand_owner_negotiation',
  'brand_owner_price_response',  -- NEW: For brand owner response to counter offer
  'influencer_final_response',
  'negotiation_input',
  'payment_pending',
  'payment_completed',
  'work_in_progress',
  'work_submitted',
  'work_approved',
  'real_time',
  'chat_closed'
));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_negotiation_round ON conversations(negotiation_round);
CREATE INDEX IF NOT EXISTS idx_conversations_max_negotiation_rounds ON conversations(max_negotiation_rounds);

-- Update existing conversations to have default negotiation settings
UPDATE conversations 
SET negotiation_round = 0,
    max_negotiation_rounds = 3,
    negotiation_history = '[]'
WHERE negotiation_round IS NULL;

-- Add comment explaining the negotiation flow
COMMENT ON COLUMN conversations.negotiation_round IS 'Current negotiation round (0-based)';
COMMENT ON COLUMN conversations.max_negotiation_rounds IS 'Maximum allowed negotiation rounds (default: 3)';
COMMENT ON COLUMN conversations.negotiation_history IS 'JSON array storing negotiation history with prices and actions';
