-- Automated Chat System Schema Updates
-- Run this file to add all required fields for automated conversations

-- Add missing columns for automated chat flow to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'user_input',
ADD COLUMN IF NOT EXISTS action_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS action_data JSONB,
ADD COLUMN IF NOT EXISTS is_automated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS action_completed BOOLEAN DEFAULT FALSE;

-- Add check constraint for message_type
ALTER TABLE messages 
DROP CONSTRAINT IF EXISTS check_message_type;

ALTER TABLE messages 
ADD CONSTRAINT check_message_type 
CHECK (message_type IN (
  'user_input', 
  'automated', 
  'audit', 
  'brand_owner_initial',
  'influencer_connection_response',
  'influencer_project_response',
  'influencer_price_response',
  'brand_owner_negotiation_input',
  'influencer_final_price_response',
  'brand_owner_details_input',
  'brand_owner_pricing_input',
  'brand_owner_payment',
  'brand_owner_negotiation_response'
));

-- Add missing columns for conversations table if not exists
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS flow_state TEXT DEFAULT 'initial',
ADD COLUMN IF NOT EXISTS awaiting_role TEXT,
ADD COLUMN IF NOT EXISTS flow_data JSONB,
ADD COLUMN IF NOT EXISTS chat_status TEXT DEFAULT 'automated';

-- Add check constraint for flow_state
ALTER TABLE conversations 
DROP CONSTRAINT IF EXISTS check_flow_state;

ALTER TABLE conversations 
ADD CONSTRAINT check_flow_state 
CHECK (flow_state IN (
  'initial',
  'influencer_responding',
  'influencer_reviewing',
  'influencer_price_response',
  'brand_owner_pricing',
  'negotiation_input',
  'brand_owner_negotiation',
  'payment_pending',
  'real_time',
  'chat_closed'
));

-- Add check constraint for awaiting_role
ALTER TABLE conversations 
DROP CONSTRAINT IF EXISTS check_awaiting_role;

ALTER TABLE conversations 
ADD CONSTRAINT check_awaiting_role 
CHECK (awaiting_role IN (
  'brand_owner',
  'influencer',
  NULL
));

-- Add check constraint for chat_status
ALTER TABLE conversations 
DROP CONSTRAINT IF EXISTS check_chat_status;

ALTER TABLE conversations 
ADD CONSTRAINT check_chat_status 
CHECK (chat_status IN (
  'automated',
  'real_time',
  'closed'
));

-- Add missing fields to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS automation_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS work_submission JSONB,
ADD COLUMN IF NOT EXISTS submission_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS work_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS conversation_type TEXT DEFAULT 'bid'; -- 'bid' or 'campaign'

-- Add missing fields to messages table  
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS action_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS action_data JSONB,
ADD COLUMN IF NOT EXISTS is_automated BOOLEAN DEFAULT false;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_flow_state ON conversations(flow_state);
CREATE INDEX IF NOT EXISTS idx_conversations_awaiting_role ON conversations(awaiting_role);
CREATE INDEX IF NOT EXISTS idx_conversations_conversation_type ON conversations(conversation_type);
CREATE INDEX IF NOT EXISTS idx_messages_action_required ON messages(action_required);
CREATE INDEX IF NOT EXISTS idx_messages_is_automated ON messages(is_automated);

-- Update existing conversations to have proper flow_state
UPDATE conversations 
SET flow_state = 'initial', 
    awaiting_role = 'brand_owner',
    automation_enabled = true,
    conversation_type = CASE 
        WHEN bid_id IS NOT NULL THEN 'bid'
        WHEN campaign_id IS NOT NULL THEN 'campaign'
        ELSE 'direct'
    END
WHERE flow_state IS NULL;

-- Update existing messages to have proper message_type
UPDATE messages 
SET message_type = 'user',
    action_required = false,
    is_automated = false
WHERE message_type IS NULL;
