# Frontend Implementation Examples

## 1. Complete Negotiation Flow Implementation

### Main Negotiation Component

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import PriceResponseUI from './PriceResponseUI';
import PaymentUI from './PaymentUI';
import WorkProgressUI from './WorkProgressUI';

const NegotiationFlow = ({ conversationId, conversation }) => {
  const [messages, setMessages] = useState([]);
  const [currentAction, setCurrentAction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const socket = useSocket();
  const { user } = useAuth();

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleConversationStateChange = (data) => {
      if (data.conversation_id === conversationId) {
        console.log('Conversation state changed:', data);
        // Update conversation state in parent component
        // This would typically be handled by a parent component or Redux
      }
    };

    const handleNewMessage = (data) => {
      if (data.conversation_id === conversationId) {
        setMessages(prev => [...prev, data.message]);
        
        if (data.message.action_required) {
          setCurrentAction(data.message.action_data);
        }
      }
    };

    const handleNotification = (data) => {
      if (data.conversation_id === conversationId) {
        // Show notification to user
        showNotification(data.message);
      }
    };

    // Join conversation room
    socket.emit('join_conversation', conversationId);

    // Listen for events
    socket.on('conversation_state_changed', handleConversationStateChange);
    socket.on('new_message', handleNewMessage);
    socket.on('notification', handleNotification);

    return () => {
      socket.emit('leave_conversation', conversationId);
      socket.off('conversation_state_changed', handleConversationStateChange);
      socket.off('new_message', handleNewMessage);
      socket.off('notification', handleNotification);
    };
  }, [socket, conversationId]);

  const handleAction = useCallback(async (action, data = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversations/${conversationId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action, data })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Action failed');
      }

      // Clear current action if successful
      setCurrentAction(null);
      
      // Show success message
      showNotification('Action completed successfully', 'success');
      
    } catch (err) {
      setError(err.message);
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const renderActionUI = () => {
    if (!currentAction) return null;

    const actionProps = {
      action: currentAction,
      onAction: handleAction,
      loading: loading,
      error: error
    };

    switch (currentAction.message_type) {
      case 'influencer_price_response':
        return <PriceResponseUI {...actionProps} />;
      
      case 'brand_owner_payment':
        return <PaymentUI {...actionProps} />;
      
      case 'work_start_prompt':
        return <WorkProgressUI {...actionProps} />;
      
      default:
        return <GenericActionUI {...actionProps} />;
    }
  };

  return (
    <div className="negotiation-flow">
      <div className="conversation-header">
        <h3>Negotiation Flow</h3>
        <div className="flow-state">
          <span className="state-label">Current State:</span>
          <span className={`state-value ${conversation?.flow_state}`}>
            {conversation?.flow_state?.replace(/_/g, ' ').toUpperCase()}
          </span>
        </div>
      </div>
      
      <div className="messages-container">
        {messages.map(message => (
          <MessageComponent 
            key={message.id} 
            message={message}
            currentUserId={user?.id}
          />
        ))}
      </div>
      
      {renderActionUI()}
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
};

export default NegotiationFlow;
```

### Price Response Component

```jsx
import React, { useState } from 'react';

const PriceResponseUI = ({ action, onAction, loading, error }) => {
  const [showNegotiation, setShowNegotiation] = useState(false);
  const [counterPrice, setCounterPrice] = useState('');
  const [negotiationReason, setNegotiationReason] = useState('');

  const handleAccept = () => {
    onAction('accept_price', { price: action.price });
  };

  const handleReject = () => {
    onAction('reject_price');
  };

  const handleNegotiate = () => {
    if (!counterPrice || !negotiationReason) {
      alert('Please provide both counter price and reason');
      return;
    }
    
    onAction('negotiate_price', { 
      reason: negotiationReason,
      counter_price: parseFloat(counterPrice)
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  };

  return (
    <div className="price-response-ui">
      <div className="action-header">
        <h4>Price Offer Received</h4>
        <p>Brand owner has offered this amount for the collaboration.</p>
      </div>
      
      <div className="price-display">
        <div className="price-amount">
          {formatPrice(action.price)}
        </div>
        <div className="price-details">
          <p>Project: {action.project_title}</p>
          <p>Duration: {action.estimated_duration}</p>
        </div>
      </div>
      
      <div className="action-buttons">
        <button 
          className="btn btn-success" 
          onClick={handleAccept}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Accept Offer'}
        </button>
        
        <button 
          className="btn btn-danger" 
          onClick={handleReject}
          disabled={loading}
        >
          Reject Offer
        </button>
        
        <button 
          className="btn btn-warning" 
          onClick={() => setShowNegotiation(!showNegotiation)}
          disabled={loading}
        >
          {showNegotiation ? 'Cancel Negotiation' : 'Negotiate Price'}
        </button>
      </div>
      
      {showNegotiation && (
        <div className="negotiation-form">
          <div className="form-group">
            <label htmlFor="counterPrice">Your Counter Offer (₹)</label>
            <input
              id="counterPrice"
              type="number"
              min="1"
              step="0.01"
              placeholder="Enter your counter offer"
              value={counterPrice}
              onChange={(e) => setCounterPrice(e.target.value)}
              className="form-control"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="negotiationReason">Reason for Negotiation</label>
            <textarea
              id="negotiationReason"
              placeholder="Explain why you need a different price..."
              value={negotiationReason}
              onChange={(e) => setNegotiationReason(e.target.value)}
              className="form-control"
              rows="3"
            />
          </div>
          
          <button 
            className="btn btn-primary"
            onClick={handleNegotiate}
            disabled={loading || !counterPrice || !negotiationReason}
          >
            Send Negotiation Request
          </button>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
};

export default PriceResponseUI;
```

### Payment UI Component

```jsx
import React, { useState, useEffect } from 'react';

const PaymentUI = ({ action, onAction, loading, error }) => {
  const [paymentData, setPaymentData] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Load Razorpay script if not already loaded
    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        console.log('Razorpay script loaded');
      };
      document.body.appendChild(script);
    }
  }, []);

  const handlePayment = async () => {
    if (!window.Razorpay) {
      alert('Payment system not loaded. Please refresh the page.');
      return;
    }

    setProcessing(true);

    try {
      const options = {
        key: action.payment_order.razorpay_config.key_id,
        amount: action.payment_order.razorpay_config.amount,
        currency: action.payment_order.razorpay_config.currency,
        name: action.payment_order.razorpay_config.name,
        description: action.payment_order.razorpay_config.description,
        order_id: action.payment_order.razorpay_config.order_id,
        prefill: {
          name: action.user_details.name,
          email: action.user_details.email,
          contact: action.user_details.phone
        },
        theme: {
          color: '#3399cc'
        },
        handler: async (response) => {
          try {
            // Verify payment on backend
            const verifyResponse = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
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
              showNotification('Payment completed successfully!', 'success');
            } else {
              throw new Error(result.message || 'Payment verification failed');
            }
          } catch (err) {
            console.error('Payment verification error:', err);
            showNotification('Payment verification failed. Please contact support.', 'error');
          }
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
          }
        }
      };
      
      const razorpay = new window.Razorpay(options);
      razorpay.open();
      
    } catch (err) {
      console.error('Payment error:', err);
      showNotification('Payment failed. Please try again.', 'error');
      setProcessing(false);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount / 100);
  };

  return (
    <div className="payment-ui">
      <div className="payment-header">
        <h4>Payment Required</h4>
        <p>Complete payment to proceed with the collaboration.</p>
      </div>
      
      <div className="payment-details">
        <div className="payment-item">
          <span className="label">Amount:</span>
          <span className="value">{formatAmount(action.payment_order.razorpay_config.amount)}</span>
        </div>
        
        <div className="payment-item">
          <span className="label">Description:</span>
          <span className="value">{action.payment_order.razorpay_config.description}</span>
        </div>
        
        <div className="payment-item">
          <span className="label">Order ID:</span>
          <span className="value">{action.payment_order.razorpay_config.order_id}</span>
        </div>
      </div>
      
      <div className="payment-actions">
        <button 
          className="btn btn-primary btn-lg"
          onClick={handlePayment}
          disabled={processing || loading}
        >
          {processing ? 'Processing Payment...' : 'Pay Now'}
        </button>
        
        <button 
          className="btn btn-secondary"
          onClick={() => onAction('cancel_payment')}
          disabled={processing || loading}
        >
          Cancel
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
};

export default PaymentUI;
```

## 2. Enhanced Wallet System Implementation

### Wallet Balance Component

```jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

const WalletBalance = () => {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchWalletBalance();
  }, []);

  const fetchWalletBalance = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/enhanced-wallet/balance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setWallet(data.wallet);
      } else {
        throw new Error(data.message || 'Failed to fetch wallet balance');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching wallet balance:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="wallet-balance loading">
        <div className="loading-spinner">Loading wallet...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wallet-balance error">
        <div className="error-message">
          {error}
          <button onClick={fetchWalletBalance} className="btn btn-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="wallet-balance error">
        <div className="error-message">No wallet data available</div>
      </div>
    );
  }

  return (
    <div className="wallet-balance">
      <div className="wallet-header">
        <h3>Wallet Balance</h3>
        <button 
          className="btn btn-sm btn-outline"
          onClick={fetchWalletBalance}
        >
          Refresh
        </button>
      </div>
      
      <div className="balance-cards">
        <div className="balance-card total">
          <div className="card-header">
            <h4>Total Balance</h4>
            <div className="balance-amount">
              {formatCurrency(wallet.total_balance_rupees)}
            </div>
          </div>
          <div className="card-description">
            Complete financial position
          </div>
        </div>
        
        <div className="balance-card available">
          <div className="card-header">
            <h4>Available</h4>
            <div className="balance-amount">
              {formatCurrency(wallet.available_balance_rupees)}
            </div>
          </div>
          <div className="card-description">
            Money you can withdraw
          </div>
        </div>
        
        <div className="balance-card frozen">
          <div className="card-header">
            <h4>In Escrow</h4>
            <div className="balance-amount">
              {formatCurrency(wallet.frozen_balance_rupees)}
            </div>
          </div>
          <div className="card-description">
            Money held in escrow
          </div>
        </div>
        
        <div className="balance-card withdrawn">
          <div className="card-header">
            <h4>Withdrawn</h4>
            <div className="balance-amount">
              {formatCurrency(wallet.withdrawn_balance_rupees)}
            </div>
          </div>
          <div className="card-description">
            Money already withdrawn
          </div>
        </div>
      </div>
      
      <div className="wallet-actions">
        <button 
          className="btn btn-primary"
          onClick={() => setShowWithdrawal(true)}
        >
          Withdraw Money
        </button>
        <button 
          className="btn btn-secondary"
          onClick={() => setShowHistory(true)}
        >
          View Transaction History
        </button>
      </div>
    </div>
  );
};

