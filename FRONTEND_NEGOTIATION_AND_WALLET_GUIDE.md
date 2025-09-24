# Frontend Negotiation Flow & Wallet Integration Guide

## Overview

This guide covers the complete automated negotiation flow and enhanced wallet system integration for the frontend. It includes real-time updates, socket events, and proper state management.

## 1. Automated Negotiation Flow

### Flow States and Transitions

```javascript
const NEGOTIATION_FLOW_STATES = {
  // Initial states
  'influencer_responding': 'Influencer needs to respond to connection',
  'brand_owner_details': 'Brand owner needs to provide project details',
  'influencer_reviewing': 'Influencer reviewing project requirements',
  'brand_owner_pricing': 'Brand owner needs to set price',
  'influencer_price_response': 'Influencer responding to price offer',
  
  // Negotiation states
  'brand_owner_negotiation': 'Brand owner handling negotiation request',
  'influencer_final_response': 'Influencer final price decision',
  'negotiation_input': 'Brand owner entering new price',
  
  // Payment states
  'payment_pending': 'Payment required from brand owner',
  'payment_completed': 'Payment completed, work can begin',
  
  // Work states
  'work_in_progress': 'Influencer working on project',
  'work_submitted': 'Work submitted for review',
  'work_approved': 'Work approved, escrow released',
  
  // Final states
  'real_time': 'Real-time chat mode',
  'chat_closed': 'Conversation closed',
  'completed': 'Collaboration completed'
};
```

### Socket Events for Real-time Updates

```javascript
// Socket event listeners for negotiation flow
socket.on('conversation_state_changed', (data) => {
  const { conversation_id, previous_state, new_state, reason, timestamp } = data;
  
  // Update UI based on state change
  updateConversationState(conversation_id, new_state);
  
  // Show appropriate UI components
  switch(new_state) {
    case 'influencer_price_response':
      showPriceResponseUI(conversation_id);
      break;
    case 'payment_pending':
      showPaymentUI(conversation_id);
      break;
    case 'work_in_progress':
      showWorkProgressUI(conversation_id);
      break;
  }
});

socket.on('new_message', (data) => {
  const { conversation_id, message, conversation_context } = data;
  
  // Handle different message types
  if (message.action_required) {
    showActionRequiredUI(message);
  } else {
    addMessageToChat(message);
  }
});
```

## 2. Enhanced Wallet System

### Wallet Balance Structure

```javascript
const WALLET_BALANCE = {
  // Core balances (in paise)
  available_balance_paise: 50000,      // Money user can withdraw
  frozen_balance_paise: 20000,         // Money in escrow
  withdrawn_balance_paise: 10000,      // Money already withdrawn
  total_balance_paise: 80000,          // Complete financial position
  
  // Rupee equivalents (for display)
  available_balance_rupees: 500.00,
  frozen_balance_rupees: 200.00,
  withdrawn_balance_rupees: 100.00,
  total_balance_rupees: 800.00,
  
  // Legacy compatibility
  balance_paise: 50000,                // Same as available_balance_paise
  balance: 500.00                      // Same as available_balance_rupees
};
```

### Wallet API Endpoints

```javascript
// Get comprehensive wallet balance
const getWalletBalance = async () => {
  const response = await fetch('/api/enhanced-wallet/balance', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
};

// Process withdrawal
const processWithdrawal = async (amount, method, bankDetails) => {
  const response = await fetch('/api/enhanced-wallet/withdraw', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      amount: amount,
      method: method,
      bank_details: bankDetails,
      notes: 'Withdrawal request'
    })
  });
  return await response.json();
};

// Get transaction history
const getTransactionHistory = async (page = 1, filters = {}) => {
  const params = new URLSearchParams({
    page: page,
    limit: 20,
    ...filters
  });
  
  const response = await fetch(`/api/enhanced-wallet/transactions?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
};
```

## 3. Frontend Components

### Wallet Balance Component

```jsx
import React, { useState, useEffect } from 'react';

