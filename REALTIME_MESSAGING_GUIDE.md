# Real-time Messaging Socket.IO Guide

This guide explains how to implement real-time messaging using Socket.IO events in your frontend application.

## Overview

The Stoory backend emits Socket.IO events for all message types, allowing real-time updates without polling. The frontend should listen to these events to update the UI immediately when messages are received.

## Socket.IO Events for Messages

### 1. **`new_message` Event**
**Emitted to:** Conversation room (`conversation_${conversationId}`)
**Purpose:** Notify all participants in a conversation about new messages
**When:** Every time a message is sent (manual, automated, or system)

```javascript
// Listen for new messages in a conversation
socket.on('new_message', (data) => {
  console.log('New message received:', data);
  
  // data structure:
  // {
  //   conversation_id: "uuid",
  //   message: {
  //     id: "uuid",
  //     conversation_id: "uuid", 
  //     sender_id: "uuid",
  //     receiver_id: "uuid",
  //     message: "Message content",
  //     media_url: "optional-media-url",
  //     message_type: "user_input|system",
  //     is_automated: true|false,
  //     action_required: true|false,
  //     action_data: { /* optional action buttons */ },
  //     created_at: "2024-01-01T00:00:00.000Z"
  //   },
  //   conversation_context: {
  //     id: "uuid",
  //     chat_status: "real_time|automated",
  //     flow_state: "influencer_responding|brand_owner_details|...",
  //     awaiting_role: "influencer|brand_owner|null",
  //     conversation_type: "direct|bid|campaign",
  //     automation_enabled: true|false,
  //     current_action_data: { /* optional */ }
  //   }
  // }
  
  // Update your UI with the new message
  addMessageToConversation(data.conversation_id, data.message);
});
```

### 2. **`notification` Event**
**Emitted to:** User's personal room (`user_${userId}`)
**Purpose:** Send personal notifications to specific users
**When:** Every time a message is sent to a specific user

```javascript
// Listen for personal notifications
socket.on('notification', (data) => {
  console.log('Personal notification received:', data);
  
  if (data.type === 'message') {
    // Handle message notification
    // data structure:
    // {
    //   type: "message",
    //   data: {
    //     id: "uuid",
    //     title: "New message",
    //     body: "Message content...",
    //     created_at: "2024-01-01T00:00:00.000Z",
    //     conversation_context: { /* same as above */ },
    //     payload: {
    //       conversation_id: "uuid",
    //       message_id: "uuid", 
    //       sender_id: "uuid"
    //     },
    //     conversation_id: "uuid",
    //     message: { /* full message object */ },
    //     sender_id: "uuid",
    //     receiver_id: "uuid"
    //   }
    // }
    
    // Show notification or update UI
    showMessageNotification(data.data);
  }
});
```

## Frontend Implementation

### 1. **Socket.IO Connection Setup**

```javascript
// socket-service.js
import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect(token) {
    this.socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  getSocket() {
    return this.socket;
  }
}

export default new SocketService();
```

### 2. **Message Listener Setup**

