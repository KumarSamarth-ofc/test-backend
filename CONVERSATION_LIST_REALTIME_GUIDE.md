# Conversation List Realtime Update Guide

This guide explains how to properly manage realtime updates for the conversation list in the Stoory backend. The frontend expects specific socket events to keep the conversation list synchronized in real-time.

## Overview

When messages are sent, conversation states change, or users interact with conversations, the backend must emit socket events to update the conversation list for all relevant users. This ensures that:

- ✅ Last messages are updated immediately
- ✅ Unread counts are accurate and updated in real-time
- ✅ Conversation states (flow_state, chat_status, awaiting_role) are synchronized
- ✅ New conversations appear at the top of the list
- ✅ User information (name, avatar) is always available

## Socket Rooms

### User Rooms (for list updates)
- **`user_<userId>`** - Individual user room for conversation list updates
- Joined automatically when user authenticates via socket
- All conversation list updates are emitted to this room

### Conversation Rooms (for chat screen)
- **`room:<conversationId>`** - Active conversation room
- Users join when opening a chat, leave when closing
- Used for message delivery, read receipts, typing indicators

## Helper Functions

We've created utility functions in `utils/conversationListUpdates.js` to ensure consistent payload structure:

### `buildConversationsUpsertPayload(params)`
Builds a standardized `conversations:upsert` payload with all required fields including `other_user` information.

### `emitConversationsUpsert(io, userId, payload)`
Emits `conversations:upsert` to a specific user's room.

### `emitConversationsUpsertToBothUsers(io, conversationId, conversation, lastMessage)`
Emits `conversations:upsert` to both participants in a conversation.

### `emitUnreadCountUpdated(io, userId, conversationId, unreadCount, action)`
Emits `unread_count_updated` event.

## Socket Events Required

### 1. `conversations:upsert` (Primary Event)

**Room**: `user_<userId>`

**When to emit**:
- ✅ New message sent/received (REST API or Socket)
- ✅ Conversation state changes (flow_state, chat_status, awaiting_role)
- ✅ Unread count changes
- ✅ New conversation created (first message)
- ✅ Payment verification completes
- ✅ Admin actions (advance/final payment releases)

**Payload structure**:
```typescript
{
  conversation_id: string;
  other_user?: {
    id: string;
    name: string;
    avatar?: string;
    profile_image_url?: string;
  };
  last_message?: {
    id: string;
    message: string; // or 'content'
    created_at: string;
    sender_id: string;
    seen?: boolean;
  };
  unread_count?: number;
  chat_status?: string; // 'automated' | 'real_time'
  flow_state?: string; // 'payment_pending' | 'payment_received' | etc.
  awaiting_role?: string; // 'brand_owner' | 'influencer' | 'admin'
  updated_at: string; // ISO timestamp - REQUIRED for sorting
  created_at?: string;
}
```

**Usage example**:
```javascript
const conversationListUtils = require('../utils/conversationListUpdates');

// After sending a message
const payload = await conversationListUtils.buildConversationsUpsertPayload({
  conversationId: conversationId,
  currentUserId: userId,
  lastMessage: savedMessage,
  conversation: fullConversation
});
conversationListUtils.emitConversationsUpsert(io, userId, payload);
```

### 2. `chat:new` (Message Events)

**Room**: `room:<conversationId>` (conversation room)

**When to emit**: New message persisted (for active chat screen)

**Payload structure**:
```typescript
{
  message: {
    id: string;
    conversation_id: string;
    sender_id: string;
    message: string; // or 'content'
    created_at: string;
    seen: boolean;
  }
}
```

**Usage example**:
```javascript
// After saving message
io.to(`room:${conversationId}`).emit('chat:new', {
  message: savedMessage
});
```

### 3. `unread_count_updated` (Unread Count)

**Room**: `user_<userId>`

**When to emit**:
- ✅ After new message received (increment)
- ✅ After messages marked as read (reset)
- ✅ After conversation opened

**Payload structure**:
```typescript
{
  conversation_id: string;
  unread_count: number;
  action?: 'increment' | 'decrement' | 'reset';
}
```

