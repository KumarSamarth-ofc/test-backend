# 🚀 Frontend Action Buttons Implementation Guide

## 📋 Overview

This guide provides complete implementation details for action buttons in the automated chat system. It covers payload requirements, API calls, UI states, and error handling for all automated flow actions.

---

## 🎯 **Action Button Types & Payloads**

### **1. Simple Actions (No Data Required)**

These actions don't need any additional data - just send an empty object:

```typescript
const simpleActions = [
  'accept_connection',    // Influencer accepts brand owner's connection request
  'reject_connection',    // Influencer rejects brand owner's connection request
  'accept_project',       // Influencer accepts project requirements
  'deny_project',         // Influencer denies project requirements
  'accept_price',         // Influencer accepts price offer
  'reject_price',         // Influencer rejects price offer
  'negotiate_price',      // Influencer requests price negotiation
  'proceed_to_payment'    // Brand owner proceeds to payment
];

// Frontend implementation
const handleSimpleAction = async (action: string) => {
  try {
    const response = await sendAction(conversationId, action, {});
    handleActionResponse(response);
  } catch (error) {
    handleActionError(error);
  }
};
```

### **2. Actions with Input Data Required**

#### **A. Project Details Input (`send_project_details`)**
```typescript
// Required payload
interface ProjectDetailsPayload {
  details: string; // Project requirements and details
}

// Frontend implementation
const [projectDetails, setProjectDetails] = useState('');

const handleSendProjectDetails = async () => {
  if (!projectDetails.trim()) {
    showError('Project details are required');
    return;
  }

  try {
    const response = await sendAction(conversationId, 'send_project_details', {
      details: projectDetails.trim()
    });
    handleActionResponse(response);
  } catch (error) {
    handleActionError(error);
  }
};

// UI Component
<div className="input-section">
  <textarea
    value={projectDetails}
    onChange={(e) => setProjectDetails(e.target.value)}
    placeholder="Enter project details, requirements, timeline, and any specific instructions..."
    maxLength={1000}
    required
  />
  <button onClick={handleSendProjectDetails}>
    Send Project Details
  </button>
</div>
```

#### **B. Price Offer Input (`send_price_offer`)**
```typescript
// Required payload
interface PriceOfferPayload {
  price: number; // Price amount in INR
}

// Frontend implementation
const [price, setPrice] = useState('');

const handleSendPriceOffer = async () => {
  const priceValue = parseInt(price);
  if (!priceValue || priceValue <= 0) {
    showError('Please enter a valid price');
    return;
  }

  try {
    const response = await sendAction(conversationId, 'send_price_offer', {
      price: priceValue
    });
    handleActionResponse(response);
  } catch (error) {
    handleActionError(error);
  }
};

// UI Component
<div className="input-section">
  <input
    type="number"
    value={price}
    onChange={(e) => setPrice(e.target.value)}
    placeholder="Enter price amount in INR"
    min="1"
    required
  />
  <button onClick={handleSendPriceOffer}>
    Send Price Offer
  </button>
</div>
```

#### **C. Negotiated Price Input (`send_negotiated_price`)**
```typescript
// Required payload
interface NegotiatedPricePayload {
  price: number; // New negotiated price amount
}

// Frontend implementation
const [negotiatedPrice, setNegotiatedPrice] = useState('');

const handleSendNegotiatedPrice = async () => {
  const priceValue = parseInt(negotiatedPrice);
  if (!priceValue || priceValue <= 0) {
    showError('Please enter a valid price');
    return;
  }

  try {
    const response = await sendAction(conversationId, 'send_negotiated_price', {
      price: priceValue
    });
    handleActionResponse(response);
    handleActionResponse(response);
  } catch (error) {
    handleActionError(error);
  }
};

// UI Component
<div className="input-section">
  <input
    type="number"
    value={negotiatedPrice}
    onChange={(e) => setNegotiatedPrice(e.target.value)}
    placeholder="Enter new negotiated price"
    min="1"
    required
  />
  <button onClick={handleSendNegotiatedPrice}>
    Send Negotiated Price
  </button>
</div>
```

---

