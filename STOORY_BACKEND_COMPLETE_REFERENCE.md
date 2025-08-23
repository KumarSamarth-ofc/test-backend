# 🚀 STOORY BACKEND - Complete Reference Guide

## 📋 **Overview**

This is the **single source of truth** for the entire Stoory backend system. It covers everything from basic setup to advanced features, including all APIs, implementations, troubleshooting, and future development.

---

## 🏗️ **System Architecture**

### **Core Components:**
1. **User Management**: Authentication, roles, profiles
2. **Campaign System**: Brand owner campaigns and management
3. **Bid System**: Influencer applications and bidding
4. **Request System**: Influencer applications to campaigns/bids
5. **Chat System**: Direct messaging + Automated flow messaging
6. **Payment System**: Razorpay integration
7. **Subscription System**: Premium features and billing

### **Technology Stack:**
- **Backend**: Node.js + Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT + Supabase Auth
- **Real-time**: Socket.io + Supabase Realtime
- **File Storage**: Supabase Storage
- **Payment**: Razorpay

---

## 🔑 **1. User Management & Authentication**

### **1.1 User Roles**
- **`influencer`**: Content creators who apply to campaigns/bids
- **`brand_owner`**: Businesses who create campaigns and hire influencers
- **`admin`**: System administrators with full access

### **1.2 Authentication Endpoints**
```http
POST /api/auth/register          # User registration
POST /api/auth/login             # User login
POST /api/auth/refresh           # Refresh JWT token
GET  /api/auth/profile           # Get user profile
PUT  /api/auth/profile           # Update user profile
```

### **1.3 JWT Token Structure**
```json
{
  "id": "user_uuid",
  "phone": "+1234567890",
  "role": "brand_owner",
  "iat": 1755868593,
  "exp": 1756473393
}
```

---

## 🎯 **2. Campaign System**

### **2.1 Campaign Management**
```http
POST   /api/campaigns                    # Create campaign
GET    /api/campaigns                     # List campaigns
GET    /api/campaigns/:id                 # Get campaign details
PUT    /api/campaigns/:id                 # Update campaign
DELETE /api/campaigns/:id                 # Delete campaign
GET    /api/campaigns/:id/applications    # Get campaign applications
```

