# Stoory Backend API Documentation

## Overview
Stoory is an influencer marketing platform that connects brand owners with influencers. This API provides authentication, campaign management, bidding, messaging, and payment processing.

## Base URL
```
http://localhost:3000/api
```

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 🔐 Authentication APIs

### 1. Send OTP for Login (Existing Users)
**Endpoint:** `POST /auth/send-otp`  
**Description:** Sends a 6-digit OTP to existing user's phone number via WhatsApp  
**Access:** Public  
**Body:**
```json
{
  "phone": "+919876543210"
}
```
**Response (Success):**
```json
{
  "success": true,
  "message": "OTP sent successfully via WhatsApp"
}
```
**Response (User Not Found):**
```json
{
  "success": false,
  "message": "Account not found. Please register first.",
  "code": "USER_NOT_FOUND"
}
```

### 2. Send OTP for Registration (New Users)
**Endpoint:** `POST /auth/send-registration-otp`  
**Description:** Sends a 6-digit OTP to new user's phone number via WhatsApp  
**Access:** Public  
**Body:**
```json
{
  "phone": "+919876543210"
}
```
**Response (Success):**
```json
{
  "success": true,
  "message": "OTP sent successfully via WhatsApp"
}
```
**Response (User Already Exists):**
```json
{
  "success": false,
  "message": "Account already exists. Please login instead.",
  "code": "USER_ALREADY_EXISTS"
}
```

### 3. Verify OTP & Register/Login
**Endpoint:** `POST /auth/verify-otp`  
**Description:** Verifies OTP and creates user account (if new) or logs in existing user  
**Access:** Public  
**Body:**
```json
{
  "phone": "+919876543210",
  "token": "123456",
  "userData": {
    "name": "John Doe",
    "email": "user@example.com",
    "role": "influencer",
    "gender": "male",
    "languages": ["English", "Hindi"],
    "categories": ["Fashion", "Lifestyle"],
    "min_range": 1000,
    "max_range": 50000
  }
}
```
**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "phone": "+919876543210",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "influencer",
    "gender": "male",
    "languages": ["English", "Hindi"],
    "categories": ["Fashion", "Lifestyle"],
    "min_range": 1000,
    "max_range": 50000
  },
  "token": "jwt-token",
  "message": "Authentication successful"
}
```

### 4. Get User Profile
**Endpoint:** `GET /auth/profile`  
**Description:** Retrieves current user's profile information  
**Access:** Protected (All roles)  
**Headers:** `Authorization: Bearer <token>`  
**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "phone": "+919876543210",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "influencer",
    "gender": "male",
    "languages": ["English"],
    "categories": ["Fashion"],
    "min_range": 1000,
    "max_range": 50000,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### 5. Update User Profile
**Endpoint:** `PUT /auth/profile`  
**Description:** Updates user profile information  
**Access:** Protected (All roles)  
**Headers:** `Authorization: Bearer <token>`  
**Body:**
```json
{
  "name": "Jane Smith",
  "email": "newemail@example.com",
  "role": "brand_owner",
  "gender": "female",
  "languages": ["English", "Spanish"],
  "categories": ["Technology", "Gaming"],
  "min_range": 2000,
  "max_range": 100000
}
```
**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "phone": "+919876543210",
    "name": "Jane Smith",
    "email": "newemail@example.com",
    "role": "brand_owner",
    "gender": "female"
  },
  "message": "Profile updated successfully"
}
```

### 6. Refresh Token
**Endpoint:** `POST /auth/refresh-token`  
**Description:** Refreshes the JWT token  
**Access:** Protected (All roles)  
**Headers:** `Authorization: Bearer <token>`  
**Response:**
```json
{
  "success": true,
  "token": "new-jwt-token",
  "message": "Token refreshed successfully"
}
```

### 7. Logout
**Endpoint:** `POST /auth/logout`  
**Description:** Logs out user (client-side token removal)  
**Access:** Protected (All roles)  
**Headers:** `Authorization: Bearer <token>`  
**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 8. Delete Account
**Endpoint:** `DELETE /auth/account`  
**Description:** Marks user account as deleted  
**Access:** Protected (All roles)  
**Headers:** `Authorization: Bearer <token>`  
**Response:**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

---

## 🎯 Campaign Management APIs

