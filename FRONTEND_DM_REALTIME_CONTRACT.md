## Direct Messages Realtime Backend Contract (Final)

This is the single source of truth for the frontend to implement 100% realtime for direct messages (and applies to campaigns/bids when in real_time).

### Socket endpoint
- **Base URL**: use the same host:port as your API in the target environment (e.g., `http://192.168.x.x:3000`).
- **Path**: default Socket.IO path (`/socket.io/`). No custom path.
- **Transports**: websocket, polling.
- **CORS**: Already configured on the server to allow common localhost/LAN origins. Use your app’s URL.

### Auth model
- Authenticate after connect via event:
  - Event: `authenticate`
  - Payload: `{ token: string }`
  - Success event: `authenticated` with `{ userId: string }`
  - Error event: `auth_error` with `{ message: string }`
- Tokens are NOT required per-message. Only the initial `authenticate` is needed.

### Rooms and membership
- User room: `user_<userId>` (joined automatically on `authenticated`).
- Conversation room: `room:<conversationId>` (frontend must join on chat screen open and leave on exit):
  - Join: `chat:join` → payload `{ conversationId: string }` → success `chat:joined { conversationId }`
  - Leave: `chat:leave` → payload `{ conversationId: string }`

### Events (final names) and directions
- Messages
  - Client → Server: `chat:send`
    - `{ tempId: string, conversationId: string, text?: string, attachments?: any, metadata?: any, clientNonce?: string }`
  - Server → Sender: `chat:ack`
    - `{ tempId: string, message: Message }`
  - Server → Room: `chat:new`
    - `{ message: Message }`

- Read receipts
  - Client → Server: `chat:read`
    - EITHER `{ conversationId: string, messageIds: string[] }`
    - OR `{ conversationId: string, upToMessageId: string }`
  - Server → Room: `chat:read`
    - `{ messageIds: string[], upToMessageId?: string, readerId: string, readAt: string }`

- Typing
  - Client → Server: `typing_start` / `typing_stop`
    - `{ conversationId: string, userId: string }`
  - Server → Room: `user_typing`
    - `{ conversationId: string, userId: string, isTyping: boolean }`

- Conversation state and list updates
  - Server → Room: `conversation_state_changed`
    - `{ conversation_id: string, flow_state: string, awaiting_role: string|null, chat_status: string, current_action_data?: any, updated_at: string }`
  - Server → User: `conversation_list_updated`
    - `{ conversation_id: string, action: 'message_sent'|'message_received'|'state_changed', message?: Message, flow_state?: string, awaiting_role?: string|null, chat_status?: string, current_action_data?: any, timestamp?: string }`
  - Server → User: `unread_count_updated` (optional)
    - `{ conversation_id: string, unread_count: number, action: 'increment'|'reset' }`

### Payload shapes
- Message
```ts
type Message = {
  id: string
  conversation_id: string
  sender_id: string
  receiver_id: string
  message: string
  created_at: string // ISO
  seen: boolean
  message_type?: 'user_input'|'automated'
  attachment_metadata?: any
  // may include: status, action_* fields (usually null for direct)
}
```
- chat:ack
```ts
{ tempId: string, message: Message }
```
- chat:new
```ts
{ message: Message }
```
- conversation_list_updated (minimum guaranteed keys)
```ts
{ conversation_id: string, action: string, message?: Message, flow_state?: string, awaiting_role?: string|null, chat_status?: string, current_action_data?: any, timestamp?: string }
```
- chat:read broadcast
```ts
{ messageIds: string[], upToMessageId?: string, readerId: string, readAt: string }
```

### Delivery guarantees and order
- On successful `chat:send`:
  1) Sender gets `chat:ack` (includes persisted message).
  2) Room gets `chat:new`.
  3) `conversation_list_updated` is sent to both users (sender: `message_sent`, receiver: `message_received`).
- After reconnect, there is no socket replay. Client should REST hydrate (context + messages) then rely on realtime moving forward.

### Direct vs Campaign/Bid
- Direct conversations: user can always send via `chat:send`.
- Campaign/Bid conversations: sending allowed only when `chat_status === 'real_time'` OR `flow_state === 'real_time'`. Otherwise use automated action interfaces.

### Client reference flow
1) Connect Socket.IO to your API base URL.
2) On connect, emit `authenticate { token }`; wait for `authenticated`.
3) On chat screen mount, `chat:join { conversationId }`; wait for `chat:joined`.
4) REST hydrate: GET context, GET messages.
5) Send optimistic message; reconcile on `chat:ack`; append on `chat:new`.
6) Emit read receipts as the user views messages; update on room `chat:read`.
7) Emit typing_start/stop; show `user_typing`.
8) Merge `conversation_list_updated` into list UI; show unread badge via `unread_count_updated` if used.
9) Handle `conversation_state_changed` to toggle automated/direct UI.
10) On reconnect: re-authenticate, rejoin rooms, re-hydrate once.

### Notes
- Room names and event names above are final and already aligned server-side.
- Conversation list event uses `user_<userId>`. Conversation room uses `room:<conversationId>`.