### **2.2 Campaign Data Structure**
```json
{
  "id": "campaign_uuid",
  "title": "Summer Campaign 2024",
  "description": "Promote our summer collection",
  "budget": 10000,
  "status": "open",
  "requirements": "Instagram posts, Stories",
  "language": "English",
  "platform": "Instagram",
  "content_type": "posts",
  "category": "fashion",
  "created_by": "brand_owner_uuid",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

## 💰 **3. Bid System**

### **3.1 Bid Management**
```http
POST   /api/bids                        # Create bid
GET    /api/bids                         # List bids
GET    /api/bids/:id                     # Get bid details
PUT    /api/bids/:id                     # Update bid
DELETE /api/bids/:id                     # Delete bid
GET    /api/bids/:id/applications        # Get bid applications
```

### **3.2 Bid Data Structure**
```json
{
  "id": "bid_uuid",
  "title": "Quick Video Promotion",
  "description": "Create short promotional videos",
  "min_budget": 3000,
  "max_budget": 8000,
  "status": "open",
  "requirements": "15-30 second videos",
  "language": "English",
  "platform": "TikTok",
  "content_type": "videos",
  "category": "marketing",
  "created_by": "brand_owner_uuid",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

## 📝 **4. Request System (Influencer Applications)**

### **4.1 Request Endpoints**
```http
POST   /api/requests                    # Create application
GET    /api/requests                     # List applications
GET    /api/requests/:id                 # Get application details
PUT    /api/requests/:id                 # Update application
DELETE /api/requests/:id                 # Withdraw application
PUT    /api/requests/:id/status          # Update status
PUT    /api/requests/:id/amount          # Update agreed amount
POST   /api/requests/:id/payment        # Process payment
```

### **4.2 Request Data Structure**
```json
{
  "id": "request_uuid",
  "campaign_id": "campaign_uuid",
  "bid_id": "bid_uuid",
  "influencer_id": "influencer_uuid",
  "status": "pending",
  "proposed_amount": 5000,
  "agreed_amount": null,
  "message": "I'm interested in this campaign!",
  "portfolio_links": ["https://example.com/portfolio"],
  "created_at": "2024-01-15T10:30:00Z"
}
```

### **4.3 Request Statuses**
- **`pending`**: Application submitted, waiting for review
- **`approved`**: Application accepted by brand owner
- **`rejected`**: Application declined
- **`in_progress`**: Work has started
- **`completed`**: Work finished and approved
- **`cancelled`**: Application withdrawn or cancelled

---

## 💬 **5. Chat System - Dual Architecture**

### **5.1 System Overview**
The chat system handles **TWO parallel messaging systems**:

1. **Direct Messaging**: Traditional user-to-user chat
2. **Automated Flow Messaging**: Structured conversations with business logic

### **5.2 Direct Messaging System**

#### **Get Direct Conversations**
```http
GET /api/messages/conversations/direct
```

**Response:**
```json
{
  "success": true,
  "conversations": [
    {
      "id": "conversation_uuid",
      "brand_owner_id": "brand_owner_uuid",
      "influencer_id": "influencer_uuid",
      "chat_status": "direct",
      "created_at": "2024-01-15T10:30:00Z",
      "last_message": {
        "id": "message_uuid",
        "message": "Hello! How are you doing?",
        "created_at": "2024-01-15T10:35:00Z",
        "sender_id": "sender_uuid"
      },
      "other_user": {
        "id": "other_user_uuid",
        "name": "John Doe",
        "role": "influencer"
      }
    }
  ]
}
```

#### **Get Direct Messages**
```http
GET /api/messages/conversations/:conversation_id/messages
```

#### **Send Direct Message**
```http
POST /api/messages
```

**Request Body:**
```json
{
  "conversation_id": "conversation_uuid",
  "message": "Hello! This is my message",
  "media_url": "https://example.com/image.jpg" // Optional
}
```

### **5.3 Automated Flow Messaging System**

#### **Initialize Automated Conversation**
```http
POST /api/bids/automated/initialize
```

**Request Body:**
```json
{
  "bid_id": "bid_uuid",
  "influencer_id": "influencer_uuid",
  "proposed_amount": 5000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Automated conversation initialized successfully",
  "conversation": {
    "id": "conversation_uuid",
    "bid_id": "bid_uuid",
    "brand_owner_id": "brand_owner_uuid",
    "influencer_id": "influencer_uuid",
    "flow_state": "initial",
    "awaiting_role": "brand_owner",
    "chat_status": "automated",
    "automation_enabled": true,
    "flow_data": {
      "proposed_amount": 5000,
      "bid_title": "Summer Campaign 2024"
    }
  },
  "flow_state": "initial",
  "awaiting_role": "brand_owner",
  "is_existing": false
}
```

#### **Get Automated Conversations**
```http
GET /api/messages/conversations/bids
```

#### **Get Automated Messages**
```http
GET /api/messages/conversations/:conversation_id/messages
```

**Response (Automated Flow):**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "message_uuid",
        "conversation_id": "conversation_uuid",
        "sender_id": "system_uuid",
        "message": "Welcome to the automated negotiation flow!",
        "message_type": "automated",
        "action_required": true,
        "action_data": {
          "buttons": [
            {
              "id": "accept_proposal",
              "text": "Accept Proposal",
              "action": "accept_proposal",
              "style": "success",
              "data": {
                "amount": 5000
              }
            },
            {
              "id": "negotiate",
              "text": "Negotiate Amount",
              "action": "negotiate_amount",
              "style": "primary"
            },
            {
              "id": "decline",
              "text": "Decline",
              "action": "decline_proposal",
              "style": "danger"
            }
          ]
        },
        "flow_context": {
          "current_state": "initial",
          "next_states": ["negotiating", "accepted", "declined"],
          "business_rules": {
            "can_negotiate": true,
            "min_amount": 3000,
            "max_amount": 8000
          }
        }
      }
    ],
    "conversation": {
      "id": "conversation_uuid",
      "flow_state": "initial",
      "awaiting_role": "brand_owner",
      "chat_status": "automated",
      "automation_enabled": true
    }
  }
}
```

#### **Handle Action Button Click**
```http
POST /api/messages/conversations/:conversation_id/button-click
```

**Request Body:**
```json
{
  "action": "accept_proposal",
  "data": {
    "amount": 5000,
    "additional_notes": "Great proposal, let's proceed!"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Action processed successfully",
  "next_flow_state": "accepted",
  "automated_response": {
    "message": "Great! Your proposal has been accepted. The influencer will be notified.",
    "action_required": false,
    "next_steps": [
      "Payment processing will begin",
      "Contract will be generated",
      "Work timeline will be shared"
    ]
  }
}
```

#### **Handle Text Input Submission**
```http
POST /api/messages/conversations/:conversation_id/text-input
```

**Request Body:**
```json
{
  "input_type": "negotiation_amount",
  "values": {
    "proposed_amount": 4500,
    "reasoning": "Based on market rates and campaign scope"
  }
}
```

### **5.4 Common Chat Endpoints**
```http
GET    /api/messages/conversations                    # All conversations
GET    /api/messages/conversations/campaigns          # Campaign conversations
PUT    /api/messages/conversations/:id/seen           # Mark as seen
GET    /api/messages/unread-count                     # Get unread count
DELETE /api/messages/:message_id                      # Delete message
```

---

## 💳 **6. Payment System**

### **6.1 Payment Endpoints**
```http
POST   /api/payments/create-order        # Create Razorpay order
POST   /api/payments/verify-payment      # Verify payment signature
GET    /api/payments/orders              # List payment orders
GET    /api/payments/orders/:id          # Get order details
```

### **6.2 Payment Flow**
1. **Create Order**: Generate Razorpay order with amount
2. **Frontend Payment**: User completes payment on frontend
3. **Verify Payment**: Backend verifies payment signature
4. **Update Status**: Mark request as paid and update database

---

## 🔄 **7. Subscription System**

### **7.1 Subscription Endpoints**
```http
POST   /api/subscriptions/create         # Create subscription
GET    /api/subscriptions                # List subscriptions
GET    /api/subscriptions/:id            # Get subscription details
PUT    /api/subscriptions/:id/cancel     # Cancel subscription
POST   /api/subscriptions/:id/upgrade    # Upgrade subscription
```

### **7.2 Subscription Plans**
- **Basic**: Limited campaigns, basic features
- **Premium**: Unlimited campaigns, advanced features
- **Enterprise**: Custom features, dedicated support

---

## 📊 **8. Database Schema**

### **8.1 Core Tables**

#### **Users Table**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255),
  role VARCHAR(20) NOT NULL CHECK (role IN ('influencer', 'brand_owner', 'admin')),
  profile_image_url TEXT,
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **Campaigns Table**
```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  budget DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  requirements TEXT,
  language VARCHAR(50),
  platform VARCHAR(50),
  content_type VARCHAR(50),
  category VARCHAR(50),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **Bids Table**
```sql
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  min_budget DECIMAL(10,2) NOT NULL,
  max_budget DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  requirements TEXT,
  language VARCHAR(50),
  platform VARCHAR(50),
  content_type VARCHAR(50),
  category VARCHAR(50),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **Requests Table**
```sql
CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  bid_id UUID REFERENCES bids(id),
  influencer_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled')),
  proposed_amount DECIMAL(10,2) NOT NULL,
  agreed_amount DECIMAL(10,2),
  message TEXT,
  portfolio_links TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure only one of campaign_id or bid_id is set
  CONSTRAINT check_request_source CHECK (
    (campaign_id IS NOT NULL AND bid_id IS NULL) OR
    (campaign_id IS NULL AND bid_id IS NOT NULL)
  )
);
```

#### **Conversations Table**
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  bid_id UUID REFERENCES bids(id),
  brand_owner_id UUID REFERENCES users(id),
  influencer_id UUID REFERENCES users(id),
  chat_status VARCHAR(20) DEFAULT 'direct' CHECK (chat_status IN ('direct', 'automated', 'completed')),
  flow_state VARCHAR(50),
  awaiting_role VARCHAR(20),
  flow_data JSONB,
  automation_enabled BOOLEAN DEFAULT FALSE,
  payment_required BOOLEAN DEFAULT FALSE,
  payment_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure proper conversation categorization
  CONSTRAINT conversations_context_unique CHECK (
    -- For campaign conversations: ensure unique per campaign context
    (campaign_id IS NOT NULL AND bid_id IS NULL) OR
    -- For bid conversations: ensure unique per bid context
    (campaign_id IS NULL AND bid_id IS NOT NULL) OR
    -- For direct conversations: no campaign or bid
    (campaign_id IS NULL AND bid_id IS NULL)
  )
);
```