export default WalletBalance;
```

### Transaction History Component

```jsx
import React, { useState, useEffect } from 'react';

const TransactionHistory = ({ onClose }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    type: 'all',
    direction: 'all',
    page: 1
  });
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchTransactions();
  }, [filters]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: filters.page,
        limit: 20,
        ...(filters.type !== 'all' && { type: filters.type }),
        ...(filters.direction !== 'all' && { direction: filters.direction })
      });
      
      const response = await fetch(`/api/enhanced-wallet/transactions?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTransactions(data.transactions);
        setPagination(data.pagination);
      } else {
        throw new Error(data.message || 'Failed to fetch transactions');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount / 100);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type) => {
    const icons = {
      'credit': '↗️',
      'debit': '↙️',
      'freeze': '❄️',
      'unfreeze': '🔥',
      'withdrawal': '💸',
      'refund': '↩️',
      'payment_sent': '💳',
      'payment_received': '💰',
      'escrow_hold': '🔒',
      'escrow_release': '🔓',
      'commission': '📊',
      'bonus': '🎁'
    };
    return icons[type] || '💼';
  };

  const getTransactionColor = (direction) => {
    return direction === 'credit' ? 'text-success' : 'text-danger';
  };

  return (
    <div className="transaction-history-modal">
      <div className="modal-header">
        <h3>Transaction History</h3>
        <button className="btn-close" onClick={onClose}>×</button>
      </div>
      
      <div className="modal-body">
        <div className="filters">
          <select 
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value, page: 1 }))}
            className="form-control"
          >
            <option value="all">All Types</option>
            <option value="credit">Credits</option>
            <option value="debit">Debits</option>
            <option value="withdrawal">Withdrawals</option>
            <option value="escrow_hold">Escrow Holds</option>
            <option value="escrow_release">Escrow Releases</option>
          </select>
          
          <select 
            value={filters.direction}
            onChange={(e) => setFilters(prev => ({ ...prev, direction: e.target.value, page: 1 }))}
            className="form-control"
          >
            <option value="all">All Directions</option>
            <option value="credit">Incoming</option>
            <option value="debit">Outgoing</option>
          </select>
        </div>
        
        {loading ? (
          <div className="loading">Loading transactions...</div>
        ) : error ? (
          <div className="error">
            {error}
            <button onClick={fetchTransactions} className="btn btn-sm">
              Retry
            </button>
          </div>
        ) : (
          <div className="transactions-list">
            {transactions.length === 0 ? (
              <div className="no-transactions">
                No transactions found
              </div>
            ) : (
              transactions.map(transaction => (
                <div key={transaction.id} className="transaction-item">
                  <div className="transaction-icon">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  
                  <div className="transaction-details">
                    <div className="transaction-description">
                      {transaction.notes || transaction.type.replace(/_/g, ' ')}
                    </div>
                    <div className="transaction-meta">
                      {formatDate(transaction.created_at)}
                      {transaction.conversation_id && (
                        <span className="conversation-id">
                          • Conversation: {transaction.conversation_id.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className={`transaction-amount ${getTransactionColor(transaction.direction)}`}>
                    {transaction.direction === 'credit' ? '+' : '-'}
                    {formatCurrency(transaction.amount_paise)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        
        {pagination && pagination.total_pages > 1 && (
          <div className="pagination">
            <button 
              className="btn btn-sm"
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={filters.page === 1}
            >
              Previous
            </button>
            
            <span className="page-info">
              Page {filters.page} of {pagination.total_pages}
            </span>
            
            <button 
              className="btn btn-sm"
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={filters.page === pagination.total_pages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
```

## 3. Socket Integration Hook

```javascript
import { useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';

export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
      setConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from socket server:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const joinRoom = useCallback((roomName) => {
    if (socket && connected) {
      socket.emit('join_room', roomName);
    }
  }, [socket, connected]);

  const leaveRoom = useCallback((roomName) => {
    if (socket && connected) {
      socket.emit('leave_room', roomName);
    }
  }, [socket, connected]);

  const emitEvent = useCallback((eventName, data) => {
    if (socket && connected) {
      socket.emit(eventName, data);
    }
  }, [socket, connected]);

  return {
    socket,
    connected,
    joinRoom,
    leaveRoom,
    emitEvent
  };
};
```

## 4. CSS Styles

```css
/* Negotiation Flow Styles */
.negotiation-flow {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.flow-state {
  display: flex;
  align-items: center;
  gap: 10px;
}

.state-label {
  font-weight: 500;
  color: #666;
}

.state-value {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  background: #e3f2fd;
  color: #1976d2;
}

/* Price Response UI */
.price-response-ui {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
}

.price-display {
  text-align: center;
  margin: 20px 0;
}

.price-amount {
  font-size: 2.5rem;
  font-weight: 700;
  color: #2e7d32;
  margin-bottom: 10px;
}

.action-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin: 20px 0;
}

.negotiation-form {
  margin-top: 20px;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
}

/* Payment UI */
.payment-ui {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
}

.payment-details {
  margin: 20px 0;
}

.payment-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.payment-item:last-child {
  border-bottom: none;
}

/* Wallet Balance Styles */
.wallet-balance {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.balance-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.balance-card {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  transition: transform 0.2s;
}

.balance-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.balance-card.total {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.balance-card.available {
  border-left: 4px solid #4caf50;
}

.balance-card.frozen {
  border-left: 4px solid #ff9800;
}

.balance-card.withdrawn {
  border-left: 4px solid #9e9e9e;
}

.balance-amount {
  font-size: 2rem;
  font-weight: 700;
  margin: 10px 0;
}

.card-description {
  font-size: 0.9rem;
  color: #666;
  margin-top: 5px;
}

/* Transaction History */
.transaction-history-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-body {
  max-height: 70vh;
  overflow-y: auto;
  padding: 20px;
}

.transaction-item {
  display: flex;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
}

.transaction-item:hover {
  background: #f8f9fa;
}

.transaction-icon {
  font-size: 1.5rem;
  margin-right: 15px;
}

.transaction-details {
  flex: 1;
}

.transaction-description {
  font-weight: 500;
  margin-bottom: 5px;
}

.transaction-meta {
  font-size: 0.9rem;
  color: #666;
}

.transaction-amount {
  font-weight: 600;
  font-size: 1.1rem;
}

.text-success {
  color: #4caf50;
}

.text-danger {
  color: #f44336;
}

/* Responsive Design */
@media (max-width: 768px) {
  .balance-cards {
    grid-template-columns: 1fr;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .conversation-header {
    flex-direction: column;
    gap: 10px;
  }
}
```

This comprehensive implementation provides everything needed to integrate the automated negotiation flow and enhanced wallet system into your frontend! 🎯
