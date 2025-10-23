#!/usr/bin/env node

/**
 * Test script for socket notifications
 * 
 * This script demonstrates how to:
 * 1. Check online users
 * 2. Send test notifications to all active socket users
 * 3. Send test notification to a specific user
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkOnlineUsers() {
  try {
    log('\n🔍 Checking online users...', 'cyan');
    const response = await axios.get(`${API_BASE}/online-users`);
    
    if (response.data.success) {
      log(`✅ Found ${response.data.online_users_count} online users`, 'green');
      
      if (response.data.online_users_count > 0) {
        log('📋 Online users:', 'blue');
        response.data.online_users.forEach((user, index) => {
          log(`  ${index + 1}. User ID: ${user.userId} (Socket: ${user.socketId})`, 'blue');
        });
      } else {
        log('⚠️  No users are currently online', 'yellow');
      }
      
      return response.data;
    } else {
      log('❌ Failed to get online users', 'red');
      return null;
    }
  } catch (error) {
    log(`❌ Error checking online users: ${error.message}`, 'red');
    return null;
  }
}

async function sendTestNotificationToAll(title, message) {
  try {
    log('\n📡 Sending test notification to all active users...', 'cyan');
    
    const payload = {
      title: title || 'Test Notification to All Users',
      message: message || 'This is a test notification sent to all active socket users!'
    };
    
    const response = await axios.post(`${API_BASE}/test-socket-notification-all`, payload);
    
    if (response.data.success) {
      log(`✅ Successfully sent notifications to ${response.data.notifications_sent} users`, 'green');
      
      if (response.data.summary) {
        log(`📊 Summary:`, 'blue');
        log(`  - Total online users: ${response.data.summary.total_users}`, 'blue');
        log(`  - Successful deliveries: ${response.data.summary.successful}`, 'green');
        log(`  - Failed deliveries: ${response.data.summary.failed}`, 'red');
        log(`  - Success rate: ${response.data.summary.success_rate}`, 'blue');
      } else {
        log(`📊 Summary:`, 'blue');
        log(`  - Total online users: ${response.data.online_users_count}`, 'blue');
        log(`  - Notifications sent: ${response.data.notifications_sent}`, 'green');
        log(`  - Delivery method: ${response.data.delivery_method}`, 'blue');
      }
      
      if (response.data.results && response.data.results.length > 0) {
        log('\n📋 Detailed results:', 'blue');
        response.data.results.forEach((result, index) => {
          const status = result.success ? '✅' : '❌';
          const color = result.success ? 'green' : 'red';
          log(`  ${index + 1}. ${status} User ${result.user_id}: ${result.delivery_method}`, color);
          if (!result.success && result.error) {
            log(`     Error: ${result.error}`, 'red');
          }
        });
      }
      
      return response.data;
    } else {
      log('❌ Failed to send notifications to all users', 'red');
      return null;
    }
  } catch (error) {
    log(`❌ Error sending notifications to all users: ${error.message}`, 'red');
    return null;
  }
}

async function sendTestNotificationToUser(userId, title, message) {
  try {
    log(`\n📡 Sending test notification to user ${userId}...`, 'cyan');
    
    const payload = {
      user_id: userId,
      title: title || 'Test Notification',
      message: message || 'This is a test notification!'
    };
    
    const response = await axios.post(`${API_BASE}/test-socket-notification`, payload);
    
    if (response.data.success) {
      log(`✅ Notification sent successfully`, 'green');
      log(`📊 Details:`, 'blue');
      log(`  - User ID: ${response.data.user_id}`, 'blue');
      log(`  - Online: ${response.data.is_online}`, response.data.is_online ? 'green' : 'yellow');
      log(`  - Delivery method: ${response.data.delivery_method}`, 'blue');
      log(`  - Total online users: ${response.data.online_users_count}`, 'blue');
      
      return response.data;
    } else {
      log('❌ Failed to send notification to user', 'red');
      return null;
    }
  } catch (error) {
    log(`❌ Error sending notification to user: ${error.message}`, 'red');
    return null;
  }
}

async function main() {
  log('🚀 Socket Notification Test Script', 'bright');
  log('=====================================', 'bright');
  
  // Check if server is running
  try {
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    log(`✅ Server is running: ${healthResponse.data.message}`, 'green');
  } catch (error) {
    log(`❌ Server is not running or not accessible at ${BASE_URL}`, 'red');
    log('Please make sure the server is running before testing notifications.', 'yellow');
    process.exit(1);
  }
  
  // Step 1: Check online users
  const onlineUsers = await checkOnlineUsers();
  
  if (!onlineUsers) {
    log('❌ Cannot proceed without online users data', 'red');
    process.exit(1);
  }
  
  // Step 2: Send test notification to all users
  if (onlineUsers.online_users_count > 0) {
    await sendTestNotificationToAll(
      '🎉 Test Notification',
      'Hello! This is a test notification sent to all active socket users. If you see this, the real-time notification system is working perfectly!'
    );
    
    // Step 3: Send test notification to first user (if any)
    if (onlineUsers.online_users.length > 0) {
      const firstUser = onlineUsers.online_users[0];
      await sendTestNotificationToUser(
        firstUser.userId,
        '👋 Personal Test',
        `Hello User ${firstUser.userId}! This is a personal test notification just for you.`
      );
    }
  } else {
    log('\n⚠️  No active users found. To test notifications:', 'yellow');
    log('1. Open your frontend application', 'yellow');
    log('2. Connect to the socket server', 'yellow');
    log('3. Run this script again', 'yellow');
  }
  
  log('\n✨ Test completed!', 'bright');
  log('=====================================', 'bright');
}

// Handle command line arguments
if (process.argv.length > 2) {
  const command = process.argv[2];
  
  switch (command) {
    case 'check':
      checkOnlineUsers().then(() => process.exit(0));
      break;
    case 'all':
      const title = process.argv[3] || 'Test Notification';
      const message = process.argv[4] || 'This is a test notification to all users!';
      sendTestNotificationToAll(title, message).then(() => process.exit(0));
      break;
    case 'user':
      const userId = process.argv[3];
      if (!userId) {
        log('❌ Please provide a user ID: node test-notifications.js user <user_id>', 'red');
        process.exit(1);
      }
      const userTitle = process.argv[4] || 'Test Notification';
      const userMessage = process.argv[5] || 'This is a test notification!';
      sendTestNotificationToUser(userId, userTitle, userMessage).then(() => process.exit(0));
      break;
    default:
      log('❌ Unknown command. Available commands:', 'red');
      log('  check - Check online users', 'yellow');
      log('  all [title] [message] - Send notification to all users', 'yellow');
      log('  user <user_id> [title] [message] - Send notification to specific user', 'yellow');
      process.exit(1);
  }
} else {
  // Run full test suite
  main().catch(error => {
    log(`❌ Unexpected error: ${error.message}`, 'red');
    process.exit(1);
  });
}
