# Socket Notification Testing

This guide explains how to test real-time socket notifications for active users.

## Available Endpoints

### 1. Check Online Users
```bash
GET /api/online-users
```
Returns the list of currently active socket users.

### 2. Send Test Notification to All Active Users
```bash
POST /api/test-socket-notification-all
Content-Type: application/json

{
  "title": "Test Notification to All Users",
  "message": "This is a test notification sent to all active users"
}
```

### 3. Send Test Notification to Specific User
```bash
POST /api/test-socket-notification
Content-Type: application/json

{
  "user_id": "user_id_here",
  "title": "Test Notification",
  "message": "This is a test notification",
  "force_send": false
}
```

## Test Script Usage

A test script is provided to easily test the notification system:

### Full Test Suite
```bash
node test-notifications.js
```

### Check Online Users Only
```bash
node test-notifications.js check
```

### Send to All Active Users
```bash
node test-notifications.js all "Custom Title" "Custom message"
```

### Send to Specific User
```bash
node test-notifications.js user "user_id_here" "Custom Title" "Custom message"
```

## How It Works

1. **Socket Connection Tracking**: When users connect via socket, they join a personal room (`user_${userId}`)
2. **Online Status**: The system tracks which users are currently connected
3. **Real-time Notifications**: Notifications are sent directly to the user's socket room
4. **Database Storage**: All notifications are also stored in the database for persistence
5. **Fallback**: If a user is offline, notifications are stored in the database only

## Testing Steps

1. **Start the server**:
   ```bash
   npm start
   ```

2. **Connect users via frontend**: Open your frontend application and ensure users are connected to the socket server

3. **Check online users**:
   ```bash
   curl http://localhost:3000/api/online-users
   ```

4. **Send test notification to all**:
   ```bash
   curl -X POST http://localhost:3000/api/test-socket-notification-all \
     -H "Content-Type: application/json" \
     -d '{"title": "Test", "message": "Hello all users!"}'
   ```

5. **Send test notification to specific user**:
   ```bash
   curl -X POST http://localhost:3000/api/test-socket-notification \
     -H "Content-Type: application/json" \
     -d '{"user_id": "your_user_id", "title": "Test", "message": "Hello!"}'
   ```

## Response Format

### Online Users Response
```json
{
  "success": true,
  "online_users_count": 2,
  "online_users": [
    {
      "socketId": "socket_id_1",
      "userId": "user_id_1",
      "room": "user_user_id_1"
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Notification Response
```json
{
  "success": true,
  "message": "Test notifications sent to 2 active users",
  "online_users_count": 2,
  "notifications_sent": 2,
  "notifications_failed": 0,
  "delivery_method": "socket",
  "summary": {
    "total_users": 2,
    "successful": 2,
    "failed": 0,
    "success_rate": "100%"
  }
}
```

## Frontend Integration

To receive notifications on the frontend, listen for the `notification` event:

```javascript
socket.on('notification', (data) => {
  console.log('Received notification:', data);
  // Handle the notification (show toast, update UI, etc.)
});
```

## Troubleshooting

- **No online users**: Make sure users are connected via socket in your frontend
- **Notifications not received**: Check if the user is in the correct socket room
- **Server errors**: Check server logs for detailed error messages
- **Database errors**: Ensure the notification service is properly configured