const WalletBalance = () => {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWalletBalance();
  }, []);

  const fetchWalletBalance = async () => {
    try {
      const response = await getWalletBalance();
      if (response.success) {
        setWallet(response.wallet);
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading wallet...</div>;
  if (!wallet) return <div>Error loading wallet</div>;

  return (
    <div className="wallet-balance">
      <div className="balance-card">
        <h3>Total Balance</h3>
        <div className="balance-amount">
          ₹{wallet.total_balance_rupees.toFixed(2)}
        </div>
      </div>
      
      <div className="balance-breakdown">
        <div className="balance-item available">
          <span className="label">Available</span>
          <span className="amount">₹{wallet.available_balance_rupees.toFixed(2)}</span>
        </div>
        
        <div className="balance-item frozen">
          <span className="label">In Escrow</span>
          <span className="amount">₹{wallet.frozen_balance_rupees.toFixed(2)}</span>
        </div>
        
        <div className="balance-item withdrawn">
          <span className="label">Withdrawn</span>
          <span className="amount">₹{wallet.withdrawn_balance_rupees.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="wallet-actions">
        <button onClick={() => setShowWithdrawal(true)}>
          Withdraw Money
        </button>
        <button onClick={() => setShowHistory(true)}>
          View History
        </button>
      </div>
    </div>
  );
};
```

### Negotiation Flow Component

```jsx
import React, { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';

const NegotiationFlow = ({ conversationId }) => {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentAction, setCurrentAction] = useState(null);
  const socket = useSocket();

  useEffect(() => {
    // Listen for conversation state changes
    socket.on('conversation_state_changed', (data) => {
      if (data.conversation_id === conversationId) {
        setConversation(prev => ({
          ...prev,
          flow_state: data.new_state
        }));
      }
    });

    // Listen for new messages
    socket.on('new_message', (data) => {
      if (data.conversation_id === conversationId) {
        setMessages(prev => [...prev, data.message]);
        
        if (data.message.action_required) {
          setCurrentAction(data.message.action_data);
        }
      }
    });

    return () => {
      socket.off('conversation_state_changed');
      socket.off('new_message');
    };
  }, [conversationId, socket]);

  const handleAction = async (action, data = {}) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, data })
      });
      
      const result = await response.json();
      if (result.success) {
        setCurrentAction(null);
      }
    } catch (error) {
      console.error('Error handling action:', error);
    }
  };

  const renderActionUI = () => {
    if (!currentAction) return null;

    switch (currentAction.message_type) {
      case 'influencer_price_response':
        return (
          <PriceResponseUI 
            action={currentAction}
            onAction={handleAction}
          />
        );
      
      case 'brand_owner_payment':
        return (
          <PaymentUI 
            action={currentAction}
            onAction={handleAction}
          />
        );
      
      case 'work_start_prompt':
        return (
          <WorkStartUI 
            action={currentAction}
            onAction={handleAction}
          />
        );
      
      default:
        return (
          <GenericActionUI 
            action={currentAction}
            onAction={handleAction}
          />
        );
    }
  };

  return (
    <div className="negotiation-flow">
      <div className="conversation-header">
        <h3>Negotiation Flow</h3>
        <div className="flow-state">
          State: {conversation?.flow_state}
        </div>
      </div>
      
      <div className="messages-container">
        {messages.map(message => (
          <MessageComponent 
            key={message.id} 
            message={message} 
          />
        ))}
      </div>
      
      {renderActionUI()}
    </div>
  );
};
```

### Price Response Component

```jsx
const PriceResponseUI = ({ action, onAction }) => {
  const [price, setPrice] = useState('');
  const [negotiationReason, setNegotiationReason] = useState('');

  const handleAccept = () => {
    onAction('accept_price', { price: action.price });
  };

  const handleReject = () => {
    onAction('reject_price');
  };

  const handleNegotiate = () => {
    onAction('negotiate_price', { 
      reason: negotiationReason,
      counter_price: price 
    });
  };

  return (
    <div className="price-response-ui">
      <div className="price-offer">
        <h4>Price Offer: ₹{action.price}</h4>
        <p>Brand owner has offered this amount for the collaboration.</p>
      </div>
      
      <div className="action-buttons">
        <button 
          className="btn-success" 
          onClick={handleAccept}
        >
          Accept Offer
        </button>
        
        <button 
          className="btn-danger" 
          onClick={handleReject}
        >
          Reject Offer
        </button>
        
        <button 
          className="btn-warning" 
          onClick={() => setShowNegotiation(true)}
        >
          Negotiate Price
        </button>
      </div>
      
      {showNegotiation && (
        <div className="negotiation-form">
          <input
            type="number"
            placeholder="Your counter offer"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <textarea
            placeholder="Reason for negotiation"
            value={negotiationReason}
            onChange={(e) => setNegotiationReason(e.target.value)}
          />
          <button onClick={handleNegotiate}>
            Send Negotiation
          </button>
        </div>
      )}
    </div>
  );
};
```

### Payment UI Component

```jsx
const PaymentUI = ({ action, onAction }) => {
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const options = {
        key: action.payment_order.razorpay_config.key_id,
        amount: action.payment_order.razorpay_config.amount,
        currency: action.payment_order.razorpay_config.currency,
        name: action.payment_order.razorpay_config.name,
        description: action.payment_order.razorpay_config.description,
        order_id: action.payment_order.razorpay_config.order_id,
        handler: async (response) => {
          // Verify payment on backend
          const verifyResponse = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              conversation_id: action.conversation_id
            })
          });
          
          const result = await verifyResponse.json();
          if (result.success) {
            onAction('payment_completed', response);
          }
        }
      };
      
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-ui">
      <div className="payment-details">
        <h4>Payment Required</h4>
        <p>Amount: ₹{action.payment_order.razorpay_config.amount / 100}</p>
        <p>Description: {action.payment_order.razorpay_config.description}</p>
      </div>
      
      <button 
        className="btn-primary" 
        onClick={handlePayment}
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
    </div>
  );
};
```

## 4. Socket Integration

### Socket Hook

```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export const useSocket = () => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_SOCKET_URL, {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    newSocket.on('connect', () => {
      console.log('Connected to socket');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from socket');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return socket;
};
```

### Socket Event Handlers

```javascript
// Join conversation room
const joinConversation = (conversationId) => {
  socket.emit('join_conversation', conversationId);
};

// Leave conversation room
const leaveConversation = (conversationId) => {
  socket.emit('leave_conversation', conversationId);
};

// Send message
const sendMessage = (conversationId, message, mediaUrl = null) => {
  socket.emit('send_message', {
    conversationId,
    senderId: currentUser.id,
    receiverId: receiverId,
    message,
    mediaUrl
  });
};

// Typing indicators
const startTyping = (conversationId) => {
  socket.emit('typing_start', {
    conversationId,
    userId: currentUser.id
  });
};

const stopTyping = (conversationId) => {
  socket.emit('typing_stop', {
    conversationId,
    userId: currentUser.id
  });
};
```

## 5. State Management

### Redux Store Structure

```javascript
const initialState = {
  conversations: {
    byId: {},
    allIds: []
  },
  wallet: {
    balance: null,
    transactions: [],
    loading: false
  },
  ui: {
    activeConversation: null,
    showWithdrawal: false,
    showHistory: false
  }
};
```

### Redux Actions

```javascript
// Conversation actions
export const setConversation = (conversation) => ({
  type: 'SET_CONVERSATION',
  payload: conversation
});

export const updateConversationState = (conversationId, newState) => ({
  type: 'UPDATE_CONVERSATION_STATE',
  payload: { conversationId, newState }
});

export const addMessage = (conversationId, message) => ({
  type: 'ADD_MESSAGE',
  payload: { conversationId, message }
});

// Wallet actions
export const setWalletBalance = (balance) => ({
  type: 'SET_WALLET_BALANCE',
  payload: balance
});

export const addTransaction = (transaction) => ({
  type: 'ADD_TRANSACTION',
  payload: transaction
});
```

## 6. Error Handling

### Error Boundaries

```jsx
class NegotiationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Negotiation flow error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong with the negotiation flow.</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### API Error Handling

```javascript
const handleApiError = (error, context) => {
  console.error(`${context} error:`, error);
  
  if (error.status === 401) {
    // Handle authentication error
    logout();
  } else if (error.status === 403) {
    // Handle permission error
    showError('You do not have permission to perform this action');
  } else if (error.status >= 500) {
    // Handle server error
    showError('Server error. Please try again later.');
  } else {
    // Handle other errors
    showError(error.message || 'An unexpected error occurred');
  }
};
```

## 7. Testing

### Unit Tests

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { WalletBalance } from './WalletBalance';

describe('WalletBalance', () => {
  test('displays wallet balance correctly', () => {
    const mockWallet = {
      available_balance_rupees: 500.00,
      frozen_balance_rupees: 200.00,
      withdrawn_balance_rupees: 100.00,
      total_balance_rupees: 800.00
    };

    render(<WalletBalance wallet={mockWallet} />);
    
    expect(screen.getByText('₹800.00')).toBeInTheDocument();
    expect(screen.getByText('₹500.00')).toBeInTheDocument();
    expect(screen.getByText('₹200.00')).toBeInTheDocument();
    expect(screen.getByText('₹100.00')).toBeInTheDocument();
  });
});
```

### Integration Tests

```javascript
import { render, screen, waitFor } from '@testing-library/react';
import { NegotiationFlow } from './NegotiationFlow';

describe('NegotiationFlow Integration', () => {
  test('handles price response flow', async () => {
    const mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      off: jest.fn()
    };

    render(<NegotiationFlow conversationId="123" socket={mockSocket} />);
    
    // Simulate price response message
    const priceMessage = {
      action_required: true,
      action_data: {
        message_type: 'influencer_price_response',
        price: 1000
      }
    };
    
    // Trigger socket event
    const priceResponseHandler = mockSocket.on.mock.calls
      .find(call => call[0] === 'new_message')[1];
    priceResponseHandler({ conversation_id: '123', message: priceMessage });
    
    await waitFor(() => {
      expect(screen.getByText('Price Offer: ₹1000')).toBeInTheDocument();
    });
  });
});
```

## 8. Performance Optimization

### Memoization

```javascript
import React, { memo, useMemo, useCallback } from 'react';

const MessageComponent = memo(({ message }) => {
  const formattedTime = useMemo(() => {
    return new Date(message.created_at).toLocaleTimeString();
  }, [message.created_at]);

  const handleAction = useCallback((action, data) => {
    // Handle action
  }, []);

  return (
    <div className="message">
      <div className="message-content">{message.message}</div>
      <div className="message-time">{formattedTime}</div>
    </div>
  );
});
```

### Lazy Loading

```javascript
import { lazy, Suspense } from 'react';

const WithdrawalModal = lazy(() => import('./WithdrawalModal'));
const TransactionHistory = lazy(() => import('./TransactionHistory'));

const WalletDashboard = () => {
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div>
      <button onClick={() => setShowWithdrawal(true)}>
        Withdraw
      </button>
      
      {showWithdrawal && (
        <Suspense fallback={<div>Loading...</div>}>
          <WithdrawalModal onClose={() => setShowWithdrawal(false)} />
        </Suspense>
      )}
    </div>
  );
};
```

This comprehensive guide provides everything needed to implement the automated negotiation flow and enhanced wallet system on the frontend! 🎯
