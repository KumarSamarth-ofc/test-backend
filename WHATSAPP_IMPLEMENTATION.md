# WhatsApp OTP Implementation Guide

This guide provides a complete implementation of WhatsApp OTP authentication for the Stoory backend.

## 🚀 Quick Start

### 1. Setup WhatsApp Service

Run the interactive setup script:
```bash
node setup_whatsapp.js
```

This will guide you through:
- Choosing a WhatsApp service provider
- Configuring credentials
- Installing dependencies
- Testing the setup

### 2. Test the Implementation

```bash
# Start the server
npm start

# In another terminal, test the OTP flow
node test_whatsapp_auth.js
```

## 📱 Available WhatsApp Services

### 1. Console Mode (Development)
- **Best for**: Development and testing
- **Setup**: No credentials required
- **Messages**: Logged to console
- **Cost**: Free

### 2. Twilio WhatsApp
- **Best for**: Production and reliable delivery
- **Setup**: Requires Twilio account
- **Messages**: Real WhatsApp messages
- **Cost**: Pay per message

### 3. MessageBird WhatsApp
- **Best for**: European markets
- **Setup**: Requires MessageBird account
- **Messages**: Real WhatsApp messages
- **Cost**: Pay per message

## 🔧 Configuration

### Environment Variables

Add to your `.env` file:

```env
# Choose your WhatsApp service
WHATSAPP_SERVICE=console  # or 'twilio' or 'messagebird'

# For Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=+14155238886

# For MessageBird
MESSAGEBIRD_API_KEY=your_api_key
MESSAGEBIRD_WHATSAPP_CHANNEL_ID=your_channel_id
```

### Dependencies

Install required packages based on your service:

```bash
# For Twilio
npm install twilio

# For MessageBird
npm install messagebird

# For Console mode (no additional dependencies)
```

## 📡 API Endpoints

### Send OTP
```http
POST /api/auth/send-otp
Content-Type: application/json

{
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully via WhatsApp"
}
```

### Verify OTP
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

**Response:**
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

### Check WhatsApp Status
```http
GET /api/auth/whatsapp-status
```

**Response:**
```json
{
  "success": true,
  "whatsapp": {
    "service": "console",
    "configured": true,
    "provider": "console"
  }
}
```

## 🔄 OTP Flow

### 1. User Requests OTP
- Frontend calls `/api/auth/send-otp`
- Backend generates 6-digit OTP
- OTP is stored in database with 10-minute expiry
- WhatsApp message is sent to user

### 2. User Verifies OTP
- Frontend calls `/api/auth/verify-otp`
- Backend validates OTP from database
- If valid, creates/updates user account
- Returns JWT token for authentication

### 3. User Authentication
- Frontend stores JWT token
- Token is included in subsequent API calls
- Backend validates token for protected routes

## 🛠️ Implementation Details

### OTP Generation
```javascript
generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
```

### OTP Storage
```sql
CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### WhatsApp Message Format
```
🔐 Your Stoory verification code is: *123456*

⏰ This code expires in 10 minutes.

🔒 For security, never share this code with anyone.

📱 If you didn't request this code, please ignore this message.
```

## 🧪 Testing

### Console Mode Testing
1. Set `WHATSAPP_SERVICE=console` in `.env`
2. Start server: `npm start`
3. Send OTP request
4. Check console logs for the message
5. Use the OTP from logs to verify

### Real WhatsApp Testing
1. Configure Twilio or MessageBird
2. Use real phone number
3. Check WhatsApp for actual message
4. Verify with received OTP

### Automated Testing
```bash
# Run comprehensive tests
node test_whatsapp_auth.js
```

## 🔒 Security Features

### OTP Security
- 6-digit random OTP
- 10-minute expiry
- Single-use (deleted after verification)
- Rate limiting on send requests

### JWT Security
- Custom JWT implementation
- 7-day token expiry
- Role-based access control
- Secure token validation

### Database Security
- Row Level Security (RLS) enabled
- Admin-only access to OTP table
- Automatic cleanup of expired OTPs

## 🚨 Error Handling

### Common Errors
- **Invalid phone number**: Phone format validation
- **OTP expired**: 10-minute time limit
- **Invalid OTP**: Wrong or already used OTP
- **Service unavailable**: WhatsApp service down

### Error Responses
```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

## 📊 Monitoring

### Logs to Watch
- OTP generation and sending
- WhatsApp service responses
- Authentication attempts
- Error messages

### Metrics to Track
- OTP delivery success rate
- Authentication success rate
- Service response times
- Error frequency by type

## 🔧 Troubleshooting

### OTP Not Received
1. Check WhatsApp service configuration
2. Verify phone number format (+1234567890)
3. Check service provider status
4. Review console logs for errors

### Authentication Fails
1. Verify OTP from logs/messages
2. Check OTP expiry (10 minutes)
3. Ensure correct phone number
4. Review database connection

### Service Errors
1. Check environment variables
2. Verify API credentials
3. Test service connectivity
4. Review error logs

## 🚀 Production Deployment

### Environment Setup
1. Use production WhatsApp service
2. Set strong JWT_SECRET
3. Enable HTTPS
4. Configure proper CORS

### Monitoring
1. Set up error tracking
2. Monitor OTP delivery rates
3. Track authentication metrics
4. Set up alerts for failures

### Security
1. Rate limit OTP requests
2. Monitor for abuse
3. Implement IP blocking if needed
4. Regular security audits

## 📚 Additional Resources

- [Twilio WhatsApp Documentation](https://www.twilio.com/docs/whatsapp)
- [MessageBird WhatsApp Documentation](https://developers.messagebird.com/docs/whatsapp)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)

## 🤝 Support

For issues with:
- **Implementation**: Check this guide and code comments
- **Twilio**: Contact Twilio support
- **MessageBird**: Contact MessageBird support
- **Backend**: Review server logs and database queries 