#### **Messages Table**
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  receiver_id UUID REFERENCES users(id),
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'user' CHECK (message_type IN ('user', 'system', 'automated')),
  action_required BOOLEAN DEFAULT FALSE,
  action_data JSONB,
  media_url TEXT,
  metadata JSONB,
  seen BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **8.2 Indexes**
```sql
-- Performance indexes
CREATE INDEX idx_campaigns_created_by ON campaigns(created_by);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_bids_created_by ON bids(created_by);
CREATE INDEX idx_bids_status ON bids(status);
CREATE INDEX idx_requests_campaign_id ON requests(campaign_id);
CREATE INDEX idx_requests_bid_id ON requests(bid_id);
CREATE INDEX idx_requests_influencer_id ON requests(influencer_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_conversations_campaign_id ON conversations(campaign_id);
CREATE INDEX idx_conversations_bid_id ON conversations(bid_id);
CREATE INDEX idx_conversations_brand_owner_id ON conversations(brand_owner_id);
CREATE INDEX idx_conversations_influencer_id ON conversations(influencer_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
```

---

## 🔧 **9. Frontend Implementation Guide**

### **9.1 Chat Service (chatService.ts)**
```typescript
import { apiService } from './apiService';

export interface DirectConversation {
  id: string;
  brand_owner_id: string;
  influencer_id: string;
  chat_status: 'direct';
  created_at: string;
  last_message?: {
    id: string;
    message: string;
    created_at: string;
    sender_id: string;
  };
  other_user: {
    id: string;
    name: string;
    role: string;
  };
}

export interface AutomatedConversation {
  id: string;
  bid_id: string;
  flow_state: string;
  awaiting_role: string;
  chat_status: 'automated';
  automation_enabled: boolean;
  flow_data: {
    proposed_amount: number;
    bid_title: string;
    [key: string]: any;
  };
  last_message?: {
    id: string;
    message: string;
    action_required: boolean;
    action_data?: ActionData;
  };
}

export interface ActionData {
  buttons?: Array<{
    id: string;
    text: string;
    action: string;
    data?: any;
    style?: 'primary' | 'success' | 'danger' | 'warning' | 'info';
  }>;
  input_fields?: Array<{
    id: string;
    label: string;
    type: 'text' | 'number' | 'email' | 'textarea';
    placeholder?: string;
    required?: boolean;
  }>;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  message_type: 'user' | 'system' | 'automated';
  action_required: boolean;
  action_data?: ActionData;
  flow_context?: {
    current_state: string;
    next_states: string[];
    business_rules: any;
  };
  created_at: string;
}

class ChatService {
  // === DIRECT MESSAGING ===
  
  async getDirectConversations(): Promise<DirectConversation[]> {
    const response = await apiService.get('/api/messages/conversations/direct');
    return response.success ? response.conversations : [];
  }

  async getDirectMessages(conversationId: string): Promise<Message[]> {
    const response = await apiService.get(`/api/messages/conversations/${conversationId}/messages`);
    return response.success ? response.data.messages : [];
  }

  async sendDirectMessage(conversationId: string, message: string, mediaUrl?: string): Promise<boolean> {
    const response = await apiService.post('/api/messages', {
      conversation_id: conversationId,
      message: message,
      media_url: mediaUrl
    });
    return response.success;
  }

  // === AUTOMATED FLOW MESSAGING ===
  
  async initializeAutomatedConversation(bidId: string, influencerId: string, proposedAmount: number) {
    const response = await apiService.post('/api/bids/automated/initialize', {
      bid_id: bidId,
      influencer_id: influencerId,
      proposed_amount: proposedAmount
    });
    return response;
  }

  async getAutomatedConversations(): Promise<AutomatedConversation[]> {
    const response = await apiService.get('/api/messages/conversations/bids');
    return response.success ? response.conversations : [];
  }

  async getAutomatedMessages(conversationId: string): Promise<Message[]> {
    const response = await apiService.get(`/api/messages/conversations/${conversationId}/messages`);
    return response.success ? response.data.messages : [];
  }

  async handleActionButton(conversationId: string, action: string, data?: any) {
    const response = await apiService.post(`/api/messages/conversations/${conversationId}/button-click`, {
      action,
      data
    });
    return response;
  }

  async handleTextInput(conversationId: string, inputData: any) {
    const response = await apiService.post(`/api/messages/conversations/${conversationId}/text-input`, inputData);
    return response;
  }

  // === COMMON ===
  
  async markConversationAsSeen(conversationId: string): Promise<boolean> {
    const response = await apiService.put(`/api/messages/conversations/${conversationId}/seen`);
    return response.success;
  }
}

export const chatService = new ChatService();
```

