# 🚀 Frontend API Endpoints Guide - Automated Chat System

## 📋 Overview

This guide provides the **correct API endpoints** for implementing the automated chat system. The frontend was previously using wrong endpoints, which caused the "API route not found" errors.

---

## 🎯 **Core API Endpoints**

### **1. Conversation Initialization**
```typescript
// Initialize a new bid conversation
POST /api/bids/automated/initialize
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "bid_id": "string",           // UUID of the bid
  "influencer_id": "string",    // UUID of the influencer
  "proposed_amount": number     // Amount proposed by influencer
}

Response:
{
  "success": true,
  "message": "Automated conversation initialized successfully",
  "conversation": {
    "id": "string",
    "flow_state": "influencer_responding",
    "awaiting_role": "influencer",
    "bid_id": "string",
    "brand_owner_id": "string",
    "influencer_id": "string"
  },
  "flow_state": "influencer_responding",
  "awaiting_role": "influencer"
}
```

### **2. Brand Owner Actions**
```typescript
// Handle brand owner actions in automated flow
POST /api/bids/automated/brand-owner-action
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "conversation_id": "string",  // UUID of the conversation
  "action": "string",           // Action to perform
  "data": {}                    // Optional data for the action
}

Available Actions:
- "send_project_details" or "project_details" → requires { details: string }
- "send_price_offer" or "price_offer" → requires { price: number }
- "send_negotiated_price" → requires { price: number }

Response:
{
  "success": true,
  "conversation": {
    "id": "string",
    "flow_state": "new_state",
    "awaiting_role": "new_role"
  },
  "message": { /* Main message object */ },
  "audit_message": { /* Audit message object */ }
}
```

### **3. Influencer Actions**
```typescript
// Handle influencer actions in automated flow
POST /api/bids/automated/influencer-action
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "conversation_id": "string",  // UUID of the conversation
  "action": "string",           // Action to perform
  "data": {}                    // Optional data for the action
}

Available Actions:
- "accept" or "accept_connection" → no data required
- "reject" or "reject_connection" → no data required
- "accept_project" → no data required
- "deny_project" → no data required
- "accept_price" → no data required
- "reject_price" → no data required
- "negotiate_price" → no data required

Response:
{
  "success": true,
  "conversation": {
    "id": "string",
    "flow_state": "new_state",
    "awaiting_role": "new_role"
  },
  "message": { /* Main message object */ },
  "audit_message": { /* Audit message object */ }
}
```

---

## 🔄 **Action Name Compatibility**

**✅ Both short and full action names are supported for better frontend compatibility:**

| Short Name | Full Name | Description |
|------------|-----------|-------------|
| `accept` | `accept_connection` | Influencer accepts connection |
| `reject` | `reject_connection` | Influencer rejects connection |
| `project_details` | `send_project_details` | Brand owner sends project details |
| `price_offer` | `send_price_offer` | Brand owner sends price offer |

**💡 Recommendation**: Use the **short names** for simplicity, but both will work!

---

## 🔌 **Frontend Implementation**

