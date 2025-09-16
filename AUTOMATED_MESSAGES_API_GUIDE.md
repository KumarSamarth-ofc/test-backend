# 🤖 Automated Messages Flow API Guide

## 📋 Overview

This guide shows you how to access and use the automated messages flow system through the API endpoints. The system handles bid conversations, campaign conversations, and direct messaging with automated state management.

---

## 🚀 Base URL & Authentication

### **Base URL**
```
http://localhost:3000/api
```

### **Authentication**
All endpoints require JWT authentication:
```http
Authorization: Bearer <your_jwt_token>
```

### **Content-Type**
```http
Content-Type: application/json
```

---

## 🎯 BID CONVERSATIONS API

### **1. Initialize Bid Conversation**
**Brand Owner** starts a conversation with an influencer who applied to their bid.

```http
POST /api/bids/automated/initialize
Authorization: Bearer <brand_owner_token>
Content-Type: application/json

{
  "bid_id": "uuid",
  "influencer_id": "uuid",
  "proposed_amount": 500
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bid conversation initialized successfully",
  "conversation": {
    "id": "conversation-uuid",
    "flow_state": "influencer_responding",
    "awaiting_role": "influencer",
    "bid_id": "bid-uuid",
    "brand_owner_id": "brand-uuid",
    "influencer_id": "influencer-uuid"
  },
  "flow_state": "influencer_responding",
  "awaiting_role": "influencer"
}
```

### **2. Brand Owner Actions**
**Brand Owner** performs actions in the conversation flow.

```http
POST /api/bids/automated/brand-owner-action
Authorization: Bearer <brand_owner_token>
Content-Type: application/json

{
  "conversation_id": "uuid",
  "action": "send_project_details",
  "data": {
    "project_details": "Create a 30-second video showcasing our new product",
    "timeline": "2 weeks",
    "deliverables": ["Video file", "Thumbnail", "Social media copy"]
  }
}
```

**Available Actions:**
- `send_project_details` - Share project requirements
- `send_price_offer` - Propose a price
- `proceed_to_payment` - Move to payment phase
- `approve_work` - Approve submitted work
- `request_revision` - Request work revisions

**Response:**
```json
{
  "success": true,
  "conversation": {
    "id": "conversation-uuid",
    "flow_state": "influencer_reviewing",
    "awaiting_role": "influencer"
  },
  "message": "Project details sent successfully",
  "flow_state": "influencer_reviewing",
  "awaiting_role": "influencer"
}
```

### **3. Influencer Actions**
**Influencer** responds to brand owner actions.

```http
POST /api/bids/automated/influencer-action
Authorization: Bearer <influencer_token>
Content-Type: application/json

{
  "conversation_id": "uuid",
  "action": "accept_price",
  "data": {
    "price": 500
  }
}
```

**Available Actions:**
- `accept` - Accept the connection request
- `reject` - Reject the connection request
- `accept_project` - Accept project details
- `accept_price` - Accept the proposed price
- `negotiate_price` - Request price negotiation
- `submit_work` - Submit completed work
- `resubmit_work` - Resubmit revised work

**Response:**
```json
{
  "success": true,
  "conversation": {
    "id": "conversation-uuid",
    "flow_state": "payment_pending",
    "awaiting_role": "brand_owner"
  },
  "message": "Price accepted successfully",
  "flow_state": "payment_pending",
  "awaiting_role": "brand_owner"
}
```

### **4. Get Conversation Context**
Get the current state and context of a conversation.

```http
GET /api/bids/automated/conversation/{conversation_id}/context
Authorization: Bearer <any_valid_token>
```

**Response:**
```json
{
  "success": true,
  "conversation": {
    "id": "conversation-uuid",
    "flow_state": "influencer_responding",
    "awaiting_role": "influencer",
    "bid_id": "bid-uuid",
    "brand_owner_id": "brand-uuid",
    "influencer_id": "influencer-uuid"
  },
  "messages": [
    {
      "id": "message-uuid",
      "message": "🎯 **Bid Connection Request**\n\nHi! You've been invited to collaborate...",
      "message_type": "automated",
      "action_required": true,
      "action_data": {
        "title": "Bid Collaboration",
        "buttons": [
          {"id": "accept", "text": "Accept Bid", "action": "accept", "style": "success"},
          {"id": "reject", "text": "Decline Bid", "action": "reject", "style": "danger"}
        ]
      },
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "flow_state": "influencer_responding",
  "awaiting_role": "influencer"
}
```

### **5. Work Submission & Review**