**Usage example**:
```javascript
const conversationListUtils = require('../utils/conversationListUpdates');

// After new message
conversationListUtils.emitUnreadCountUpdated(
  io,
  receiverId,
  conversationId,
  unreadCount,
  'increment'
);

// After read
conversationListUtils.emitUnreadCountUpdated(
  io,
  userId,
  conversationId,
  0,
  'reset'
);
```

### 4. `chat:read` (Read Receipts)

**Room**: `room:<conversationId>` (conversation room)

**When to emit**: Messages marked as read

**Payload structure**:
```typescript
{
  conversation_id: string;
  readerId: string;
  messageIds?: string[];
  upToMessageId?: string;
  readAt?: string;
}
```

**Usage example**:
```javascript
io.to(`room:${conversationId}`).emit('chat:read', {
  conversation_id: conversationId,
  readerId: userId,
  messageIds: messageIds,
  readAt: new Date().toISOString()
});
```

### 5. `conversations:remove` (Optional)

**Room**: `user_<userId>`

**When to emit**: Conversation is archived, deleted, or should be removed from list

**Payload structure**:
```typescript
{
  conversation_id: string;
}
```

**Usage example**:
```javascript
io.to(`user_${userId}`).emit('conversations:remove', {
  conversation_id: conversationId
});
```

## Implementation Checklist

### ✅ On Message Send/Receive

**REST API (`controllers/messageController.js`)**:
```javascript
// 1. Save message to DB
const newMessage = await supabaseAdmin.from('messages').insert(...);

// 2. Emit chat:new to conversation room
io.to(`room:${conversationId}`).emit('chat:new', { message: newMessage });

// 3. Build and emit conversations:upsert to both users
const conversationListUtils = require('../utils/conversationListUpdates');
const { data: fullConversation } = await supabaseAdmin.from('conversations').select('*').eq('id', conversationId).single();

// For receiver
const receiverPayload = await conversationListUtils.buildConversationsUpsertPayload({
  conversationId,
  currentUserId: receiverId,
  lastMessage: newMessage,
  conversation: fullConversation
});
conversationListUtils.emitConversationsUpsert(io, receiverId, receiverPayload);

// For sender
const senderPayload = await conversationListUtils.buildConversationsUpsertPayload({
  conversationId,
  currentUserId: senderId,
  lastMessage: newMessage,
  conversation: fullConversation
});
conversationListUtils.emitConversationsUpsert(io, senderId, senderPayload);

// 4. Emit unread_count_updated for receiver
if (receiverPayload.unread_count > 0) {
  conversationListUtils.emitUnreadCountUpdated(
    io,
    receiverId,
    conversationId,
    receiverPayload.unread_count,
    'increment'
  );
}
```

**Socket Handler (`sockets/messageHandler.js`)**:
```javascript
// Same pattern as REST API
// Already implemented in chat:send handler
```

### ✅ On Conversation State Change

When `flow_state`, `chat_status`, or `awaiting_role` changes (e.g., payment verification, automated flow actions):

```javascript
const conversationListUtils = require('../utils/conversationListUpdates');

// 1. Update conversation in DB
const { data: updatedConversation } = await supabaseAdmin
  .from('conversations')
  .update({ flow_state, awaiting_role, chat_status, updated_at: new Date().toISOString() })
  .eq('id', conversationId)
  .select()
  .single();

// 2. Emit conversations:upsert to both users
await conversationListUtils.emitConversationsUpsertToBothUsers(
  io,
  conversationId,
  updatedConversation,
  null // no new message
);
```

### ✅ On Message Read

When messages are marked as read:

