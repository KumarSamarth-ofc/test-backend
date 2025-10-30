## Direct Messages: Realtime Contract and Integration Guide

This document explains exactly how to send/receive direct messages using Socket.IO with optimistic UI, how the backend expects payloads, and how realtime rooms and events work. It also includes reconnection and debug tips.

### Terminology and Rooms
- **User room**: `user_<userId>`
  - Joined automatically on authenticate. Used for conversation-list updates, notifications, unread counters.
- **Conversation room**: `room:<conversationId>`
  - Join when opening a chat, leave when navigating away. Used for chat events inside that conversation.

### Connect and Authenticate
1) Connect your socket client to the backend Socket.IO endpoint (same host/port as API, unless configured otherwise).
2) Immediately authenticate:
```ts
socket.emit('authenticate', { token });
socket.on('authenticated', ({ userId }) => {
  // Now in user_<userId>
});
```

### Join a Conversation Room
Join on chat screen mount; rejoin on reconnect:
```ts
socket.emit('chat:join', { conversationId });
socket.on('chat:joined', () => {
  // Listening in room:<conversationId>
});
```

Optional: leave when exiting the chat screen
```ts
socket.emit('chat:leave', { conversationId });
```

### Send a Direct Message (Optimistic UI)
Direct conversations can send anytime (campaign/bid conversations must be in real_time).

Client → Server
```ts
const payload = {
  tempId: `temp_${Date.now()}`,
  conversationId,
  text,                    // string ("" allowed if only attachments)
  attachments: null,       // or metadata object if needed
  metadata: null,          // optional extra fields
  clientNonce: uuid()      // optional idempotency key
};
socket.emit('chat:send', payload);
```

Server emits (in order)
- To sender socket: `chat:ack` with the saved message
- To conversation room: `chat:new` with the saved message
- To sender `user_<userId>`: `conversation_list_updated` (action: message_sent)
- To receiver `user_<userId>`: `conversation_list_updated` (action: message_received)

Event payloads
```ts
// chat:ack (sender only)
{ tempId: string, message: Message }

// chat:new (room:<conversationId>)
{ message: Message }

// conversation_list_updated (user_<userId>)
{ conversation_id: string, message?: Message, action: 'message_sent'|'message_received'|'state_changed', flow_state?: string, awaiting_role?: string, chat_status?: string, current_action_data?: any }
```

Recommended optimistic flow
1) Append a temporary message immediately with `tempId` and status `sending`.
2) On `chat:ack`, replace the temp message with the persisted message.
3) Also listen to `chat:new` in the room (handles receiver and multi-device cases).
4) If no `chat:ack` arrives within a timeout, show a resend affordance.

### Read Receipts
Client → Server
```ts
// Mark specific messages
socket.emit('chat:read', { conversationId, messageIds: [id1, id2] });

// Or mark up to a certain message chronologically
socket.emit('chat:read', { conversationId, upToMessageId: id });
```

Server → Room
```ts
// chat:read (room:<conversationId>)
{ messageIds: string[], upToMessageId?: string, readerId: string, readAt: isoString }
``;

### Typing Indicators (optional)
```ts
socket.emit('typing_start', { conversationId, userId });
socket.emit('typing_stop', { conversationId, userId });

// Server → room:<conversationId>
{ conversationId, userId, isTyping: boolean }
```

### Conversation Context and Messages (REST)
- GET `/api/messages/conversations/:conversationId/context`
- GET `/api/messages/conversations/:conversationId/messages?page=1&limit=50`

Use these to hydrate when opening the chat or after reconnect. Then rely on realtime events to stay in sync.

### Reconnect and Auto-Rejoin
On socket `connect` or `reconnect`:
1) Emit `authenticate` with token.
2) Rejoin all active conversation rooms with `chat:join`.
3) Optionally refetch conversation context/messages if you suspect missed events.

### Direct vs Campaign/Bid Conversations
- Direct conversations: chat is always allowed.
- Campaign/Bid conversations: chat allowed only when `chat_status === 'real_time'` or `flow_state === 'real_time'`. Otherwise, use automated actions.

### Minimal Client Listener Setup
```ts
socket.on('chat:ack', ({ tempId, message }) => {/* replace optimistic */});
socket.on('chat:new', ({ message }) => {/* append if not own optimistic */});
socket.on('chat:read', (data) => {/* update read markers */});
socket.on('conversation_list_updated', (update) => {/* merge list item */});
```

### Debug Checklist
- Expect these logs server-side on a successful send:
  - `User connected:` then `authenticated` for your socket
  - `chat:join room:<conversationId>`
  - `💾 [CHAT] saved message ...`
  - `➡️ [EMIT] chat:ack ...` and `➡️ [EMIT] chat:new -> room:<conversationId> ...`
  - Two `conversation_list_updated` lines to each user
- If none appear:
  - Ensure the client emitted `authenticate` and then `chat:join`.
  - Verify the socket connects to the correct base URL/port.
- Use POST `/test-message` with `{ conversationId, senderId, receiverId, message }` to validate your room join. It emits to `room:<conversationId>`.

### Message Shape (Server)
```ts
type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string; // ISO
  seen: boolean;
  message_type?: 'user_input'|'automated';
  attachment_metadata?: any;
};
```

This contract reflects the current backend implementation in `sockets/messageHandler.js` and automated emits via `utils/automatedFlowService.js` and `services/socketEmitter.js`.


