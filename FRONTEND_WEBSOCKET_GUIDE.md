# Frontend WebSocket Implementation Guide for Notifications

## Quick Setup (Copy-Paste Ready)

### 1. Install Dependencies
```bash
npm install socket.io-client
# or
yarn add socket.io-client
```

### 2. Complete WebSocket Service (Copy-Paste Ready)

```javascript
import io from 'socket.io-client';

class NotificationWebSocketService {
  constructor() {
    this.socket = null;
    this.userId = null;
    this.isConnected = false;
    this.serverUrl = 'http://localhost:3000'; // Change to your backend URL
  }

  // Initialize connection
  connect(userId, authToken = null) {
    this.userId = userId;
    
    const options = {
      transports: ['websocket'],
      autoConnect: true,
    };

    // Add auth if token provided
    if (authToken) {
      options.auth = { token: authToken };
    }

    this.socket = io(this.serverUrl, options);

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket.id);
      this.isConnected = true;
      
      // Join user room for notifications
      this.socket.emit('join', this.userId);
      console.log(`📡 Joined user room: user_${this.userId}`);
      
      // Join global notifications
      this.socket.emit('request_global_notifications', this.userId);
      console.log(`🔔 Joined global notifications: notifications_${this.userId}`);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
    });

    // Notification events
    this.socket.on('notification', (notificationData) => {
      console.log('🔔 Received notification:', notificationData);
      this.handleNotification(notificationData);
    });

    // Status updates
    this.socket.on('user_status_update', (statusData) => {
      console.log('👤 User status update:', statusData);
      this.handleStatusUpdate(statusData);
    });

    // Test message (for debugging)
    this.socket.on('test_message', (testData) => {
      console.log('🧪 Test message received:', testData);
    });
  }

  handleNotification(notificationData) {
    const { type, data } = notificationData;
    
    // Show notification to user
    this.showNotification(data.title, data.body);
    
    // Update notification list in your app
    this.updateNotificationList(data);
    
    // Handle different notification types
    switch (type) {
      case 'test':
        console.log('📱 Test notification received');
        break;
      case 'message':
        console.log('💬 Message notification received');
        break;
      default:
        console.log('📢 Unknown notification type:', type);
    }
  }

  handleStatusUpdate(statusData) {
    // Handle online/offline status updates
    const { user_id, status, timestamp } = statusData;
    console.log(`👤 User ${user_id} is now ${status}`);
  }

  showNotification(title, body) {
    // Method 1: Console log (for testing)
    console.log(`🔔 NOTIFICATION: ${title}`);
    console.log(`📝 MESSAGE: ${body}`);
    
    // Method 2: Alert (React Native)
    // Alert.alert(title, body);
    
    // Method 3: Toast notification (React Native)
    // Toast.show(title, Toast.SHORT);
    
    // Method 4: Custom notification component
    // this.showCustomNotification(title, body);
  }

  updateNotificationList(notificationData) {
    // Update your notification state/context
    // This will make the notification appear in your notification screen
    
    // Example for React Context:
    // this.notificationContext.addNotification(notificationData);
    
    // Example for Redux:
    // this.store.dispatch(addNotification(notificationData));
    
    console.log('📋 Notification list updated with:', notificationData);
  }

  // Send test message to server
  sendTestMessage() {
    if (this.isConnected) {
      this.socket.emit('test_message', {
        message: 'Hello from frontend!',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('🔌 WebSocket disconnected');
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id,
      userId: this.userId
    };
  }
}

// Export singleton instance
export const notificationWebSocket = new NotificationWebSocketService();
export default notificationWebSocket;
```

### 3. React Native Integration

```javascript
// App.js or your main component
import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import notificationWebSocket from './services/NotificationWebSocketService';

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Connect to WebSocket when app starts
    const userId = '88cb11a1-99ff-497c-b70d-201ff14b75b9'; // Your user ID
    notificationWebSocket.connect(userId);

    // Check connection status periodically
    const statusInterval = setInterval(() => {
      const status = notificationWebSocket.getConnectionStatus();
      setIsConnected(status.isConnected);
    }, 1000);

    return () => {
      clearInterval(statusInterval);
      notificationWebSocket.disconnect();
    };
  }, []);

  const handleTestNotification = () => {
    // Send test message to server
    notificationWebSocket.sendTestMessage();
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text>WebSocket Status: {isConnected ? '✅ Connected' : '❌ Disconnected'}</Text>
      
      <Button 
        title="Send Test Message" 
        onPress={handleTestNotification}
        disabled={!isConnected}
      />
      
      <Text>Notifications: {notifications.length}</Text>
    </View>
  );
}
```

