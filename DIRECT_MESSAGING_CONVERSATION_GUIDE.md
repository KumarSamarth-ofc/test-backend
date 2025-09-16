# 💬 Direct Messaging & Conversation Creation Guide

## 📋 Overview

This guide explains how direct messaging and conversation creation is handled in the Stoory platform. The system supports multiple types of conversations: direct messages, campaign-based conversations, and bid-based conversations.

---

## 🏗️ Architecture Overview

### Conversation Types
1. **Direct Conversations** - Direct messaging between users (no campaign/bid context)
2. **Campaign Conversations** - Conversations initiated through campaign applications
3. **Bid Conversations** - Conversations initiated through bid applications

### Key Components
- **MessageController** - Handles all messaging operations
- **AutomatedFlowService** - Manages automated conversation flows
- **Socket.IO** - Real-time messaging
- **Database Tables** - `conversations`, `messages`, `requests`

---

## 🗄️ Database Schema

### Conversations Table
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    bid_id UUID REFERENCES bids(id) ON DELETE CASCADE,
    brand_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    influencer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
    chat_status VARCHAR(50) DEFAULT 'realtime',
    flow_state VARCHAR(50),
    awaiting_role VARCHAR(50),
    payment_required BOOLEAN DEFAULT FALSE,
    payment_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_conversation_source CHECK (
        (campaign_id IS NOT NULL AND bid_id IS NULL) OR 
        (campaign_id IS NULL AND bid_id IS NOT NULL)
    ),
    UNIQUE(campaign_id, brand_owner_id, influencer_id),
    UNIQUE(bid_id, brand_owner_id, influencer_id)
);
```

### Messages Table
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    media_url TEXT,
    status VARCHAR(50) DEFAULT 'sent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔄 Conversation Creation Flow

### 1. Direct Conversation Creation

**File**: `controllers/messageController.js` (lines 342-442)

```javascript
async sendMessage(req, res) {
  try {
    const { conversation_id, receiver_id, message, campaign_id, bid_id } = req.body;
    const senderId = req.user.id;

    let conversationId = conversation_id;

    // If no conversation_id provided, find or create one
    if (!conversationId) {
      // Try to find existing conversation
      const { data: existingConv } = await supabaseAdmin
        .from("conversations")
        .select("id")
        .or(`brand_owner_id.eq.${senderId},influencer_id.eq.${senderId}`)
        .or(`brand_owner_id.eq.${receiver_id},influencer_id.eq.${receiver_id}`)
        .eq("campaign_id", campaign_id || null)
        .eq("bid_id", bid_id || null)
        .single();

      if (existingConv) {
        conversationId = existingConv.id;
      } else {
        // Create new conversation dynamically
        const conversationData = {
          brand_owner_id: req.user.role === "brand_owner" ? senderId : receiver_id,
          influencer_id: req.user.role === "influencer" ? senderId : receiver_id,
          chat_status: "realtime",
          payment_required: false,
          payment_completed: false,
        };

        // Add campaign_id or bid_id if provided
        if (campaign_id) {
          conversationData.campaign_id = campaign_id;
        } else if (bid_id) {
          conversationData.bid_id = bid_id;
        }

        const { data: newConversation, error: convError } = await supabaseAdmin
          .from("conversations")
          .insert(conversationData)
          .select()
          .single();

        if (convError) {
          return res.status(500).json({
            success: false,
            message: "Failed to create conversation",
          });
        }

        conversationId = newConversation.id;
      }
    }

    // Continue with message sending...
  } catch (error) {
    // Error handling
  }
}
```

### 2. Campaign Conversation Creation

**File**: `controllers/campaignController.js` (lines 717-776)

```javascript
async initializeCampaignConversation(req, res) {
  try {
    const { campaign_id, influencer_id } = req.body;

    // Verify user is the brand owner of this campaign
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from("campaigns")
      .select("created_by")
      .eq("id", campaign_id)
      .single();

    if (campaign.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the campaign creator can initialize conversations",
      });
    }

    const result = await automatedFlowService.initializeCampaignConversation(
      campaign_id,
      influencer_id
    );

    res.json({
      success: true,
      message: "Campaign conversation initialized successfully",
      conversation: result.conversation,
      flow_state: result.flow_state,
      awaiting_role: result.awaiting_role,
    });
  } catch (error) {
    // Error handling
  }
}
```

### 3. Bid Conversation Creation

**File**: `controllers/bidController.js` (lines 699-794)

```javascript
async initializeBidConversation(req, res) {
  try {
    const { bid_id, influencer_id, proposed_amount } = req.body;

    // Verify user is the brand owner of this bid
    const { data: bid, error: bidError } = await supabaseAdmin
      .from("bids")
      .select("created_by")
      .eq("id", bid_id)
      .single();

    if (bid.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the bid creator can initialize conversations",
      });
    }

    const result = await automatedFlowService.initializeBidConversation(
      bid_id,
      influencer_id,
      proposed_amount
    );

    res.json({
      success: true,
      message: "Bid conversation initialized successfully",
      conversation: result.conversation,
      flow_state: result.flow_state,
      awaiting_role: result.awaiting_role,
    });
  } catch (error) {
    // Error handling
  }
}
```

---

## 📡 API Endpoints

### Conversation Management

#### Get Conversations
```http
GET /api/messages/conversations
GET /api/messages/conversations/direct
GET /api/messages/conversations/campaigns
GET /api/messages/conversations/bids
```

**Query Parameters**:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

**Response**:
```json
{
  "success": true,
  "conversations": [
    {
      "id": "conversation-uuid",
      "conversation_type": "direct|campaign|bid",
      "conversation_title": "Direct Chat|Campaign Name|Bid Title",
      "other_user": {
        "id": "user-uuid",
        "name": "User Name",
        "role": "brand_owner|influencer"
      },
      "last_message": {
        "message": "Last message text",
        "created_at": "2024-01-01T10:00:00Z",
        "sender_id": "user-uuid"
      },
      "unread_count": 5,
      "flow_state": "payment_pending|work_in_progress|completed",
      "awaiting_role": "brand_owner|influencer|null",
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25
  }
}
```

#### Get Messages
```http
GET /api/messages/conversations/:conversation_id/messages
```

**Query Parameters**:
- `page` - Page number (default: 1)
- `limit` - Messages per page (default: 50)

**Response**:
```json
{
  "success": true,
  "messages": [
    {
      "id": "message-uuid",
      "conversation_id": "conversation-uuid",
      "sender_id": "user-uuid",
      "receiver_id": "user-uuid",
      "message": "Message text",
      "message_type": "text|image|file|automated",
      "media_url": "https://storage.url/file.jpg",
      "status": "sent|delivered|read",
      "created_at": "2024-01-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100
  }
}
```

#### Send Message
```http
POST /api/messages/conversations/:conversation_id/messages
POST /api/messages/
```

**Request Body**:
```json
{
  "conversation_id": "conversation-uuid", // Optional if creating new conversation
  "receiver_id": "user-uuid", // Required if creating new conversation
  "message": "Message text",
  "message_type": "text|image|file",
  "media_url": "https://storage.url/file.jpg", // Optional
  "campaign_id": "campaign-uuid", // Optional for campaign conversations
  "bid_id": "bid-uuid" // Optional for bid conversations
}
```

**Response**:
```json
{
  "success": true,
  "message": {
    "id": "message-uuid",
    "conversation_id": "conversation-uuid",
    "sender_id": "user-uuid",
    "receiver_id": "user-uuid",
    "message": "Message text",
    "message_type": "text",
    "status": "sent",
    "created_at": "2024-01-01T10:00:00Z"
  },
  "conversation": {
    "id": "conversation-uuid",
    "brand_owner_id": "user-uuid",
    "influencer_id": "user-uuid",
    "chat_status": "realtime",
    "flow_state": "active",
    "awaiting_role": null
  }
}
```

#### Mark Messages as Seen
```http
PUT /api/messages/conversations/:conversation_id/seen
```

**Response**:
```json
{
  "success": true,
  "message": "Messages marked as seen"
}
```

### Direct Connect Endpoints

#### Initiate Direct Connect
```http
POST /api/messages/direct-connect
```

**Request Body**:
```json
{
  "receiver_id": "user-uuid",
  "message": "Hello, I'd like to connect with you"
}
```

#### Get Direct Connections
```http
GET /api/messages/direct-connections
```

#### Send Direct Message
```http
POST /api/messages/direct-message
```

**Request Body**:
```json
{
  "receiver_id": "user-uuid",
  "message": "Direct message text"
}
```

---

## 🔌 Socket.IO Integration

### Connection Setup
**File**: `sockets/messageHandler.js`

```javascript
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);
  messageHandler.handleConnection(socket);
});
```

### Socket Events

#### Client → Server Events
```javascript
// Join user room
socket.emit('join', { userId: 'user-uuid' });

