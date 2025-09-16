-- Update message_type constraint to allow 'system'
ALTER TABLE messages DROP CONSTRAINT IF EXISTS check_message_type;

ALTER TABLE messages 
ADD CONSTRAINT check_message_type 
CHECK (message_type IN (
  'user_input', 
  'system',
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
