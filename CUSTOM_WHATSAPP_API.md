# Facebook Graph API WhatsApp Integration

This guide explains how to integrate Facebook Graph API for WhatsApp Business with the Stoory backend for OTP functionality.

## 🚀 Quick Setup

### 1. Configure Facebook Graph API

Run the setup script:
```bash
npm run setup:whatsapp
```

Choose option 1 (Custom WhatsApp API) and provide:
- Your Facebook Graph API endpoint URL
- Your Facebook Access Token (without "Bearer")

### 2. Environment Configuration

Add to your `.env` file:
```env
WHATSAPP_SERVICE=custom
WHATSAPP_API_ENDPOINT=https://graph.facebook.com/v22.0/YOUR_PHONE_NUMBER_ID/messages
WHATSAPP_API_KEY=your_facebook_access_token_here
```

## 📡 Facebook Graph API Requirements

Your WhatsApp Business API should:

### Accept POST Requests
```http
POST https://graph.facebook.com/v22.0/YOUR_PHONE_NUMBER_ID/messages
Content-Type: application/json
Authorization: Bearer your_facebook_access_token

{
  "messaging_product": "whatsapp",
  "to": "1234567890",
  "type": "text",
  "text": {
    "body": "🔐 Your Stoory verification code is: *123456*..."
  }
}
```

### Return JSON Response
```json
{
  "messaging_product": "whatsapp",
  "contacts": [
    {
      "input": "1234567890",
      "wa_id": "1234567890"
    }
  ],
  "messages": [
    {
      "id": "wamid.HBgNMTIzNDU2Nzg5MBIVAgEa"
    }
  ]
}
```

### Error Response
```json
{
  "error": {
    "message": "Invalid phone number",
    "type": "OAuthException",
    "code": 100
  }
}
```

## 🔄 OTP Flow

### 1. User Requests OTP
```http
POST /api/auth/send-otp
{
  "phone": "+1234567890"
}
```

### 2. Backend Process
1. Generates 6-digit OTP
2. Stores OTP in database (10-minute expiry)
3. Formats WhatsApp message
4. Sends to Facebook Graph API

### 3. Facebook Graph API Sends WhatsApp Message
- Receives formatted message
- Sends actual WhatsApp message
- Returns success/error response

### 4. User Verifies OTP
```http
POST /api/auth/verify-otp
{
  "phone": "+1234567890",
  "token": "123456"
}
```

## 📝 Message Format

The backend will send formatted messages to Facebook Graph API:

### OTP Message
```
🔐 Your Stoory verification code is: *123456*

⏰ This code expires in 10 minutes.

🔒 For security, never share this code with anyone.

📱 If you didn't request this code, please ignore this message.
```

### Welcome Message
```
🎉 Welcome to Stoory, User!

✅ Your account has been successfully created.

🚀 You can now:
• Browse campaigns and bids
• Connect with brand owners
• Start earning through influencer marketing

📱 Stay tuned for exciting opportunities!

Best regards,
The Stoory Team
```

## 🧪 Testing

### Console Mode Testing
```bash
# Set to console mode for development
WHATSAPP_SERVICE=console

# Start server
npm start

# Test OTP flow
npm run test:whatsapp
```

### Facebook Graph API Testing
```bash
# Set to custom mode
WHATSAPP_SERVICE=custom
WHATSAPP_API_ENDPOINT=https://graph.facebook.com/v22.0/YOUR_PHONE_NUMBER_ID/messages
WHATSAPP_API_KEY=your_facebook_access_token

# Start server
npm start

# Test with real phone number
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}'
```

## 🔧 Implementation Details

### WhatsApp Service (`utils/whatsapp.js`)
- **Facebook Graph API integration**: Sends POST requests to Graph API
- **Phone number formatting**: Automatically formats for WhatsApp
- **Error handling**: Comprehensive error management
- **Message formatting**: Professional WhatsApp messages
- **Authentication**: Bearer token support

### Auth Service (`utils/auth.js`)
- **OTP generation**: 6-digit random codes
- **Database storage**: Secure with expiry
- **WhatsApp integration**: Seamless delivery
- **JWT authentication**: Custom token generation

### API Endpoints
- `POST /api/auth/send-otp` - Send OTP via Facebook Graph API
- `POST /api/auth/verify-otp` - Verify OTP and authenticate
- `GET /api/auth/whatsapp-status` - Check service status

## 🔒 Security Features

### OTP Security
- ✅ 6-digit random OTP
- ✅ 10-minute expiry
- ✅ Single-use (deleted after verification)
- ✅ Rate limiting on send requests

### API Security
- ✅ Bearer token authentication
- ✅ Phone number validation
- ✅ Error handling and logging
- ✅ Secure database storage

## 🚨 Error Handling

### Common Errors
- **Invalid phone number**: Phone format validation
- **API endpoint unreachable**: Network connectivity
- **API authentication failed**: Invalid access token
- **Message delivery failed**: Facebook Graph API error

### Error Responses
```json
{
  "success": false,
  "message": "Failed to send WhatsApp OTP",
  "error": "Invalid access token"
}
```

## 📊 Monitoring

### Logs to Watch
- OTP generation and sending
- Facebook Graph API request/response logs
- Authentication attempts
- Error messages

### Metrics to Track
- API response times
- Message delivery success rate
- Authentication success rate
- Error frequency by type

## 🔧 Troubleshooting

### API Not Responding
1. Check your Facebook Graph API endpoint URL
2. Verify your Facebook Access Token is valid
3. Test with Facebook Graph API Explorer
4. Check network connectivity

### Authentication Fails
1. Verify Facebook Access Token is correct
2. Check token permissions (WhatsApp Business API)
3. Ensure token hasn't expired
4. Review Facebook App settings

### Message Not Delivered
1. Check phone number format (should be without +)
2. Verify WhatsApp Business API is active
3. Test with Facebook Graph API Explorer
4. Review error logs

## 🚀 Production Deployment

### Environment Setup
1. Use HTTPS for all communications
2. Set strong Facebook Access Token
3. Enable proper CORS
4. Configure monitoring

### API Requirements
1. High availability (99.9%+ uptime)
2. Fast response times (<2 seconds)
3. Proper error handling
4. Rate limiting if needed

### Security
1. Use HTTPS for all communications
2. Implement token rotation
3. Monitor for abuse
4. Regular security audits

## 📚 Facebook Graph API Setup

### 1. Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add WhatsApp Business API product

### 2. Get Access Token
1. Go to your app dashboard
2. Navigate to WhatsApp > Getting Started
3. Copy your Access Token

### 3. Get Phone Number ID
1. In WhatsApp > Getting Started
2. Note your Phone Number ID
3. Use it in the endpoint URL

### 4. Test with Graph API Explorer
1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app
3. Test the messages endpoint

## 🤝 Support

For issues with:
- **Integration**: Check this guide and API logs
- **Facebook Graph API**: Use Facebook Graph API Explorer
- **WhatsApp Business**: Check Facebook Business documentation
- **Backend**: Review server logs and database queries 