# Stoory Backend APIs Available for Admin Dashboard

This document lists all the existing backend APIs that can be used by the admin dashboard, organized by functionality.

## Base URL
```
http://localhost:3000/api
```

## Authentication & Authorization

### Available Endpoints
- `POST /auth/send-otp` - Send OTP for admin login
- `POST /auth/verify-otp` - Verify OTP and get token
- `POST /auth/refresh-token` - Refresh authentication token
- `GET /auth/profile` - Get admin profile (requires auth)
- `POST /auth/logout` - Logout admin (requires auth)

### Admin Check
- `GET /admin-check` - Check if admin users exist (no auth required)

## User Management

### Available Endpoints
- `GET /users/influencers` - List influencers with pagination and filters
  - Query params: `page`, `limit`, `search`, `languages`, `categories`, `min_range`, `max_range`, `sort_by`, `sort_order`
  - Returns: Paginated list of influencers with social platform details
- `GET /users/profile` - Get user profile details (requires auth)
- `GET /users/verification-status` - Get user verification status (requires auth)

### Data Structure Available
```json
{
  "id": "string",
  "name": "string", 
  "role": "influencer" | "brand_owner" | "admin",
  "phone": "string",
  "email": "string",
  "gender": "string",
  "languages": "array",
  "categories": "array", 
  "min_range": "number",
  "max_range": "number",
  "profile_image_url": "string",
  "created_at": "string",
  "social_platforms": [
    {
      "id": "string",
      "platform_name": "string",
      "profile_link": "string", 
      "followers_count": "number",
      "engagement_rate": "number"
    }
  ]
}
```

## Campaign Management

### Available Endpoints
- `GET /campaigns` - List campaigns with pagination
  - Query params: `page`, `limit`, `status`, `search`
  - Returns: Paginated list of campaigns
- `GET /campaigns/stats` - Get campaign statistics
- `GET /campaigns/:id` - Get individual campaign details
- `POST /campaigns` - Create new campaign (admin/brand_owner only)
- `PUT /campaigns/:id` - Update campaign (admin/brand_owner only)
- `DELETE /campaigns/:id` - Delete campaign (admin/brand_owner only)

### Data Structure Available
```json
{
  "id": "string",
  "title": "string",
  "description": "string", 
  "budget": "number",
  "status": "open" | "pending" | "closed",
  "start_date": "string",
  "end_date": "string",
  "requirements": "string",
  "deliverables": "array",
  "campaign_type": "product" | "service",
  "image_url": "string",
  "language": "string",
  "platform": "string",
  "content_type": "string",
  "sending_package": "boolean",
  "no_of_packages": "number",
  "created_by": "string",
  "created_at": "string",
  "updated_at": "string"
}
```

## Bid Management

### Available Endpoints
- `GET /bids` - List bids with pagination
  - Query params: `page`, `limit`, `status`, `search`
  - Returns: Paginated list of bids
- `GET /bids/stats` - Get bid statistics
- `GET /bids/:id` - Get individual bid details
- `POST /bids` - Create new bid (admin/brand_owner only)
- `PUT /bids/:id` - Update bid (admin/brand_owner only)
- `DELETE /bids/:id` - Delete bid (admin/brand_owner only)

