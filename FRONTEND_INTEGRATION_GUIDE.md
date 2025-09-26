# Frontend Integration Guide: Negotiation Flow as Addon to Existing Automated Flow

## Overview
The negotiation flow is **NOT a new implementation** - it's an **addon** to the existing automated flow system. The frontend should handle negotiation states the same way it handles all other automated flow states.

## Existing Automated Flow Pattern

### 1. **Flow State Management**
The frontend already handles these flow states:
```javascript
// Existing flow states (from database schema)
const EXISTING_FLOW_STATES = [
  'initial',
  'influencer_responding',
  'brand_owner_details',
  'influencer_reviewing', 
  'brand_owner_pricing',
  'influencer_price_response',
  'brand_owner_negotiation',     // EXISTING - negotiation request
  'influencer_final_response',
  'payment_pending',
  'payment_completed',
  'work_in_progress',
  'work_submitted',
  'work_approved',
  'real_time',
  'chat_closed'
];
```

### 2. **New Negotiation States (Addons)**
```javascript
// NEW states added for enhanced negotiation
const NEW_NEGOTIATION_STATES = [
  'influencer_price_input',      // NEW - counter offer input
  'brand_owner_price_response'   // NEW - brand owner response to counter
];
```

## Frontend Integration Pattern

### 1. **State Detection (Same as Existing)**
```javascript
// Frontend should detect negotiation states the same way as existing states
const isNegotiationState = (flowState) => {
  return [
    'brand_owner_negotiation',    // Existing
    'influencer_price_input',     // New
    'brand_owner_price_response'  // New
  ].includes(flowState);
};

// Usage in existing flow handler
if (conversation.chat_status === 'automated' && conversation.flow_state) {
  if (isNegotiationState(conversation.flow_state)) {
    // Handle negotiation states same as other automated states
    renderNegotiationInterface(conversation);
  } else {
    // Handle other automated states
    renderAutomatedInterface(conversation);
  }
}
```

### 2. **Button Handling (Same Pattern)**
```javascript
// Frontend already handles button clicks the same way
const handleButtonClick = async (buttonId, additionalData = {}) => {
  const response = await fetch('/api/messages/conversations/:id/button-click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      button_id: buttonId,
      additional_data: additionalData
    })
  });
  
  // Same response handling for all automated flows
  const result = await response.json();
  updateConversationState(result.conversation);
};
```

### 3. **Message Rendering (Same Pattern)**
```javascript
// Frontend already renders action_data the same way
const renderMessage = (message) => {
  if (message.action_required && message.action_data) {
    return (
      <ActionInterface
        title={message.action_data.title}
        subtitle={message.action_data.subtitle}
        buttons={message.action_data.buttons}
        inputField={message.action_data.input_field}
        flowState={message.action_data.flow_state}
        visibleTo={message.action_data.visible_to}
        onButtonClick={handleButtonClick}
        onInputSubmit={handleInputSubmit}
      />
    );
  }
  
  return <RegularMessage message={message.message} />;
};
```

## Negotiation-Specific UI Components

### 1. **Counter Offer Input (New Component)**
```javascript
// Only needed for influencer_price_input state
const CounterOfferInput = ({ onCounterOffer }) => {
  const [price, setPrice] = useState('');
  
  const handleSubmit = () => {
    onCounterOffer({ price: parseInt(price) });
  };
  
  return (
    <div className="counter-offer-input">
      <input
        type="number"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="Enter your counter offer"
        min="1"
      />
      <button onClick={handleSubmit}>Send Counter Offer</button>
    </div>
  );
};
```

### 2. **Negotiation History (New Component)**
```javascript
// Only needed for negotiation states
const NegotiationHistory = ({ history, currentRound, maxRounds }) => {
  return (
    <div className="negotiation-history">
      <h4>Negotiation Round {currentRound}/{maxRounds}</h4>
      {history.map((entry, index) => (
        <div key={index} className="negotiation-entry">
          <span>{entry.action}: ₹{entry.price}</span>
          <span>{entry.timestamp}</span>
        </div>
      ))}
    </div>
  );
};
```

## Complete Integration Example