### **1. API Service Class**
```typescript
class AutomatedChatAPI {
  private baseURL: string;
  private token: string;

  constructor(baseURL: string, token: string) {
    this.baseURL = baseURL;
    this.token = token;
  }

  // Initialize conversation
  async initializeConversation(bidId: string, influencerId: string, proposedAmount: number) {
    const response = await fetch(`${this.baseURL}/api/bids/automated/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({
        bid_id: bidId,
        influencer_id: influencerId,
        proposed_amount: proposedAmount
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Send action
  async sendAction(
    conversationId: string, 
    action: string, 
    data?: any,
    userRole: 'brand_owner' | 'influencer'
  ) {
    const endpoint = userRole === 'brand_owner' 
      ? '/api/bids/automated/brand-owner-action'
      : '/api/bids/automated/influencer-action';

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        action: action,
        data: data || {}
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Get conversation context
  async getConversationContext(conversationId: string) {
    const response = await fetch(
      `${this.baseURL}/api/bids/automated/conversation/${conversationId}/context`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Get messages
  async getMessages(conversationId: string, page: number = 1, limit: number = 50) {
    const response = await fetch(
      `${this.baseURL}/api/conversations/${conversationId}/messages?page=${page}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Send regular message
  async sendMessage(conversationId: string, message: string, receiverId: string) {
    const response = await fetch(`${this.baseURL}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({
        message: message,
        receiver_id: receiverId
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}
```

### **2. Usage Examples**
```typescript
// Initialize the API service
const api = new AutomatedChatAPI('http://localhost:3000', userToken);

// Initialize a conversation
try {
  const result = await api.initializeConversation(
    'bid-uuid',
    'influencer-uuid',
    5000
  );
  
  console.log('Conversation initialized:', result.conversation.id);
  console.log('Flow state:', result.flow_state);
  console.log('Awaiting role:', result.awaiting_role);
} catch (error) {
  console.error('Failed to initialize conversation:', error);
}

// Send an action
try {
  const result = await api.sendAction(
    'conversation-uuid',
    'accept', // Using short name - will work!
    {},
    'influencer'
  );
  
  console.log('Action completed:', result.message);
  console.log('New flow state:', result.conversation.flow_state);
} catch (error) {
  console.error('Failed to send action:', error);
}

// Get conversation context
try {
  const context = await api.getConversationContext('conversation-uuid');
  console.log('Current flow state:', context.conversation.flow_state);
  console.log('Awaiting role:', context.conversation.awaiting_role);
} catch (error) {
  console.error('Failed to get context:', error);
}
```

---

## 🚨 **Common Errors & Solutions**

### **1. "API route not found" (404)**
**Problem**: Using wrong endpoint
**Solution**: Use the correct endpoints from this guide

### **2. "Conversation not found"**
**Problem**: Wrong conversation ID or conversation doesn't exist
**Solution**: 
- Verify conversation ID is correct
- Check if conversation was properly initialized
- Use `getConversationContext` to verify

### **3. "Action not valid for current state"**
**Problem**: Trying to perform action in wrong flow state
**Solution**: 
- Check current `flow_state` using `getConversationContext`
- Only show actions valid for current state
- Wait for state to change before allowing action

### **4. "Missing required parameters"**
**Problem**: Not sending required data for actions
**Solution**: 
- Check action requirements in this guide
- Send required data in the `data` field
- Validate input before sending

### **5. "Unknown action" (500)**
**Problem**: Using unsupported action names
**Solution**: 
- Use the action names listed in this guide
- Both short and full names are supported
- Check spelling and case sensitivity

---

## 📱 **Mobile/React Native Considerations**

### **1. Error Handling**
```typescript
// Handle network errors gracefully
const handleAPIError = (error: any) => {
  if (error.message.includes('Network request failed')) {
    showErrorMessage('Network error. Please check your connection.');
  } else if (error.message.includes('401')) {
    showErrorMessage('Session expired. Please login again.');
  } else if (error.message.includes('404')) {
    showErrorMessage('Resource not found. Please refresh.');
  } else if (error.message.includes('Unknown action')) {
    showErrorMessage('Invalid action. Please try again.');
  } else {
    showErrorMessage('An error occurred. Please try again.');
  }
};
```

### **2. Loading States**
```typescript
const [loading, setLoading] = useState(false);

const handleAction = async (action: string, data?: any) => {
  setLoading(true);
  try {
    const result = await api.sendAction(conversationId, action, data, userRole);
    handleSuccess(result);
  } catch (error) {
    handleAPIError(error);
  } finally {
    setLoading(false);
  }
};
```

---

## 🧪 **Testing**

### **1. Test API Endpoints**
```typescript
// Test conversation initialization
describe('Conversation Initialization', () => {
  test('should initialize conversation successfully', async () => {
    const result = await api.initializeConversation(
      'test-bid-id',
      'test-influencer-id',
      5000
    );
    
    expect(result.success).toBe(true);
    expect(result.conversation.flow_state).toBe('influencer_responding');
    expect(result.conversation.awaiting_role).toBe('influencer');
  });
});

// Test action sending with short names
describe('Action Sending', () => {
  test('should send accept action successfully', async () => {
    const result = await api.sendAction(
      'test-conversation-id',
      'accept', // Short name works!
      {},
      'influencer'
    );
    
    expect(result.success).toBe(true);
    expect(result.conversation.flow_state).toBe('brand_owner_details');
  });
});
```

---

## 📚 **Quick Reference**

| Purpose | Method | Endpoint | Required Body |
|---------|--------|----------|---------------|
| **Initialize** | POST | `/api/bids/automated/initialize` | `{ bid_id, influencer_id, proposed_amount }` |
| **Brand Owner Action** | POST | `/api/bids/automated/brand-owner-action` | `{ conversation_id, action, data? }` |
| **Influencer Action** | POST | `/api/bids/automated/influencer-action` | `{ conversation_id, action, data? }` |
| **Get Context** | GET | `/api/bids/automated/conversation/{id}/context` | None |
| **Get Messages** | GET | `/api/conversations/{id}/messages` | None |
| **Send Message** | POST | `/api/conversations/{id}/messages` | `{ message, receiver_id }` |

---

## 🎉 **Conclusion**

This guide provides all the **correct API endpoints** for your automated chat system. The key points are:

1. ✅ **Use `/api/bids/automated/...`** for automated flow actions
2. ✅ **Use `/api/conversations/{id}/messages`** for regular messages
3. ✅ **Always include `Authorization: Bearer {token}`** header
4. ✅ **Send `conversation_id` in the body** for actions
5. ✅ **Check flow state** before allowing actions
6. ✅ **Both short and full action names work** - use what's convenient!

**🚀 Your frontend can now use `accept` instead of `accept_connection` - it will work perfectly!**

For any questions or clarifications, refer to the backend API documentation or contact the backend team! 🚀