### **9.2 Key Frontend Screens**

#### **ChatListScreen**
- Tab navigation (All, Direct, Automated)
- Separate rendering for each conversation type
- Real-time updates

#### **DirectChatScreen**
- Traditional text input and send
- Real-time message updates
- Simple chat interface

#### **AutomatedChatScreen**
- Action buttons with different styles
- Input forms for structured data
- Flow state tracking
- Business rule validation

---

## 🚀 **10. Real-Time Features**

### **10.1 WebSocket Events**
```typescript
// Listen for new messages
socket.on('new_message', (data) => {
  // Update chat with new message
});

// Listen for typing indicators
socket.on('typing', (data) => {
  // Show typing indicator
});

// Listen for conversation updates
socket.on('conversation_updated', (data) => {
  // Refresh conversation list
});
```

### **10.2 Real-Time Updates**
- **New messages** appear instantly
- **Typing indicators** show user activity
- **Status changes** update in real-time
- **Flow state changes** trigger UI updates

---

## 🔍 **11. Troubleshooting & Debugging**

### **11.1 Common Issues**

#### **Conversations Not Loading**
- Check user authentication and role
- Verify database constraints
- Check API endpoint responses

#### **Automated Flow Errors**
- Verify flow state transitions
- Check business rule validation
- Ensure proper action data structure