## 🔌 **API Implementation**

### **1. Generic Action Sender**

```typescript
// Generic action sender for brand owner actions
const sendBrandOwnerAction = async (
  conversationId: string, 
  action: string, 
  data?: any
) => {
  const response = await fetch(`/api/bids/automated/brand-owner-action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      conversation_id: conversationId,
      action: action,
      data: data || {}
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Generic action sender for influencer actions
const sendInfluencerAction = async (
  conversationId: string, 
  action: string, 
  data?: any
) => {
  const response = await fetch(`/api/bids/automated/influencer-action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      conversation_id: conversationId,
      action: action,
      data: data || {}
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// Unified action sender
const sendAction = async (
  conversationId: string, 
  action: string, 
  data?: any,
  userRole: 'brand_owner' | 'influencer' = 'brand_owner'
) => {
  if (userRole === 'brand_owner') {
    return sendBrandOwnerAction(conversationId, action, data);
  } else {
    return sendInfluencerAction(conversationId, action, data);
  }
};
```

### **2. Campaign Actions (if using campaigns instead of bids)**

```typescript
// For campaign conversations
const sendCampaignAction = async (
  conversationId: string, 
  action: string, 
  data?: any,
  userRole: 'brand_owner' | 'influencer' = 'brand_owner'
) => {
  const endpoint = userRole === 'brand_owner' 
    ? '/api/campaigns/automated/brand-owner-action'
    : '/api/campaigns/automated/influencer-action';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      conversation_id: conversationId,
      action: action,
      data: data || {}
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};
```

---

## 🎨 **UI State Management**

### **1. Flow State & Action Button Visibility**

```typescript
interface ConversationState {
  id: string;
  flowState: string;
  awaitingRole: string;
  conversationType: 'bid' | 'campaign';
  flowData: any;
  brandOwnerId: string;
  influencerId: string;
}

// Determine if current user should see action buttons
const shouldShowActionButtons = (userRole: string, currentFlowState: string) => {
  const userRoleMap = {
    'brand_owner': 'brand_owner',
    'influencer': 'influencer'
  };
  
  return userRoleMap[userRole] === currentFlowState.awaitingRole;
};

// Get available actions for current flow state
const getAvailableActions = (flowState: string, userRole: string) => {
  const actionMap = {
    'initial': {
      brand_owner: ['connect'], // Note: This is now automatic
      influencer: []
    },
    'influencer_responding': {
      brand_owner: [],
      influencer: ['accept_connection', 'reject_connection']
    },
    'brand_owner_details': {
      brand_owner: ['send_project_details'],
      influencer: []
    },
    'influencer_reviewing': {
      brand_owner: [],
      influencer: ['accept_project', 'deny_project']
    },
    'brand_owner_pricing': {
      brand_owner: ['send_price_offer'],
      influencer: []
    },
    'influencer_price_response': {
      brand_owner: [],
      influencer: ['accept_price', 'reject_price', 'negotiate_price']
    },
    'brand_owner_negotiation': {
      brand_owner: ['agree_negotiation', 'reject_negotiation'],
      influencer: []
    },
    'negotiation_input': {
      brand_owner: ['send_negotiated_price'],
      influencer: []
    },
    'influencer_final_response': {
      brand_owner: [],
      influencer: ['accept_negotiated_price', 'reject_negotiated_price']
    },
    'payment_pending': {
      brand_owner: ['proceed_to_payment'],
      influencer: []
    }
  };
  
  return actionMap[flowState]?.[userRole] || [];
};
```

### **2. Action Button Component**

```typescript
interface ActionButtonProps {
  action: string;
  text: string;
  style: 'success' | 'danger' | 'warning' | 'primary';
  onClick: () => void;
  disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  action,
  text,
  style,
  onClick,
  disabled = false
}) => {
  const buttonStyles = {
    success: 'bg-green-500 hover:bg-green-600',
    danger: 'bg-red-500 hover:bg-red-600',
    warning: 'bg-yellow-500 hover:bg-yellow-600',
    primary: 'bg-blue-500 hover:bg-blue-600'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-4 py-2 rounded-lg text-white font-medium
        ${buttonStyles[style]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        transition-colors duration-200
      `}
    >
      {text}
    </button>
  );
};
```

### **3. Dynamic Action Button Rendering**

```typescript
const renderActionButtons = (flowState: string, userRole: string) => {
  const availableActions = getAvailableActions(flowState, userRole);
  
  if (availableActions.length === 0) {
    return <div className="text-gray-500">Waiting for other party...</div>;
  }

  const actionConfigs = {
    'accept_connection': { text: 'Accept Connection', style: 'success' as const },
    'reject_connection': { text: 'Reject Connection', style: 'danger' as const },
    'accept_project': { text: 'Accept Project', style: 'success' as const },
    'deny_project': { text: 'Deny Project', style: 'danger' as const },
    'accept_price': { text: 'Accept Offer', style: 'success' as const },
    'reject_price': { text: 'Reject Offer', style: 'danger' as const },
    'negotiate_price': { text: 'Negotiate Price', style: 'warning' as const },
    'proceed_to_payment': { text: 'Proceed to Payment', style: 'success' as const }
  };

  return (
    <div className="flex gap-3 flex-wrap">
      {availableActions.map(action => {
        const config = actionConfigs[action];
        if (!config) return null;
        
        return (
          <ActionButton
            key={action}
            action={action}
            text={config.text}
            style={config.style}
            onClick={() => handleAction(action)}
          />
        );
      })}
    </div>
  );
};
```

---

## ✅ **Input Validation**

### **1. Validation Rules**

```typescript
interface ValidationRule {
  required: string[];
  validate: (data: any) => boolean;
  errorMessage: string;
}