### 1. **Enhanced Flow State Handler**
```javascript
const handleAutomatedFlow = (conversation) => {
  const { flow_state, awaiting_role, negotiation_round, max_negotiation_rounds } = conversation;
  
  switch (flow_state) {
    // Existing states (no changes needed)
    case 'influencer_responding':
      return renderConnectionResponse(conversation);
    case 'brand_owner_details':
      return renderProjectDetailsInput(conversation);
    case 'influencer_reviewing':
      return renderProjectReview(conversation);
    case 'brand_owner_pricing':
      return renderPriceInput(conversation);
    case 'influencer_price_response':
      return renderPriceResponse(conversation);
    
    // Existing negotiation state (no changes needed)
    case 'brand_owner_negotiation':
      return renderNegotiationResponse(conversation);
    
    // NEW negotiation states (addons)
    case 'influencer_price_input':
      return renderCounterOfferInput(conversation);
    case 'brand_owner_price_response':
      return renderCounterOfferResponse(conversation);
    
    // Existing states (no changes needed)
    case 'influencer_final_response':
      return renderFinalResponse(conversation);
    case 'payment_pending':
      return renderPaymentInterface(conversation);
    // ... other existing states
  }
};
```

### 2. **Button Mapping (Same as Existing)**
```javascript
// Frontend already maps buttons the same way
const BUTTON_MAPPINGS = {
  // Existing buttons (no changes needed)
  'accept_connection': 'accept_connection',
  'reject_connection': 'reject_connection',
  'accept_project': 'accept_project',
  'deny_project': 'deny_project',
  'accept_price': 'accept_price',
  'reject_price': 'reject_price',
  
  // Existing negotiation buttons (no changes needed)
  'negotiate_price': 'negotiate_price',
  'agree_negotiation': 'handle_negotiation',
  'reject_negotiation': 'handle_negotiation',
  
  // NEW negotiation buttons (addons)
  'send_counter_offer': 'send_counter_offer',
  'accept_counter_offer': 'accept_counter_offer',
  'reject_counter_offer': 'reject_counter_offer',
  'make_final_offer': 'make_final_offer',
  'accept_final_offer': 'accept_final_offer',
  'reject_final_offer': 'reject_final_offer',
  'accept_negotiated_price': 'accept_negotiated_price',
  'reject_negotiated_price': 'reject_negotiated_price'
};
```

### 3. **Data Flow (Same as Existing)**
```javascript
// Frontend already handles data the same way
const handleNegotiationAction = async (action, data) => {
  // Same API call pattern as existing automated flows
  const response = await fetch('/api/messages/conversations/:id/button-click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      button_id: action,
      additional_data: data
    })
  });
  
  // Same response handling
  const result = await response.json();
  if (result.success) {
    updateConversationState(result.conversation);
    updateMessages(result.messages);
  }
};
```

## Key Points for Frontend Integration

### 1. **No New Architecture Needed**
- Use existing `ActionInterface` component
- Use existing button click handling
- Use existing message rendering
- Use existing state management

### 2. **Only Add New UI Components**
- `CounterOfferInput` for `influencer_price_input` state
- `NegotiationHistory` for showing round tracking
- Enhanced `ActionInterface` for negotiation buttons

### 3. **Same Data Flow**
- Same API endpoints
- Same message structure
- Same button mapping
- Same state updates

### 4. **Database Schema (Already Updated)**
```sql
-- New columns added to conversations table
ALTER TABLE conversations 
ADD COLUMN negotiation_round INTEGER DEFAULT 0,
ADD COLUMN max_negotiation_rounds INTEGER DEFAULT 3,
ADD COLUMN negotiation_history JSONB DEFAULT '[]';

-- New flow states added to constraint
ALTER TABLE conversations 
ADD CONSTRAINT check_flow_state 
CHECK (flow_state IN (
  -- ... existing states ...
  'influencer_price_input',      -- NEW
  'brand_owner_price_response'   -- NEW
));
```

## Summary

The negotiation flow is **100% compatible** with the existing automated flow system:

1. **Same API endpoints** - No new endpoints needed
2. **Same message structure** - Uses existing `action_data` format
3. **Same button handling** - Uses existing button click system
4. **Same state management** - Uses existing flow state system
5. **Same UI patterns** - Uses existing `ActionInterface` component

**Frontend only needs to:**
- Add 2 new flow state handlers
- Add 1 new input component (counter offer)
- Add 1 new display component (negotiation history)
- Add new button mappings (already handled by backend)

**No changes needed to:**
- Existing flow state handling
- Existing button click system
- Existing message rendering
- Existing API calls
- Existing state management
