# 📱 Notification System Overview

## 🏗️ **Architecture Components**

### **1. NotificationService** (`services/notificationService.js`)
- **Purpose**: Central notification management service
- **Key Features**:
  - Stores notifications in database
  - Determines delivery method (Socket vs FCM) based on user online status
  - Manages notification state (pending, delivered, read)
  - Provides notification retrieval and filtering

### **2. FCM Service** (`services/fcmService.js`)
- **Purpose**: Firebase Cloud Messaging for push notifications
- **Key Features**:
  - Registers FCM tokens for users
  - Sends push notifications to mobile/web devices
  - Manages device tokens in `fcm_tokens` table
  - Handles token updates and cleanup

### **3. Socket.IO** (`sockets/messageHandler.js`)
- **Purpose**: Real-time notification delivery via WebSocket
- **Key Features**:
  - Emits notifications to online users instantly
  - Tracks user online/offline status
  - Personal rooms per user (`user_${userId}`)
  - Conversation-based rooms

### **4. Notification Controller** (`controllers/notificationController.js`)
- **Purpose**: API endpoints for notification management
- **Endpoints**:
  - GET `/api/notifications` - Get user notifications
  - GET `/api/notifications/unread-count` - Get unread count
  - PUT `/api/notifications/:id/read` - Mark as read
  - PUT `/api/notifications/read-all` - Mark all as read

---

## 🔄 **Notification Delivery Flow**

### **When User is Online (Connected via Socket.IO):**

```
1. Event Triggered (e.g., new message)
   ↓
2. NotificationService.storeNotification()
   - Stores in `notifications` table
   - Status: 'pending'
   ↓
3. Check if user is online (messageHandler.isUserOnline())
   ↓
4. Send via Socket.IO
   - Emit to: `user_${userId}`
   - Event: `notification`
   ↓
5. Frontend receives notification in real-time
   ↓
6. Frontend marks as read
   - PATCH /api/notifications/:id/read
   - Status updated to 'delivered'
```

### **When User is Offline:**

```
1. Event Triggered (e.g., new message)
   ↓
2. NotificationService.storeNotification()
   - Stores in `notifications` table
   - Status: 'pending'
   ↓
3. Check if user is online
   - User is OFFLINE
   ↓
4. Send via FCM
   - Retrieve user's FCM tokens from `fcm_tokens` table
   - Send push notification via Firebase
   ↓
5. User receives push notification on device
   ↓
6. When user opens app, notifications are synced
   - GET /api/notifications
   - Status updated to 'delivered'
```

---

## 📊 **Database Schema**

### **`notifications` Table**
```sql
{
  id: UUID,
  user_id: UUID (references users.id),
  type: String (message, campaign, bid, payment, etc.),
  priority: String (low, medium, high),
  status: String (pending, delivered, failed),
  title: String,
  message: String,
  data: JSONB (additional data),
  action_url: String (deep link URL),
  read_at: Timestamp,
  expires_at: Timestamp,
  created_at: Timestamp,
  updated_at: Timestamp
}
```

### **`fcm_tokens` Table**
```sql
{
  id: UUID,
  user_id: UUID (references users.id),
  token: String (FCM registration token),
  device_type: String (web, android, ios),
  device_id: String,
  is_active: Boolean,
  last_used_at: Timestamp,
  created_at: Timestamp,
  updated_at: Timestamp
}
```

---

## 🎯 **Notification Types**

### **1. Message Notifications**
- **Trigger**: New message received
- **Sent via**: Socket.IO (if online) or FCM (if offline)
- **Data**: Conversation context, message details, sender info

### **2. Campaign Notifications**
- **Trigger**: Campaign updates, applications
- **Sent via**: Socket.IO or FCM
- **Data**: Campaign details, application status

### **3. Bid Notifications**
- **Trigger**: Bid updates, proposals
- **Sent via**: Socket.IO or FCM
- **Data**: Bid details, proposal status

### **4. Payment Notifications**
- **Trigger**: Payment updates, escrow releases
- **Sent via**: Socket.IO or FCM
- **Data**: Payment details, transaction status

### **5. Work Submission Notifications**
- **Trigger**: Work submitted, approved, or revision requested
- **Sent via**: Socket.IO or FCM
- **Data**: Work details, submission status

---

## 🔧 **How Notifications Are Handled**

### **Message Notifications Example:**