const validationRules: Record<string, ValidationRule> = {
  'send_project_details': {
    required: ['details'],
    validate: (data: any) => {
      return data.details && 
             data.details.length > 0 && 
             data.details.length <= 1000;
    },
    errorMessage: 'Project details must be between 1 and 1000 characters'
  },
  'send_price_offer': {
    required: ['price'],
    validate: (data: any) => {
      return data.price && 
             data.price > 0 && 
             data.price <= 1000000;
    },
    errorMessage: 'Price must be between ₹1 and ₹10,00,000'
  },
  'send_negotiated_price': {
    required: ['price'],
    validate: (data: any) => {
      return data.price && 
             data.price > 0 && 
             data.price <= 1000000;
    },
    errorMessage: 'Negotiated price must be between ₹1 and ₹10,00,000'
  }
};

// Validate input before sending action
const validateAndSendAction = async (action: string, data?: any) => {
  const rule = validationRules[action];
  
  if (rule) {
    // Check required fields
    for (const field of rule.required) {
      if (!data || !data[field]) {
        throw new Error(`${field} is required for action: ${action}`);
      }
    }
    
    // Validate data
    if (!rule.validate(data)) {
      throw new Error(rule.errorMessage);
    }
  }

  return sendAction(conversationId, action, data);
};
```

---

## 🚨 **Error Handling**

### **1. Action Error Handler**

```typescript
const handleActionError = (error: any) => {
  console.error('Action failed:', error);
  
  // Handle specific error cases
  if (error.message.includes('Connect action is not needed')) {
    showInfoMessage('Connection request already sent automatically');
    return;
  }
  
  if (error.message.includes('Action not valid for current state')) {
    showWarningMessage('This action is not available in the current state');
    return;
  }
  
  // Handle validation errors
  if (error.message.includes('is required') || error.message.includes('must be')) {
    showErrorMessage(error.message);
    return;
  }
  
  // Generic error
  showErrorMessage('Action failed: ' + error.message);
};

// Toast/notification functions
const showSuccessMessage = (message: string) => {
  // Implement your toast/notification system
  toast.success(message);
};

const showErrorMessage = (message: string) => {
  toast.error(message);
};

const showWarningMessage = (message: string) => {
  toast.warning(message);
};

