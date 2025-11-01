# Socket.IO Implementation Summary

## Backend Changes

### 1. Created `services/socketEmitter.js`
- Simple singleton service to emit Socket.IO events
- Methods: `emitToConversation`, `emitToCampaign`, `emitToUser`

### 2. Updated `sockets/messageHandler.js`
- Added JWT authentication via `authenticate` event
- Added simplified events:
  - `chat:join` / `chat:leave` - Join/leave conversation rooms with membership checks
  - `chat:send` - Send messages (only allowed in `real_time` mode)
  - `chat:read` - Mark messages as read
  - `work:join` / `work:leave` - Join/leave campaign work rooms
- Rooms: `room:<conversationId>` and `room:work:<campaignId>`

### 3. Updated `utils/automatedFlowService.js`
- Removed all audit messages completely
- Added `emitAutomatedMessage` helper method
- Added socket emits after automated message creation (to be completed in follow-up)

### 4. Updated `index.js`
- Initialize socketEmitter singleton with io instance

## Socket.IO Events

### Client → Server
- `authenticate` { token } - Authenticate socket with JWT
- `chat:join` { conversationId } - Join conversation room
- `chat:leave` { conversationId } - Leave conversation room
- `chat:send` { tempId, conversationId, text?, attachments?, clientNonce } - Send message (only in real_time mode)
- `chat:read` { conversationId, messageIds[]?, upToMessageId? } - Mark messages as read
- `work:join` { campaignId } - Join work room for campaign updates
- `work:leave` { campaignId } - Leave work room

### Server → Client
- `authenticated` { userId } - Authentication successful
- `auth_error` { message } - Authentication failed
- `chat:joined` { conversationId } - Successfully joined room
- `chat:error` { message, tempId? } - Chat operation error
- `chat:ack` { tempId, message } - Message persisted, replace optimistic message
- `chat:new` { message } - New message broadcast to room
- `chat:automated` { message, reason } - Automated message from flow engine
- `chat:read` { messageIds[], readerId, readAt } - Read receipt broadcast
- `conversation_list_updated` { conversation_id, message, action } - Conversation list update

## Frontend Integration

### 1. Authentication
```javascript
socket.emit('authenticate', { token: userJWT });
socket.on('authenticated', ({ userId }) => {
  // Store userId, proceed with joining rooms
});
```

### 2. Join Conversation
```javascript
socket.emit('chat:join', { conversationId });
socket.on('chat:joined', ({ conversationId }) => {
  // Ready to send/receive messages
});
```

### 3. Send Message (Optimistic)
```javascript
const tempId = generateTempId();
const message = { tempId, conversationId, text, clientNonce };

// Render optimistically
setMessages(prev => [...prev, { ...message, temp: true, id: tempId }]);

// Send via socket
socket.emit('chat:send', message);

// Replace with server message on ack
socket.on('chat:ack', ({ tempId, message }) => {
  setMessages(prev => prev.map(m => m.tempId === tempId ? message : m));
});
```

### 4. Receive Messages
```javascript
// Normal messages
socket.on('chat:new', ({ message }) => {
  setMessages(prev => [...prev, message]);
});

// Automated messages
socket.on('chat:automated', ({ message, reason }) => {
  setMessages(prev => [...prev, message]);
  // Handle action buttons/inputs based on message.action_data
});
```

### 5. Read Receipts
```javascript
// Mark as read
socket.emit('chat:read', { conversationId, upToMessageId: lastMessageId });

// Receive read updates
socket.on('chat:read', ({ messageIds, readerId, readAt }) => {
  // Update message read status in UI
});
```

## Notes

1. **Real-time vs Automated**: Only `chat:send` works when `chat_status === 'real_time'`. In automated mode, use action buttons.
2. **Idempotency**: Use `clientNonce` to prevent duplicate messages on retry.
3. **Membership Checks**: All room joins verify user access.
4. **No Audit Messages**: All audit messages removed from backend.