```javascript
// In MessageController.sendMessage()

// 1. Store notification in database
const notificationService = require('../services/notificationService');
notificationService.storeNotification({
  user_id: receiverId,
  type: 'message',
  title: `${req.user.name} sent you a message`,
  message: newMessage.message,
  data: {
    conversation_id: conversationId,
    message: newMessage,
    conversation_context: conversationContext,
  },
  action_url: `/conversations/${conversationId}`
});

// 2. Send via Socket.IO (if user online)
io.to(`user_${receiverId}`).emit("notification", {
  type: "message",
  data: {
    conversation_id: conversationId,
    message: newMessage,
    conversation_context: conversationContext,
  },
});

// 3. Send via FCM (if user offline)
const fcmService = require('../services/fcmService');
fcmService.sendMessageNotification(
  conversationId,
  newMessage,
  senderId,
  receiverId
);
```

---

## 📡 **Socket.IO Events**

### **Client → Server:**
- `join` - User joins their personal room
- `leave_conversation` - User leaves a conversation
- `send_message` - Send a message
- `typing_start` - User started typing
- `typing_stop` - User stopped typing
- `mark_seen` - Mark messages as seen

### **Server → Client:**
- `notification` - New notification received
- `message_sent` - Message sent confirmation
- `new_message` - New message in conversation
- `conversation_state_changed` - Conversation state updated
- `conversation_list_updated` - Conversation list updated
- `user_typing` - Another user is typing

---

## 🚀 **FCM Push Notifications**

### **Token Registration:**
```javascript
// Client registers FCM token
POST /api/fcm/register
{
  "token": "FCM_REGISTRATION_TOKEN",
  "device_type": "android",
  "device_id": "DEVICE_ID"
}
```

### **Sending Push Notification:**
```javascript
// FCMService sends notification
await fcmService.sendNotificationToUser(userId, {
  notification: {
    title: "New Message",
    body: message.text
  },
  data: {
    type: "message",
    conversation_id: conversationId
  }
});
```

---

## 📱 **Notification Priority System**

### **Priority Levels:**
1. **high** - Critical notifications (payment updates, urgent messages)
2. **medium** - Standard notifications (new messages, campaign updates)
3. **low** - Informational notifications (system updates)

### **Delivery Methods by Priority:**
- **high**: Socket.IO + FCM + Email (if configured)
- **medium**: Socket.IO or FCM
- **low**: FCM only

---

## 🔄 **Notification States**

### **Pending** → **Delivered** → **Read**

1. **pending**: Notification created, not yet delivered
2. **delivered**: Notification sent to user
3. **read**: User viewed the notification

### **Failed Deliveries:**
- FCM tokens that fail are marked as inactive
- Failed notifications are retried with exponential backoff
- Dead tokens are automatically cleaned up

---

## 🎯 **Best Practices**

### **1. Always Store First:**
```javascript
// Store notification before sending
const result = await notificationService.storeNotification(data);
if (result.success) {
  // Then send via Socket or FCM
}
```

### **2. Check Online Status:**
```javascript
// Determine delivery method
const isOnline = notificationService.isUserOnline(userId);
if (isOnline) {
  // Send via Socket.IO
} else {
  // Send via FCM
}
```

### **3. Use Appropriate Channels:**
- **Real-time**: Use Socket.IO for instant delivery
- **Persistent**: Store in database for offline users
- **Push**: Use FCM for mobile/web notifications

### **4. Handle Failures Gracefully:**
```javascript
try {
  await fcmService.sendNotificationToUser(userId, notification);
} catch (error) {
  console.error('FCM failed, but notification is stored:', error);
  // Notification will be delivered when user opens app
}
```

---

## 🔍 **Debugging & Testing**

### **Test Socket Notifications:**
```bash
POST /api/test-socket-notification
{
  "user_id": "USER_ID",
  "title": "Test Notification",
  "message": "This is a test"
}
```

### **Test All Online Users:**
```bash
POST /api/test-socket-notification-all
{
  "title": "Test to All",
  "message": "Test message to all users"
}
```

### **Check Notification Status:**
```bash
GET /api/notifications
Authorization: Bearer TOKEN
```

---

## 🎉 **Summary**

The notification system provides:
- ✅ **Real-time delivery** via Socket.IO for online users
- ✅ **Push notifications** via FCM for offline users
- ✅ **Persistent storage** in database for all notifications
- ✅ **Automatic fallback** from Socket to FCM when user is offline
- ✅ **Priority-based delivery** for different notification types
- ✅ **State management** (pending, delivered, read)
- ✅ **Multi-platform support** (web, mobile)