### 9. Create Campaign
**Endpoint:** `POST /campaigns`  
**Description:** Creates a new campaign for brand owners  
**Access:** Protected (brand_owner role)  
**Headers:** `Authorization: Bearer <token>`  
**Body:**
```json
{
  "title": "Summer Fashion Campaign",
  "description": "Promote our new summer collection",
  "budget": 50000,
  "start_date": "2024-06-01",
  "end_date": "2024-08-31",
  "requirements": "Fashion influencers with 10k+ followers",
  "deliverables": ["Instagram posts", "Stories", "Reels"]
}
```
**Response:**
```json
{
  "success": true,
  "campaign": {
    "id": "uuid",
    "title": "Summer Fashion Campaign",
    "description": "Promote our new summer collection",
    "budget": 50000,
    "status": "open",
    "start_date": "2024-06-01",
    "end_date": "2024-08-31",
    "requirements": "Fashion influencers with 10k+ followers",
    "deliverables": ["Instagram posts", "Stories", "Reels"],
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### 10. Get All Campaigns
**Endpoint:** `GET /campaigns`  
**Description:** Retrieves all campaigns with optional filters  
**Access:** Protected (All roles)  
**Headers:** `Authorization: Bearer <token>`  
**Query Parameters:**
- `status` (optional): open, pending, closed
- `category` (optional): Filter by category
- `min_budget` (optional): Minimum budget
- `max_budget` (optional): Maximum budget
- `page` (optional): Page number for pagination
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "campaigns": [
    {
      "id": "uuid",
      "title": "Summer Fashion Campaign",
      "description": "Promote our new summer collection",
      "budget": 50000,
      "status": "open",
      "start_date": "2024-06-01",
      "end_date": "2024-08-31",
      "requirements": "Fashion influencers with 10k+ followers",
      "deliverables": ["Instagram posts", "Stories", "Reels"],
      "created_at": "2024-01-01T00:00:00Z",
      "created_by": {
        "id": "uuid",
        "phone": "+919876543210",
        "name": "Fashion Brand Co.",
        "email": "brand@example.com",
        "role": "brand_owner"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### 11. Get Campaign by ID
**Endpoint:** `GET /campaigns/:id`  
**Description:** Retrieves a specific campaign by ID  
**Access:** Protected (All roles)  
**Headers:** `Authorization: Bearer <token>`  
**Response:**
```json
{
  "success": true,
  "campaign": {
    "id": "uuid",
    "title": "Summer Fashion Campaign",
    "description": "Promote our new summer collection",
    "budget": 50000,
    "status": "open",
    "start_date": "2024-06-01",
    "end_date": "2024-08-31",
    "requirements": "Fashion influencers with 10k+ followers",
    "deliverables": ["Instagram posts", "Stories", "Reels"],
    "created_at": "2024-01-01T00:00:00Z",
    "created_by": {
      "id": "uuid",
      "phone": "+919876543210",
      "name": "Fashion Brand Co.",
      "email": "brand@example.com",
      "role": "brand_owner"
    }
  }
}
```

### 12. Update Campaign
**Endpoint:** `PUT /campaigns/:id`  
**Description:** Updates a campaign (only by creator)  
**Access:** Protected (brand_owner role)  
**Headers:** `Authorization: Bearer <token>`  
**Body:**
```json
{
  "title": "Updated Campaign Title",
  "description": "Updated description",
  "budget": 75000,
  "status": "pending"
}
```
**Response:**
```json
{
  "success": true,
  "campaign": {
    "id": "uuid",
    "title": "Updated Campaign Title",
    "description": "Updated description",
    "budget": 75000,
    "status": "pending"
  },
  "message": "Campaign updated successfully"
}
```

### 13. Delete Campaign
**Endpoint:** `DELETE /campaigns/:id`  
**Description:** Deletes a campaign (only by creator)  
**Access:** Protected (brand_owner role)  
**Headers:** `Authorization: Bearer <token>`  
**Response:**
```json
{
  "success": true,
  "message": "Campaign deleted successfully"
}
```

---

## 💰 Bidding APIs

### 14. Create Bid
**Endpoint:** `POST /bids`  
**Description:** Creates a new bid for influencers  
**Access:** Protected (influencer role)  
**Headers:** `Authorization: Bearer <token>`  
**Body:**
```json
{
  "title": "Fashion Influencer Services",
  "description": "Professional fashion influencer with 50k followers",
  "budget": 15000
}
```
**Response:**
```json
{
  "success": true,
  "bid": {
    "id": "uuid",
    "title": "Fashion Influencer Services",
    "description": "Professional fashion influencer with 50k followers",
    "budget": 15000,
    "status": "open",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### 15. Get All Bids
**Endpoint:** `GET /bids`  
**Description:** Retrieves all bids with optional filters  
**Access:** Protected (All roles)  
**Headers:** `Authorization: Bearer <token>`  
**Query Parameters:**
- `status` (optional): open, pending, closed
- `min_budget` (optional): Minimum budget
- `max_budget` (optional): Maximum budget
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "bids": [
    {
      "id": "uuid",
      "title": "Fashion Influencer Services",
      "description": "Professional fashion influencer with 50k followers",
      "budget": 15000,
      "status": "open",
      "created_at": "2024-01-01T00:00:00Z",
      "created_by": {
        "id": "uuid",
        "phone": "+919876543210",
        "name": "Fashion Influencer Co.",
        "email": "influencer@example.com",
        "role": "influencer"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "pages": 2
  }
}
```

### 16. Get Bid by ID
**Endpoint:** `GET /bids/:id`  
**Description:** Retrieves a specific bid by ID  
**Access:** Protected (All roles)  
**Headers:** `Authorization: Bearer <token>`  
**Response:**
```json
{
  "success": true,
  "bid": {
    "id": "uuid",
    "title": "Fashion Influencer Services",
    "description": "Professional fashion influencer with 50k followers",
    "budget": 15000,
    "status": "open",
    "created_at": "2024-01-01T00:00:00Z",
    "created_by": {
      "id": "uuid",
      "phone": "+919876543210",
      "name": "Fashion Influencer Co.",
      "email": "influencer@example.com",
      "role": "influencer"
    }
  }
}
```

### 17. Update Bid
**Endpoint:** `PUT /bids/:id`  
**Description:** Updates a bid (only by creator)  
**Access:** Protected (influencer role)  
**Headers:** `Authorization: Bearer <token>`  
**Body:**
```json
{
  "title": "Updated Bid Title",
  "description": "Updated description",
  "budget": 20000,
  "status": "pending"
}
```
**Response:**
```json
{
  "success": true,
  "bid": {
    "id": "uuid",
    "title": "Updated Bid Title",
    "description": "Updated description",
    "budget": 20000,
    "status": "pending"
  },
  "message": "Bid updated successfully"
}
```

### 18. Delete Bid
**Endpoint:** `DELETE /bids/:id`  
**Description:** Deletes a bid (only by creator)  
**Access:** Protected (influencer role)  
**Headers:** `Authorization: Bearer <token>`  
**Response:**
```json
{
  "success": true,
  "message": "Bid deleted successfully"
}
```

---

## 🤝 Request Management APIs

### 19. Create Request (Connect)
**Endpoint:** `POST /requests`  
**Description:** Creates a connection request between influencer and campaign/bid  
**Access:** Protected (influencer role)  
**Headers:** `Authorization: Bearer <token>`  
**Body:**
```json
{
  "campaign_id": "uuid",  // OR bid_id
  "message": "I'm interested in this campaign!"
}
```
**Response:**
```json
{
  "success": true,
  "request": {
    "id": "uuid",
    "campaign_id": "uuid",
    "influencer_id": "uuid",
    "status": "connected",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "message": "Request created successfully"
}
```

### 20. Get User Requests
**Endpoint:** `GET /requests`  
**Description:** Retrieves requests for the current user  
**Access:** Protected (All roles)  
**Headers:** `Authorization: Bearer <token>`  
**Query Parameters:**
- `status` (optional): connected, negotiating, paid, completed, cancelled
- `type` (optional): campaign, bid
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "requests": [
    {
      "id": "uuid",
      "campaign_id": "uuid",
      "influencer_id": "uuid",
      "status": "connected",
      "final_agreed_amount": 15000,
      "initial_payment": 4500,
      "final_payment": 10500,
      "created_at": "2024-01-01T00:00:00Z",
      "campaign": {
        "id": "uuid",
        "title": "Summer Fashion Campaign",
        "budget": 50000
      },
      "influencer": {
        "id": "uuid",
        "phone": "+919876543210",
        "name": "John Doe",
        "email": "influencer@example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "pages": 1
  }
}
```

### 21. Update Request Status
**Endpoint:** `PUT /requests/:id`  
**Description:** Updates request status (brand owner can approve/negotiate)  
**Access:** Protected (brand_owner role)  
**Headers:** `Authorization: Bearer <token>`  
**Body:**
```json
{
  "status": "negotiating",
  "final_agreed_amount": 15000
}
```
**Response:**
```json
{
  "success": true,
  "request": {
    "id": "uuid",
    "status": "negotiating",
    "final_agreed_amount": 15000
  },
  "message": "Request status updated successfully"
}
```

---

## 💳 Payment APIs

### 22. Process Approval Payment (30%)
**Endpoint:** `POST /payments/approval-payment`  
**Description:** Processes the initial 30% payment for a request  
**Access:** Protected (brand_owner role)  
**Headers:** `Authorization: Bearer <token>`  
**Body:**
```json
{
  "request_id": "uuid",
  "payment_method": "razorpay"
}
```
**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "uuid",
    "request_id": "uuid",
    "amount": 4500,
    "type": "initial",
    "status": "completed",
    "payment_method": "razorpay",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "message": "Approval payment processed successfully"
}
```

### 23. Process Completion Payment (70%)
**Endpoint:** `POST /payments/completion-payment`  
**Description:** Processes the final 70% payment for a completed request  
**Access:** Protected (brand_owner role)  
**Headers:** `Authorization: Bearer <token>`  
**Body:**
```json
{
  "request_id": "uuid",
  "payment_method": "razorpay"
}
```
**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "uuid",
    "request_id": "uuid",
    "amount": 10500,
    "type": "final",
    "status": "completed",
    "payment_method": "razorpay",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "message": "Completion payment processed successfully"
}
```

### 24. Get Payment History
**Endpoint:** `GET /payments`  
**Description:** Retrieves payment history for the current user  
**Access:** Protected (All roles)  
**Headers:** `Authorization: Bearer <token>`  
**Query Parameters:**
- `type` (optional): initial, final
- `status` (optional): pending, completed, failed
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "payments": [
    {
      "id": "uuid",
      "request_id": "uuid",
      "amount": 4500,
      "type": "initial",
      "status": "completed",
      "payment_method": "razorpay",
      "created_at": "2024-01-01T00:00:00Z",
      "request": {
        "id": "uuid",
        "campaign_id": "uuid",
        "final_agreed_amount": 15000
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "pages": 1
  }
}
```

---

## 💬 Messaging APIs

### 25. Get Conversations
**Endpoint:** `GET /messages/conversations`  
**Description:** Retrieves all conversations for the current user  
**Access:** Protected (All roles)  
**Headers:** `Authorization: Bearer <token>`  
**Response:**
```json
{
  "success": true,
  "conversations": [
    {
      "id": "uuid",
      "campaign_id": "uuid",
      "brand_owner_id": "uuid",
      "influencer_id": "uuid",
      "created_at": "2024-01-01T00:00:00Z",
      "campaign": {
        "id": "uuid",
        "title": "Summer Fashion Campaign"
      },
      "brand_owner": {
        "id": "uuid",
        "phone": "+919876543210",
        "name": "Fashion Brand Co.",
        "email": "brand@example.com"
      },
      "influencer": {
        "id": "uuid",
        "phone": "+919876543211",
        "name": "John Doe",
        "email": "influencer@example.com"
      }
    }
  ]
}
```

### 26. Get Messages
**Endpoint:** `GET /messages/:conversationId`  
**Description:** Retrieves messages for a specific conversation  
**Access:** Protected (All roles)  
**Headers:** `Authorization: Bearer <token>`  
**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "uuid",
      "conversation_id": "uuid",
      "sender_id": "uuid",
      "receiver_id": "uuid",
      "content": "Hello! I'm interested in your campaign.",
      "message_type": "text",
      "created_at": "2024-01-01T00:00:00Z",
      "sender": {
        "id": "uuid",
        "phone": "+919876543210",
        "name": "John Doe",
        "email": "influencer@example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 5,
    "pages": 1
  }
}
```

### 27. Send Message
**Endpoint:** `POST /messages`  
**Description:** Sends a message in a conversation  
**Access:** Protected (All roles)  
**Headers:** `Authorization: Bearer <token>`  
**Body:**
```json
{
  "conversation_id": "uuid",
  "content": "Hello! I'm interested in your campaign.",
  "message_type": "text"
}
```
**Response:**
```json
{
  "success": true,
  "message": {
    "id": "uuid",
    "conversation_id": "uuid",
    "sender_id": "uuid",
    "receiver_id": "uuid",
    "content": "Hello! I'm interested in your campaign.",
    "message_type": "text",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "message": "Message sent successfully"
}
```

---

## 🔧 Utility APIs

### 28. WhatsApp Service Status
**Endpoint:** `GET /auth/whatsapp-status`  
**Description:** Checks WhatsApp service configuration status  
**Access:** Public  
**Response:**
```json
{
  "success": true,
  "whatsapp": {
    "service": "custom",
    "configured": true,
    "provider": "facebook-graph-api",
    "endpoint": "https://graph.facebook.com/v22.0/780343825151255/messages"
  }
}
```

---

## 📱 App Implementation Guide

### **For Mobile App Development:**

#### **1. Authentication Flow:**
**For Login (Existing Users):**
1. **Send Login OTP** → `POST /auth/send-otp`
2. **Check Response** → If `code: "USER_NOT_FOUND"`, redirect to registration
3. **Verify OTP** → `POST /auth/verify-otp` (login existing user)
4. **Store JWT Token** → Use for all subsequent requests

**For Registration (New Users):**
1. **Send Registration OTP** → `POST /auth/send-registration-otp`
2. **Check Response** → If `code: "USER_ALREADY_EXISTS"`, redirect to login
3. **Verify OTP** → `POST /auth/verify-otp` (creates new account)
4. **Store JWT Token** → Use for all subsequent requests

#### **2. User Onboarding:**
1. **Complete Profile** → `PUT /auth/profile` (add name, email, gender, etc.)
2. **Set Preferences** → Update languages, categories, budget range

#### **3. Campaign Discovery (Influencers):**
1. **Browse Campaigns** → `GET /campaigns`
2. **Filter & Search** → Use query parameters
3. **Connect** → `POST /requests`

#### **4. Campaign Management (Brand Owners):**
1. **Create Campaign** → `POST /campaigns`
2. **Manage Requests** → `GET /requests` + `PUT /requests/:id`
3. **Process Payments** → `POST /payments/approval-payment` + `POST /payments/completion-payment`

#### **5. Bidding System (Influencers):**
1. **Create Bid** → `POST /bids`
2. **Manage Bids** → `GET /bids` + `PUT /bids/:id`

#### **6. Messaging:**
1. **Get Conversations** → `GET /messages/conversations`
2. **Send Messages** → `POST /messages`
3. **Real-time Updates** → Use WebSocket connection

### **Key Features to Implement:**

#### **For Influencers:**
- ✅ OTP-based registration/login
- ✅ Profile management with gender
- ✅ Browse and filter campaigns
- ✅ Create and manage bids
- ✅ Connect with brand owners
- ✅ Real-time messaging
- ✅ Payment tracking

#### **For Brand Owners:**
- ✅ OTP-based registration/login
- ✅ Profile management with gender
- ✅ Create and manage campaigns
- ✅ Review influencer requests
- ✅ Process payments (30% + 70%)
- ✅ Real-time messaging
- ✅ Analytics dashboard

### **Payment Flow:**
1. **Request Created** → Influencer connects with campaign
2. **Negotiation** → Brand owner and influencer discuss terms
3. **Initial Payment (30%)** → `POST /payments/approval-payment`
4. **Work Completion** → Influencer delivers content
5. **Final Payment (70%)** → `POST /payments/completion-payment`

### **Real-time Features:**
- **WebSocket Connection** → For instant messaging
- **Push Notifications** → For new requests, messages, payments
- **Status Updates** → Real-time campaign/bid status changes

### **Security Considerations:**
- **JWT Authentication** → All protected endpoints
- **Role-based Access** → Different permissions for different roles
- **Input Validation** → All user inputs validated
- **Rate Limiting** → Prevent abuse
- **Data Encryption** → Sensitive data protection

This API provides everything needed to build a complete influencer marketing platform! 🚀 