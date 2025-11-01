## Frontend Guide: Realtime Conversations and Automated Flow

This document explains how the frontend should keep the conversations list up-to-date in realtime (similar to WhatsApp/Instagram), and how to react to automated flow transitions including payments and admin releases.

### Socket authentication and rooms
- Connect and authenticate via the socket `authenticate` event (JWT).
- The server joins the user to `user_<userId>` for list-level events.
- For an open chat, join `room:<conversationId>` to receive live messages.

### Events the frontend must handle
- `conversations:upsert` (to `user_<userId>`)
  - Single-row upsert for the conversations list when anything changes (new message, unread, order, state changes, first message of a new conversation).
  - Payload (shape can extend, rely on keys that exist):
    - `conversation_id`
    - `other_user` (id, name, avatar)
    - `last_message` (id, text, type, created_at, sender_id)
    - `unread_count`
    - `chat_status`, `flow_state`, `awaiting_role`
    - `updated_at`

- `conversations:remove` (to `user_<userId>`)  
  Remove the conversation from the list when closed/archived.

- `chat:new` (to `room:<conversationId>`)  
  New message for an open chat screen. The list still updates via `conversations:upsert`.

- `chat:ack` (to sender only)  
  Acknowledge optimistic messages and reconcile temp IDs. List also gets `conversations:upsert`.

Notes:
- The backend currently also emits `conversation_list_updated` in a few places. Treat it as an alias of `conversations:upsert` on the client.

### Conversations list reducer logic (client)
- On `conversations:upsert`:
  - If the row exists: merge changes, update `last_message`, `unread_count`, `chat_status`, `flow_state`, `awaiting_role`, and `updated_at`.
  - If not exists: insert the row.
  - Re-sort list by `last_message.created_at` desc; fallback to `updated_at` desc.
  - If the incoming item is older than the current local `last_message.created_at`, ignore to avoid regressions.

- On `conversations:remove`: delete the row and update ordering.

### Optimistic send
1. Immediately insert/update the conversation’s preview and move it to top.
2. On `chat:ack`, replace temp message with the saved message. 
3. A subsequent `conversations:upsert` will also arrive; ignore if older than local preview.

### Unread counts and read receipts
- Increment unread if a `chat:new` arrives for a conversation not currently open.
- When the user opens a chat or marks read, emit `chat:read` and zero unread locally. The server will emit `conversations:upsert` to confirm.

### Reconnect and resync
- On reconnect, fetch `/conversations?updated_after=lastSyncAt` (or first page) and merge results; keep listening for `conversations:upsert`.
- Maintain a `lastSyncAt` timestamp locally.

---

## Automated flow: payment and work lifecycle (frontend behavior)

The automated flow switches the conversation between guided states and realtime chat. The list is updated by `conversations:upsert` whenever state changes or a system message is created.

### Key states you’ll see
- `payment_pending` → waiting for brand owner to pay.
- `payment_completed` → payment succeeded; waiting for admin to release advance.
- `work_in_progress` → after admin releases advance; influencer is working.
- `work_submitted` → influencer submitted work; brand owner must review.
- `work_approved` → brand owner approved work; waiting for admin to release final.
- `admin_final_payment_pending` → waiting for admin final release.
- `closed` → collaboration closed after final payment or refund.
- `real_time` → free chat enabled as specified by your rules.

Each state change triggers a `conversations:upsert` so the list reflects the latest preview and sort order.

### Payment flows and admin releases (server already supports)

Admin-facing REST endpoints (require admin JWT):
- `GET /api/admin/payments/pending?status=advance_pending|final_pending&page=&limit=`  
  List pending payments for admin processing.
- `POST /api/admin/payments/:payment_id/confirm-advance`  
  Confirm the advance release for the influencer.
- `POST /api/admin/payments/:payment_id/process-final`  
  Process the final payout after work approval.
- `GET /api/admin/payments/timeline/:conversation_id`  
  Payment timeline for a conversation (auditing/admin UI).
- `POST /api/admin/payments/:payment_id/upload-screenshot`  
  Optional screenshot upload for records.

How this affects the frontend:
1. Brand owner completes the payment → state moves to `payment_completed` (system message created). The conversation list will upsert to reflect this.
2. Admin confirms the advance via the admin endpoint → server moves to `work_in_progress` and emits a system/automated message. The list receives `conversations:upsert` and the chat can proceed.
3. Influencer submits work → `work_submitted`; brand owner sees action buttons in chat UI.
4. Brand owner approves → state transitions to `work_approved` then `admin_final_payment_pending`.
5. Admin processes final via the admin endpoint → server moves conversation to `closed` and emits a final system message; the list updates via `conversations:upsert`.