#### **Real-Time Issues**
- Check WebSocket connection
- Verify event handlers
- Check authentication tokens

### **11.2 Debug Endpoints**
```http
GET /api/debug/conversations/:id    # Debug conversation data
GET /api/debug/messages/:id         # Debug message data
GET /api/debug/flow/:id             # Debug flow state
```

---

## 📈 **12. Performance & Scaling**

### **12.1 Database Optimization**
- **Indexes** on frequently queried columns
- **Connection pooling** for database connections
- **Query optimization** for complex joins

### **12.2 Caching Strategy**
- **Redis** for session storage
- **In-memory caching** for frequently accessed data
- **CDN** for static assets

### **12.3 Load Balancing**
- **Horizontal scaling** with multiple server instances
- **Load balancer** for traffic distribution
- **Auto-scaling** based on demand

---

## 🔒 **13. Security & Privacy**

### **13.1 Authentication**
- **JWT tokens** with expiration
- **Role-based access control** (RBAC)
- **Secure password hashing**

### **13.2 Data Protection**
- **Row Level Security** (RLS) in Supabase
- **Input validation** and sanitization
- **SQL injection prevention**

### **13.3 API Security**
- **Rate limiting** to prevent abuse
- **CORS configuration** for frontend access
- **Request validation** middleware

