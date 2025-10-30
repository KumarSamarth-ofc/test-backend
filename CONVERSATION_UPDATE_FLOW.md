# Conversation List & Chat Screen Update Flow

This document explains exactly how the conversation list and chat screen are updated in realtime for both **sender** and **receiver** when messages are sent or automated flow events occur.

## Socket Rooms

**User Rooms** (for list updates):
- `user_<userId>` - Individual user room
- `global_<userId>` - Global updates (alias, same data)

**Conversation Rooms** (for chat screen):
- `room:<conversationId>` - Active conversation room
- `conversation_<conversationId>` - Legacy alias (deprecated)

---

## 1. User Sends a Message (Real-time Chat)

### Backend Flow (`chat:send` event)

1. **Message is saved** to database
2. **Emits to sender**:
   - ✅ `chat:ack` → `socket.id` (only to sender's socket)
     ```json
     {
       "tempId": "...",
       "message": { /* saved message object */ }
     }
     ```
   - ✅ `conversation_list_updated` → `user_<senderId>`
     ```json
     {
       "conversation_id": "...",
       "message": { /* message object */ },
       "action": "message_sent",
       "timestamp": "..."
     }
     ```

3. **Emits to receiver**:
   - ✅ `chat:new` → `room:<conversationId>` (if receiver is in room)
     ```json
     {
       "message": { /* message object */ }
     }
     ```
   - ✅ `conversation_list_updated` → `user_<receiverId>`
     ```json
     {
       "conversation_id": "...",
       "message": { /* message object */ },
       "action": "message_received",
       "timestamp": "..."
     }
     ```
   - ✅ `unread_count_updated` → `user_<receiverId>` (increment)
     ```json
     {
       "conversation_id": "...",
       "unread_count": 1,
       "action": "increment"
     }
     ```

### Frontend Handling

**For Sender:**
```ts
// Chat screen (if sender has conversation open)
socket.on('chat:ack', ({ tempId, message }) => {
  // Replace optimistic message with saved message
  replaceTempMessage(tempId, message);
});

// Conversation list
socket.on('conversation_list_updated', (data) => {
  if (data.action === 'message_sent') {
    updateConversationInList({
      conversation_id: data.conversation_id,
      last_message: data.message,
      // Move to top, update preview
    });
  }
});
```

**For Receiver:**
```ts
// Chat screen (if receiver has conversation open)
socket.on('chat:new', ({ message }) => {
  if (message.conversation_id === openConversationId) {
    appendMessage(message);
    // Scroll to bottom
  }
});

// Conversation list
socket.on('conversation_list_updated', (data) => {
  if (data.action === 'message_received') {
    updateConversationInList({
      conversation_id: data.conversation_id,
      last_message: data.message,
      // Move to top, show unread badge
    });
  }
});

socket.on('unread_count_updated', (data) => {
  incrementUnreadCount(data.conversation_id);
});
```

---

## 2. Automated Flow Events

### Backend Flow (from `automatedFlowService.js`)

When automated actions occur (price accepted, payment created, work submitted, etc.):

1. **Message is saved** to database
2. **Emits automated message**:
   - ✅ `chat:automated` → `room:<conversationId>` (via `emitAutomatedMessage`)
     ```json
     {
       "message": { /* automated message */ },
       "reason": "automated"
     }
     ```
   - ✅ `conversation_state_changed` → `room:<conversationId>` (via direct emit)
     ```json
     {
       "conversation_id": "...",
       "flow_state": "payment_pending",
       "awaiting_role": "brand_owner",
       "chat_status": "automated",
       "current_action_data": { /* buttons, inputs, etc. */ },
       "updated_at": "..."
     }
     ```
   - ✅ `new_message` → `room:<conversationId>` (legacy, some places still emit)
     ```json
     {
       "conversation_id": "...",
       "message": { /* message */ },
       "conversation_context": { /* flow state, etc. */ }
     }
     ```
3. **Emits list update**:
   - ✅ `conversation_list_updated` → `user_<brandOwnerId>` and `user_<influencerId>`
     ```json
     {
       "conversation_id": "...",
       "flow_state": "payment_pending",
       "awaiting_role": "brand_owner",
       "chat_status": "automated",
       "current_action_data": { /* action UI data */ },
       "action": "state_changed",
       "timestamp": "..."
     }
     ```

### Frontend Handling

**Both Users (Sender & Receiver):**

```ts
// Chat screen (if conversation is open)
socket.on('chat:automated', ({ message }) => {
  if (message.conversation_id === openConversationId) {
    appendMessage(message);
  }
});

socket.on('conversation_state_changed', (evt) => {
  if (evt.conversation_id === openConversationId) {
    // Update conversation state
    updateFlowState(evt.flow_state, evt.awaiting_role, evt.chat_status);
    
    // Replace action interface
    setActionInterface(evt.current_action_data || null);
  }
});

// Conversation list
socket.on('conversation_list_updated', (data) => {
  if (data.action === 'state_changed') {
    updateConversationInList({
      conversation_id: data.conversation_id,
      flow_state: data.flow_state,
      awaiting_role: data.awaiting_role,
      chat_status: data.chat_status,
      current_action_data: data.current_action_data,
      // Update preview if message included
      last_message: data.message || existingLastMessage,
    });
  }
});
```

---

## 3. Read Status Updates

### Backend Flow (`chat:read` event)

When user marks messages as read:

1. **Updates read status** in database
2. **Emits**:
   - ✅ `chat:read_ack` → `socket.id` (confirmation to sender)
   - ✅ `conversation_list_updated` → `user_<readerId>`
     ```json
     {
       "conversation_id": "...",
       "unread_count": 0, // or new count
       "action": "read"
     }
     ```
   - ✅ `unread_count_updated` → `user_<readerId>`
     ```json
     {
       "conversation_id": "...",
       "unread_count": 0,
       "action": "reset"
     }
     ```

### Frontend Handling

```ts
// When user opens conversation or scrolls to bottom
socket.emit('chat:read', { 
  conversationId, 
  upToMessageId: lastMessageId 
});

socket.on('chat:read_ack', (data) => {
  // Confirm read status
});

socket.on('unread_count_updated', (data) => {
  if (data.action === 'reset') {
    setUnreadCount(data.conversation_id, 0);
  }
});
```

---

## 4. Summary: Which Events Update What

### Conversation List Updates
**Event**: `conversation_list_updated` (to `user_<userId>`)

**Triggers when:**
- ✅ User sends message → `action: 'message_sent'` or `'message_received'`
- ✅ Automated flow state changes → `action: 'state_changed'`
- ✅ Messages read → `action: 'read'`
- ✅ New conversation created → `action: 'conversation_created'`

**What to update:**
- `last_message` (preview text, timestamp)
- `unread_count`
- `flow_state`, `awaiting_role`, `chat_status`
- `current_action_data` (if included)
- Sort position (move to top if new message)

### Chat Screen Updates
**Events**: 
- `chat:new` (to `room:<conversationId>`)
- `chat:automated` (to `room:<conversationId>`)
- `conversation_state_changed` (to `room:<conversationId>`)
- `chat:ack` (to sender only)

**What to update:**
- Message list (append new messages)
- Action interface (replace on `conversation_state_changed`)
- Read indicators
- Typing indicators (if implemented)

---

## 5. Important Notes

1. **Always join both rooms**:
   - `user_<userId>` on connect (for list updates)
   - `room:<conversationId>` when opening a conversation (for chat updates)

2. **Handle both event names**:
   - Current backend emits: `conversation_list_updated`
   - Frontend guide mentions: `conversations:upsert`
   - **Treat them as aliases** - listen to both or normalize on frontend

3. **Read receipts are separate**:
   - `unread_count_updated` is a separate event
   - Can increment/decrement/reset
   - Also included in `conversation_list_updated` sometimes

4. **Action interface updates**:
   - Always from `conversation_state_changed` or `conversation_list_updated.current_action_data`
   - **Replace, don't append** the action UI
   - Check `visible_to` field to show/hide for specific roles

5. **Optimistic updates**:
   - Sender shows message immediately
   - Wait for `chat:ack` to confirm
   - List updates via `conversation_list_updated` separately

---

## 6. Complete Frontend Setup Example

```ts
// On socket connect
socket.emit('authenticate', { token });
// Server automatically joins user to user_<userId>

// Listen for list updates (always active)
socket.on('conversation_list_updated', (data) => {
  upsertConversationInList(data);
});

socket.on('unread_count_updated', (data) => {
  updateUnreadCount(data.conversation_id, data.unread_count);
});

// When user opens a conversation
socket.emit('chat:join', { conversationId });

socket.on('chat:new', ({ message }) => {
  if (message.conversation_id === openConversationId) {
    appendMessage(message);
  }
  // List also gets conversation_list_updated separately
});

socket.on('chat:ack', ({ tempId, message }) => {
  replaceTempMessage(tempId, message);
});

socket.on('conversation_state_changed', (evt) => {
  if (evt.conversation_id === openConversationId) {
    updateConversationState(evt);
    setActionInterface(evt.current_action_data);
  }
});

socket.on('chat:read_ack', () => {
  // Confirm read
});

// When sending message
const tempId = uuid();
appendOptimisticMessage(tempId, text);
socket.emit('chat:send', { tempId, conversationId, text });

// When leaving conversation
socket.emit('chat:leave', { conversationId });
```

---

## Current Backend Events Summary

| Event | Room | Purpose | When |
|-------|------|---------|------|
| `chat:ack` | sender socket only | Confirm message saved | After message insert |
| `chat:new` | `room:<conversationId>` | New message | After message insert |
| `chat:automated` | `room:<conversationId>` | Automated message | Flow transitions |
| `conversation_list_updated` | `user_<userId>` | List updates | Messages, state changes |
| `unread_count_updated` | `user_<userId>` | Unread count | New messages, reads |
| `conversation_state_changed` | `room:<conversationId>` | Flow state change | Automated actions |
| `chat:read_ack` | reader socket only | Confirm read | After read update |

