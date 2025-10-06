# Influencer API Documentation

This comprehensive guide covers all available API endpoints for influencers using the Stoory Backend application.

## Table of Contents
1. [Quick Start - Influencer Setup](#quick-start---influencer-setup)
2. [Authentication & Authorization](#authentication--authorization)
3. [Profile Management](#profile-management)
4. [Social Platform Management](#social-platform-management)
5. [Campaign Discovery](#campaign-discovery)
6. [Bid Discovery](#bid-discovery)
7. [Request Management](#request-management)
8. [Work Submission](#work-submission)
9. [Payment & Wallet Management](#payment--wallet-management)
10. [Message & Conversation Management](#message--conversation-management)
11. [Subscription Management](#subscription-management)
12. [File & Attachment Management](#file--attachment-management)
13. [FCM & Notifications](#fcm--notifications)

---

## Quick Start - Influencer Setup

### 🚀 **Registration Process**

1. **Send OTP for Registration**
```bash
POST /api/auth/send-registration-otp
Content-Type: application/json

{
  "phone": "+919999999999"
}
```

2. **Verify OTP and Complete Registration**
```bash
POST /api/auth/verify-otp
Content-Type: application/json

{
  "phone": "+919999999999",
  "otp": "123456"
}
```

3. **Complete Profile Setup**
```bash
PUT /api/auth/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Your Name",
  "email": "your@email.com",
  "role": "influencer",
  "languages": ["English", "Hindi"],
  "categories": ["Fashion", "Lifestyle"],
  "min_range": 1000,
  "max_range": 5000
}
```

### 📊 **Influencer Capabilities**
As an influencer, you can:
- ✅ **Discover Campaigns**: Browse and search available campaigns
- ✅ **Discover Bids**: Browse and search available bids
- ✅ **Submit Requests**: Apply for campaigns and bids
- ✅ **Manage Work**: Submit work and track progress
- ✅ **Handle Payments**: Receive payments and manage wallet
- ✅ **Communicate**: Chat with brand owners
- ✅ **Manage Profile**: Update profile and social platforms
- ✅ **Track Analytics**: View performance metrics

---

## Authentication & Authorization

### Base URL: `/api/auth`

#### Public Endpoints (No Authentication Required)

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/send-otp` | Send OTP for login | `{ "phone": "string" }` | `{ "success": boolean, "message": string }` |
| POST | `/send-registration-otp` | Send OTP for registration | `{ "phone": "string" }` | `{ "success": boolean, "message": string }` |
| POST | `/verify-otp` | Verify OTP and get tokens | `{ "phone": "string", "otp": "string" }` | `{ "success": boolean, "tokens": object, "user": object }` |
| POST | `/refresh-token` | Refresh access token | `{ "refresh_token": "string" }` | `{ "success": boolean, "tokens": object }` |

#### Protected Endpoints (Authentication Required)

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/profile` | Get user profile | - | `{ "success": boolean, "user": object }` |
| PUT | `/profile` | Update user profile | `{ "name": "string", "email": "string", ... }` | `{ "success": boolean, "user": object }` |
| POST | `/profile/image` | Upload profile image | FormData with `image` file | `{ "success": boolean, "image_url": string }` |
| DELETE | `/profile/image` | Delete profile image | - | `{ "success": boolean }` |
| POST | `/profile/verification-document` | Upload verification document | FormData with `verification_document` file | `{ "success": boolean, "document_url": string }` |
| POST | `/logout` | Logout user | - | `{ "success": boolean }` |
| DELETE | `/account` | Delete user account | - | `{ "success": boolean }` |

---

## Profile Management

### Base URL: `/api/users`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/profile` | Get user profile | - | `{ "success": boolean, "user": object }` |
| GET | `/verification-status` | Get user verification status | - | `{ "success": boolean, "verification": object }` |
| PUT | `/verification-details` | Update verification details | `{ "verification_details": object }` | `{ "success": boolean, "verification": object }` |
| POST | `/verification-document` | Upload verification document | FormData with `verification_document` file | `{ "success": boolean, "document_url": string }` |

### Profile Data Structure
```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "phone": "string",
  "role": "influencer",
  "gender": "string",
  "languages": ["English", "Hindi"],
  "categories": ["Fashion", "Lifestyle"],
  "min_range": 1000,
  "max_range": 5000,
  "profile_image_url": "string",
  "bio": "string",
  "experience_years": 2,
  "specializations": ["Photography", "Video Creation"],
  "portfolio_links": ["https://instagram.com/username"],
  "verification_status": "pending",
  "is_verified": false,
  "created_at": "string",
  "social_platforms": [
    {
      "id": "string",
      "platform_name": "Instagram",
      "profile_link": "https://instagram.com/username",
      "followers_count": 10000,
      "engagement_rate": 5.5
    }
  ]
}
```

---

## Social Platform Management

### Base URL: `/api/auth/social-platforms`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/` | Get user's social platforms | - | `{ "success": boolean, "platforms": array }` |
| POST | `/` | Add social platform | `{ "platform": "string", "username": "string", "followers": number }` | `{ "success": boolean, "platform": object }` |
| PUT | `/:id` | Update social platform | `{ "platform": "string", "username": "string", "followers": number }` | `{ "success": boolean, "platform": object }` |
| DELETE | `/:id` | Delete social platform | - | `{ "success": boolean }` |
| GET | `/stats` | Get social platform statistics | - | `{ "success": boolean, "stats": object }` |

### Social Platform Data Structure
```json
{
  "id": "string",
  "platform_name": "Instagram",
  "profile_link": "https://instagram.com/username",
  "followers_count": 10000,
  "engagement_rate": 5.5,
  "platform_is_active": true,
  "created_at": "string"
}
```

---

## Campaign Discovery

### Base URL: `/api/campaigns`

| Method | Endpoint | Description | Query Parameters | Response |
|--------|----------|-------------|------------------|----------|
| GET | `/` | Get available campaigns | `page`, `limit`, `status`, `search`, `category`, `type` | `{ "success": boolean, "campaigns": array, "pagination": object }` |
| GET | `/stats` | Get campaign statistics | - | `{ "success": boolean, "stats": object }` |
| GET | `/:id` | Get specific campaign details | - | `{ "success": boolean, "campaign": object }` |

### Campaign Data Structure
```json
{
  "id": "string",
  "title": "Summer Fashion Campaign",
  "description": "Promote our new summer collection",
  "min_budget": 5000,
  "max_budget": 10000,
  "status": "open",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "requirements": "Fashion content creators with 10k+ followers",
  "deliverables": ["Instagram Post", "Story"],
  "campaign_type": "product",
  "image_url": "string",
  "language": "English",
  "platform": "Instagram",
  "content_type": "Fashion",
  "sending_package": true,
  "no_of_packages": 2,
  "created_by": "string",
  "created_at": "string"
}
```

### Campaign Status Filtering
- **open**: Available campaigns you can apply to
- **pending**: Campaigns you've applied to (waiting for response)
- **closed**: Completed or cancelled campaigns

---

## Bid Discovery

### Base URL: `/api/bids`

| Method | Endpoint | Description | Query Parameters | Response |
|--------|----------|-------------|------------------|----------|
| GET | `/` | Get available bids | `page`, `limit`, `status`, `search`, `category` | `{ "success": boolean, "bids": array, "pagination": object }` |
| GET | `/stats` | Get bid statistics | - | `{ "success": boolean, "stats": object }` |
| GET | `/:id` | Get specific bid details | - | `{ "success": boolean, "bid": object }` |

### Bid Data Structure
```json
{
  "id": "string",
  "title": "Tech Review Video",
  "description": "Create a review video for our new smartphone",
  "min_budget": 3000,
  "max_budget": 8000,
  "requirements": "Tech reviewers with 5k+ subscribers",
  "language": "English",
  "platform": "YouTube",
  "content_type": "Video",
  "category": "Technology",
  "expiry_date": "2024-01-15",
  "status": "open",
  "created_by": "string",
  "created_at": "string"
}
```

---

## Request Management

### Base URL: `/api/requests`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/` | Create new request | `{ "bid_id": "string", "proposed_amount": number, "message": "string" }` | `{ "success": boolean, "request": object }` |
| GET | `/` | Get your requests | Query: `page`, `limit`, `status` | `{ "success": boolean, "requests": array, "pagination": object }` |
| GET | `/:id` | Get specific request | - | `{ "success": boolean, "request": object }` |
| PUT | `/:id/agree` | Update agreed amount | `{ "agreed_amount": number }` | `{ "success": boolean, "request": object }` |
| DELETE | `/:id` | Withdraw request | - | `{ "success": boolean }` |

### Request Data Structure
```json
{
  "id": "string",
  "campaign_id": "string",
  "bid_id": "string",
  "influencer_id": "string",
  "status": "connected",
  "proposed_amount": 5000,
  "final_agreed_amount": 4500,
  "message": "I'm interested in this campaign",
  "created_at": "string",
  "updated_at": "string"
}
```

### Request Status Flow
1. **connected**: Request submitted, waiting for brand owner response
2. **negotiating**: Brand owner responded, negotiating terms
3. **paid**: Payment received, work can begin
4. **completed**: Work completed and approved
5. **cancelled**: Request cancelled by either party

---

## Work Submission

### Base URL: `/api/requests`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/:id/submit-work` | Submit work for review | `{ "work_submission_link": "string", "work_description": "string", "work_files": array }` | `{ "success": boolean, "submission": object }` |
| GET | `/:id/work-status` | Get work status | - | `{ "success": boolean, "work_status": object }` |

### Work Submission Data Structure
```json
{
  "work_submission_link": "https://instagram.com/p/abc123",
  "work_description": "Created 3 Instagram posts showcasing the product",
  "work_files": [
    {
      "file_url": "string",
      "file_type": "image",
      "file_name": "post1.jpg"
    }
  ],
  "submitted_at": "2024-01-15T10:30:00Z"
}
```

---

## Payment & Wallet Management

### Base URL: `/api/payments`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/transactions` | Get transaction history | Query: `page`, `limit`, `type` | `{ "success": boolean, "transactions": array, "pagination": object }` |
| GET | `/wallet/balance` | Get wallet balance | - | `{ "success": boolean, "balance": object }` |
| POST | `/wallet/withdraw` | Withdraw from wallet | `{ "amount": number }` | `{ "success": boolean, "withdrawal": object }` |

### Enhanced Wallet Management

### Base URL: `/api/enhanced-wallet`

| Method | Endpoint | Description | Query Parameters | Response |
|--------|----------|-------------|------------------|----------|
| GET | `/balance` | Get comprehensive wallet balance | - | `{ "success": boolean, "balance": object }` |
| POST | `/withdraw` | Process withdrawal | - | `{ "success": boolean, "withdrawal": object }` |
| GET | `/transactions` | Get comprehensive transaction history | `page`, `limit`, `type`, `direction`, `status` | `{ "success": boolean, "transactions": array, "pagination": object }` |
| GET | `/summary` | Get transaction summary | `days` (default: 30) | `{ "success": boolean, "summary": object }` |
| GET | `/escrow-holds` | Get escrow holds | - | `{ "success": boolean, "holds": array }` |
| GET | `/breakdown` | Get wallet breakdown | - | `{ "success": boolean, "breakdown": object }` |

### Transaction Data Structure
```json
{
  "id": "string",
  "user_id": "string",
  "amount_paise": 500000,
  "type": "credit",
  "direction": "incoming",
  "description": "Payment received for campaign collaboration",
  "status": "completed",
  "conversation_id": "string",
  "created_at": "string"
}
```

---

## Message & Conversation Management

### Base URL: `/api/messages`

| Method | Endpoint | Description | Query Parameters | Response |
|--------|----------|-------------|------------------|----------|
| GET | `/conversations` | Get your conversations | `page`, `limit`, `type` | `{ "success": boolean, "conversations": array }` |
| GET | `/conversations/direct` | Get direct conversations | `page`, `limit` | `{ "success": boolean, "conversations": array }` |
| GET | `/conversations/bids` | Get bid conversations | `page`, `limit` | `{ "success": boolean, "conversations": array }` |
| GET | `/conversations/campaigns` | Get campaign conversations | `page`, `limit` | `{ "success": boolean, "conversations": array }` |
| GET | `/conversations/:conversation_id/messages` | Get conversation messages | `page`, `limit` | `{ "success": boolean, "messages": array }` |
| GET | `/conversations/:conversation_id/context` | Get conversation context | - | `{ "success": boolean, "context": object }` |

#### Message Operations

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/conversations/:conversation_id/messages` | Send message | `{ "message": "string", "type": "string" }` | `{ "success": boolean, "message": object }` |
| PUT | `/conversations/:conversation_id/seen` | Mark messages as seen | - | `{ "success": boolean }` |
| DELETE | `/messages/:message_id` | Delete message | - | `{ "success": boolean }` |

#### Interactive Features

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/conversations/:conversation_id/button-click` | Handle button click | `{ "button_id": "string", "data": object }` | `{ "success": boolean, "response": object }` |
| POST | `/conversations/:conversation_id/text-input` | Handle text input | `{ "input": "string", "context": object }` | `{ "success": boolean, "response": object }` |

#### Direct Connect

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/direct-connect` | Initiate direct connection | `{ "target_user_id": "string" }` | `{ "success": boolean, "connection": object }` |
| GET | `/direct-connections` | Get direct connections | - | `{ "success": boolean, "connections": array }` |
| POST | `/direct-message` | Send direct message | `{ "target_user_id": "string", "message": "string" }` | `{ "success": boolean, "message": object }` |

#### Utility

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| GET | `/unread-count` | Get unread message count | `{ "success": boolean, "unread_count": number }` |

---

## Subscription Management

### Base URL: `/api/subscriptions`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/plans` | Get available subscription plans | - | `{ "success": boolean, "plans": array }` |
| GET | `/status` | Get subscription status | - | `{ "success": boolean, "subscription": object }` |
| POST | `/create-order` | Create subscription order | `{ "plan_id": "string" }` | `{ "success": boolean, "order": object }` |
| POST | `/process-payment` | Process subscription payment | `{ "order_id": "string", "payment_data": object }` | `{ "success": boolean, "payment": object }` |
| POST | `/create-free` | Create free subscription | `{ "plan_id": "string" }` | `{ "success": boolean, "subscription": object }` |
| GET | `/payment-status/:payment_id` | Get payment status | - | `{ "success": boolean, "status": object }` |
| POST | `/update-payment-status` | Update payment status | `{ "payment_id": "string", "status": "string" }` | `{ "success": boolean, "payment": object }` |
| POST | `/cancel` | Cancel subscription | - | `{ "success": boolean, "subscription": object }` |
| GET | `/history` | Get subscription history | - | `{ "success": boolean, "history": array }` |

---

## File & Attachment Management

### Base URL: `/api/attachments`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/conversations/:conversation_id/upload` | Upload attachment | FormData with file | `{ "success": boolean, "attachment": object }` |
| POST | `/conversations/:conversation_id/send-with-attachment` | Send message with attachment | FormData with file and message | `{ "success": boolean, "message": object }` |
| POST | `/conversations/:conversation_id/upload-formdata` | Upload with FormData | FormData with file | `{ "success": boolean, "attachment": object }` |
| DELETE | `/attachments/:attachment_id` | Delete attachment | - | `{ "success": boolean }` |
| GET | `/attachments/:attachment_id` | Get attachment info | - | `{ "success": boolean, "attachment": object }` |
| GET | `/supported-types` | Get supported file types | - | `{ "success": boolean, "fileTypes": array }` |

### Direct Storage Management

### Base URL: `/api/files`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/conversations/:conversation_id/upload` | Upload file and send message | FormData with file | `{ "success": boolean, "message": object }` |
| DELETE | `/files/:message_id` | Delete file | - | `{ "success": boolean }` |
| GET | `/files/:message_id` | Get file info | - | `{ "success": boolean, "file": object }` |
| GET | `/supported-types` | Get supported file types | - | `{ "success": boolean, "types": array }` |

---

## FCM & Notifications

### Base URL: `/api/fcm`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/register` | Register FCM token | `{ "token": "string", "device_type": "string" }` | `{ "success": boolean, "registered": boolean }` |
| POST | `/unregister` | Unregister FCM token | `{ "token": "string" }` | `{ "success": boolean, "unregistered": boolean }` |
| GET | `/tokens` | Get user's FCM tokens | - | `{ "success": boolean, "tokens": array }` |
| POST | `/test` | Send test notification | `{ "title": "string", "body": "string", "data": object }` | `{ "success": boolean, "sent": boolean }` |

---

## Authentication & Authorization

### Authentication Headers

All protected endpoints require the following header:
```
Authorization: Bearer <access_token>
```

### Token Management

- **Access Token**: Short-lived token for API requests (typically 15 minutes)
- **Refresh Token**: Long-lived token for obtaining new access tokens
- **Token Refresh**: Use `/api/auth/refresh-token` to get new access tokens

---

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Specific field error"
  }
}
```

### Common HTTP Status Codes

- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **422**: Validation Error
- **500**: Internal Server Error

---

## Rate Limiting

The application implements rate limiting for:
- OTP requests: 5 requests per minute per phone number
- API requests: 1000 requests per hour per user
- File uploads: 10 uploads per minute per user

---

## WebSocket Events

The application supports real-time communication via WebSocket:

### Connection Events
- `connection`: Client connects
- `disconnect`: Client disconnects

### Message Events
- `new_message`: New message received
- `message_sent`: Message sent confirmation
- `notification`: Push notification
- `conversation_list_updated`: Conversation list update
- `unread_count_updated`: Unread count update

### Flow Events
- `flow_state_changed`: Conversation flow state change
- `button_click`: Interactive button click
- `text_input`: Text input response

---

## Influencer Workflow

### 1. **Profile Setup**
1. Register with phone number
2. Complete profile with bio, categories, price range
3. Add social media platforms
4. Upload verification documents

### 2. **Discover Opportunities**
1. Browse available campaigns
2. Search bids by category, budget, platform
3. Filter by your preferences

### 3. **Apply for Opportunities**
1. Submit request with proposed amount
2. Wait for brand owner response
3. Negotiate terms if needed

### 4. **Complete Work**
1. Receive payment confirmation
2. Submit work deliverables
3. Wait for approval
4. Receive final payment

### 5. **Manage Finances**
1. Track wallet balance
2. View transaction history
3. Withdraw earnings

---

## Best Practices

1. **Profile Optimization**: Keep profile updated with latest work and social media stats
2. **Quick Response**: Respond to messages and requests promptly
3. **Quality Work**: Submit high-quality deliverables on time
4. **Professional Communication**: Maintain professional tone in conversations
5. **Regular Updates**: Keep social media platforms updated with current follower counts
6. **Verification**: Complete verification process for better opportunities
7. **Pricing Strategy**: Set competitive but fair pricing based on your reach and engagement

---

## Support

For technical support or questions about API integration, please refer to the individual controller files in the `controllers/` directory or contact the development team.

