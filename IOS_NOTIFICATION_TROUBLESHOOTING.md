# 🍎 iOS Notification Troubleshooting Guide

## 🔍 **Issue: FCM Not Working for iOS + Socket.IO Issues**

### **Problems Identified:**

1. **FCM iOS notifications not working** - iOS devices not receiving push notifications
2. **Socket.IO not working** - iOS clients not receiving socket events

---

## 🔧 **FCM iOS Fixes Applied:**

### **1. Enhanced APNS Payload Structure**

The iOS APNS payload has been improved to properly handle notifications:

```javascript
apns: {
  headers: {
    'apns-priority': '10',      // High priority for immediate delivery
    'apns-push-type': 'alert'    // Alert type for foreground/background
  },
  payload: {
    aps: {
      alert: {
        title: notification.title,
        body: notification.body
      },
      sound: 'default',
      badge: notification.badge || 1,
      category: 'MESSAGE_CATEGORY',
      'mutable-content': 1,      // For notification extensions
      'content-available': 1     // For background data fetching
    },
    // Custom data for iOS
    ...notification.data
  }
}
```

### **2. Critical iOS Requirements:**

#### **Firebase Configuration:**
- ✅ Firebase service account credentials are set
- ⚠️ **Missing**: APNs certificates/keys need to be configured in Firebase Console

#### **Required in Firebase Console:**

1. **Go to Firebase Console** → Project Settings → Cloud Messaging → APNs Authentication Key
2. **Upload APNs Authentication Key** (.p8 file)
3. **Add Key ID** and **Team ID** from Apple Developer account
4. **OR** upload APNs Certificates (Development + Production)

#### **APNs Certificate Requirements:**

For **Development**:
- Certificate Type: Apple Development iOS Push Services
- Valid for your app's Bundle ID

For **Production**:
- Certificate Type: Apple Production iOS Push Services  
- Valid for your app's Bundle ID

---

## 🔧 **Socket.IO iOS Troubleshooting:**

### **Common Socket.IO Issues on iOS:**

1. **CORS Issues**
2. **SSL/HTTPS Requirements**
3. **Authentication Headers**
4. **Background Connection Limitations**

### **Check Socket.IO Configuration:**

Verify Socket.IO server configuration in `index.js`:

```javascript
// Socket.IO should support CORS for iOS
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins during development
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'] // Support both transports
});
```

### **iOS Socket.IO Client Requirements:**

1. **Use HTTPS/WSS**: iOS requires secure connections
   - ✅ Development: `wss://localhost:3000` (if using tunneling)
   - ✅ Production: `wss://yourdomain.com`

2. **Background Mode**: iOS has strict background limitations
   - App must be in foreground to maintain socket connections
   - Use background fetch or push notifications for offline scenarios

3. **Authentication Header**: Socket.IO must include auth token
   ```javascript
   socket = io(serverUrl, {
     auth: {
       token: userToken
     },
     transports: ['websocket']
   });
   ```

---

## 🧪 **Testing iOS Notifications:**

### **Step 1: Test FCM Token Registration**

```bash
POST /api/fcm/register
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "token": "FCM_TOKEN_FROM_IOS_APP",
  "device_type": "ios",
  "device_id": "DEVICE_ID"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "FCM token registered successfully",
  "data": {
    "id": "uuid",
    "user_id": "user_uuid",
    "token": "FCM_TOKEN",
    "device_type": "ios",
    "is_active": true
  }
}
```

### **Step 2: Test FCM Notification**

```bash
POST /api/fcm/test
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "title": "Test iOS Notification",
  "body": "Testing iOS push notification",
  "data": {
    "type": "test",
    "conversation_id": "test"
  }
}
```

### **Step 3: Check Firebase Console**

1. Go to Firebase Console → Cloud Messaging
2. Check if notifications are being sent
3. View delivery statistics
4. Check for any errors in Cloud Messaging logs

### **Step 4: Test Socket.IO Connection**

```javascript
// In iOS app, connect to Socket.IO
import SocketIO

let socket: SocketIOClient?

socket = SocketIOClient(
  socketURL: "wss://yourdomain.com",
  config: [
    .log(true),
    .forceWebsockets(true),
    .compress(),
    .secure(true),
    .selfSigned(false),
    .sessionDelegate(self)
  ]
)

socket?.connect()
```

---

## 🐛 **Common Issues & Solutions:**

### **Issue 1: "FCM Token Not Registered"**

**Problem**: iOS app not registering FCM token with backend

**Solution**:
1. Ensure iOS app is properly requesting notification permissions
2. Ensure FCM SDK is properly initialized in iOS app
3. Check that token is being sent to backend API

