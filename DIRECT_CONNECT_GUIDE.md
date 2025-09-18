# Direct Connect API Guide

This guide explains how to implement direct connect functionality in your frontend application to enable users to start direct conversations with each other.

## Overview

Direct Connect allows users to start private conversations with other users without going through campaigns or bids. The system automatically handles:

- **Existing Conversations**: Returns existing conversation ID if one already exists
- **New Conversations**: Creates a new conversation if none exists
- **Role-based Logic**: Automatically determines brand_owner and influencer roles
- **Real-time Updates**: Sends WebSocket notifications to both users
- **Push Notifications**: Sends FCM notifications for new connections

## API Endpoint

### Direct Connect
**POST** `/api/messages/direct-connect`

Initiates a direct connection between two users.

#### Authentication
Requires JWT token in Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

#### Request Body
```json
{
  "target_user_id": "uuid (required)",
  "initial_message": "string (optional)"
}
```

#### Parameters
- `target_user_id` (required): UUID of the user you want to connect with
- `initial_message` (optional): Initial message to send in the conversation

#### Response

**Success (200/201):**
```json
{
  "success": true,
  "conversation": {
    "id": "conversation-uuid",
    "brand_owner_id": "brand-owner-uuid",
    "influencer_id": "influencer-uuid",
    "chat_status": "real_time",
    "flow_state": "real_time",
    "awaiting_role": null,
    "conversation_type": "direct",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "conversation_id": "conversation-uuid",
  "message": "Direct connection created successfully" // or "Direct connection already exists, returning existing conversation"
}
```

**Error (400):**
```json
{
  "success": false,
  "message": "target_user_id is required"
}
```

**Error (400):**
```json
{
  "success": false,
  "message": "Cannot connect to yourself"
}
```

**Error (404):**
```json
{
  "success": false,
  "message": "User not found"
}
```

## Frontend Implementation

### 1. Basic Direct Connect Function

```javascript
// direct-connect-service.js
class DirectConnectService {
  constructor() {
    this.baseURL = '/api/messages';
  }

  async initiateDirectConnect(targetUserId, initialMessage = null) {
    try {
      const response = await fetch(`${this.baseURL}/direct-connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          target_user_id: targetUserId,
          initial_message: initialMessage
        })
      });

      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          conversationId: result.conversation_id,
          conversation: result.conversation,
          isExisting: result.message.includes('already exists'),
          message: result.message
        };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Direct connect error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new DirectConnectService();
```

### 2. React Component Example

```jsx
// DirectConnectButton.jsx
import React, { useState } from 'react';
import directConnectService from '../services/direct-connect-service';

