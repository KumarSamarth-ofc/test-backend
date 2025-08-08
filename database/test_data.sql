-- Test Data for Stoory Backend
-- Run this after the main schema to populate test data

-- Insert test users
INSERT INTO users (id, phone, email, role, languages, categories, min_range, max_range) VALUES
-- Brand Owners
('550e8400-e29b-41d4-a716-446655440001', '+919876543210', 'brand1@example.com', 'brand_owner', ARRAY['English', 'Hindi'], ARRAY['Fashion', 'Beauty'], 1000, 5000),
('550e8400-e29b-41d4-a716-446655440002', '+919876543211', 'brand2@example.com', 'brand_owner', ARRAY['English'], ARRAY['Technology', 'Gaming'], 2000, 10000),
('550e8400-e29b-41d4-a716-446655440003', '+919876543212', 'brand3@example.com', 'brand_owner', ARRAY['English', 'Tamil'], ARRAY['Food', 'Travel'], 500, 3000),

-- Influencers
('550e8400-e29b-41d4-a716-446655440004', '+919876543213', 'influencer1@example.com', 'influencer', ARRAY['English', 'Hindi'], ARRAY['Fashion', 'Lifestyle'], 500, 2000),
('550e8400-e29b-41d4-a716-446655440005', '+919876543214', 'influencer2@example.com', 'influencer', ARRAY['English'], ARRAY['Technology', 'Gaming'], 1000, 5000),
('550e8400-e29b-41d4-a716-446655440006', '+919876543215', 'influencer3@example.com', 'influencer', ARRAY['English', 'Tamil'], ARRAY['Food', 'Travel'], 300, 1500),
('550e8400-e29b-41d4-a716-446655440007', '+919876543216', 'influencer4@example.com', 'influencer', ARRAY['English'], ARRAY['Fashion', 'Beauty'], 800, 3000),

-- Admin
('550e8400-e29b-41d4-a716-446655440008', '+919876543217', 'admin@stoory.com', 'admin', ARRAY['English'], ARRAY['All'], 0, 100000);

-- Insert social platforms for influencers
INSERT INTO social_platforms (user_id, platform_name, profile_link, followers_count, engagement_rate) VALUES
('550e8400-e29b-41d4-a716-446655440004', 'Instagram', 'https://instagram.com/influencer1', 50000, 3.5),
('550e8400-e29b-41d4-a716-446655440004', 'YouTube', 'https://youtube.com/influencer1', 25000, 4.2),
('550e8400-e29b-41d4-a716-446655440005', 'Instagram', 'https://instagram.com/influencer2', 75000, 2.8),
('550e8400-e29b-41d4-a716-446655440005', 'TikTok', 'https://tiktok.com/influencer2', 100000, 5.1),
('550e8400-e29b-41d4-a716-446655440006', 'Instagram', 'https://instagram.com/influencer3', 30000, 4.5),
('550e8400-e29b-41d4-a716-446655440007', 'YouTube', 'https://youtube.com/influencer4', 45000, 3.8);

-- Insert campaigns
INSERT INTO campaigns (id, created_by, title, description, budget, status, start_date, end_date, requirements, deliverables) VALUES
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440001', 'Summer Fashion Collection', 'Promote our new summer fashion line with Instagram posts and stories', 2500.00, 'open', '2024-06-01', '2024-08-31', 'Must have 10k+ followers, Fashion niche preferred', ARRAY['3 Instagram posts', '5 Instagram stories', '1 YouTube video']),
('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440002', 'Gaming Headset Launch', 'Review and promote our new gaming headset', 5000.00, 'open', '2024-05-15', '2024-07-15', 'Gaming content creator, 50k+ followers', ARRAY['1 YouTube review video', '2 Instagram posts', '1 TikTok video']),
('550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440003', 'Restaurant Food Review', 'Visit our restaurant and create food review content', 1500.00, 'open', '2024-06-01', '2024-06-30', 'Food blogger, Local to Chennai', ARRAY['1 Instagram post', '1 YouTube video', '3 Instagram stories']),
('550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440001', 'Beauty Product Campaign', 'Promote our skincare products', 3000.00, 'pending', '2024-07-01', '2024-09-30', 'Beauty influencer, 20k+ followers', ARRAY['2 Instagram posts', '1 YouTube tutorial', '5 Instagram stories']);

-- Insert bids
INSERT INTO bids (id, created_by, title, description, budget, status) VALUES
('550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440002', 'Quick Tech Review', 'Need a quick review of our new smartphone app', 800.00, 'open'),
('550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440003', 'Travel Vlog', 'Create a travel vlog for our hotel', 1200.00, 'open'),
('550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440001', 'Fashion Photoshoot', 'Model our new clothing line', 2000.00, 'open');

