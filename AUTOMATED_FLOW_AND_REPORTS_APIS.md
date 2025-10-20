## Stoory Automated Flow + Admin Payments + Reports (API + Frontend Guide)

This document describes the updated conversation lifecycle (no escrow), admin-mediated payments, report APIs, and the frontend handling (REST + WebSocket).

### Auth
- All endpoints require Bearer auth (JWT). Role guards are enforced per endpoint.
- For idempotent writes, include header: `Idempotency-Key: <uuid>`.

---

## 1) Conversation Lifecycle (no-escrow)

States: `initial`, `work_in_progress`, `work_submitted`, `work_revision_requested`, `work_approved`, `closed`.

Transitions
- Influencer `submit_work`: `work_in_progress|work_revision_requested → work_submitted`
- Brand owner `request_revision`: `work_submitted → work_revision_requested`
- Brand owner `approve_work`: `work_submitted → work_approved`
- Admin `release_final`: `work_approved → closed`

### 1.1 GET /api/conversations/:id
Returns conversation and computed payment breakdown.

Response
```json
{
  "success": true,
  "conversation": { "id": "...", "flow_state": "work_in_progress", "awaiting_role": "influencer", "brand_owner_id": "...", "influencer_id": "...", "flow_data": {"agreed_amount": 5000} },
  "payment_breakdown": {
    "commission_percentage": 10,
    "total_amount": 5000,
    "commission_amount": 500,
    "net_amount": 4500,
    "advance_amount": 1350,
    "final_amount": 3150
  }
}
```

### 1.2 POST /api/conversations/:id/actions
Body
```json
{ "action": "submit_work|request_revision|approve_work|close", "payload": { "message": "...", "reason": "...", "attachments": [{"url":"...","name":"..."}] } }
```
Notes
- Role guards enforced: influencer can `submit_work`; brand owner can `request_revision`/`approve_work`.
- Creates a system message for each action; emits realtime events.

Response
```json
{ "success": true, "conversation": {"id":"...","flow_state":"work_submitted"}, "message": {"id":"...","message":"Work submitted"} }
```

WebSocket events (listen via Socket.IO)
- `conversation_state_changed` → `{ conversation_id, previous_state, new_state, reason, timestamp }`
- `new_message` → `{ conversation_id, message, conversation_context? }`

---

## 2) Admin-mediated Payments (no escrow)

Admin collects money from brand owner off-platform, then records/executes payouts to influencer. Each admin action creates a system message (optionally with screenshots) and may transition conversation state.

All responses include `payment_breakdown` like 1.1.

### 2.1 POST /api/conversations/:id/payments/receive (admin)
Body
```json
{ "amount": 5000, "currency": "INR", "reference": "UTR123", "attachments": [{"url":"..."}], "notes": "Received from BO" }
```
Effect
- Records incoming transaction for audit.
- Adds automated message with optional screenshot.

### 2.2 POST /api/conversations/:id/payments/release-advance (admin)
Body
```json
{ "amount": 1350, "currency": "INR", "payout_reference": "PAYOUT-1", "attachments": [{"url":"..."}], "notes": "Advance" }
```
Effect
- Records payout transaction to influencer.
- Adds automated message; transitions state → `work_in_progress`.
- Emits `conversation_state_changed` and `new_message`.

### 2.3 POST /api/conversations/:id/payments/release-final (admin)
Precondition
- Conversation must be `work_approved` (brand owner approved work).

Body
```json
{ "amount": 3150, "currency": "INR", "payout_reference": "PAYOUT-2", "attachments": [{"url":"..."}], "notes": "Final" }
```
Effect
- Records final payout; posts system message.
- Transitions to `closed`; emits state + message events.

### 2.4 POST /api/conversations/:id/payments/refund-final (admin)
Body
```json
{ "amount": 3150, "currency": "INR", "refund_reference": "REF-1", "attachments": [{"url":"..."}], "notes": "Refund to BO" }
```
Effect
- Records refund back to brand owner; posts system message.

