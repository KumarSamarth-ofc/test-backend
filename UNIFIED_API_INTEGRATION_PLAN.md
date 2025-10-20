# Unified API Integration Plan - Bid & Campaign Flows

## Current State Analysis

### ✅ **Current Implementation Status**

**Campaign Flow:**
- `POST /api/campaigns/automated/influencer-action` → Returns: `{ success, conversation, message, audit_message, flow_state, awaiting_role }`
- `POST /api/campaigns/automated/brand-owner-action` → Returns: `{ success, conversation, message, audit_message, flow_state, awaiting_role }`
- WebSocket Events: `conversation_updated`, `new_message`

**Bid Flow:**
- `POST /api/bids/automated/influencer-action` → Returns: `result` (from automatedFlowService)
- `POST /api/bids/automated/brand-owner-action` → Returns: `result` (from automatedFlowService)
- WebSocket Events: `conversation_updated`, `new_message`

**New Unified Approach:**
- `POST /api/conversations/:id/actions` → Returns: `{ success, conversation, message }`
- WebSocket Events: `conversation_state_changed`, `new_message`

---

## 🎯 **Unified API Standard**

### **1. Same API Endpoints**

**Replace all flows with:**
```javascript
// Single endpoint for all conversation actions
POST /api/conversations/:id/actions
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "action": "submit_work|request_revision|approve_work|close|accept_price|reject_price|negotiate_price",
  "payload": {
    "message": "Optional message",
    "attachments": [...],
    "data": {...} // Action-specific data
  }
}
```

### **2. Same Response Format**

**Standardized Response:**
```javascript
{
  "success": true,
  "conversation": {
    "id": "...",
    "flow_state": "work_submitted",
    "awaiting_role": "brand_owner",
    "chat_status": "automated",
    "brand_owner_id": "...",
    "influencer_id": "...",
    "flow_data": {...},
    "work_submission": {...},
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": {
    "id": "...",
    "conversation_id": "...",
    "sender_id": "...",
    "receiver_id": "...",
    "message": "Work submitted successfully",
    "message_type": "work_submission",
    "attachment_metadata": [...],
    "created_at": "2024-01-01T00:00:00Z"
  },
  "audit_message": {
    "id": "...",
    "conversation_id": "...",
    "sender_id": "00000000-0000-0000-0000-000000000000", // SYSTEM_USER_ID
    "receiver_id": "...",
    "message": "System: Work submission recorded",
    "message_type": "audit",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "flow_state": "work_submitted",
  "awaiting_role": "brand_owner"
}
```

### **3. Same WebSocket Events**

**Standardized WebSocket Events:**
```javascript
// State changes
socket.emit('conversation_state_changed', {
  conversation_id: "...",
  previous_state: "work_in_progress",
  new_state: "work_submitted",
  awaiting_role: "brand_owner",
  reason: "submit_work",
  timestamp: "2024-01-01T00:00:00Z"
});

// New messages
socket.emit('new_message', {
  conversation_id: "...",
  message: {...}, // The actual message object
  conversation_context: {
    id: "...",
    flow_state: "work_submitted",
    awaiting_role: "brand_owner",
    chat_status: "automated"
  }
});

// Conversation list updates
socket.emit('conversation_list_updated', {
  conversation_id: "...",
  conversation_context: {...},
  action: "state_changed",
  timestamp: "2024-01-01T00:00:00Z"
});
```

---

## 🔄 **Implementation Plan**

### **Phase 1: Standardize Response Format**

**Update BidController to match CampaignController:**

```javascript
// In BidController.handleInfluencerAction
res.json({
  success: true,
  conversation: result.conversation,
  message: result.message,
  audit_message: result.audit_message, // ✅ Add this
  flow_state: result.flow_state,
  awaiting_role: result.awaiting_role,
});
```

**Update BidController.handleBrandOwnerAction similarly.**

### **Phase 2: Standardize WebSocket Events**

**Update all controllers to emit same events:**

