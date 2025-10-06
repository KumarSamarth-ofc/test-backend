# Brand Owner API Documentation

This comprehensive guide covers all available API endpoints for brand owners using the Stoory Backend application.

## Table of Contents
1. [Quick Start - Brand Owner Setup](#quick-start---brand-owner-setup)
2. [Authentication & Authorization](#authentication--authorization)
3. [Profile Management](#profile-management)
4. [Campaign Management](#campaign-management)
5. [Bid Management](#bid-management)
6. [Influencer Discovery](#influencer-discovery)
7. [Request Management](#request-management)
8. [Work Review](#work-review)
9. [Payment Management](#payment-management)
10. [Message & Conversation Management](#message--conversation-management)
11. [Subscription Management](#subscription-management)
12. [File & Attachment Management](#file--attachment-management)
13. [FCM & Notifications](#fcm--notifications)

---

## Quick Start - Brand Owner Setup

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
  "name": "Your Brand Name",
  "email": "brand@company.com",
  "role": "brand_owner",
  "business_name": "Your Company",
  "business_type": "Fashion",
  "gst_number": "29ABCDE1234F1Z5"
}
```

### 📊 **Brand Owner Capabilities**
As a brand owner, you can:
- ✅ **Create Campaigns**: Launch marketing campaigns
- ✅ **Create Bids**: Post project requirements
- ✅ **Discover Influencers**: Find and connect with influencers
- ✅ **Manage Requests**: Review and approve influencer applications
- ✅ **Review Work**: Approve or request revisions
- ✅ **Process Payments**: Handle payments and escrow
- ✅ **Communicate**: Chat with influencers
- ✅ **Manage Subscriptions**: Upgrade to premium features
- ✅ **Track Analytics**: View campaign performance

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

### Brand Owner Profile Data Structure
```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "phone": "string",
  "role": "brand_owner",
  "business_name": "Your Company",
  "business_type": "Fashion",
  "gst_number": "29ABCDE1234F1Z5",
  "profile_image_url": "string",
  "verification_status": "pending",
  "is_verified": false,
  "created_at": "string",
  "verification": {
    "verification_completeness": 75,
    "missing_fields": ["business_documents", "address_proof"]
  }
}
```

---

## Campaign Management

### Base URL: `/api/campaigns`

| Method | Endpoint | Description | Required Role | Request Body | Response |
|--------|----------|-------------|---------------|--------------|----------|
| POST | `/` | Create new campaign | `brand_owner`, `admin` | `{ "title": "string", "description": "string", "budget": number, "image": file }` | `{ "success": boolean, "campaign": object }` |
| GET | `/` | Get your campaigns | `brand_owner` | Query: `page`, `limit`, `status`, `search` | `{ "success": boolean, "campaigns": array, "pagination": object }` |
| GET | `/stats` | Get campaign statistics | `brand_owner` | - | `{ "success": boolean, "stats": object }` |
| GET | `/:id` | Get specific campaign | `brand_owner` | - | `{ "success": boolean, "campaign": object }` |
| PUT | `/:id` | Update campaign | `brand_owner`, `admin` | `{ "title": "string", "description": "string", "budget": number, "image": file }` | `{ "success": boolean, "campaign": object }` |
| DELETE | `/:id` | Delete campaign | `brand_owner`, `admin` | - | `{ "success": boolean }` |

### Campaign Creation Data Structure
```json
{
  "title": "Summer Fashion Campaign",
  "description": "Promote our new summer collection with lifestyle content",
  "min_budget": 5000,
  "max_budget": 10000,
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "requirements": "Fashion content creators with 10k+ followers",
  "deliverables": ["Instagram Post", "Story", "Reel"],
  "campaign_type": "product",
  "image_url": "string",
  "language": "English",
  "platform": "Instagram",
  "content_type": "Fashion",
  "sending_package": true,
  "no_of_packages": 2
}
```

### Campaign Status Management
- **open**: Campaign is live and accepting applications
- **pending**: Campaign is under review
- **closed**: Campaign is completed or cancelled

---

## Bid Management

### Base URL: `/api/bids`

| Method | Endpoint | Description | Required Role | Request Body | Response |
|--------|----------|-------------|---------------|--------------|----------|
| POST | `/` | Create new bid | `brand_owner`, `admin` | `{ "title": "string", "description": "string", "budget": number, "image": file }` | `{ "success": boolean, "bid": object }` |
| GET | `/` | Get your bids | `brand_owner` | Query: `page`, `limit`, `status`, `search` | `{ "success": boolean, "bids": array, "pagination": object }` |
| GET | `/stats` | Get bid statistics | `brand_owner` | - | `{ "success": boolean, "stats": object }` |
| GET | `/:id` | Get specific bid | `brand_owner` | - | `{ "success": boolean, "bid": object }` |
| PUT | `/:id` | Update bid | `brand_owner`, `admin` | `{ "title": "string", "description": "string", "budget": number, "image": file }` | `{ "success": boolean, "bid": object }` |
| DELETE | `/:id` | Delete bid | `brand_owner`, `admin` | - | `{ "success": boolean }` |

### Bid Creation Data Structure
```json
{
  "title": "Tech Review Video",
  "description": "Create a review video for our new smartphone",
  "min_budget": 3000,
  "max_budget": 8000,
  "requirements": "Tech reviewers with 5k+ subscribers",
  "language": "English",
  "platform": "YouTube",
  "content_type": "Video",
  "category": "Technology",
  "expiry_date": "2024-01-15"
}
```

---

## Influencer Discovery

### Base URL: `/api/users`

| Method | Endpoint | Description | Query Parameters | Response |
|--------|----------|-------------|------------------|----------|
| GET | `/influencers` | List influencers | `page`, `limit`, `search`, `languages`, `categories`, `min_range`, `max_range`, `sort_by`, `sort_order` | `{ "success": boolean, "influencers": array, "pagination": object }` |

### Influencer Search Parameters
- **search**: Search by influencer name (premium feature)
- **languages**: Filter by languages (comma-separated)
- **categories**: Filter by categories (comma-separated)
- **min_range**: Minimum follower range
- **max_range**: Maximum follower range
- **sort_by**: Sort by `created_at`, `min_range`, `max_range`
- **sort_order**: `asc` or `desc`

### Influencer Data Structure
```json
{
  "id": "string",
  "name": "string",
  "role": "influencer",
  "languages": ["English", "Hindi"],
  "categories": ["Fashion", "Lifestyle"],
  "min_range": 1000,
  "max_range": 5000,
  "profile_image_url": "string",
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

### Premium Access
- **Free Tier**: Limited influencer data (no names, basic info only)
- **Premium Tier**: Full influencer profiles with names and contact details
- **Upgrade**: Use subscription management endpoints to upgrade

---

## Request Management

### Base URL: `/api/requests`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/` | Get requests for your campaigns/bids | Query: `page`, `limit`, `status`, `campaign_id`, `bid_id` | `{ "success": boolean, "requests": array, "pagination": object }` |
| GET | `/:id` | Get specific request | - | `{ "success": boolean, "request": object }` |
| PUT | `/:id/status` | Update request status | `{ "status": "string" }` | `{ "success": boolean, "request": object }` |

#### Payment Operations

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/approval-payment` | Process approval payment | `{ "request_id": "string", "amount": number }` | `{ "success": boolean, "payment": object }` |
| POST | `/completion-payment` | Process completion payment | `{ "request_id": "string", "amount": number }` | `{ "success": boolean, "payment": object }` |

#### Influencer Management

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/bid/:bid_id/influencers` | Get bid influencers | - | `{ "success": boolean, "influencers": array }` |
| GET | `/campaign/:campaign_id/influencers` | Get campaign influencers | - | `{ "success": boolean, "influencers": array }` |
| GET | `/bid/:bid_id/influencer-count` | Get bid influencer count | - | `{ "success": boolean, "count": number }` |
| GET | `/campaign/:campaign_id/influencer-count` | Get campaign influencer count | - | `{ "success": boolean, "count": number }` |

### Request Status Management
- **connected**: Request received, awaiting your response
- **negotiating**: Terms being negotiated
- **paid**: Payment processed, work in progress
- **completed**: Work completed and approved
- **cancelled**: Request cancelled

---

## Work Review

### Base URL: `/api/requests`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/:id/approve-work` | Approve submitted work | - | `{ "success": boolean, "approval": object }` |
| POST | `/:id/request-revision` | Request work revision | `{ "revision_reason": "string" }` | `{ "success": boolean, "revision": object }` |
| GET | `/:id/work-status` | Get work status | - | `{ "success": boolean, "work_status": object }` |

### Work Review Data Structure
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
  "submitted_at": "2024-01-15T10:30:00Z",
  "status": "submitted",
  "revision_reason": "string"
}
```

---

## Payment Management

### Base URL: `/api/payments`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/process-payment` | Process payment from frontend | `{ "amount": number, "currency": "string", "order_id": "string" }` | `{ "success": boolean, "payment": object }` |
| GET | `/payment-config` | Get payment configuration | - | `{ "success": boolean, "config": object }` |
| POST | `/create-order` | Create Razorpay order | `{ "amount": number, "currency": "string" }` | `{ "success": boolean, "order": object }` |
| GET | `/transactions` | Get transaction history | Query: `page`, `limit`, `type` | `{ "success": boolean, "transactions": array, "pagination": object }` |
| POST | `/process-final-payment` | Process final payment | `{ "razorpay_order_id": "string", "razorpay_payment_id": "string", "razorpay_signature": "string", "request_id": "string", "amount": number }` | `{ "success": boolean, "payment": object }` |
| POST | `/unfreeze-payment/:request_id` | Unfreeze payment | - | `{ "success": boolean, "payment": object }` |
| POST | `/refund` | Create refund | `{ "payment_id": "string", "amount": number, "reason": "string" }` | `{ "success": boolean, "refund": object }` |
| GET | `/request/:request_id/payment-details` | Get request payment details | - | `{ "success": boolean, "payment_details": object }` |

### Payment Flow
1. **Create Order**: Generate Razorpay order
2. **Process Payment**: Handle payment completion
3. **Escrow Hold**: Funds held until work completion
4. **Release Payment**: Release funds after work approval
5. **Refund**: Process refunds if needed

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

### Subscription Benefits
- **Free Tier**: Basic campaign creation, limited influencer data
- **Premium Tier**: Full influencer profiles, advanced analytics, priority support
- **Enterprise Tier**: Custom features, dedicated support, bulk operations

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

## Brand Owner Workflow

### 1. **Profile Setup**
1. Register with phone number
2. Complete business profile with company details
3. Upload business verification documents
4. Set up payment methods

### 2. **Create Opportunities**
1. Create campaigns or bids
2. Set budget and requirements
3. Define deliverables and timeline
4. Publish opportunities

### 3. **Manage Applications**
1. Review influencer applications
2. Negotiate terms and pricing
3. Approve or reject requests
4. Process payments

### 4. **Work Management**
1. Monitor work progress
2. Review submitted work
3. Approve or request revisions
4. Release payments

### 5. **Analytics & Reporting**
1. Track campaign performance
2. View influencer metrics
3. Analyze ROI and engagement
4. Generate reports

---

## Best Practices

1. **Clear Requirements**: Provide detailed campaign/bid descriptions
2. **Realistic Budgets**: Set competitive but fair pricing
3. **Quick Response**: Respond to applications promptly
4. **Professional Communication**: Maintain professional tone
5. **Timely Payments**: Process payments on time
6. **Constructive Feedback**: Provide helpful revision requests
7. **Long-term Relationships**: Build lasting partnerships with influencers
8. **Performance Tracking**: Monitor and analyze campaign results

---

## Support

For technical support or questions about API integration, please refer to the individual controller files in the `controllers/` directory or contact the development team.

