# Negotiation Flow Integration with Existing Automated Flow

## Visual Flow Diagram

```
EXISTING AUTOMATED FLOW (No Changes Needed)
============================================

1. influencer_responding
   ↓ (influencer accepts connection)
2. brand_owner_details  
   ↓ (brand owner sends project details)
3. influencer_reviewing
   ↓ (influencer accepts project)
4. brand_owner_pricing
   ↓ (brand owner sends price offer)
5. influencer_price_response
   ↓ (influencer chooses: accept/reject/negotiate)
   
   IF ACCEPT → payment_pending
   IF REJECT → chat_closed
   IF NEGOTIATE → brand_owner_negotiation (EXISTING STATE)

NEGOTIATION FLOW (Addon - New States Added)
===========================================

6. brand_owner_negotiation (EXISTING)
   ↓ (brand owner chooses: agree/reject)
   
   IF REJECT → chat_closed
   IF AGREE → influencer_price_input (NEW STATE)

7. influencer_price_input (NEW)
   ↓ (influencer sends counter offer)
8. brand_owner_price_response (NEW)
   ↓ (brand owner responds: accept/reject/make_final)
   
   IF ACCEPT → payment_pending
   IF REJECT → influencer_price_input (loop back if rounds < max)
   IF REJECT (max rounds) → chat_closed
   IF MAKE_FINAL → influencer_final_response

9. influencer_final_response (EXISTING)
   ↓ (influencer accepts/rejects final offer)
10. payment_pending (EXISTING)
```

## Frontend Integration Points

### 1. **Existing Flow States (No Changes)**
```javascript
// These states already work - no frontend changes needed
const EXISTING_STATES = [
  'influencer_responding',     // ✅ Already handled
  'brand_owner_details',       // ✅ Already handled  
  'influencer_reviewing',      // ✅ Already handled
  'brand_owner_pricing',       // ✅ Already handled
  'influencer_price_response', // ✅ Already handled
  'brand_owner_negotiation',   // ✅ Already handled
  'influencer_final_response', // ✅ Already handled
  'payment_pending'            // ✅ Already handled
];
```

### 2. **New Negotiation States (Addons)**
```javascript
// These are the ONLY new states frontend needs to handle
const NEW_NEGOTIATION_STATES = [
  'influencer_price_input',      // NEW - Counter offer input
  'brand_owner_price_response'   // NEW - Brand owner response to counter
];
```

### 3. **Integration Pattern**
```javascript
// Frontend flow handler (minimal changes needed)
const handleFlowState = (conversation) => {
  switch (conversation.flow_state) {
    // Existing states - NO CHANGES NEEDED
    case 'influencer_responding':
    case 'brand_owner_details':
    case 'influencer_reviewing':
    case 'brand_owner_pricing':
    case 'influencer_price_response':
    case 'brand_owner_negotiation':      // EXISTING - no changes
    case 'influencer_final_response':
    case 'payment_pending':
      return renderExistingFlow(conversation);
    
    // NEW states - minimal additions
    case 'influencer_price_input':       // NEW - add counter offer input
      return renderCounterOfferInput(conversation);
    case 'brand_owner_price_response':   // NEW - add counter response
      return renderCounterOfferResponse(conversation);
  }
};
```

## Backend Integration (Already Complete)

### 1. **Same API Endpoints**
- `/api/messages/conversations/:id/button-click` (existing)
- `/api/bids/automated/brand-owner-action` (existing)
- `/api/bids/automated/influencer-action` (existing)

### 2. **Same Message Structure**
```javascript
// All messages use the same action_data structure
{
  "message_type": "automated",
  "action_required": true,
  "action_data": {
    "title": "Negotiation Response",
    "subtitle": "Choose how to respond",
    "buttons": [...],
    "flow_state": "brand_owner_negotiation",
    "visible_to": "brand_owner"
  }
}
```

### 3. **Same Button Handling**
```javascript
// All buttons use the same mapping system
const buttonMappings = {
  'agree_negotiation': 'handle_negotiation',
  'reject_negotiation': 'handle_negotiation',
  'send_counter_offer': 'send_counter_offer',
  'accept_counter_offer': 'accept_counter_offer',
  // ... etc
};
```

## Key Benefits of This Integration

### 1. **Minimal Frontend Changes**
- Only 2 new flow state handlers needed
- Only 1 new input component needed
- All existing code remains unchanged

### 2. **Same User Experience**
- Same button click handling
- Same message rendering
- Same state management
- Same API calls

### 3. **Backward Compatible**
- Existing conversations continue to work
- No breaking changes
- Gradual rollout possible

### 4. **Consistent Architecture**
- Same patterns as existing automated flow
- Same error handling
- Same logging and debugging
- Same testing approach

## Implementation Checklist

### Frontend (Minimal Changes)
- [ ] Add `influencer_price_input` state handler
- [ ] Add `brand_owner_price_response` state handler  
- [ ] Add `CounterOfferInput` component
- [ ] Add negotiation history display (optional)
- [ ] Update button mappings (if needed)

### Backend (Already Complete)
- [x] Add new flow states to database constraint
- [x] Add negotiation tracking columns
- [x] Add button mapping in bid controller
- [x] Add negotiation logic in automated flow service
- [x] Add round tracking and history
- [x] Add smart rejection logic

### Database (Already Complete)
- [x] Add `negotiation_round` column
- [x] Add `max_negotiation_rounds` column
- [x] Add `negotiation_history` column
- [x] Update flow state constraint
- [x] Add indexes for performance

## Summary

The negotiation flow is **NOT a new implementation** - it's a **seamless addon** to the existing automated flow system. The frontend only needs to handle 2 new flow states using the same patterns as existing states. All the complex logic, state management, and API handling is already implemented in the backend using the same architecture as the existing automated flow.
