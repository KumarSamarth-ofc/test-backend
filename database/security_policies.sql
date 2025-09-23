-- Security Policies for FCM Tokens, Coupons, and Coupon Usage
-- Run this after setting up the coupon system

-- Enable RLS on existing tables
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

-- FCM Tokens Policies
-- Users can only access their own FCM tokens
CREATE POLICY "Users can view own FCM tokens" ON fcm_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own FCM tokens" ON fcm_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own FCM tokens" ON fcm_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own FCM tokens" ON fcm_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Coupons Policies
-- Public can view active coupons (for validation)
CREATE POLICY "Public can view active coupons" ON coupons
    FOR SELECT USING (is_active = true);

-- Only admins can manage coupons
CREATE POLICY "Admins can manage coupons" ON coupons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Coupon Usage Policies
-- Users can only view their own coupon usage
CREATE POLICY "Users can view own coupon usage" ON coupon_usage
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own coupon usage (when applying coupons)
CREATE POLICY "Users can insert own coupon usage" ON coupon_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only admins can update/delete coupon usage
CREATE POLICY "Admins can manage coupon usage" ON coupon_usage
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Admins can delete coupon usage" ON coupon_usage
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Additional security: Prevent users from creating their own coupons
CREATE POLICY "Prevent user coupon creation" ON coupons
    FOR INSERT WITH CHECK (false);

-- Additional security: Prevent users from updating coupon usage records
CREATE POLICY "Prevent user coupon usage updates" ON coupon_usage
    FOR UPDATE USING (false);

-- Additional security: Prevent users from deleting coupon usage records
CREATE POLICY "Prevent user coupon usage deletion" ON coupon_usage
    FOR DELETE USING (false);

-- Create indexes for better performance with RLS
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user_id ON coupon_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);

-- Success message
SELECT 'Security policies applied successfully!' as message;