```javascript
// In all action handlers
const io = req.app.get("io");
if (io && result.success) {
  // Emit conversation state change
  io.to(`conversation_${conversation_id}`).emit('conversation_state_changed', {
    conversation_id: conversation_id,
    previous_state: conversation.flow_state,
    new_state: result.conversation.flow_state,
    awaiting_role: result.conversation.awaiting_role,
    reason: action,
    timestamp: new Date().toISOString()
  });

  // Emit new message events
  if (result.message) {
    io.to(`conversation_${conversation_id}`).emit('new_message', {
      conversation_id: conversation_id,
      message: result.message,
      conversation_context: {
        id: conversation_id,
        flow_state: result.conversation.flow_state,
        awaiting_role: result.conversation.awaiting_role,
        chat_status: result.conversation.chat_status
      }
    });
  }

  if (result.audit_message) {
    io.to(`conversation_${conversation_id}`).emit('new_message', {
      conversation_id: conversation_id,
      message: result.audit_message,
      conversation_context: {
        id: conversation_id,
        flow_state: result.conversation.flow_state,
        awaiting_role: result.conversation.awaiting_role,
        chat_status: result.conversation.chat_status
      }
    });
  }

  // Emit conversation list updates
  io.to(`user_${conversation.brand_owner_id}`).emit('conversation_list_updated', {
    conversation_id: conversation_id,
    conversation_context: {
      id: conversation_id,
      flow_state: result.conversation.flow_state,
      awaiting_role: result.conversation.awaiting_role,
      chat_status: result.conversation.chat_status
    },
    action: 'state_changed',
    timestamp: new Date().toISOString()
  });

  io.to(`user_${conversation.influencer_id}`).emit('conversation_list_updated', {
    conversation_id: conversation_id,
    conversation_context: {
      id: conversation_id,
      flow_state: result.conversation.flow_state,
      awaiting_role: result.conversation.awaiting_role,
      chat_status: result.conversation.chat_status
    },
    action: 'state_changed',
    timestamp: new Date().toISOString()
  });
}
```

### **Phase 3: Extend Unified Endpoint**

**Update ConversationController.performAction to handle all actions:**

```javascript
// In ConversationController.performAction
async performAction(req, res) {
  try {
    const { id } = req.params;
    const { action, payload = {} } = req.body || {};
    const userId = req.user.id;

    if (!action) {
      return res.status(400).json({ success: false, error: "action is required" });
    }

    const conv = await fetchConversation(id);

    // Role guards for all actions
    if (action === "submit_work" && req.user.role !== "influencer") {
      return res.status(403).json({ success: false, error: "Only influencer can submit work" });
    }
    if ((action === "request_revision" || action === "approve_work") && req.user.role !== "brand_owner") {
      return res.status(403).json({ success: false, error: "Only brand owner can perform this action" });
    }
    if ((action === "accept_price" || action === "reject_price" || action === "negotiate_price") && req.user.role !== "brand_owner") {
      return res.status(403).json({ success: false, error: "Only brand owner can perform this action" });
    }

    // State guards
    if (!canTransition(conv.flow_state, action)) {
      return res.status(409).json({ success: false, error: `Invalid state transition from ${conv.flow_state} via ${action}` });
    }

    // Handle all actions using automatedFlowService
    let result;
    if (req.user.role === "influencer") {
      result = await automatedFlowService.handleInfluencerAction(id, action, payload);
    } else if (req.user.role === "brand_owner") {
      result = await automatedFlowService.handleBrandOwnerAction(id, action, payload);
    } else {
      return res.status(403).json({ success: false, error: "Invalid role for this action" });
    }

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    // Emit WebSocket events
    const io = getIO(req);
    if (io) {
      // Emit conversation state change
      io.to(`conversation_${id}`).emit('conversation_state_changed', {
        conversation_id: id,
        previous_state: conv.flow_state,
        new_state: result.conversation.flow_state,
        awaiting_role: result.conversation.awaiting_role,
        reason: action,
        timestamp: new Date().toISOString()
      });

      // Emit new message events
      if (result.message) {
        io.to(`conversation_${id}`).emit('new_message', {
          conversation_id: id,
          message: result.message,
          conversation_context: {
            id: id,
            flow_state: result.conversation.flow_state,
            awaiting_role: result.conversation.awaiting_role,
            chat_status: result.conversation.chat_status
          }
        });
      }

      if (result.audit_message) {
        io.to(`conversation_${id}`).emit('new_message', {
          conversation_id: id,
          message: result.audit_message,
          conversation_context: {
            id: id,
            flow_state: result.conversation.flow_state,
            awaiting_role: result.conversation.awaiting_role,
            chat_status: result.conversation.chat_status
          }
        });
      }

      // Emit conversation list updates
      io.to(`user_${conv.brand_owner_id}`).emit('conversation_list_updated', {
        conversation_id: id,
        conversation_context: {
          id: id,
          flow_state: result.conversation.flow_state,
          awaiting_role: result.conversation.awaiting_role,
          chat_status: result.conversation.chat_status
        },
        action: 'state_changed',
        timestamp: new Date().toISOString()
      });

      io.to(`user_${conv.influencer_id}`).emit('conversation_list_updated', {
        conversation_id: id,
        conversation_context: {
          id: id,
          flow_state: result.conversation.flow_state,
          awaiting_role: result.conversation.awaiting_role,
          chat_status: result.conversation.chat_status
        },
        action: 'state_changed',
        timestamp: new Date().toISOString()
      });
    }

    // Return standardized response
    return res.json({
      success: true,
      conversation: result.conversation,
      message: result.message,
      audit_message: result.audit_message,
      flow_state: result.conversation.flow_state,
      awaiting_role: result.conversation.awaiting_role
    });

  } catch (error) {
    console.error('Error in performAction:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
```