```javascript
// message-listener.js
import socketService from './socket-service';

class MessageListener {
  constructor() {
    this.socket = null;
    this.messageCallbacks = new Map();
    this.notificationCallbacks = new Map();
  }

  initialize() {
    this.socket = socketService.getSocket();
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    this.setupMessageListeners();
  }

  setupMessageListeners() {
    // Listen for new messages
    this.socket.on('new_message', (data) => {
      console.log('📨 New message received:', data);
      
      // Call registered callbacks
      this.messageCallbacks.forEach(callback => {
        callback(data);
      });
    });

    // Listen for personal notifications
    this.socket.on('notification', (data) => {
      console.log('🔔 Notification received:', data);
      
      if (data.type === 'message') {
        // Call registered notification callbacks
        this.notificationCallbacks.forEach(callback => {
          callback(data);
        });
      }
    });

    // Listen for typing indicators
    this.socket.on('user_typing', (data) => {
      console.log('⌨️ User typing:', data);
      // Handle typing indicators
      this.handleTypingIndicator(data);
    });

    // Listen for conversation state changes
    this.socket.on('conversation_state_changed', (data) => {
      console.log('🔄 Conversation state changed:', data);
      // Handle conversation state changes
      this.handleConversationStateChange(data);
    });

    // Listen for conversation updates
    this.socket.on('conversation_updated', (data) => {
      console.log('📝 Conversation updated:', data);
      // Handle conversation updates
      this.handleConversationUpdate(data);
    });
  }

  // Register message callback
  onMessage(callback) {
    this.messageCallbacks.set(callback, callback);
  }

  // Unregister message callback
  offMessage(callback) {
    this.messageCallbacks.delete(callback);
  }

  // Register notification callback
  onNotification(callback) {
    this.notificationCallbacks.set(callback, callback);
  }

  // Unregister notification callback
  offNotification(callback) {
    this.notificationCallbacks.delete(callback);
  }

  // Handle typing indicators
  handleTypingIndicator(data) {
    // data: { conversationId, userId, isTyping }
    // Update UI to show/hide typing indicator
  }

  // Handle conversation state changes
  handleConversationStateChange(data) {
    // data: { conversation_id, previous_state, new_state, reason, timestamp }
    // Update conversation state in UI
  }

  // Handle conversation updates
  handleConversationUpdate(data) {
    // data: { conversation_id, flow_state, awaiting_role, chat_status, conversation_type, conversation_context }
    // Update conversation in UI
  }
}

export default new MessageListener();
```

### 3. **React Component Integration**

```jsx
// ChatComponent.jsx
import React, { useState, useEffect, useCallback } from 'react';
import messageListener from '../services/message-listener';
import socketService from '../services/socket-service';

const ChatComponent = ({ conversationId, currentUserId }) => {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());

  useEffect(() => {
    // Initialize socket connection
    const token = localStorage.getItem('authToken');
    socketService.connect(token);
    messageListener.initialize();

    // Join conversation room
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('join_conversation', { conversationId });
    }

    // Set up message listeners
    const handleNewMessage = (data) => {
      if (data.conversation_id === conversationId) {
        setMessages(prev => [...prev, data.message]);
      }
    };

    const handleNotification = (data) => {
      if (data.data.conversation_id === conversationId) {
        // Show notification or update UI
        console.log('Message notification:', data.data);
      }
    };

    messageListener.onMessage(handleNewMessage);
    messageListener.onNotification(handleNotification);

    // Cleanup
    return () => {
      messageListener.offMessage(handleNewMessage);
      messageListener.offNotification(handleNotification);
      
      if (socket) {
        socket.emit('leave_conversation', { conversationId });
      }
    };
  }, [conversationId]);

  const sendMessage = async (messageText) => {
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          message: messageText
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Message will be added via Socket.IO event
        console.log('Message sent successfully');
      } else {
        console.error('Failed to send message:', result.message);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="chat-container">
      <div className="messages-list">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.sender_id === currentUserId ? 'sent' : 'received'}`}>
            <div className="message-content">
              {message.message}
            </div>
            <div className="message-time">
              {new Date(message.created_at).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
      
      {isTyping && (
        <div className="typing-indicator">
          {Array.from(typingUsers).map(userId => (
            <span key={userId}>User {userId} is typing...</span>
          ))}
        </div>
      )}
      
      <div className="message-input">
        <input
          type="text"
          placeholder="Type a message..."
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              sendMessage(e.target.value);
              e.target.value = '';
            }
          }}
        />
      </div>
    </div>
  );
};

export default ChatComponent;
```

### 4. **Room Management**

```javascript
// room-manager.js
import socketService from './socket-service';

class RoomManager {
  constructor() {
    this.socket = null;
    this.joinedRooms = new Set();
  }

  initialize() {
    this.socket = socketService.getSocket();
  }

