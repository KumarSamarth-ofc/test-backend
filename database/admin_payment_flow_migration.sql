-- Admin Payment Flow Database Migration
-- This migration adds support for admin-managed payments without payment gateways

-- Create commission settings table
CREATE TABLE IF NOT EXISTS commission_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    is_active BOOLEAN DEFAULT TRUE,
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default commission setting
INSERT INTO commission_settings (commission_percentage, is_active) 
VALUES (10.00, TRUE)
ON CONFLICT DO NOTHING;

-- Create admin payment tracking table
CREATE TABLE IF NOT EXISTS admin_payment_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    bid_id UUID REFERENCES bids(id) ON DELETE CASCADE,
    brand_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    influencer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Payment amounts (in paise)
    total_amount_paise INTEGER NOT NULL,
    commission_amount_paise INTEGER NOT NULL,
    net_amount_paise INTEGER NOT NULL,
    advance_amount_paise INTEGER NOT NULL,
    final_amount_paise INTEGER NOT NULL,
    
    -- Commission details
    commission_percentage DECIMAL(5,2) NOT NULL,
    
    -- Payment status tracking
    advance_payment_status TEXT DEFAULT 'admin_received' CHECK (advance_payment_status IN ('admin_received', 'admin_confirmed')),
    final_payment_status TEXT DEFAULT 'pending' CHECK (final_payment_status IN ('pending', 'admin_confirmed')),
    
    -- Admin actions
    advance_confirmed_at TIMESTAMP WITH TIME ZONE,
    advance_paid_at TIMESTAMP WITH TIME ZONE,
    final_confirmed_at TIMESTAMP WITH TIME ZONE,
    final_paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Screenshots and notes
    advance_screenshot_url TEXT,
    final_screenshot_url TEXT,
    admin_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT check_admin_payment_source CHECK (
        (campaign_id IS NOT NULL AND bid_id IS NULL) OR 
        (campaign_id IS NULL AND bid_id IS NOT NULL)
    ),
    CONSTRAINT check_amount_consistency CHECK (
        total_amount_paise = commission_amount_paise + net_amount_paise AND
        net_amount_paise = advance_amount_paise + final_amount_paise
    )
);

-- Add admin_payment_tracking_id to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS admin_payment_tracking_id UUID REFERENCES admin_payment_tracking(id) ON DELETE SET NULL;

-- Update flow states to include admin payment states
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
  'admin_payment_received',    -- NEW: Admin received payment
  'advance_payment_sent',      -- NEW: Admin sent advance
  'work_in_progress',
  'work_submitted',
  'work_approved',
  'final_payment_sent',        -- NEW: Admin sent final payment
  'real_time',
  'chat_closed'
));

-- Add new message types for admin payments
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
  'brand_owner_negotiation_response',
  'payment_breakdown',              -- NEW: Payment breakdown message
  'advance_payment_confirmed',      -- NEW: Advance payment confirmation
  'final_payment_confirmed',        -- NEW: Final payment confirmation
  'admin_message'                   -- NEW: General admin message
));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_payment_tracking_conversation_id ON admin_payment_tracking(conversation_id);
CREATE INDEX IF NOT EXISTS idx_admin_payment_tracking_campaign_id ON admin_payment_tracking(campaign_id);
CREATE INDEX IF NOT EXISTS idx_admin_payment_tracking_bid_id ON admin_payment_tracking(bid_id);
CREATE INDEX IF NOT EXISTS idx_admin_payment_tracking_brand_owner_id ON admin_payment_tracking(brand_owner_id);
CREATE INDEX IF NOT EXISTS idx_admin_payment_tracking_influencer_id ON admin_payment_tracking(influencer_id);
CREATE INDEX IF NOT EXISTS idx_admin_payment_tracking_advance_status ON admin_payment_tracking(advance_payment_status);
CREATE INDEX IF NOT EXISTS idx_admin_payment_tracking_final_status ON admin_payment_tracking(final_payment_status);
CREATE INDEX IF NOT EXISTS idx_admin_payment_tracking_created_at ON admin_payment_tracking(created_at);

CREATE INDEX IF NOT EXISTS idx_transactions_admin_payment_tracking_id ON transactions(admin_payment_tracking_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_stage ON transactions(payment_stage);

-- Enable RLS for admin_payment_tracking table
ALTER TABLE admin_payment_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_payment_tracking table
CREATE POLICY "Admins can view all payment tracking" ON admin_payment_tracking
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Users can view their own payment tracking" ON admin_payment_tracking
    FOR SELECT USING (
        brand_owner_id = auth.uid() OR 
        influencer_id = auth.uid()
    );

-- Enable RLS for commission_settings table
ALTER TABLE commission_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for commission_settings table
CREATE POLICY "Admins can manage commission settings" ON commission_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Users can view active commission settings" ON commission_settings
    FOR SELECT USING (is_active = TRUE);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_payment_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_admin_payment_tracking_updated_at
    BEFORE UPDATE ON admin_payment_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_payment_tracking_updated_at();

-- Add comments for documentation
COMMENT ON TABLE admin_payment_tracking IS 'Tracks admin-managed payments for campaigns and bids';
COMMENT ON TABLE commission_settings IS 'Platform commission configuration';
COMMENT ON COLUMN admin_payment_tracking.total_amount_paise IS 'Total amount paid by brand owner (in paise)';
COMMENT ON COLUMN admin_payment_tracking.commission_amount_paise IS 'Platform commission amount (in paise)';
COMMENT ON COLUMN admin_payment_tracking.net_amount_paise IS 'Amount influencer receives after commission (in paise)';
COMMENT ON COLUMN admin_payment_tracking.advance_amount_paise IS 'Advance payment amount (30% of net, in paise)';
COMMENT ON COLUMN admin_payment_tracking.final_amount_paise IS 'Final payment amount (70% of net, in paise)';
COMMENT ON COLUMN transactions.admin_payment_tracking_id IS 'Reference to admin payment tracking record';
COMMENT ON COLUMN transactions.payment_stage IS 'Payment stage: advance or final';

-- Expiry sweep functions
-- Ensure enums include 'expired'
DO $$ BEGIN
  ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'expired';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE bid_status ADD VALUE IF NOT EXISTS 'expired';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION mark_expired_campaigns(now_ts TIMESTAMP WITH TIME ZONE)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE campaigns c
  SET status = 'expired', updated_at = now()
  WHERE c.status = 'open'
    AND c.end_date IS NOT NULL
    AND c.end_date < now_ts
    AND NOT EXISTS (
      SELECT 1 FROM requests r
      WHERE r.campaign_id = c.id
    );
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION mark_expired_bids(now_ts TIMESTAMP WITH TIME ZONE)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE bids b
  SET status = 'expired', updated_at = now()
  WHERE b.status = 'open'
    AND b.expiry_date IS NOT NULL
    AND b.expiry_date < now_ts
    AND NOT EXISTS (
      SELECT 1 FROM requests r
      WHERE r.bid_id = b.id
    );
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sweep_expired_campaigns_and_bids()
RETURNS TABLE(campaigns_expired INTEGER, bids_expired INTEGER) AS $$
BEGIN
  campaigns_expired := mark_expired_campaigns(now());
  bids_expired := mark_expired_bids(now());
  RETURN QUERY SELECT campaigns_expired, bids_expired;
END;
$$ LANGUAGE plpgsql;
