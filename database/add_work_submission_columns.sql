-- Add Work Submission Columns Migration
-- This script adds all the missing columns needed for the work submission flow

-- 1. Add work submission related columns to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS work_submission JSONB,
ADD COLUMN IF NOT EXISTS submission_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS work_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS revision_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_revisions INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS rejection_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS revision_feedback TEXT,
ADD COLUMN IF NOT EXISTS approval_feedback TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Update flow_state constraint to include all work submission states
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
  'brand_owner_negotiation',
  'influencer_final_response',
  'negotiation_input',
  'payment_pending',
  'payment_completed',
  'work_in_progress',        -- Work has started
  'work_submitted',          -- Influencer submitted work
  'work_revision_requested', -- Brand owner requested revision
  'work_approved',           -- Brand owner approved work
  'admin_final_payment_pending', -- Admin needs to process final payment
  'admin_final_payment_complete', -- Admin completed final payment
  'work_rejected',           -- Work was rejected (final)
  'real_time',               -- Real-time chat enabled
  'completed',
  'connection_rejected',
  'chat_closed',
  'closed'
));

-- 3. Update work_status constraint
ALTER TABLE conversations 
DROP CONSTRAINT IF EXISTS check_work_status;

ALTER TABLE conversations 
ADD CONSTRAINT check_work_status 
CHECK (work_status IN (
  'pending',
  'submitted',
  'approved',
  'revision_requested',
  'rejected'
));

-- 4. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_work_status ON conversations(work_status);
CREATE INDEX IF NOT EXISTS idx_conversations_submission_date ON conversations(submission_date);
CREATE INDEX IF NOT EXISTS idx_conversations_revision_count ON conversations(revision_count);

-- 5. Add comments for documentation
COMMENT ON COLUMN conversations.work_submission IS 'JSONB containing work submission details (deliverables, description, attachments, etc.)';
COMMENT ON COLUMN conversations.submission_date IS 'Timestamp when work was submitted';
COMMENT ON COLUMN conversations.work_status IS 'Current status of the work (pending, submitted, approved, revision_requested, rejected)';
COMMENT ON COLUMN conversations.revision_count IS 'Number of revisions requested so far';
COMMENT ON COLUMN conversations.max_revisions IS 'Maximum number of revisions allowed';
COMMENT ON COLUMN conversations.approval_date IS 'Timestamp when work was approved';
COMMENT ON COLUMN conversations.rejection_date IS 'Timestamp when work was rejected';
COMMENT ON COLUMN conversations.revision_feedback IS 'Feedback provided when requesting revision';
COMMENT ON COLUMN conversations.approval_feedback IS 'Feedback provided when approving work';
COMMENT ON COLUMN conversations.rejection_reason IS 'Reason provided when rejecting work';

-- 6. Update existing conversations to have default values
UPDATE conversations 
SET 
  work_status = 'pending',
  revision_count = 0,
  max_revisions = 3
WHERE work_status IS NULL;

-- 7. Verify the migration
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'conversations' 
  AND column_name IN (
    'work_submission', 
    'submission_date', 
    'work_status', 
    'revision_count', 
    'max_revisions',
    'approval_date',
    'rejection_date',
    'revision_feedback',
    'approval_feedback',
    'rejection_reason'
  )
ORDER BY column_name;