const showInfoMessage = (message: string) => {
  toast.info(message);
};
```

### **2. Response Handler**

```typescript
const handleActionResponse = (response: any) => {
  if (response.success) {
    // Update conversation state
    updateFlowState(response.flow_state, response.awaiting_role);
    
    // Show success message
    showSuccessMessage('Action completed successfully');
    
    // Update UI based on new state
    updateConversationUI(response);
    
    // Refresh messages if needed
    if (response.message) {
      addMessageToConversation(response.message);
    }
    
    if (response.audit_message) {
      addMessageToConversation(response.audit_message);
    }
  } else {
    showErrorMessage(response.message || 'Action failed');
  }
};
```

---

## 🔄 **Complete Implementation Example**

### **1. Main Action Handler**

```typescript
const ConversationActions: React.FC<{ conversation: ConversationState }> = ({ conversation }) => {
  const { userRole } = useAuth(); // Your auth hook
  const [loading, setLoading] = useState(false);
  
  const handleAction = async (action: string, data?: any) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const response = await validateAndSendAction(action, data);
      handleActionResponse(response);
    } catch (error) {
      handleActionError(error);
    } finally {
      setLoading(false);
    }
  };
  
  const shouldShowActions = shouldShowActionButtons(userRole, conversation);
  const availableActions = getAvailableActions(conversation.flowState, userRole);
  
  if (!shouldShowActions || availableActions.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        {conversation.awaitingRole === 'influencer' 
          ? 'Waiting for influencer response...' 
          : 'Waiting for brand owner response...'
        }
      </div>
    );
  }
  
  return (
    <div className="action-buttons-container">
      {renderActionButtons(conversation.flowState, userRole)}
      
      {/* Input fields for actions that need data */}
      {availableActions.includes('send_project_details') && (
        <ProjectDetailsInput onSubmit={(details) => handleAction('send_project_details', { details })} />
      )}
      
      {availableActions.includes('send_price_offer') && (
        <PriceInput onSubmit={(price) => handleAction('send_price_offer', { price })} />
      )}
      
      {availableActions.includes('send_negotiated_price') && (
        <PriceInput onSubmit={(price) => handleAction('send_negotiated_price', { price })} />
      )}
    </div>
  );
};
```

### **2. Input Components**

```typescript
const ProjectDetailsInput: React.FC<{ onSubmit: (details: string) => void }> = ({ onSubmit }) => {
  const [details, setDetails] = useState('');
  
  const handleSubmit = () => {
    if (details.trim()) {
      onSubmit(details.trim());
      setDetails('');
    }
  };
  
  return (
    <div className="input-section mt-4">
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Enter project details, requirements, timeline, and any specific instructions..."
        maxLength={1000}
        className="w-full p-3 border rounded-lg resize-none"
        rows={4}
      />
      <div className="flex justify-between items-center mt-2">
        <span className="text-sm text-gray-500">
          {details.length}/1000 characters
        </span>
        <button
          onClick={handleSubmit}
          disabled={!details.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
        >
          Send Project Details
        </button>
      </div>
    </div>
  );
};

const PriceInput: React.FC<{ onSubmit: (price: number) => void }> = ({ onSubmit }) => {
  const [price, setPrice] = useState('');
  
  const handleSubmit = () => {
    const priceValue = parseInt(price);
    if (priceValue > 0) {
      onSubmit(priceValue);
      setPrice('');
    }
  };
  
  return (
    <div className="input-section mt-4">
      <div className="flex gap-2">
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Enter price amount in INR"
          min="1"
          className="flex-1 p-3 border rounded-lg"
        />
        <button
          onClick={handleSubmit}
          disabled={!price || parseInt(price) <= 0}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
        >
          Send Price
        </button>
      </div>
    </div>
  );
};
```

---

## 📱 **Mobile/React Native Considerations**

### **1. Touch-Friendly Buttons**

```typescript
// Ensure buttons are large enough for mobile
const ActionButton: React.FC<ActionButtonProps> = ({ ... }) => {
  return (
    <TouchableOpacity
      onPress={onClick}
      disabled={disabled}
      style={[
        styles.button,
        styles[style],
        disabled && styles.disabled
      ]}
      activeOpacity={0.7}
    >
      <Text style={styles.buttonText}>{text}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 48, // Touch-friendly height
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  success: { backgroundColor: '#10B981' },
  danger: { backgroundColor: '#EF4444' },
  warning: { backgroundColor: '#F59E0B' },
  primary: { backgroundColor: '#3B82F6' },
  disabled: { opacity: 0.5 }
});
```

### **2. Input Handling for Mobile**

```typescript
// Use appropriate input components for mobile
const ProjectDetailsInput: React.FC<{ onSubmit: (details: string) => void }> = ({ onSubmit }) => {
  const [details, setDetails] = useState('');
  
  return (
    <View style={styles.inputContainer}>
      <TextInput
        value={details}
        onChangeText={setDetails}
        placeholder="Enter project details..."
        multiline
        numberOfLines={4}
        style={styles.textInput}
        maxLength={1000}
      />
      <View style={styles.inputFooter}>
        <Text style={styles.charCount}>
          {details.length}/1000
        </Text>
        <TouchableOpacity
          onPress={() => onSubmit(details)}
          disabled={!details.trim()}
          style={[styles.submitButton, !details.trim() && styles.disabled]}
        >
          <Text style={styles.submitButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
```

---

## 🧪 **Testing**

### **1. Unit Tests**

```typescript
// Test action payload validation
describe('Action Validation', () => {
  test('should validate project details payload', () => {
    const validPayload = { details: 'Valid project details' };
    const invalidPayload = { details: '' };
    
    expect(validateProjectDetails(validPayload)).toBe(true);
    expect(validateProjectDetails(invalidPayload)).toBe(false);
  });
  
  test('should validate price payload', () => {
    const validPayload = { price: 5000 };
    const invalidPayload = { price: -100 };
    
    expect(validatePrice(validPayload)).toBe(true);
    expect(validatePrice(invalidPayload)).toBe(false);
  });
});

// Test action button visibility
describe('Action Button Visibility', () => {
  test('should show correct actions for influencer_responding state', () => {
    const actions = getAvailableActions('influencer_responding', 'influencer');
    expect(actions).toContain('accept_connection');
    expect(actions).toContain('reject_connection');
  });
});
```

### **2. Integration Tests**

```typescript
// Test complete action flow
describe('Action Flow Integration', () => {
  test('should handle accept_connection action flow', async () => {
    const mockResponse = {
      success: true,
      flow_state: 'brand_owner_details',
      awaiting_role: 'brand_owner'
    };
    
    // Mock API call
    jest.spyOn(api, 'sendAction').mockResolvedValue(mockResponse);
    
    const result = await handleAction('accept_connection');
    
    expect(result.flow_state).toBe('brand_owner_details');
    expect(result.awaiting_role).toBe('brand_owner');
  });
});
```

---

## 📚 **Quick Reference**

### **Action Payload Summary**

| Action | Payload | Required | Example |
|--------|---------|----------|---------|
| `accept_connection` | `{}` | No | `{}` |
| `reject_connection` | `{}` | No | `{}` |
| `send_project_details` | `{ details: string }` | Yes | `{ details: "Project requirements..." }` |
| `send_price_offer` | `{ price: number }` | Yes | `{ price: 5000 }` |
| `negotiate_price` | `{}` | No | `{}` |
| `send_negotiated_price` | `{ price: number }` | Yes | `{ price: 4500 }` |

### **API Endpoints**

- **Brand Owner Actions**: `POST /api/bids/automated/brand-owner-action`
- **Influencer Actions**: `POST /api/bids/automated/influencer-action`
- **Campaign Actions**: `POST /api/campaigns/automated/{role}-action`

### **Required Headers**

```typescript
{
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
}
```

---

## 🎉 **Conclusion**

This guide provides everything you need to implement action buttons in your automated chat system. The key points are:

1. **Simple actions** need no payload - just send `{}`
2. **Input actions** need specific data like `{ details: "text" }` or `{ price: 5000 }`
3. **Always validate** input before sending actions
4. **Handle errors** gracefully with user-friendly messages
5. **Update UI state** based on action responses
6. **Show/hide buttons** based on current flow state and user role

For any questions or clarifications, refer to the backend API documentation or contact the backend team! 🚀