### **Phase 4: Update Routes**

**Add unified routes to conversations.js:**

```javascript
// In routes/conversations.js
router.post("/:id/actions", authService.authenticateToken, ConversationController.performAction);

// Keep old routes for backward compatibility (deprecated)
router.post("/:id/actions/bid", authService.authenticateToken, ConversationController.performAction);
router.post("/:id/actions/campaign", authService.authenticateToken, ConversationController.performAction);
```

---

## 📋 **Frontend Integration**

### **Unified Frontend Code**

**Single API call for all actions:**
```javascript
// Frontend can use same code for bid and campaign flows
async function performConversationAction(conversationId, action, payload = {}) {
  const response = await fetch(`/api/conversations/${conversationId}/actions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: action,
      payload: payload
    })
  });

  const result = await response.json();
  
  if (result.success) {
    // Handle success
    updateConversationState(result.conversation);
    addMessageToChat(result.message);
    if (result.audit_message) {
      addMessageToChat(result.audit_message);
    }
  } else {
    // Handle error
    showError(result.error);
  }
}

// Usage examples
await performConversationAction(conversationId, 'submit_work', {
  message: 'Work completed',
  attachments: [...]
});

await performConversationAction(conversationId, 'approve_work', {
  message: 'Great work!'
});

await performConversationAction(conversationId, 'accept_price', {
  data: { agreed_amount: 5000 }
});
```

**Unified WebSocket handling:**
```javascript
// Same WebSocket event handling for all flows
socket.on('conversation_state_changed', (data) => {
  console.log('Conversation state changed:', data);
  updateConversationState(data.conversation_id, data.new_state, data.awaiting_role);
});

socket.on('new_message', (data) => {
  console.log('New message received:', data);
  addMessageToChat(data.message);
  updateConversationContext(data.conversation_context);
});

socket.on('conversation_list_updated', (data) => {
  console.log('Conversation list updated:', data);
  updateConversationInList(data.conversation_id, data.conversation_context);
});
```

---

## 🚀 **Migration Strategy**

### **Phase 1: Immediate (Backward Compatible)**
1. ✅ Standardize response format in BidController
2. ✅ Standardize WebSocket events in all controllers
3. ✅ Extend ConversationController.performAction
4. ✅ Add unified routes

### **Phase 2: Frontend Update**
1. Update frontend to use `/api/conversations/:id/actions`
2. Test with both bid and campaign flows
3. Verify WebSocket events work correctly

### **Phase 3: Deprecation**
1. Mark old endpoints as deprecated
2. Add deprecation warnings
3. Monitor usage

### **Phase 4: Cleanup**
1. Remove old endpoints
2. Clean up unused code
3. Update documentation

---

## ✅ **Benefits of Unified Approach**

1. **Consistency:** Same API, response format, and WebSocket events for all flows
2. **Maintainability:** Single codebase for conversation actions
3. **Frontend Simplicity:** One set of API calls and WebSocket handlers
4. **Extensibility:** Easy to add new actions or flows
5. **Testing:** Single test suite for all conversation actions
6. **Documentation:** One API reference for all flows

---

## 🎯 **Next Steps**

1. **Implement Phase 1:** Standardize response format and WebSocket events
2. **Test:** Verify both bid and campaign flows work with unified approach
3. **Update Frontend:** Migrate to unified API endpoints
4. **Monitor:** Ensure no breaking changes
5. **Cleanup:** Remove old endpoints after migration

This unified approach ensures that **both bid and campaign flows use the same API endpoints, response format, and WebSocket events**, making the system consistent and maintainable! 🚀