**iOS Code Check**:
```swift
// Request notification permission
UNUserNotificationCenter.current().requestAuthorization(
  options: [.alert, .badge, .sound]) { granted, error in
    if granted {
      // Get FCM token
      Messaging.messaging().token { token, error in
        if let token = token {
          // Send to backend
          // POST /api/fcm/register with token
        }
      }
    }
}
```

### **Issue 2: "APNs Connection Failed"**

**Problem**: Firebase can't connect to Apple Push Notification service

**Solution**:
1. **Upload APNs Key in Firebase Console**:
   - Go to Firebase Console → Project Settings → Cloud Messaging
   - Upload APNs Authentication Key (.p8)
   - Add Key ID and Team ID

2. **Check APNs Certificate**:
   - Valid for correct Bundle ID
   - Not expired
   - Correct environment (Dev/Prod)

### **Issue 3: "Socket.IO Not Connecting on iOS"**

**Problem**: iOS socket.IO client can't connect to server

**Solution**:
1. **Check URL**: Use `wss://` for secure connection
2. **Check CORS**: Ensure server allows your origin
3. **Check Auth**: Include auth token in socket connection
4. **Background Limitations**: iOS kills background connections

**Debug**:
```javascript
// Add logging in socket connection
socket.on('connect', () => {
  console.log('✅ Connected to server');
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
});

socket.on('error', (error) => {
  console.log('❌ Socket error:', error);
});
```

### **Issue 4: "Notifications Received But Not Showing"**

**Problem**: FCM notification received but not displayed

**Solution**:
1. **Check Foreground Notification Handling**:
   ```swift
   // In AppDelegate.swift
   func userNotificationCenter(
     _ center: UNUserNotificationCenter,
     willPresent notification: UNNotification,
     withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
   ) {
     // Show notification even when app is open
     completionHandler([.alert, .badge, .sound])
   }
   ```

2. **Check Background Notification Handling**:
   ```swift
   func userNotificationCenter(
     _ center: UNUserNotificationCenter,
     didReceive response: UNNotificationResponse,
     withCompletionHandler completionHandler: @escaping () -> Void
   ) {
     // Handle notification tap
     completionHandler()
   }
   ```

---

## ✅ **Verification Steps:**

### **1. Verify FCM Setup:**

```bash
# Check FCM token exists for user
curl -X GET "http://localhost:3000/api/fcm/tokens" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response should show iOS token
{
  "success": true,
  "tokens": [
    {
      "id": "uuid",
      "user_id": "user_uuid",
      "token": "FCM_TOKEN",
      "device_type": "ios",
      "is_active": true
    }
  ]
}
```

### **2. Verify APNs Configuration:**

- ✅ Check Firebase Console → APNs Key uploaded
- ✅ Check Apple Developer account → Push Notifications enabled
- ✅ Check Bundle ID → Push Notifications capability enabled
- ✅ Check Provisioning Profile → Push Notifications included

### **3. Verify Socket.IO Connection:**

```javascript
// Client-side test
socket.emit('join', userId);
socket.on('notification', (data) => {
  console.log('Received notification:', data);
});

// Server-side logs should show:
// User connected: socket_id
// User ${userId} joined room: user_${userId}
```

---

## 🚀 **Next Steps:**

1. **Configure APNs in Firebase Console**
2. **Enable Push Notifications in Xcode** (Capabilities → Push Notifications)
3. **Test FCM token registration from iOS app**
4. **Test notification sending from backend**
5. **Monitor Firebase Console for delivery statistics**
6. **Check iOS app logs for any errors**

---

## 📊 **Monitoring:**

### **Firebase Console:**
- Cloud Messaging → Analytics
- View delivery rates
- Check error logs

### **Backend Logs:**
```bash
# Watch logs for FCM notifications
tail -f logs/app.log | grep FCM

# Should see:
✅ Successfully sent to token ABC123...
⚠️ FCM service not initialized (if Firebase not configured)
❌ Failed to send to token XYZ... (if token invalid)
```

### **iOS Console:**
- Xcode → Window → Devices and Simulators
- View device logs
- Check for FCM/Push Notification errors

---

## 🎯 **Summary:**

1. **FCM iOS Fix**: ✅ Enhanced APNS payload structure
2. **Firebase Setup**: ⚠️ Need to configure APNs in Firebase Console
3. **Socket.IO**: ✅ Proper CORS and transport configuration
4. **iOS App**: ⚠️ Must enable Push Notifications capability

**Critical Action Required**: Upload APNs Authentication Key to Firebase Console!