// Join conversation room
socket.emit('join_conversation', { conversationId: 'conversation-uuid' });

// Send message
socket.emit('send_message', {
  conversation_id: 'conversation-uuid',
  receiver_id: 'user-uuid',
  message: 'Message text',
  message_type: 'text'
});

// Mark message as read
socket.emit('mark_read', { messageId: 'message-uuid' });

// Typing indicators
socket.emit('typing_start', { conversationId: 'conversation-uuid' });
socket.emit('typing_stop', { conversationId: 'conversation-uuid' });
```

#### Server → Client Events
```javascript
// New message received
socket.on('new_message', (data) => {
  console.log('New message:', data);
});

// Message status update
socket.on('message_status', (data) => {
  console.log('Message status:', data);
});

// User typing indicator
socket.on('user_typing', (data) => {
  console.log('User typing:', data);
});

// User online/offline status
socket.on('user_status_change', (data) => {
  console.log('User status:', data);
});

// Notification
socket.on('notification', (data) => {
  console.log('Notification:', data);
});
```

---

## 🤖 Automated Flow Integration

### Campaign Flow
**File**: `services/automatedFlowService.js`

```javascript
async initializeCampaignConversation(campaignId, influencerId) {
  // 1. Get campaign details
  // 2. Check if conversation already exists
  // 3. Create request record
  // 4. Create conversation
  // 5. Send automated welcome message
  // 6. Set up flow state
  // 7. Emit socket events
}
```

### Bid Flow
```javascript
async initializeBidConversation(bidId, influencerId, proposedAmount) {
  // 1. Get bid details
  // 2. Check if bid has expired
  // 3. Create request record with payment details
  // 4. Create conversation
  // 5. Send automated welcome message
  // 6. Set up flow state
  // 7. Emit socket events
}
```

---

## 🔐 Security & Permissions

### Role-Based Access
- **Brand Owners**: Can initiate conversations with influencers
- **Influencers**: Can respond to conversations and initiate direct messages
- **Admins**: Full access to all conversations

### Conversation Access Control
```javascript
// Check if user is part of this conversation
if (conversation.brand_owner_id !== userId && conversation.influencer_id !== userId) {
  return res.status(403).json({
    success: false,
    message: "Access denied"
  });
}
```

### Message Validation
```javascript
const validateSendMessage = [
  body('message')
    .notEmpty()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message is required and must be between 1 and 2000 characters'),
  body('receiver_id')
    .optional()
    .isUUID()
    .withMessage('Receiver ID must be a valid UUID'),
  body('conversation_id')
    .optional()
    .isUUID()
    .withMessage('Conversation ID must be a valid UUID')
];
```

---

## 📊 Message Status Tracking

### Status Flow
1. **sent** - Message sent successfully
2. **delivered** - Message delivered to recipient
3. **read** - Message read by recipient

### Status Updates
```javascript
// Update message status
async updateMessageStatus(messageId, status) {
  const { error } = await supabaseAdmin
    .from('messages')
    .update({ 
      status: status,
      updated_at: new Date().toISOString()
    })
    .eq('id', messageId);
}
```

---

## 🔄 Real-time Features

### Typing Indicators
```javascript
// Start typing
socket.emit('typing_start', { conversationId });