#### **Submit Work (Influencer)**
```http
POST /api/bids/{conversation_id}/submit-work
Authorization: Bearer <influencer_token>
Content-Type: application/json

{
  "work_submission_link": "https://drive.google.com/file/example",
  "work_description": "Completed video with all requirements",
  "work_files": ["video.mp4", "thumbnail.jpg", "copy.txt"]
}
```

#### **Review Work (Brand Owner)**
```http
POST /api/bids/{conversation_id}/review-work
Authorization: Bearer <brand_owner_token>
Content-Type: application/json

{
  "action": "approve_work",
  "feedback": "Excellent work! Approved for payment."
}
```

---

## 🎯 CAMPAIGN CONVERSATIONS API

### **1. Initialize Campaign Conversation**
**Brand Owner** starts a conversation with an influencer who applied to their campaign.

```http
POST /api/campaigns/initialize-conversation
Authorization: Bearer <brand_owner_token>
Content-Type: application/json

{
  "campaign_id": "uuid",
  "influencer_id": "uuid"
}
```

### **2. Brand Owner Actions**
```http
POST /api/campaigns/handle-brand-owner-action
Authorization: Bearer <brand_owner_token>
Content-Type: application/json

{
  "conversation_id": "uuid",
  "action": "project_details",
  "data": {
    "project_details": "Create content for our summer campaign",
    "budget": 1000,
    "timeline": "3 weeks"
  }
}
```

### **3. Influencer Actions**
```http
POST /api/campaigns/handle-influencer-action
Authorization: Bearer <influencer_token>
Content-Type: application/json

{
  "conversation_id": "uuid",
  "action": "accept_project",
  "data": {}
}
```

---

## 💬 DIRECT CONVERSATIONS API

### **1. Get All Conversations**
Get conversations based on user role.

```http
GET /api/messages/conversations
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "success": true,
  "conversations": [
    {
      "id": "conversation-uuid",
      "flow_state": "real_time",
      "awaiting_role": null,
      "campaigns": {
        "id": "campaign-uuid",
        "title": "Summer Campaign",
        "description": "Promote our summer collection"
      },
      "bids": null,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1
  }
}
```

### **2. Get Specific Conversation Types**

#### **Bid Conversations Only**
```http
GET /api/messages/conversations/bids
Authorization: Bearer <user_token>
```

#### **Campaign Conversations Only**
```http
GET /api/messages/conversations/campaigns
Authorization: Bearer <user_token>
```

#### **Direct Conversations Only**
```http
GET /api/messages/conversations/direct
Authorization: Bearer <user_token>
```

### **3. Get Messages in Conversation**
```http
GET /api/messages/conversations/{conversation_id}/messages?page=1&limit=50
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "message-uuid",
      "conversation_id": "conversation-uuid",
      "sender_id": "user-uuid",
      "receiver_id": "user-uuid",
      "message": "Hello! I'm interested in this project.",
      "message_type": "user_input",
      "is_automated": false,
      "action_required": false,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1
  }
}
```

### **4. Send Message**
```http
POST /api/messages/conversations/{conversation_id}/messages
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "message": "Hello! How are you?",
  "media_url": "https://example.com/image.jpg"
}
```

### **5. Handle Button Clicks**
```http
POST /api/messages/conversations/{conversation_id}/button-click
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "button_id": "accept",
  "button_action": "accept",
  "data": {}
}
```

### **6. Handle Text Input**
```http
POST /api/messages/conversations/{conversation_id}/text-input
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "input_text": "I'd like to negotiate the price",
  "input_type": "price_negotiation"
}
```

---

## 🔔 REAL-TIME UPDATES (WebSocket)

### **Connection**
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### **Listen for Updates**

#### **New Messages**
```javascript
socket.on('new_message', (data) => {
  console.log('New message:', data.message);
  // Update UI with new message
  addMessageToUI(data.message);
});
```

#### **Conversation Updates**
```javascript
socket.on('conversation_update', (data) => {
  console.log('Conversation updated:', data);
  // Update conversation state
  updateConversationState(data.flow_state, data.awaiting_role);
});
```

#### **Notifications**
```javascript
socket.on('notification', (data) => {
  console.log('New notification:', data);
  // Show notification to user
  showNotification(data);
});
```

### **Join Conversation Room**
```javascript
// Join a specific conversation
socket.emit('join_conversation', {
  conversation_id: 'conversation-uuid'
});

// Listen for conversation-specific events
socket.on('conversation_message', (data) => {
  // Handle message in specific conversation
});
```

---

## 📊 FLOW STATES & ACTIONS

