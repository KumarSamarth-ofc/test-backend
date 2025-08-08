# Authentication Migration Summary

## Overview

The Stoory backend has been successfully migrated from Supabase's built-in OTP authentication to a custom WhatsApp OTP authentication system. This provides better control, improved user experience, and more flexibility.

## Key Changes Made

### 1. Database Schema Updates

**New Table Added:**
```sql
CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes Added:**
- `idx_otp_codes_phone` - For fast phone number lookups
- `idx_otp_codes_expires` - For efficient expiry checks

**RLS Policies:**
- Admin-only access to OTP codes table for security

### 2. Authentication Service (`utils/auth.js`)

**Removed:**
- Supabase OTP integration
- Supabase session management
- Supabase token verification

**Added:**
- Custom OTP generation (6-digit codes)
- OTP storage in database with 10-minute expiry
- Custom JWT token generation and verification
- WhatsApp service integration
- Welcome message sending for new users

**Key Methods:**
- `generateOTP()` - Creates 6-digit OTP
- `storeOTP(phone, otp)` - Stores OTP in database
- `verifyStoredOTP(phone, otp)` - Verifies OTP from database
- `sendWhatsAppOTP(phone, otp)` - Sends OTP via WhatsApp
- `verifyToken(token)` - Verifies custom JWT tokens
- `generateToken(user)` - Creates new JWT tokens

### 3. WhatsApp Service (`utils/whatsapp.js`)

**New Service Created:**
- Supports multiple WhatsApp providers (Twilio, MessageBird, Console)
- Configurable via environment variables
- Includes methods for OTP, welcome, and notification messages

**Supported Services:**
- **Twilio WhatsApp** (recommended)
- **MessageBird WhatsApp**
- **Console Mode** (for development/testing)

### 4. Auth Controller Updates (`controllers/authController.js`)

**Changes:**
- Removed Supabase session handling
- Updated to use custom JWT tokens
- Simplified user creation flow
- Added user profile updates during verification
- Removed Supabase logout (now client-side only)

**API Response Changes:**
```json
// Before (Supabase)
{
  "success": true,
  "user": {...},
  "session": {...}
}

// After (Custom JWT)
{
  "success": true,
  "user": {...},
  "token": "jwt_token_here"
}
```

### 5. Environment Variables

**Added:**
```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# WhatsApp Service Configuration
WHATSAPP_SERVICE=twilio  # or 'messagebird' or 'console'

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=+14155238886

# MessageBird Configuration
MESSAGEBIRD_API_KEY=your_messagebird_api_key
MESSAGEBIRD_WHATSAPP_CHANNEL_ID=your_channel_id
```

### 6. Dependencies

**Added:**
- `jsonwebtoken` - For custom JWT handling

**Optional (for WhatsApp services):**
- `twilio` - For Twilio WhatsApp integration
- `messagebird` - For MessageBird WhatsApp integration

## Authentication Flow

### 1. Send OTP
```http
POST /api/auth/send-otp
{
  "phone": "+1234567890"
}
```

**What happens:**
1. Generates 6-digit OTP
2. Stores OTP in database with 10-minute expiry
3. Sends OTP via WhatsApp
4. Returns success response

### 2. Verify OTP
```http
POST /api/auth/verify-otp
{
  "phone": "+1234567890",
  "token": "123456",
  "userData": {
    "email": "user@example.com",
    "role": "influencer"
  }
}
```

**What happens:**
1. Verifies OTP from database
2. Deletes used OTP
3. Creates/updates user profile
4. Generates custom JWT token
5. Sends welcome message (for new users)
6. Returns user data and JWT token

### 3. Use Token
```http
GET /api/campaigns
Authorization: Bearer jwt_token_here
```

## Benefits of New System

### 1. Better User Experience
- WhatsApp messages are more reliable than SMS
- Users prefer WhatsApp for OTP
- Better delivery rates

### 2. More Control
- Custom OTP generation and storage
- Flexible expiry times
- Custom JWT token management
- Better error handling

### 3. Cost Effective
- WhatsApp messages are often cheaper than SMS
- Multiple provider options
- Better pricing control

### 4. Enhanced Features
- Welcome messages for new users
- Campaign notifications
- Payment confirmations
- Custom message templates

## Migration Steps

### 1. Database Setup
Run the updated schema in Supabase SQL editor to add the `otp_codes` table.

### 2. Environment Configuration
Update your `.env` file with the new variables.

### 3. Install Dependencies
```bash
npm install jsonwebtoken
# Optional: npm install twilio (for Twilio)
# Optional: npm install messagebird (for MessageBird)
```

### 4. Choose WhatsApp Service
- **Development:** Use `WHATSAPP_SERVICE=console`
- **Production:** Set up Twilio or MessageBird

### 5. Test Authentication
Use the provided test script:
```bash
node test_whatsapp_auth.js
```

## Security Considerations

### 1. JWT Security
- Use a strong JWT_SECRET
- Tokens expire after 7 days
- Store secrets securely

### 2. OTP Security
- OTPs expire after 10 minutes
- Used OTPs are deleted immediately
- Rate limiting on OTP requests

### 3. Database Security
- RLS policies protect OTP codes
- Admin-only access to OTP table
- Proper indexing for performance

## Testing

### Console Mode Testing
1. Set `WHATSAPP_SERVICE=console`
2. Start server: `npm start`
3. Run test script: `node test_whatsapp_auth.js`
4. Check console logs for OTP codes

### Real WhatsApp Testing
1. Set up Twilio/MessageBird account
2. Configure environment variables
3. Test with real phone numbers
4. Verify WhatsApp message delivery

## Troubleshooting

### Common Issues

1. **OTP not received:**
   - Check WhatsApp service configuration
   - Verify phone number format
   - Check service provider status

2. **JWT errors:**
   - Verify JWT_SECRET is set
   - Check token expiration
   - Ensure proper token format

3. **Database errors:**
   - Ensure `otp_codes` table exists
   - Check RLS policies
   - Verify Supabase connection

### Debug Mode
Enable debug logging in `utils/auth.js`:
```javascript
console.log('OTP generated:', otp);
console.log('WhatsApp result:', result);
```

## Next Steps

1. **Choose WhatsApp Service:**
   - For development: Use console mode
   - For production: Set up Twilio or MessageBird

2. **Update Frontend:**
   - Modify authentication flow
   - Handle new JWT tokens
   - Update API calls

3. **Test Thoroughly:**
   - Test OTP sending and verification
   - Test authenticated endpoints
   - Test error scenarios

4. **Monitor:**
   - OTP delivery rates
   - Authentication success rates
   - Error rates

## Support

- **WhatsApp Setup:** See `WHATSAPP_SETUP_GUIDE.md`
- **API Testing:** See `test_whatsapp_auth.js`
- **Database Schema:** See `database/schema.sql`
- **Environment Variables:** See `env.example`

The migration is complete and ready for testing! 🎉 