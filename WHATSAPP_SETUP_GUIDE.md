# WhatsApp Integration Setup Guide

This guide will help you set up WhatsApp integration for OTP authentication in the Stoory backend.

## Overview

The backend now uses custom WhatsApp OTP authentication instead of Supabase's built-in OTP. This provides more control and better user experience.

## Available WhatsApp Services

### 1. Twilio WhatsApp (Recommended)

**Pros:**
- Reliable and widely used
- Good documentation
- Reasonable pricing
- Easy setup

**Setup Steps:**

1. **Create Twilio Account:**
   - Go to [Twilio Console](https://console.twilio.com/)
   - Sign up for a free account
   - Get your Account SID and Auth Token

2. **Enable WhatsApp Sandbox:**
   - In Twilio Console, go to Messaging → Try it out → Send a WhatsApp message
   - Follow the instructions to join your WhatsApp sandbox
   - Note your WhatsApp number (usually +14155238886)

3. **Install Twilio SDK:**
   ```bash
   npm install twilio
   ```

4. **Configure Environment Variables:**
   ```env
   WHATSAPP_SERVICE=twilio
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_WHATSAPP_NUMBER=+14155238886
   ```

### 2. MessageBird WhatsApp

**Pros:**
- Good for European markets
- Competitive pricing
- Direct WhatsApp Business API access

**Setup Steps:**

1. **Create MessageBird Account:**
   - Go to [MessageBird](https://messagebird.com/)
   - Sign up and verify your account
   - Get your API key

2. **Set up WhatsApp Channel:**
   - Contact MessageBird support to enable WhatsApp
   - Get your WhatsApp channel ID

3. **Install MessageBird SDK:**
   ```bash
   npm install messagebird
   ```

4. **Configure Environment Variables:**
   ```env
   WHATSAPP_SERVICE=messagebird
   MESSAGEBIRD_API_KEY=your_api_key
   MESSAGEBIRD_WHATSAPP_CHANNEL_ID=your_channel_id
   ```

### 3. Console Mode (Development)

**Use for:**
- Development and testing
- When you don't have WhatsApp service credentials

**Setup:**
```env
WHATSAPP_SERVICE=console
```

This will log messages to the console instead of sending actual WhatsApp messages.

## Database Setup

Run the updated schema in your Supabase SQL editor:

```sql
-- Add OTP codes table
CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_otp_codes_phone ON otp_codes(phone);
CREATE INDEX idx_otp_codes_expires ON otp_codes(expires_at);

-- Enable RLS
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policy (admin only)
CREATE POLICY "Admin can manage OTP codes" ON otp_codes
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
```

## Environment Variables

Update your `.env` file:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# WhatsApp Service (choose one)
WHATSAPP_SERVICE=twilio  # or 'messagebird' or 'console'

# For Twilio:
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=+14155238886

# For MessageBird:
MESSAGEBIRD_API_KEY=your_messagebird_api_key
MESSAGEBIRD_WHATSAPP_CHANNEL_ID=your_channel_id
```

## API Changes

### Authentication Flow

1. **Send OTP:**
   ```http
   POST /api/auth/send-otp
   Content-Type: application/json
   
   {
     "phone": "+1234567890"
   }
   ```

2. **Verify OTP:**
   ```http
   POST /api/auth/verify-otp
   Content-Type: application/json
   
   {
     "phone": "+1234567890",
     "token": "123456",
     "userData": {
       "email": "user@example.com",
       "role": "influencer"
     }
   }
   ```

3. **Response:**
   ```json
   {
     "success": true,
     "user": {
       "id": "uuid",
       "phone": "+1234567890",
       "role": "influencer"
     },
     "token": "jwt_token_here",
     "message": "Authentication successful"
   }
   ```

### Using the Token

Include the JWT token in subsequent requests:

```http
GET /api/campaigns
Authorization: Bearer jwt_token_here
```

## Testing

### 1. Console Mode Testing

1. Set `WHATSAPP_SERVICE=console` in your `.env`
2. Start the server: `npm start`
3. Send OTP request:
   ```bash
   curl -X POST http://localhost:3000/api/auth/send-otp \
     -H "Content-Type: application/json" \
     -d '{"phone": "+1234567890"}'
   ```
4. Check console logs for the OTP
5. Verify OTP:
   ```bash
   curl -X POST http://localhost:3000/api/auth/verify-otp \
     -H "Content-Type: application/json" \
     -d '{"phone": "+1234567890", "token": "123456"}'
   ```

### 2. Twilio Testing

1. Set up Twilio credentials
2. Join the WhatsApp sandbox
3. Test with real phone number
4. Check WhatsApp for OTP message

## Production Considerations

### 1. Security
- Use a strong JWT_SECRET
- Store secrets securely
- Enable HTTPS in production
- Implement rate limiting for OTP requests

### 2. WhatsApp Business API
For production, consider upgrading to:
- **Twilio WhatsApp Business API** (requires approval)
- **MessageBird WhatsApp Business API** (requires approval)
- **Meta WhatsApp Business API** (direct integration)

### 3. Monitoring
- Monitor OTP delivery rates
- Track authentication success rates
- Set up alerts for failures

### 4. Backup Plan
- Implement SMS fallback
- Add email OTP option
- Consider alternative authentication methods

## Troubleshooting

### Common Issues

1. **OTP not received:**
   - Check WhatsApp service configuration
   - Verify phone number format
   - Check service provider status

2. **Database errors:**
   - Ensure `otp_codes` table exists
   - Check RLS policies
   - Verify Supabase connection

3. **JWT errors:**
   - Verify JWT_SECRET is set
   - Check token expiration
   - Ensure proper token format

### Debug Mode

Enable debug logging:

```javascript
// In utils/auth.js
console.log('OTP generated:', otp);
console.log('WhatsApp result:', result);
```

## Migration from Supabase Auth

If you're migrating from Supabase authentication:

1. **Export existing users** (if needed)
2. **Update frontend** to use new auth endpoints
3. **Test thoroughly** with new authentication flow
4. **Monitor** for any issues during transition

## Support

For issues with:
- **Twilio:** Check [Twilio WhatsApp Documentation](https://www.twilio.com/docs/whatsapp)
- **MessageBird:** Check [MessageBird WhatsApp Documentation](https://developers.messagebird.com/docs/whatsapp)
- **Backend:** Check server logs and database queries 