  // Join conversation room
  joinConversation(conversationId) {
    if (this.socket && !this.joinedRooms.has(`conversation_${conversationId}`)) {
      this.socket.emit('join_conversation', { conversationId });
      this.joinedRooms.add(`conversation_${conversationId}`);
      console.log(`Joined conversation room: ${conversationId}`);
    }
  }

  // Leave conversation room
  leaveConversation(conversationId) {
    if (this.socket && this.joinedRooms.has(`conversation_${conversationId}`)) {
      this.socket.emit('leave_conversation', { conversationId });
      this.joinedRooms.delete(`conversation_${conversationId}`);
      console.log(`Left conversation room: ${conversationId}`);
    }
  }

  // Join user room (for personal notifications)
  joinUserRoom(userId) {
    if (this.socket && !this.joinedRooms.has(`user_${userId}`)) {
      this.socket.emit('join_user_room', { userId });
      this.joinedRooms.add(`user_${userId}`);
      console.log(`Joined user room: ${userId}`);
    }
  }

  // Leave user room
  leaveUserRoom(userId) {
    if (this.socket && this.joinedRooms.has(`user_${userId}`)) {
      this.socket.emit('leave_user_room', { userId });
      this.joinedRooms.delete(`user_${userId}`);
      console.log(`Left user room: ${userId}`);
    }
  }

  // Get list of joined rooms
  getJoinedRooms() {
    return Array.from(this.joinedRooms);
  }
}

export default new RoomManager();
```

## Message Types and Handling

### 1. **Manual Messages (User Input)**
- **Type:** `user_input`
- **Action Required:** Usually `false`
- **Socket Events:** `new_message` + `notification`
- **UI Update:** Add to message list immediately

### 2. **System Messages (Automated)**
- **Type:** `system`
- **Action Required:** Usually `true`
- **Socket Events:** `new_message` + `notification`
- **UI Update:** Add to message list, show action buttons if `action_required: true`

### 3. **Flow State Messages**
- **Type:** `system`
- **Action Required:** Depends on flow state
- **Socket Events:** `conversation_state_changed` + `conversation_updated`
- **UI Update:** Update conversation state, show appropriate UI

## Error Handling

```javascript
// error-handler.js
class SocketErrorHandler {
  static handleConnectionError(error) {
    console.error('Socket connection error:', error);
    // Implement reconnection logic
    // Show user-friendly error message
  }

  static handleMessageError(error) {
    console.error('Message error:', error);
    // Handle message sending errors
    // Show retry option
  }

  static handleNotificationError(error) {
    console.error('Notification error:', error);
    // Handle notification errors
    // Fallback to polling if needed
  }
}

export default SocketErrorHandler;
```

## Testing

```javascript
// socket-test.js
import socketService from './socket-service';
import messageListener from './message-listener';

const testSocketConnection = () => {
  // Test connection
  const socket = socketService.connect('test-token');
  
  // Test message listener
  messageListener.initialize();
  
  // Test message callback
  messageListener.onMessage((data) => {
    console.log('Test message received:', data);
  });
  
  // Test notification callback
  messageListener.onNotification((data) => {
    console.log('Test notification received:', data);
  });
};

export { testSocketConnection };
```

## Best Practices

### 1. **Connection Management**
- Always check if socket is connected before emitting events
- Implement reconnection logic for dropped connections
- Clean up listeners on component unmount

### 2. **Message Handling**
- Use message IDs to prevent duplicates
- Implement optimistic updates for better UX
- Handle different message types appropriately

### 3. **Performance**
- Debounce typing indicators
- Limit message history loading
- Use pagination for large conversation histories

### 4. **Error Handling**
- Implement fallback mechanisms
- Show user-friendly error messages
- Log errors for debugging

## Summary

The Stoory backend emits the following Socket.IO events for real-time messaging:

- **`new_message`** - For all new messages in conversations
- **`notification`** - For personal notifications to users
- **`user_typing`** - For typing indicators
- **`conversation_state_changed`** - For flow state changes
- **`conversation_updated`** - For conversation updates

The frontend should listen to these events to provide real-time updates without polling the server.
