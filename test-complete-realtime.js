const { io } = require('socket.io-client');
const fcmService = require('./services/fcmService');
const { supabaseAdmin } = require('./supabase/client');

async function testCompleteRealtimeSystem() {
  console.log('🧪 Testing Complete Real-time System...');
  
  try {
    // Test 1: Check FCM service
    console.log('\n📱 Test 1: FCM Service Status');
    console.log('   - Initialized:', fcmService.initialized);
    console.log('   - Firebase App:', fcmService.app ? 'Available' : 'Not available');
    
    if (!fcmService.initialized) {
      console.log('❌ FCM service not initialized');
      return;
    }

    // Test 2: Check active FCM tokens
    console.log('\n🔑 Test 2: Active FCM Tokens');
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from('fcm_tokens')
      .select('user_id, token, device_type, is_active, users!inner(name)')
      .eq('is_active', true);

    if (tokensError) {
      console.error('❌ Error fetching tokens:', tokensError);
      return;
    }

    if (!tokens || tokens.length === 0) {
      console.log('❌ No active FCM tokens found');
      return;
    }

    console.log(`✅ Found ${tokens.length} active FCM tokens`);

    // Test 3: Test Socket.IO connection
    console.log('\n🔌 Test 3: Socket.IO Connection');
    const socket = io('http://localhost:3000', {
      transports: ['websocket', 'polling']
    });

    await new Promise((resolve, reject) => {
      socket.on('connect', () => {
        console.log('✅ Connected to Socket.IO server');
        resolve();
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Socket.IO connection error:', error);
        reject(error);
      });

      setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);
    });

    // Test 4: Listen for all socket events
    console.log('\n👂 Test 4: Socket Event Listeners');
    
    let eventsReceived = {
      new_message: 0,
      notification: 0,
      conversation_list_updated: 0,
      unread_count_updated: 0,
      conversation_state_changed: 0,
      conversation_updated: 0
    };

    // Listen for new_message events
    socket.on('new_message', (data) => {
      eventsReceived.new_message++;
      console.log('✅ new_message event received:', {
        conversation_id: data.conversation_id,
        message_id: data.message?.id,
        message_type: data.message?.message_type
      });
    });

    // Listen for notification events
    socket.on('notification', (data) => {
      eventsReceived.notification++;
      console.log('✅ notification event received:', {
        type: data.type,
        conversation_id: data.data?.conversation_id
      });
    });

    // Listen for conversation_list_updated events
    socket.on('conversation_list_updated', (data) => {
      eventsReceived.conversation_list_updated++;
      console.log('✅ conversation_list_updated event received:', {
        conversation_id: data.conversation_id,
        action: data.action,
        message_id: data.message?.id
      });
    });

    // Listen for unread_count_updated events
    socket.on('unread_count_updated', (data) => {
      eventsReceived.unread_count_updated++;
      console.log('✅ unread_count_updated event received:', {
        conversation_id: data.conversation_id,
        unread_count: data.unread_count,
        action: data.action
      });
    });

    // Listen for conversation_state_changed events
    socket.on('conversation_state_changed', (data) => {
      eventsReceived.conversation_state_changed++;
      console.log('✅ conversation_state_changed event received:', {
        conversation_id: data.conversation_id,
        previous_state: data.previous_state,
        new_state: data.new_state
      });
    });

    // Listen for conversation_updated events
    socket.on('conversation_updated', (data) => {
      eventsReceived.conversation_updated++;
      console.log('✅ conversation_updated event received:', {
        conversation_id: data.conversation_id,
        flow_state: data.flow_state
      });
    });

    // Test 5: Send test notification
    console.log('\n📤 Test 5: Sending Test Notification');
    const testToken = tokens[0];
    
    const testNotification = {
      title: '🧪 Complete System Test',
      body: 'Testing all real-time features including conversation list updates',
      data: {
        type: 'system_test',
        timestamp: new Date().toISOString(),
        message: 'Complete system test notification'
      }
    };

    const result = await fcmService.sendToTokens([testToken.token], testNotification);
    
    if (result.success) {
      console.log('✅ Test notification sent successfully!');
      console.log(`📊 Results: ${result.successful.length} sent, ${result.failed.length} failed`);
    } else {
      console.log('❌ Test notification failed:', result.error);
    }

    // Test 6: Summary
    console.log('\n📊 Test 6: Event Summary');
    console.log('Events received during test:');
    Object.entries(eventsReceived).forEach(([event, count]) => {
      console.log(`   - ${event}: ${count}`);
    });

    // Test 7: Frontend Integration Guide
    console.log('\n📋 Test 7: Frontend Integration Guide');
    console.log('The frontend should listen for these events:');
    console.log('');
    console.log('1. conversation_list_updated - Update conversation list UI');
    console.log('   - Shows new messages in conversation list');
    console.log('   - Updates last message preview');
    console.log('   - Moves conversation to top of list');
    console.log('');
    console.log('2. unread_count_updated - Update unread message counts');
    console.log('   - Increments unread count for specific conversation');
    console.log('   - Updates badge numbers');
    console.log('   - Resets count when conversation is opened');
    console.log('');
    console.log('3. new_message - Add message to conversation view');
    console.log('   - Adds message to current conversation');
    console.log('   - Scrolls to bottom of message list');
    console.log('   - Shows typing indicators');
    console.log('');
    console.log('4. notification - Show system notifications');
    console.log('   - Displays toast notifications');
    console.log('   - Shows in-app notifications');
    console.log('   - Handles notification clicks');

    // Keep listening for a few seconds
    console.log('\n⏳ Listening for events for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('\n📊 Final Event Count:');
    Object.entries(eventsReceived).forEach(([event, count]) => {
      console.log(`   - ${event}: ${count}`);
    });

    // Cleanup
    socket.disconnect();
    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCompleteRealtimeSystem().then(() => {
  console.log('\n🏁 Complete real-time system test finished');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
