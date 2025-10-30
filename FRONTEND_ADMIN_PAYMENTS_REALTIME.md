## Realtime Payments and Admin Stages - Frontend Guide

This guide describes the sockets-only flow for brand-owner payment, verification, and admin advance/final release. REST is used only to trigger actions; all UI state is driven by socket events.

### Socket listeners inside an open chat (room:<conversationId>)
- conversation_state_changed
  - Update in-memory conversation: flow_state, awaiting_role, chat_status, current_action_data.
  - Re-render ActionInterface based on current_action_data.
- chat:new
  - Append automated/user messages.
- conversation_list_updated (user_<userId>)
  - Merge minimal list row (last message, unread, order). Do not overwrite open chat state.

### Proceed to payment (brand owner)
1) Tap “Proceed to payment” → call brand owner action API.
2) Response contains current_action_data.razorpay_order; open Razorpay SDK immediately.
3) On success, POST verify endpoint (bids: `/api/bids/automated/verify-payment`, campaigns: `/api/campaigns/automated/verify-payment`).
4) Do not poll; rely on:
   - conversation_state_changed → next state (e.g., `admin_advance_pending`).
   - chat:new → optional confirmation message.

### Admin stages (realtime only)
After verification, the backend sets one of these and emits conversation_state_changed with current_action_data:

- admin_advance_pending
  - current_action_data:
    - visible_to: 'admin'
    - message_type: 'admin_payment'
    - flow_state: 'admin_advance_pending'
    - awaiting_role: 'admin'
    - payment_breakdown: { total_amount_paise, commission_amount_paise, net_amount_paise, advance_amount_paise, final_amount_paise, display: { total, commission, net_to_influencer, advance, final } }
    - buttons:
      - { id: 'release_advance', text: 'Release Advance', style: 'success', action: 'release_advance' }
      - { id: 'refund_advance', text: 'Refund Advance to Brand', style: 'danger', action: 'refund_advance' }

- admin_final_pending
  - current_action_data:
    - visible_to: 'admin'
    - message_type: 'admin_payment'
    - flow_state: 'admin_final_pending'
    - awaiting_role: 'admin'
    - payment_breakdown (final focus)
    - buttons:
      - { id: 'release_final', text: 'Release Final', style: 'success', action: 'release_final' }
      - { id: 'refund_final', text: 'Refund Final to Brand', style: 'danger', action: 'refund_final' }

Only admin sees actionable buttons (visible_to='admin'). Brand owner/influencer see info-only.

### Button handlers (admin screen)
- admin_advance_pending:
  - release_advance → POST `/api/admin/payments/conversations/:conversationId/release-advance`
  - refund_advance → POST `/api/admin/payments/conversations/:conversationId/refund-advance`
- admin_final_pending:
  - release_final → POST `/api/admin/payments/conversations/:conversationId/release-final`
  - refund_final → POST `/api/admin/payments/conversations/:conversationId/refund-final`

Backend effects (realtime)
- Emits conversation_state_changed to `room:<conversationId>` with updated state and current_action_data.
- Emits chat:new with a system confirmation message when appropriate.
- Emits conversation_list_updated to both users.

### Rendering rules (ActionInterface)
1) If current_action_data exists:
   - If `visible_to` matches the current user role or 'both', render buttons.
   - Else render info-only (title/subtitle, breakdown).
2) Payment pending (brand owner): if `razorpay_order` exists, open the SDK immediately; optionally also show a Pay Now button.
3) When conversation_state_changed arrives with `current_action_data: {}` (or undefined), remove action UI and show plain chat.

### Minimal client sketch
```ts
socket.on('conversation_state_changed', (p) => {
  if (p.conversation_id !== activeId) return;
  setConversation(s => ({
    ...s,
    flow_state: p.flow_state,
    awaiting_role: p.awaiting_role ?? s.awaiting_role,
    chat_status: p.chat_status ?? s.chat_status,
    current_action_data: p.current_action_data || {}
  }));
});

socket.on('chat:new', ({ message }) => appendMessage(message));

function renderActionInterface(conv, userRole) {
  const a = conv.current_action_data;
  if (!a) return null;
  const canAct = a.visible_to === userRole || a.visible_to === 'both';

  if (a.message_type === 'admin_payment') {
    return canAct ? (
      <AdminPaymentUI breakdown={a.payment_breakdown} buttons={a.buttons} />
    ) : (
      <AdminPaymentInfo breakdown={a.payment_breakdown} />
    );
  }

  if (a.razorpay_order) {
    openRazorpayOnce(a.razorpay_order); // guard to avoid re-opening
  }
  return null;
}
```

### Do not poll
- Hydrate once on mount/reconnect (context + first page of messages).
- After that, rely on sockets only: conversation_state_changed, chat:new, conversation_list_updated.