const DirectConnectButton = ({ targetUserId, targetUserName, onConnect }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [initialMessage, setInitialMessage] = useState('');

  const handleDirectConnect = async () => {
    if (!targetUserId) {
      alert('Target user ID is required');
      return;
    }

    setIsConnecting(true);
    
    try {
      const result = await directConnectService.initiateDirectConnect(
        targetUserId, 
        initialMessage || null
      );

      if (result.success) {
        // Navigate to the conversation
        window.location.href = `/conversations/${result.conversationId}`;
        
        // Call callback if provided
        if (onConnect) {
          onConnect(result);
        }

        // Show success message
        alert(result.isExisting 
          ? `Opened existing conversation with ${targetUserName}` 
          : `Started new conversation with ${targetUserName}`
        );
      } else {
        alert(`Failed to connect: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="direct-connect-container">
      <div className="message-input">
        <textarea
          value={initialMessage}
          onChange={(e) => setInitialMessage(e.target.value)}
          placeholder="Optional: Add an initial message..."
          rows={3}
        />
      </div>
      
      <button 
        onClick={handleDirectConnect}
        disabled={isConnecting}
        className="connect-button"
      >
        {isConnecting ? 'Connecting...' : `Connect with ${targetUserName}`}
      </button>
    </div>
  );
};

export default DirectConnectButton;
```

### 3. User Profile Integration

```jsx
// UserProfile.jsx
import React from 'react';
import DirectConnectButton from './DirectConnectButton';

const UserProfile = ({ user, currentUserId }) => {
  const canConnect = user.id !== currentUserId && user.role !== 'admin';

  return (
    <div className="user-profile">
      <div className="user-info">
        <h2>{user.name}</h2>
        <p>{user.email}</p>
        <span className="role-badge">{user.role}</span>
      </div>
      
      {canConnect && (
        <div className="connect-section">
          <DirectConnectButton 
            targetUserId={user.id}
            targetUserName={user.name}
            onConnect={(result) => {
              console.log('Connected:', result);
              // Handle successful connection
            }}
          />
        </div>
      )}
    </div>
  );
};

export default UserProfile;
```

### 4. User List with Direct Connect

```jsx
// UserList.jsx
import React, { useState, useEffect } from 'react';
import DirectConnectButton from './DirectConnectButton';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Fetch users and current user
    fetchUsers();
    fetchCurrentUser();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const result = await response.json();
      setUsers(result.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const result = await response.json();
      setCurrentUser(result.user);
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  return (
    <div className="user-list">
      <h2>Users</h2>
      <div className="users-grid">
        {users.map(user => (
          <div key={user.id} className="user-card">
            <div className="user-info">
              <h3>{user.name}</h3>
              <p>{user.email}</p>
              <span className="role">{user.role}</span>
            </div>
            
            {currentUser && user.id !== currentUser.id && (
              <DirectConnectButton 
                targetUserId={user.id}
                targetUserName={user.name}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserList;
```

## WebSocket Events

When a direct connection is created, the following WebSocket events are emitted:

### 1. Conversation State Changed
```javascript
// Listen for conversation state changes
socket.on('conversation_state_changed', (data) => {
  console.log('Conversation state changed:', data);
  // data contains:
  // - conversation_id
  // - previous_state
  // - new_state
  // - reason: 'direct_connection_created'
  // - timestamp
});
```

### 2. Conversation Updated
```javascript
// Listen for conversation updates
socket.on('conversation_updated', (data) => {
  console.log('Conversation updated:', data);
  // data contains:
  // - conversation_id
  // - flow_state: 'real_time'
  // - awaiting_role: null
  // - chat_status: 'real_time'
  // - conversation_type: 'direct'
  // - conversation_context
});
```

### 3. Direct Connection Created
```javascript
// Listen for direct connection notifications
socket.on('notification', (data) => {
  if (data.type === 'direct_connection_created') {
    console.log('Direct connection created:', data);
    // data contains:
    // - conversation_id
    // - message: 'Direct connection established'
    // - chat_status: 'real_time'
    // - conversation_context
  }
});
```

## Push Notifications

Direct connections also trigger FCM push notifications:

### Notification Payload
```json
{
  "notification": {
    "title": "New Direct Connection",
    "body": "You have a new direct connection"
  },
  "data": {
    "type": "direct_connection",
    "conversation_id": "conversation-uuid",
    "sender_id": "sender-uuid"
  }
}
```

### Handling Notifications
```javascript
// In your notification service
const handleNotification = (payload) => {
  if (payload.data.type === 'direct_connection') {
    // Navigate to conversation
    window.location.href = `/conversations/${payload.data.conversation_id}`;
  }
};
```

## Error Handling

### Common Error Scenarios

1. **User Not Found (404)**
   - Target user doesn't exist
   - Handle by showing "User not found" message

2. **Self Connection (400)**
   - User tries to connect to themselves
   - Handle by disabling connect button for current user

3. **Network Errors**
   - Handle by showing retry option
   - Implement exponential backoff for retries

4. **Authentication Errors (401)**
   - Token expired or invalid
   - Redirect to login page

### Error Handling Example
```javascript
const handleDirectConnect = async (targetUserId) => {
  try {
    const result = await directConnectService.initiateDirectConnect(targetUserId);
    
    if (result.success) {
      // Success handling
      navigateToConversation(result.conversationId);
    } else {
      // Error handling
      handleConnectError(result.error);
    }
  } catch (error) {
    // Network or other errors
    handleNetworkError(error);
  }
};

const handleConnectError = (error) => {
  switch (error) {
    case 'User not found':
      showError('The user you\'re trying to connect with doesn\'t exist');
      break;
    case 'Cannot connect to yourself':
      showError('You cannot connect to yourself');
      break;
    default:
      showError('Failed to connect. Please try again.');
  }
};
```

## Best Practices

### 1. User Experience
- Show loading states during connection
- Provide clear feedback for success/error states
- Allow users to add initial messages
- Handle existing conversations gracefully

### 2. Performance
- Cache user lists to avoid repeated API calls
- Implement pagination for large user lists
- Use optimistic updates for better UX

### 3. Security
- Always validate user IDs on the frontend
- Never expose sensitive user information
- Implement proper error boundaries

### 4. Real-time Updates
- Listen for WebSocket events to update UI
- Handle connection state changes
- Implement proper cleanup on component unmount

## Testing

### Unit Tests
```javascript
// direct-connect.test.js
import directConnectService from '../services/direct-connect-service';

describe('DirectConnectService', () => {
  test('should initiate direct connect successfully', async () => {
    const mockResponse = {
      success: true,
      conversation_id: 'test-conversation-id',
      conversation: { id: 'test-conversation-id' }
    };

    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve(mockResponse)
    });

    const result = await directConnectService.initiateDirectConnect('test-user-id');
    
    expect(result.success).toBe(true);
    expect(result.conversationId).toBe('test-conversation-id');
  });

  test('should handle existing conversation', async () => {
    const mockResponse = {
      success: true,
      conversation_id: 'existing-conversation-id',
      message: 'Direct connection already exists, returning existing conversation'
    };

    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve(mockResponse)
    });

    const result = await directConnectService.initiateDirectConnect('test-user-id');
    
    expect(result.success).toBe(true);
    expect(result.isExisting).toBe(true);
  });
});
```

## Integration Checklist

- [ ] Implement DirectConnectService
- [ ] Create DirectConnectButton component
- [ ] Add direct connect to user profiles
- [ ] Implement WebSocket event listeners
- [ ] Add push notification handling
- [ ] Implement error handling
- [ ] Add loading states
- [ ] Test with different user roles
- [ ] Test existing conversation scenarios
- [ ] Add unit tests

## API Reference Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/messages/direct-connect` | Initiate direct connection |

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| target_user_id | string (UUID) | Yes | ID of user to connect with |
| initial_message | string | No | Optional initial message |

| Response Field | Type | Description |
|----------------|------|-------------|
| success | boolean | Whether the request was successful |
| conversation_id | string (UUID) | ID of the conversation |
| conversation | object | Full conversation object |
| message | string | Success or info message |