Result: The admin release steps (advance and final) are handled, and every step results in a `conversations:upsert` so the list stays consistent.

---

## Minimal client wiring example (TypeScript-like pseudocode)

```ts
// After socket authenticate
socket.on('conversations:upsert', (payload) => {
  store.dispatch(conversationsUpsert(payload));
});

socket.on('conversations:remove', ({ conversation_id }) => {
  store.dispatch(conversationsRemove(conversation_id));
});

// Active chat screen
socket.emit('chat:join', { conversationId });
socket.on('chat:new', (evt) => {
  if (evt.message.conversation_id === conversationId) {
    store.dispatch(chatAppendMessage(evt.message));
  }
});

// Optimistic send
const tempId = uuid();
store.dispatch(listOptimisticPreview(conversationId, tempId, text));
socket.emit('chat:send', { tempId, conversationId, text });
socket.on('chat:ack', ({ tempId, message }) => {
  store.dispatch(reconcileOptimistic(conversationId, tempId, message));
});

// Read receipts
socket.emit('chat:read', { conversationId, upToMessageId });
```

---

---

## Handling Realtime Updates While Inside a Conversation

**Problem**: Previously, you had to close and reopen conversations to see new messages or action interfaces. This section explains how to handle live updates when the user is actively viewing a conversation.

### When User Opens a Conversation Screen

1. **Join the conversation room**:
   ```ts
   socket.emit('chat:join', { conversationId });
   ```

2. **Fetch initial state**:
   - GET `/conversations/:id` (includes `flow_state`, `awaiting_role`, `current_action_data`)
   - GET `/messages/conversations/:id/messages` (load messages)

3. **Listen for live messages**:
   ```ts
   socket.on('chat:new', ({ message }) => {
     if (message.conversation_id === conversationId) {
       // Append message to your message list
       // Update action interface if message has action_data
     }
   });
   ```

4. **Listen for state changes** (most important for action interface updates):
   ```ts
   socket.on('conversation_state_changed', (evt) => {
     if (evt.conversation_id !== conversationId) return;
     
     // Update conversation state
     updateConversationState(evt.flow_state, evt.awaiting_role, evt.chat_status);
     
     // Replace action interface with new current_action_data
     setActionInterface(evt.current_action_data || null);
   });
   ```

5. **Also listen to list-level upserts** (they can carry updated action data):
   ```ts
   socket.on('conversations:upsert', (row) => {
     // Update list
     updateList(row);
     
     // If this is the open conversation, also update action interface
     if (row.conversation_id === conversationId && row.current_action_data) {
       setActionInterface(row.current_action_data);
     }
   });
   ```

### Key Points for Action Interface

- **Replace, don't append**: When `conversation_state_changed` or `conversations:upsert` arrives with `current_action_data`, completely replace the current action UI (buttons, input fields, etc.).

- **Disable buttons after click**: After user clicks an action button, disable it and show loading state until the state change event confirms the action was processed.

- **Handle form inputs**: For actions that require input (e.g., `send_project_details`, `send_price_offer`), validate on client, send the action, then replace the UI when the state change event arrives.

### Example Flow

1. User sees "Accept Price" button → clicks it
2. Button shows loading state
3. Server processes → emits `conversation_state_changed` with new `current_action_data` (e.g., "Proceed to Payment" button)
4. Client receives event → replaces action UI immediately
5. No need to close/reopen conversation!

### When User Leaves Conversation

```ts
socket.emit('chat:leave', { conversationId });
```

### Reconnect Handling

On socket reconnect:
1. Re-emit `chat:join` for currently open conversation
2. Refetch last N messages since last seen message ID
3. Refetch conversation state to get latest `current_action_data`
4. Continue listening to events

---

## FAQ

**Q: Do we need to be in the conversation room to update the list?**  
A: No. The list is driven by `conversations:upsert` sent to `user_<userId>`, regardless of whether the chat room is joined.

**Q: How do new conversations appear?**  
A: When the first message is persisted (user or automated), the server emits `conversations:upsert` to both participants. Insert it at the top by timestamp.

**Q: Are admin releases handled?**  
A: Yes. After payment, admin confirms the advance (moves to `work_in_progress`). After approval, admin processes final (moves to `closed`). Each step emits `conversations:upsert` and a system message.

**Q: Why isn't my action interface updating when I'm in the conversation?**  
A: Make sure you're listening to `conversation_state_changed` and `conversations:upsert` events, and replace the action UI with `current_action_data` when these events arrive. Don't rely on polling or refetching—use realtime events.

**Q: Should I refetch messages/conversation on every action?**  
A: No. Listen to `chat:new` and `conversation_state_changed` events. Only refetch on reconnect or if events seem out of sync.