---

## 🧪 **14. Testing Strategy**

### **14.1 Unit Tests**
- **API endpoint testing** with Jest
- **Service layer testing** for business logic
- **Database query testing**

### **14.2 Integration Tests**
- **End-to-end API testing**
- **Database integration testing**
- **Authentication flow testing**

### **14.3 Load Testing**
- **Performance testing** with Artillery
- **Stress testing** for high traffic
- **Database performance testing**

---

## 📚 **15. Development Workflow**

### **15.1 Code Organization**
```
src/
├── controllers/          # API route handlers
├── middleware/           # Express middleware
├── routes/              # API route definitions
├── services/            # Business logic
├── utils/               # Helper functions
├── database/            # Database migrations
└── tests/               # Test files
```

### **15.2 Git Workflow**
- **Feature branches** for new development
- **Pull requests** for code review
- **Automated testing** on commits
- **Staging deployment** for testing

### **15.3 Deployment**
- **Environment variables** for configuration
- **Docker containers** for consistency
- **CI/CD pipeline** for automation
- **Monitoring and logging** for production

---

## 🎯 **16. Future Development**

### **16.1 Planned Features**
- **Advanced analytics** and reporting
- **Multi-language support** for international users
- **Mobile app** development
- **AI-powered matching** algorithms

### **16.2 Technical Improvements**
- **GraphQL API** for flexible data fetching
- **Microservices architecture** for scalability
- **Event-driven architecture** for real-time features
- **Machine learning** integration

---

## 📞 **17. Support & Maintenance**

### **17.1 Monitoring**
- **Application performance** monitoring
- **Database performance** tracking
- **Error tracking** and alerting
- **Uptime monitoring**

### **17.2 Backup & Recovery**
- **Automated database backups**
- **Point-in-time recovery** capabilities
- **Disaster recovery** procedures
- **Data retention** policies

---

## 🔗 **18. External Integrations**

### **18.1 Payment Gateway**
- **Razorpay** for payment processing
- **Webhook handling** for payment updates
- **Refund processing** capabilities

### **18.2 File Storage**
- **Supabase Storage** for media files
- **Image optimization** and compression
- **CDN integration** for fast delivery

### **18.3 Communication**
- **Email service** for notifications
- **SMS service** for alerts
- **Push notifications** for mobile

---

## 📋 **19. API Rate Limits**

### **19.1 Default Limits**
- **Authentication**: 5 requests per minute
- **General API**: 100 requests per minute
- **File uploads**: 10 requests per minute
- **Real-time events**: 1000 events per minute

### **19.2 Custom Limits**
- **Premium users**: Higher rate limits
- **Admin users**: Unlimited access
- **API keys**: Custom limits per key

---

## 🎉 **20. Conclusion**

This comprehensive guide covers the entire Stoory backend system, from basic setup to advanced features. It serves as the single source of truth for developers, frontend teams, and system administrators.

### **Key Takeaways:**
- **Dual chat system** for direct and automated messaging
- **Comprehensive API** covering all business functions
- **Scalable architecture** ready for growth
- **Security-first** approach to data protection
- **Real-time features** for modern user experience

### **Next Steps:**
1. **Implement frontend** using provided service examples
2. **Test all API endpoints** with provided payloads
3. **Set up monitoring** and error tracking
4. **Deploy to staging** for testing
5. **Go live** with production deployment

---

**🚀 Ready to build the future of influencer marketing! 🚀**
