# Frontend Notification Integration Guide

This guide explains how to integrate the notification system with your frontend application using Socket.IO and REST APIs.

## Table of Contents
1. [Socket.IO Setup](#socketio-setup)
2. [Notification API Integration](#notification-api-integration)
3. [Real-time Event Handling](#real-time-event-handling)
4. [Message Status Tracking](#message-status-tracking)
5. [Notification UI Components](#notification-ui-components)
6. [Push Notifications](#push-notifications)
7. [Error Handling](#error-handling)
8. [Complete Example](#complete-example)

## Socket.IO Setup

### 1. Install Dependencies

```bash
npm install socket.io-client
```

### 2. Initialize Socket Connection

```javascript
// utils/socket.js
import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.userId = null;
    this.eventListeners = new Map();
  }

  connect(userId, token) {
    if (this.socket && this.isConnected) {
      return;
    }

    this.userId = userId;
    this.socket = io(process.env.REACT_APP_API_URL || 'http://localhost:3000', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.isConnected = true;
      
      // Join user room
      this.socket.emit('join', this.userId);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });
  }

  // Event listener management
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
    this.socket.on(event, callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
    this.socket.off(event, callback);
  }

  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    }
  }
}

export default new SocketService();
```

## Notification API Integration

### 1. API Service

```javascript
// services/notificationService.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

class NotificationService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api/notifications`,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add auth token to requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Get user notifications
  async getNotifications(page = 1, limit = 20, status = 'all') {
    try {
      const response = await this.api.get('/', {
        params: { page, limit, status }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get unread count
  async getUnreadCount() {
    try {
      const response = await this.api.get('/unread-count');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const response = await this.api.put(`/${notificationId}/read`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Mark all notifications as read
  async markAllAsRead() {
    try {
      const response = await this.api.put('/mark-all-read');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Delete notification
  async deleteNotification(notificationId) {
    try {
      const response = await this.api.delete(`/${notificationId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get notification preferences
  async getPreferences() {
    try {
      const response = await this.api.get('/preferences');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Update notification preferences
  async updatePreferences(preferences) {
    try {
      const response = await this.api.put('/preferences', { preferences });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Register device token for push notifications
  async registerDeviceToken(deviceToken, platform) {
    try {
      const response = await this.api.post('/register-device', {
        device_token: deviceToken,
        platform: platform
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response) {
      return new Error(error.response.data.message || 'API Error');
    } else if (error.request) {
      return new Error('Network Error');
    } else {
      return new Error('Unknown Error');
    }
  }
}

export default new NotificationService();
```

## Real-time Event Handling

### 1. Notification Hook

```javascript
// hooks/useNotifications.js
import { useState, useEffect, useCallback } from 'react';
import SocketService from '../utils/socket';
import NotificationService from '../services/notificationService';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load initial notifications
  const loadNotifications = useCallback(async (page = 1, status = 'all') => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await NotificationService.getNotifications(page, 20, status);
      setNotifications(response.notifications);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load unread count
  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await NotificationService.getUnreadCount();
      setUnreadCount(response.unread_count);
    } catch (err) {
      console.error('Error loading unread count:', err);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await NotificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, status: 'read', read_at: new Date().toISOString() }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await NotificationService.markAllAsRead();
      setNotifications(prev => 
        prev.map(notif => ({ 
          ...notif, 
          status: 'read', 
          read_at: new Date().toISOString() 
        }))
      );
      setUnreadCount(0);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await NotificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Handle new notification from socket
  const handleNewNotification = useCallback((notification) => {
    setNotifications(prev => [notification, ...prev]);
    if (notification.status === 'pending') {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  // Setup socket listeners
  useEffect(() => {
    if (SocketService.isConnected) {
      SocketService.on('notification', handleNewNotification);
      
      return () => {
        SocketService.off('notification', handleNewNotification);
      };
    }
  }, [handleNewNotification]);

  // Load initial data
  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, [loadNotifications, loadUnreadCount]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    loadNotifications,
    loadUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };
};
```

## Message Status Tracking

### 1. Message Hook

```javascript
// hooks/useMessages.js
import { useState, useEffect, useCallback } from 'react';
import SocketService from '../utils/socket';

export const useMessages = (conversationId) => {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);

  // Send message
  const sendMessage = useCallback((messageData) => {
    if (SocketService.isConnected) {
      SocketService.emit('send_message', {
        conversationId,
        ...messageData
      });
    }
  }, [conversationId]);

  // Mark message as read
  const markAsRead = useCallback((messageId) => {
    if (SocketService.isConnected) {
      SocketService.emit('mark_read', {
        messageId,
        userId: getCurrentUserId(), // You'll need to implement this
        conversationId
      });
    }
  }, [conversationId]);

  // Start typing
  const startTyping = useCallback(() => {
    if (SocketService.isConnected) {
      SocketService.emit('typing_start', {
        conversationId,
        userId: getCurrentUserId()
      });
    }
  }, [conversationId]);

  // Stop typing
  const stopTyping = useCallback(() => {
    if (SocketService.isConnected) {
      SocketService.emit('typing_stop', {
        conversationId,
        userId: getCurrentUserId()
      });
    }
  }, [conversationId]);

  // Handle new message
  const handleNewMessage = useCallback((data) => {
    setMessages(prev => [...prev, data.message]);
  }, []);

  // Handle message status update
  const handleMessageStatus = useCallback((data) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, status: data.status }
          : msg
      )
    );
  }, []);

  // Handle typing indicator
  const handleTyping = useCallback((data) => {
    if (data.isTyping) {
      setTypingUsers(prev => [...prev.filter(id => id !== data.userId), data.userId]);
    } else {
      setTypingUsers(prev => prev.filter(id => id !== data.userId));
    }
  }, []);

  // Setup socket listeners
  useEffect(() => {
    if (SocketService.isConnected && conversationId) {
      // Join conversation room
      SocketService.emit('join_conversation', conversationId);

      // Setup event listeners
      SocketService.on('new_message', handleNewMessage);
      SocketService.on('message_status', handleMessageStatus);
      SocketService.on('user_typing', handleTyping);

      return () => {
        // Leave conversation room
        SocketService.emit('leave_conversation', conversationId);
        
        // Remove event listeners
        SocketService.off('new_message', handleNewMessage);
        SocketService.off('message_status', handleMessageStatus);
        SocketService.off('user_typing', handleTyping);
      };
    }
  }, [conversationId, handleNewMessage, handleMessageStatus, handleTyping]);

  return {
    messages,
    isTyping,
    typingUsers,
    sendMessage,
    markAsRead,
    startTyping,
    stopTyping
  };
};
```

## Notification UI Components

### 1. Notification Bell Component

```javascript
// components/NotificationBell.jsx
import React, { useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';

const NotificationBell = () => {
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <NotificationDropdown onClose={() => setIsOpen(false)} />
      )}
    </div>
  );
};

export default NotificationBell;
```

### 2. Notification Dropdown

```javascript
// components/NotificationDropdown.jsx
import React, { useEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import NotificationItem from './NotificationItem';

const NotificationDropdown = ({ onClose }) => {
  const { 
    notifications, 
    isLoading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useNotifications();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.notification-dropdown')) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div className="notification-dropdown absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Notifications</h3>
          <button
            onClick={markAllAsRead}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Mark all as read
          </button>
        </div>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No notifications</div>
        ) : (
          notifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={markAsRead}
              onDelete={deleteNotification}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
```

### 3. Notification Item

```javascript
// components/NotificationItem.jsx
import React from 'react';

const NotificationItem = ({ notification, onMarkAsRead, onDelete }) => {
  const handleClick = () => {
    if (notification.status === 'pending') {
      onMarkAsRead(notification.id);
    }
    
    // Handle notification click based on type
    if (notification.data?.conversation_id) {
      // Navigate to conversation
      window.location.href = `/conversations/${notification.data.conversation_id}`;
    } else if (notification.data?.campaign_id) {
      // Navigate to campaign
      window.location.href = `/campaigns/${notification.data.campaign_id}`;
    }
  };

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'message':
        return '💬';
      case 'campaign':
        return '📢';
      case 'payment':
        return '💳';
      case 'system':
        return '🔔';
      default:
        return '📢';
    }
  };

  const getPriorityColor = () => {
    switch (notification.priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      default:
        return 'border-l-blue-500';
    }
  };

  return (
    <div
      className={`p-4 border-l-4 ${getPriorityColor()} ${
        notification.status === 'pending' ? 'bg-blue-50' : 'bg-white'
      } hover:bg-gray-50 cursor-pointer`}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3">
        <div className="text-2xl">{getNotificationIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h4 className="text-sm font-medium text-gray-900">
              {notification.title}
            </h4>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(notification.id);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {notification.body}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(notification.created_at).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
```

## Push Notifications

### 1. Push Notification Service

```javascript
// services/pushNotificationService.js
class PushNotificationService {
  constructor() {
    this.isSupported = 'Notification' in window;
    this.permission = this.isSupported ? Notification.permission : 'denied';
  }

  async requestPermission() {
    if (!this.isSupported) {
      throw new Error('Push notifications are not supported');
    }

    if (this.permission === 'granted') {
      return true;
    }

    const permission = await Notification.requestPermission();
    this.permission = permission;
    return permission === 'granted';
  }

  async registerForPushNotifications() {
    try {
      const permission = await this.requestPermission();
      if (!permission) {
        throw new Error('Permission denied for push notifications');
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      // Get subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.REACT_APP_VAPID_PUBLIC_KEY
      });

      // Send subscription to server
      await NotificationService.registerDeviceToken(
        JSON.stringify(subscription),
        'web'
      );

      return subscription;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      throw error;
    }
  }

  showNotification(title, options = {}) {
    if (this.permission === 'granted') {
      new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        ...options
      });
    }
  }
}

export default new PushNotificationService();
```

## Error Handling

### 1. Error Boundary

```javascript
// components/NotificationErrorBoundary.jsx
import React from 'react';

class NotificationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Notification Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-medium">Notification Error</h3>
          <p className="text-red-600 text-sm mt-1">
            Something went wrong with notifications. Please refresh the page.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default NotificationErrorBoundary;
```

## Complete Example

### 1. App.js Integration

```javascript
// App.js
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { NotificationErrorBoundary } from './components/NotificationErrorBoundary';
import { NotificationProvider } from './contexts/NotificationContext';
import SocketService from './utils/socket';
import PushNotificationService from './services/pushNotificationService';

function App() {
  useEffect(() => {
    // Initialize socket connection
    const token = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    
    if (token && userId) {
      SocketService.connect(userId, token);
      
      // Register for push notifications
      PushNotificationService.registerForPushNotifications()
        .catch(error => console.error('Push notification registration failed:', error));
    }

    return () => {
      SocketService.disconnect();
    };
  }, []);

  return (
    <NotificationErrorBoundary>
      <NotificationProvider>
        <Router>
          <Routes>
            {/* Your routes */}
          </Routes>
        </Router>
      </NotificationProvider>
    </NotificationErrorBoundary>
  );
}

export default App;
```

### 2. Notification Context

```javascript
// contexts/NotificationContext.jsx
import React, { createContext, useContext } from 'react';
import { useNotifications } from '../hooks/useNotifications';

const NotificationContext = createContext();

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const notificationData = useNotifications();

  return (
    <NotificationContext.Provider value={notificationData}>
      {children}
    </NotificationContext.Provider>
  );
};
```

## Usage Examples

### 1. Using Notifications in Components

```javascript
// components/Header.jsx
import React from 'react';
import { useNotificationContext } from '../contexts/NotificationContext';
import NotificationBell from './NotificationBell';

const Header = () => {
  const { unreadCount } = useNotificationContext();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold">My App</h1>
          </div>
          <div className="flex items-center space-x-4">
            <NotificationBell />
            {unreadCount > 0 && (
              <span className="text-sm text-gray-600">
                {unreadCount} unread notifications
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
```

### 2. Message Component with Status

```javascript
// components/Message.jsx
import React from 'react';

const Message = ({ message, isOwn, onMarkAsRead }) => {
  const getStatusIcon = () => {
    switch (message.status) {
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return '✓✓';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (message.status) {
      case 'read':
        return 'text-blue-500';
      case 'delivered':
        return 'text-gray-500';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isOwn ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
      }`}>
        <p className="text-sm">{message.message}</p>
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs opacity-75">
            {new Date(message.created_at).toLocaleTimeString()}
          </span>
          {isOwn && (
            <span className={`text-xs ml-2 ${getStatusColor()}`}>
              {getStatusIcon()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Message;
```

This comprehensive guide provides everything you need to integrate the notification system with your frontend application. The system handles real-time notifications, message status tracking, push notifications, and provides a complete UI for managing notifications.