-- Insert requests (connections)
INSERT INTO requests (id, campaign_id, bid_id, influencer_id, status, final_agreed_amount, initial_payment, final_payment) VALUES
-- Campaign requests
('550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440101', NULL, '550e8400-e29b-41d4-a716-446655440004', 'connected', NULL, NULL, NULL),
('550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440102', NULL, '550e8400-e29b-41d4-a716-446655440005', 'negotiating', 4500.00, 1350.00, 3150.00),
('550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440103', NULL, '550e8400-e29b-41d4-a716-446655440006', 'paid', 1200.00, 360.00, 840.00),
('550e8400-e29b-41d4-a716-446655440304', '550e8400-e29b-41d4-a716-446655440104', NULL, '550e8400-e29b-41d4-a716-446655440007', 'completed', 2800.00, 840.00, 1960.00),

-- Bid requests
('550e8400-e29b-41d4-a716-446655440305', NULL, '550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440005', 'connected', NULL, NULL, NULL),
('550e8400-e29b-41d4-a716-446655440306', NULL, '550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440006', 'negotiating', 1000.00, 300.00, 700.00),
('550e8400-e29b-41d4-a716-446655440307', NULL, '550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440004', 'paid', 1800.00, 540.00, 1260.00);

-- Insert conversations (auto-created for paid requests)
INSERT INTO conversations (id, campaign_id, bid_id, brand_owner_id, influencer_id, request_id) VALUES
('550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440103', NULL, '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440303'),
('550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440104', NULL, '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440304'),
('550e8400-e29b-41d4-a716-446655440403', NULL, '550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440307');

-- Insert messages
INSERT INTO messages (conversation_id, sender_id, receiver_id, message, seen) VALUES
-- Conversation 1: Food Review
('550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440006', 'Hi! Thanks for applying to our restaurant review campaign. When can you visit?', true),
('550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440003', 'Hi! I can visit this weekend. What time works best?', true),
('550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440006', 'Saturday 2 PM works perfectly. We will provide a complimentary meal.', false),

-- Conversation 2: Beauty Campaign
('550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440007', 'Hi! Your beauty content is perfect for our campaign. Payment has been processed.', true),
('550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440001', 'Thank you! I will start working on the content this week.', true),
('550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440001', 'I\'ve completed the first Instagram post. Should I send it for review?', false),

-- Conversation 3: Fashion Photoshoot
('550e8400-e29b-41d4-a716-446655440403', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', 'Hi! We\'re excited to work with you on the fashion photoshoot.', true),
('550e8400-e29b-41d4-a716-446655440403', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'Hi! I\'m available next week. What\'s the location?', true),
('550e8400-e29b-41d4-a716-446655440403', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', 'We have a studio in Mumbai. Can you come on Tuesday?', false);

-- Insert transactions (for paid requests)
INSERT INTO transactions (wallet_id, amount, type, status, campaign_id, bid_id, request_id, razorpay_payment_id, razorpay_order_id, payment_stage) VALUES
-- Food review payment
((SELECT id FROM wallets WHERE user_id = '550e8400-e29b-41d4-a716-446655440006'), 360.00, 'credit', 'completed', '550e8400-e29b-41d4-a716-446655440103', NULL, '550e8400-e29b-41d4-a716-446655440303', 'pay_test123', 'order_test123', 'initial'),
((SELECT id FROM wallets WHERE user_id = '550e8400-e29b-41d4-a716-446655440006'), 840.00, 'credit', 'completed', '550e8400-e29b-41d4-a716-446655440103', NULL, '550e8400-e29b-41d4-a716-446655440303', 'pay_test124', 'order_test124', 'final'),

-- Beauty campaign payment
((SELECT id FROM wallets WHERE user_id = '550e8400-e29b-41d4-a716-446655440007'), 840.00, 'credit', 'completed', '550e8400-e29b-41d4-a716-446655440104', NULL, '550e8400-e29b-41d4-a716-446655440304', 'pay_test125', 'order_test125', 'initial'),
((SELECT id FROM wallets WHERE user_id = '550e8400-e29b-41d4-a716-446655440007'), 1960.00, 'credit', 'completed', '550e8400-e29b-41d4-a716-446655440104', NULL, '550e8400-e29b-41d4-a716-446655440304', 'pay_test126', 'order_test126', 'final'),

-- Fashion photoshoot payment
((SELECT id FROM wallets WHERE user_id = '550e8400-e29b-41d4-a716-446655440004'), 540.00, 'credit', 'completed', NULL, '550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440307', 'pay_test127', 'order_test127', 'initial');

-- Update wallet balances based on transactions
UPDATE wallets SET balance = 1200.00 WHERE user_id = '550e8400-e29b-41d4-a716-446655440006';
UPDATE wallets SET balance = 2800.00 WHERE user_id = '550e8400-e29b-41d4-a716-446655440007';
UPDATE wallets SET balance = 540.00 WHERE user_id = '550e8400-e29b-41d4-a716-446655440004'; 