### 4. React Web Integration

```javascript
// App.js or your main component
import React, { useEffect, useState } from 'react';
import notificationWebSocket from './services/NotificationWebSocketService';

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Connect to WebSocket when app starts
    const userId = '88cb11a1-99ff-497c-b70d-201ff14b75b9'; // Your user ID
    notificationWebSocket.connect(userId);

    // Check connection status periodically
    const statusInterval = setInterval(() => {
      const status = notificationWebSocket.getConnectionStatus();
      setIsConnected(status.isConnected);
    }, 1000);

    return () => {
      clearInterval(statusInterval);
      notificationWebSocket.disconnect();
    };
  }, []);

  return (
    <div>
      <h1>WebSocket Status: {isConnected ? '✅ Connected' : '❌ Disconnected'}</h1>
      <button 
        onClick={() => notificationWebSocket.sendTestMessage()}
        disabled={!isConnected}
      >
        Send Test Message
      </button>
      <p>Notifications: {notifications.length}</p>
    </div>
  );
}
```

### 5. Testing the Connection

```javascript
// Test script to verify WebSocket connection
const testWebSocket = () => {
  const userId = '88cb11a1-99ff-497c-b70d-201ff14b75b9';
  
  // Connect
  notificationWebSocket.connect(userId);
  
  // Check status after 2 seconds
  setTimeout(() => {
    const status = notificationWebSocket.getConnectionStatus();
    console.log('Connection Status:', status);
    
    if (status.isConnected) {
      console.log('✅ WebSocket is working!');
      console.log('Now send a notification from backend to test receiving...');
    } else {
      console.log('❌ WebSocket connection failed');
    }
  }, 2000);
};

// Run test
testWebSocket();
```

### 6. Backend Events You Can Listen To

| Event | Purpose | Data Structure |
|-------|---------|----------------|
| `notification` | Receive notifications | `{ type: 'test', data: { title, body, ... } }` |
| `user_status_update` | Online status updates | `{ user_id, status: 'online', timestamp }` |
| `test_message` | Test messages | `{ message, timestamp }` |
| `connect` | Connection established | - |
| `disconnect` | Connection lost | - |

### 7. Backend Rooms You Join

| Room | Purpose | How to Join |
|------|---------|-------------|
| `user_${userId}` | Personal notifications | `socket.emit('join', userId)` |
| `notifications_${userId}` | Global notifications | `socket.emit('request_global_notifications', userId)` |

### 8. Troubleshooting

```javascript
// Debug connection issues
const debugWebSocket = () => {
  console.log('Socket instance:', notificationWebSocket.socket);
  console.log('Connection status:', notificationWebSocket.getConnectionStatus());
  console.log('User ID:', notificationWebSocket.userId);
  
  // Test server connectivity
  fetch('http://localhost:3000/health')
    .then(response => response.json())
    .then(data => console.log('Server health:', data))
    .catch(error => console.error('Server not reachable:', error));
};
```

### 9. Production Configuration

```javascript
// For production, update the server URL
const serverUrl = process.env.NODE_ENV === 'production' 
  ? 'https://your-production-backend.com'
  : 'http://localhost:3000';

// Update in the service
this.serverUrl = serverUrl;
```

### 10. Complete Usage Example

```javascript
import notificationWebSocket from './services/NotificationWebSocketService';

// Initialize
const userId = '88cb11a1-99ff-497c-b70d-201ff14b75b9';
notificationWebSocket.connect(userId);

// Now when backend sends notifications, you'll receive them in real-time!
// Test by sending a notification from backend:
// curl -X POST http://localhost:3000/api/test-socket-notification \
//   -H "Content-Type: application/json" \
//   -d '{"user_id": "88cb11a1-99ff-497c-b70d-201ff14b75b9", "title": "Test", "message": "Hello!"}'
```

## Quick Start Checklist

- [ ] Install `socket.io-client`
- [ ] Copy the `NotificationWebSocketService` class
- [ ] Update `serverUrl` to your backend URL
- [ ] Set your `userId`
- [ ] Call `notificationWebSocket.connect(userId)`
- [ ] Test with backend notification endpoint
- [ ] Check console for connection status

## Expected Behavior

1. **Connection**: Console shows "✅ WebSocket connected"
2. **Room Join**: Console shows "📡 Joined user room: user_${userId}"
3. **Notifications**: When backend sends notification, console shows "🔔 Received notification"
4. **Real-time**: Notifications appear immediately without refreshing

That's it! Your frontend will now receive real-time notifications via WebSocket! 🚀