// Stop typing
socket.emit('typing_stop', { conversationId });
```

### Online/Offline Status
```javascript
// User comes online
socket.on('join', (data) => {
  socket.userId = data.userId;
  socket.join(`user_${data.userId}`);
  // Send pending notifications
  messageHandler.sendPendingNotifications(data.userId);
});

// User goes offline
socket.on('disconnect', () => {
  // Handle offline status
});
```

### Message Delivery
```javascript
// Real-time message delivery
io.to(`conversation_${conversationId}`).emit('new_message', {
  conversation_id: conversationId,
  message: messageData
});
```

---

## 🚀 Usage Examples

### Frontend Integration

#### Send Direct Message
```javascript
// Send a direct message
const sendDirectMessage = async (receiverId, message) => {
  const response = await fetch('/api/messages/direct-message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      receiver_id: receiverId,
      message: message
    })
  });
  
  return response.json();
};
```

#### Get Conversations
```javascript
// Get all conversations
const getConversations = async (type = 'all') => {
  const response = await fetch(`/api/messages/conversations/${type}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
};
```

#### Socket Connection
```javascript
// Connect to socket
const socket = io('ws://localhost:3000', {
  auth: { token: userToken }
});

// Listen for new messages
socket.on('new_message', (data) => {
  console.log('New message received:', data);
  // Update UI with new message
});

// Send message via socket
socket.emit('send_message', {
  conversation_id: conversationId,
  receiver_id: receiverId,
  message: messageText
});
```

---

## 📝 Summary

The direct messaging and conversation creation system in Stoory provides:

1. **Multiple Conversation Types** - Direct, campaign, and bid conversations
2. **Real-time Communication** - Socket.IO integration for instant messaging
3. **Automated Flows** - Structured conversations for campaigns and bids
4. **Role-based Access** - Secure access control based on user roles
5. **Message Status Tracking** - Sent, delivered, and read statuses
6. **Rich Features** - Typing indicators, online status, notifications
7. **Scalable Architecture** - Clean separation of concerns and modular design

The system handles both simple direct messaging and complex automated flows for business transactions, providing a comprehensive communication platform for the Stoory ecosystem.