### Data Structure Available
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "min_budget": "number",
  "max_budget": "number", 
  "requirements": "string",
  "language": "string",
  "platform": "string",
  "content_type": "string",
  "category": "string",
  "expiry_date": "string",
  "status": "open" | "pending" | "closed",
  "created_by": "string",
  "created_at": "string",
  "updated_at": "string"
}
```

## Request Management (Connections)

### Available Endpoints
- `GET /requests` - List requests with pagination
  - Query params: `page`, `limit`, `status`, `campaign_id`, `bid_id`
  - Returns: Paginated list of requests/connections
- `GET /requests/:id` - Get individual request details
- `PUT /requests/:id/status` - Update request status (admin/brand_owner only)
- `PUT /requests/:id/agree` - Update agreed amount (influencer only)
- `DELETE /requests/:id` - Withdraw request (influencer only)
- `GET /requests/bid/:bid_id/influencers` - Get influencers for a bid
- `GET /requests/campaign/:campaign_id/influencers` - Get influencers for a campaign
- `GET /requests/bid/:bid_id/influencer-count` - Get influencer count for bid
- `GET /requests/campaign/:campaign_id/influencer-count` - Get influencer count for campaign

### Data Structure Available
```json
{
  "id": "string",
  "campaign_id": "string",
  "bid_id": "string", 
  "influencer_id": "string",
  "status": "connected" | "negotiating" | "paid" | "completed" | "cancelled",
  "final_agreed_amount": "number",
  "initial_payment": "number",
  "final_payment": "number",
  "created_at": "string",
  "updated_at": "string"
}
```

## Chat/Messaging Management

### Available Endpoints
- `GET /messages/conversations` - List conversations (role-based filtering)
- `GET /messages/conversations/direct` - List direct conversations only
- `GET /messages/conversations/bids` - List bid conversations only
- `GET /messages/conversations/campaigns` - List campaign conversations only
- `GET /messages/conversations/:conversation_id/messages` - Get messages for conversation
- `GET /messages/conversations/:conversation_id/context` - Get conversation context
- `POST /messages/conversations/:conversation_id/messages` - Send message
- `PUT /messages/conversations/:conversation_id/seen` - Mark messages as seen
- `DELETE /messages/:message_id` - Delete message
- `GET /messages/unread-count` - Get unread message count
- `POST /messages/direct-connect` - Initiate direct connection
- `GET /messages/direct-connections` - Get direct connections
- `POST /messages/direct-message` - Send direct message

### Data Structure Available
```json
{
  "conversations": [
    {
      "id": "string",
      "brand_owner_id": "string",
      "influencer_id": "string",
      "campaign_id": "string",
      "bid_id": "string",
      "chat_status": "string",
      "flow_state": "string",
      "awaiting_role": "string",
      "created_at": "string",
      "updated_at": "string",
      "campaigns": {
        "id": "string",
        "title": "string",
        "description": "string",
        "budget": "number",
        "status": "string"
      },
      "bids": {
        "id": "string", 
        "title": "string",
        "description": "string",
        "min_budget": "number",
        "max_budget": "number",
        "status": "string"
      }
    }
  ],
  "messages": [
    {
      "id": "string",
      "conversation_id": "string",
      "sender_id": "string",
      "receiver_id": "string",
      "message": "string",
      "media_url": "string",
      "seen": "boolean",
      "created_at": "string"
    }
  ]
}
```

## Payment & Wallet Management

### Available Endpoints
- `GET /payments/transactions` - Get transaction history
- `GET /payments/wallet/balance` - Get wallet balance
- `POST /payments/wallet/withdraw` - Withdraw from wallet
- `POST /payments/process-payment` - Process payment
- `GET /payments/payment-config` - Get payment configuration
- `POST /payments/create-order` - Create Razorpay order
- `POST /payments/process-final-payment` - Process final payment
- `POST /payments/unfreeze-payment/:request_id` - Unfreeze payment
- `POST /payments/refund` - Create refund
- `GET /payments/request/:request_id/payment-details` - Get request payment details

### Data Structure Available
```json
{
  "transactions": [
    {
      "id": "string",
      "user_id": "string",
      "amount": "number",
      "type": "credit" | "debit",
      "description": "string",
      "status": "pending" | "completed" | "failed",
      "created_at": "string"
    }
  ],
  "wallet": {
    "balance": "number",
    "user_id": "string"
  }
}
```

## Subscription Management

### Available Endpoints
- `GET /subscriptions/plans` - Get available subscription plans
- `GET /subscriptions/status` - Get user subscription status (requires auth)
- `POST /subscriptions/create-order` - Create subscription order (requires auth)
- `POST /subscriptions/process-payment` - Process subscription payment (requires auth)
- `POST /subscriptions/create-free` - Create free subscription (requires auth)
- `GET /subscriptions/payment-status/:payment_id` - Get payment status (requires auth)
- `POST /subscriptions/update-payment-status` - Update payment status (requires auth)
- `POST /subscriptions/cancel` - Cancel subscription (requires auth)
- `GET /subscriptions/history` - Get subscription history (requires auth)

### Data Structure Available
```json
{
  "plans": [
    {
      "id": "string",
      "name": "string",
      "price": "number",
      "duration": "string",
      "features": "array",
      "is_active": "boolean"
    }
  ],
  "subscription": {
    "id": "string",
    "user_id": "string",
    "plan_id": "string",
    "status": "string",
    "start_date": "string",
    "end_date": "string",
    "is_active": "boolean"
  }
}
```

## Coupon Management

### Available Endpoints
- `GET /coupons/admin/all` - Get all coupons (admin only)
- `GET /coupons/admin/stats` - Get coupon statistics (admin only)
- `POST /coupons/admin/create` - Create new coupon (admin only)
- `PUT /coupons/admin/:couponId` - Update coupon (admin only)
- `DELETE /coupons/admin/:couponId` - Delete coupon (admin only)
- `POST /coupons/validate` - Validate coupon code (requires auth)
- `POST /coupons/apply` - Apply coupon code (requires auth)
- `POST /coupons/create-subscription` - Create subscription with coupon (requires auth)
- `GET /coupons/history` - Get coupon usage history (requires auth)

### Data Structure Available
```json
{
  "coupons": [
    {
      "id": "string",
      "code": "string",
      "discount_type": "percentage" | "fixed",
      "discount_value": "number",
      "min_order_amount": "number",
      "max_discount": "number",
      "usage_limit": "number",
      "used_count": "number",
      "is_active": "boolean",
      "valid_from": "string",
      "valid_until": "string",
      "created_at": "string"
    }
  ]
}
```

## File & Attachment Management

### Available Endpoints
- `POST /attachments/conversations/:conversation_id/upload` - Upload attachment (requires auth)
- `POST /attachments/conversations/:conversation_id/send-with-attachment` - Send message with attachment (requires auth)
- `POST /attachments/conversations/:conversation_id/upload-formdata` - Upload with FormData (requires auth)
- `DELETE /attachments/:attachment_id` - Delete attachment (requires auth)
- `GET /attachments/:attachment_id` - Get attachment info (requires auth)
- `GET /attachments/supported-types` - Get supported file types

### Data Structure Available
```json
{
  "attachments": [
    {
      "id": "string",
      "conversation_id": "string",
      "file_name": "string",
      "file_url": "string",
      "file_type": "string",
      "file_size": "number",
      "created_at": "string"
    }
  ]
}
```

## FCM (Push Notifications)

### Available Endpoints
- `POST /fcm/register` - Register FCM token (requires auth)
- `POST /fcm/unregister` - Unregister FCM token (requires auth)
- `GET /fcm/tokens` - Get user's FCM tokens (requires auth)
- `POST /fcm/test` - Send test notification (requires auth)
- `POST /fcm/cleanup` - Cleanup inactive tokens (admin only)

## Health & Debug Endpoints

### Available Endpoints
- `GET /health` - Health check endpoint
- `GET /cors-debug` - CORS debug endpoint
- `GET /api/cors-test` - API CORS test
- `GET /test-socket` - Socket.IO test endpoint
- `POST /test-message` - Test message endpoint
- `GET /test-fcm` - FCM service status

## Missing APIs for Admin Dashboard

Based on the requirements document, the following APIs are **NOT YET AVAILABLE** and need to be implemented:

### Dashboard Statistics
- `GET /dashboard/stats` - Overall platform statistics
- `GET /users/stats` - User count statistics
- `GET /campaigns/stats` - Campaign statistics (exists but may need enhancement)
- `GET /bids/stats` - Bid statistics (exists but may need enhancement)
- `GET /transactions/stats` - Transaction statistics

### Enhanced User Management
- `GET /users/brand-owners` - List brand owners with pagination
- `POST /users/influencers` - Create new influencer
- `POST /users/brand-owners` - Create new brand owner
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Enhanced Campaign Management
- `GET /campaigns/recent` - Recent campaigns for dashboard
- `PUT /campaigns/:id/status` - Update campaign status

### Enhanced Bid Management
- `GET /bids/recent` - Recent bids for dashboard
- `PUT /bids/:id/status` - Update bid status

### Reports & Analytics
- `GET /reports/messages` - Reported messages
- `GET /analytics/dashboard` - Dashboard analytics
- `GET /analytics/revenue` - Revenue analytics

### Notification Management
- `GET /notifications` - List notifications
- `PUT /notifications/:id/read` - Mark notification as read
- `GET /notifications/unread-count` - Unread notification count

## Implementation Notes

1. **Authentication**: All endpoints require proper JWT token authentication except health checks and admin check
2. **Role-based Access**: Many endpoints have role restrictions (admin, brand_owner, influencer)
3. **Pagination**: Most list endpoints support pagination with `page` and `limit` parameters
4. **Filtering**: Several endpoints support filtering by status, search terms, etc.
5. **File Uploads**: Image uploads are supported for campaigns, bids, and profile images
6. **Real-time**: Socket.IO is available for real-time messaging and notifications
7. **Database**: Uses Supabase with PostgreSQL
8. **Payment**: Integrated with Razorpay for payment processing

## Next Steps

1. Implement missing dashboard statistics endpoints
2. Add enhanced user management endpoints for admin
3. Create notification management system
4. Add reporting and analytics endpoints
5. Enhance existing endpoints with admin-specific data
6. Add proper admin role validation to existing endpoints