### **Flow States**
- `influencer_responding` - Influencer needs to accept/reject
- `brand_owner_details` - Brand owner shares project details
- `influencer_reviewing` - Influencer reviews project details
- `brand_owner_pricing` - Brand owner sets price
- `influencer_price_response` - Influencer responds to price
- `brand_owner_negotiation` - Brand owner negotiates price
- `influencer_final_response` - Influencer final price decision
- `payment_pending` - Payment processing
- `work_submitted` - Work submitted for review
- `work_approved` - Work approved and completed
- `work_revision_requested` - Work needs revision
- `chat_closed` - Conversation ended
- `collaboration_cancelled` - Project cancelled

### **Awaiting Roles**
- `influencer` - Influencer needs to act
- `brand_owner` - Brand owner needs to act
- `null` - No specific role waiting

---

## 🎮 COMPLETE FLOW EXAMPLE

### **Step 1: Brand Owner Initializes Conversation**
```javascript
const response = await fetch('/api/bids/automated/initialize', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + brandOwnerToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    bid_id: 'bid-uuid',
    influencer_id: 'influencer-uuid',
    proposed_amount: 500
  })
});

const result = await response.json();
// result.conversation.id contains the conversation ID
```

### **Step 2: Influencer Accepts Connection**
```javascript
const response = await fetch('/api/bids/automated/influencer-action', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + influencerToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    conversation_id: 'conversation-uuid',
    action: 'accept',
    data: {}
  })
});
```

### **Step 3: Brand Owner Shares Project Details**
```javascript
const response = await fetch('/api/bids/automated/brand-owner-action', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + brandOwnerToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    conversation_id: 'conversation-uuid',
    action: 'send_project_details',
    data: {
      project_details: 'Create a promotional video',
      timeline: '2 weeks',
      deliverables: ['Video', 'Thumbnail']
    }
  })
});
```

### **Step 4: Influencer Accepts Project**
```javascript
const response = await fetch('/api/bids/automated/influencer-action', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + influencerToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    conversation_id: 'conversation-uuid',
    action: 'accept_project',
    data: {}
  })
});
```

### **Step 5: Brand Owner Sets Price**
```javascript
const response = await fetch('/api/bids/automated/brand-owner-action', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + brandOwnerToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    conversation_id: 'conversation-uuid',
    action: 'send_price_offer',
    data: {
      price: 500
    }
  })
});
```

### **Step 6: Influencer Accepts Price**
```javascript
const response = await fetch('/api/bids/automated/influencer-action', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + influencerToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    conversation_id: 'conversation-uuid',
    action: 'accept_price',
    data: {
      price: 500
    }
  })
});
```

---

## 🚀 FRONTEND INTEGRATION

### **React/JavaScript Example**
```javascript
class AutomatedFlowClient {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async initializeBidConversation(bidId, influencerId, proposedAmount) {
    const response = await fetch(`${this.baseURL}/api/bids/automated/initialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bid_id: bidId,
        influencer_id: influencerId,
        proposed_amount: proposedAmount
      })
    });
    return await response.json();
  }

  async sendAction(conversationId, action, data) {
    const response = await fetch(`${this.baseURL}/api/bids/automated/influencer-action`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        action: action,
        data: data
      })
    });
    return await response.json();
  }

  async getConversationContext(conversationId) {
    const response = await fetch(`${this.baseURL}/api/bids/automated/conversation/${conversationId}/context`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    return await response.json();
  }
}

// Usage
const client = new AutomatedFlowClient('http://localhost:3000', 'your-jwt-token');

// Initialize conversation
const result = await client.initializeBidConversation('bid-uuid', 'influencer-uuid', 500);

// Send action
await client.sendAction('conversation-uuid', 'accept', {});

// Get context
const context = await client.getConversationContext('conversation-uuid');
```

---

## 🎯 SUMMARY

The automated messages flow API provides:

- ✅ **Complete conversation management** for bids and campaigns
- ✅ **State machine-driven flow** with automated transitions
- ✅ **Real-time updates** via WebSocket
- ✅ **Action-based interactions** with button responses
- ✅ **Work submission and review** system
- ✅ **Payment integration** and processing
- ✅ **Comprehensive error handling**

**Base URLs:**
- Bids: `/api/bids/automated/`
- Campaigns: `/api/campaigns/`
- Messages: `/api/messages/conversations/`

**Authentication:** JWT Bearer token required for all endpoints

**Real-time:** WebSocket connection for live updates

The system is ready to use! 🎉