```javascript
// 1. Update messages as seen in DB
await supabaseAdmin
  .from('messages')
  .update({ seen: true })
  .eq('conversation_id', conversationId)
  .eq('receiver_id', userId)
  .eq('seen', false);

// 2. Emit chat:read to conversation room
io.to(`room:${conversationId}`).emit('chat:read', {
  conversation_id: conversationId,
  readerId: userId,
  readAt: new Date().toISOString()
});

// 3. Update conversation list with unread_count = 0
const conversationListUtils = require('../utils/conversationListUpdates');
const { data: conversation } = await supabaseAdmin
  .from('conversations')
  .select('*')
  .eq('id', conversationId)
  .single();

const payload = await conversationListUtils.buildConversationsUpsertPayload({
  conversationId,
  currentUserId: userId,
  lastMessage: null, // use existing last_message
  conversation,
  unreadCount: 0
});
conversationListUtils.emitConversationsUpsert(io, userId, payload);

// 4. Emit unread_count_updated
conversationListUtils.emitUnreadCountUpdated(
  io,
  userId,
  conversationId,
  0,
  'reset'
);
```

### ✅ On New Conversation Created

When the first message creates a new conversation:

```javascript
// 1. Create conversation
const { data: newConversation } = await supabaseAdmin
  .from('conversations')
  .insert({ ... })
  .select()
  .single();

// 2. Save first message
const { data: firstMessage } = await supabaseAdmin
  .from('messages')
  .insert({ ... })
  .select()
  .single();

// 3. Emit conversations:upsert to both users (with other_user info)
const conversationListUtils = require('../utils/conversationListUpdates');
await conversationListUtils.emitConversationsUpsertToBothUsers(
  io,
  newConversation.id,
  newConversation,
  firstMessage
);
```

## Key Requirements

### 1. Always Include `other_user`
The frontend needs `other_user` information (id, name, avatar) to display conversation previews. This is automatically included by `buildConversationsUpsertPayload()`.

### 2. Always Include `updated_at`
The frontend sorts conversations by `updated_at` (newest first). Always include this field in `conversations:upsert` payloads.

### 3. Always Include `last_message`
When a new message is sent, always include it in `last_message` with proper structure:
```javascript
{
  id: string,
  message: string,
  created_at: string,
  sender_id: string,
  seen: boolean
}
```

### 4. Calculate Unread Counts Correctly
Unread counts are calculated based on:
- `receiver_id = userId`
- `seen = false`
- `conversation_id = conversationId`

Use the `getUnreadCount()` helper or let `buildConversationsUpsertPayload()` fetch it automatically.

### 5. Emit to Both Users
Always emit `conversations:upsert` to both participants (sender and receiver) when:
- A message is sent
- Conversation state changes
- New conversation is created

## Testing Checklist

To verify the implementation:

1. ✅ **Send a message via REST API** → List should update immediately with new last message and `other_user` info
2. ✅ **Send a message via Socket** → List should update immediately
3. ✅ **Receive a message** → List should update with unread badge increment
4. ✅ **Open a chat** → Unread count should reset
5. ✅ **Payment verification** → List should update with new `flow_state`
6. ✅ **Create new conversation** → Should appear at top of list with `other_user` info
7. ✅ **Admin processes payment** → List should update state immediately
8. ✅ **Automated flow state change** → List should update `awaiting_role` and `flow_state`

## Common Issues & Solutions

### Issue: `other_user` is null/undefined
**Solution**: Ensure `getOtherUserInfo()` helper is called. This is automatically done by `buildConversationsUpsertPayload()`.

### Issue: Conversations not sorting correctly
**Solution**: Always include `updated_at` timestamp in payload. This is automatically included by the helper.

### Issue: Unread counts not updating
**Solution**: Use `emitUnreadCountUpdated()` after updating messages or conversation state.

### Issue: Duplicate conversations:upsert events
**Solution**: Both REST API and Socket handlers use the same helper functions, so duplicates are prevented. Ensure you're not calling the emit functions multiple times.

## Files Modified

- ✅ `utils/conversationListUpdates.js` - Helper functions for consistent payloads
- ✅ `sockets/messageHandler.js` - Updated to use helpers and include `other_user`
- ✅ `controllers/messageController.js` - Updated to use helpers and include `other_user`

## Next Steps

1. Update automated flow handlers to use `conversationListUtils.emitConversationsUpsertToBothUsers()`
2. Update payment verification handlers to emit `conversations:upsert`
3. Update read receipt handlers to use helpers
4. Test all scenarios end-to-end

---

**Last Updated**: 2024-12-19
**Maintained By**: Backend Team