Frontend recommendation
- Always fetch `GET /api/conversations/:id` and use `payment_breakdown` to prefill advance/final amounts.
- Allow admin override for amounts if required; still display breakdown reference.

---

## 3) Reports

### 3.1 POST /api/reports
Body (supports either `reason_id` or `reason_key`)
```json
{
  "reported_user_id": "uuid",
  "conversation_id": "uuid",
  "reason_key": "communication_issue",
  "reason_text": "Not responding",
  "attachments": [{"url":"...","name":"..."}],
  "source": "chat_header",
  "metadata": {"contextMessageId":"..."}
}
```
Headers
- `Idempotency-Key: <uuid>` – returns same report if retried.

Behavior
- Validates both users belong to conversation when provided.
- Maps `reason_key` to `report_reasons.id` when possible; echoes `reason_key` back.
- Deduplicates open reports for same tuple within 24h.
- Basic rate limits and flood control.
- Emits admin notifications (best-effort).

Response
```json
{ "success": true, "report": {"id":"rep_...","status":"open"}, "idempotent": true, "reason_key": "communication_issue" }
```

### 3.2 GET /api/reports/mine
Returns paginated list of current user's reports.

### 3.3 GET /api/reports (admin)
Query: `page, limit, status?, reported_user_id?`
Returns reports, counts per reported user, and pagination.

### 3.4 POST /api/reports/:id/actions (admin)
Body
```json
{ "action": "acknowledge|dismiss|escalate|resolve", "notes": "..." }
```
Effect
- Updates `status`; records audit trail in `user_report_events` when available.

---

## 4) Frontend Handling (Suggested)

### 4.1 Socket wiring (per conversation)
```javascript
socket.emit('join_conversation', conversationId);

socket.on('conversation_state_changed', (e) => {
  // update UI chips, buttons, and header state
});

socket.on('new_message', (e) => {
  // append to message list; if message_type is system/payment_* show styled card
});
```

### 4.2 Action buttons
- Influencer: show `WorkSubmissionButton` when state in [`work_in_progress`, `work_revision_requested`].
  - POST `/api/conversations/:id/actions { action: 'submit_work', payload: { message, attachments } }`
- Brand owner: show `Approve`/`Request revision` when state `work_submitted`.
  - POST `/api/conversations/:id/actions { action: 'approve_work' }`
  - POST `/api/conversations/:id/actions { action: 'request_revision', payload: { reason } }`
- Admin Panel: payment controls
  - Preload via GET `/api/conversations/:id` → `payment_breakdown`
  - Release Advance/Final with attachments as proof; update UI from response and sockets.

### 4.3 Reports UI
- Open `ReportModal` from chat header, prefill `conversation_id`, `reported_user_id` (other participant), and `reason_key` from taxonomy.
- POST `/api/reports` with optional attachments and `Idempotency-Key`.
- Handle 200 with `{ idempotent: true }` as success (dedupbed within 24h).

### 4.4 Error envelope
```json
{ "success": false, "error": { "code": "STATE_CONFLICT", "message": "...", "details": { } } }
```
Always show a toast with `error.message` and log `details`.

---

## 5) Types (illustrative)

Message (system/payment)
```json
{ "id":"...", "message":"Admin released advance ₹1350", "message_type":"system", "attachment_metadata": {"attachments":[{"url":"..."}]} }
```

PaymentBreakdown
```ts
type PaymentBreakdown = {
  commission_percentage: number;
  total_amount: number;
  commission_amount: number;
  net_amount: number;
  advance_amount: number;
  final_amount: number;
}
```

---

## 6) Notes
- Commission is read from backend `commission_settings` (default 10%) and applied to agreed amount.
- Advance/final split currently 30/70 of net; can be made configurable (e.g., `advance_percent`) if needed.
- If you need per-conversation overrides, persist to `conversations.flow_data` and the breakdown will consider that.


