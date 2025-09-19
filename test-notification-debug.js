const fcmService = require('./services/fcmService');
const { supabaseAdmin } = require('./supabase/client');

async function testNotificationDebug() {
  console.log('🔍 Debugging Notification System...');
  
  try {
    // Check FCM service status
    console.log('\n📱 FCM Service Status:');
    console.log('   - Initialized:', fcmService.initialized);
    console.log('   - Firebase App:', fcmService.app ? 'Available' : 'Not available');
    
    if (!fcmService.initialized) {
      console.log('❌ FCM service not initialized. This is why notifications are not being sent.');
      return;
    }

    // Check active FCM tokens
    console.log('\n🔑 Active FCM Tokens:');
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from('fcm_tokens')
      .select('user_id, token, device_type, is_active, users!inner(name)')
      .eq('is_active', true);

    if (tokensError) {
      console.error('❌ Error fetching tokens:', tokensError);
      return;
    }

    if (!tokens || tokens.length === 0) {
      console.log('❌ No active FCM tokens found. Users need to register their tokens first.');
      console.log('💡 To fix this:');
      console.log('   1. Users need to open the frontend app');
      console.log('   2. Allow notification permissions');
      console.log('   3. The app should register FCM tokens with the backend');
      return;
    }

    console.log(`✅ Found ${tokens.length} active FCM tokens:`);
    tokens.forEach((token, index) => {
      console.log(`   ${index + 1}. User: ${token.users.name} (${token.user_id})`);
      console.log(`      Device: ${token.device_type}, Token: ${token.token.substring(0, 20)}...`);
    });

    // Test sending notification to first token
    console.log('\n📤 Testing notification to first user...');
    const testToken = tokens[0];
    
    const testNotification = {
      title: '🔍 Debug Test Notification',
      body: 'This is a debug test to check if notifications are working',
      data: {
        type: 'debug_test',
        timestamp: new Date().toISOString(),
        message: 'Debug test notification'
      }
    };

    const result = await fcmService.sendToTokens([testToken.token], testNotification);
    
    if (result.success) {
      console.log('✅ Test notification sent successfully!');
      console.log(`📊 Results: ${result.successful.length} sent, ${result.failed.length} failed`);
      
      if (result.successful.length > 0) {
        console.log('🎉 Notification delivered! Check the device for the notification.');
      }
      
      if (result.failed.length > 0) {
        console.log('❌ Some notifications failed to send');
        console.log('💡 This could be due to:');
        console.log('   - Invalid or expired FCM tokens');
        console.log('   - Device not connected to internet');
        console.log('   - App not installed or notifications disabled');
      }
    } else {
      console.log('❌ Test notification failed:', result.error);
    }

    // Check conversation list update events
    console.log('\n📋 Checking Conversation List Update Events:');
    console.log('❌ No specific socket events found for conversation list updates');
    console.log('💡 Current events available:');
    console.log('   - new_message: Updates individual conversations');
    console.log('   - notification: Personal notifications');
    console.log('   - conversation_updated: Updates specific conversation');
    console.log('   - conversation_state_changed: Flow state changes');
    
    console.log('\n🔧 Recommendations:');
    console.log('   1. Add conversation_list_updated socket event');
    console.log('   2. Emit this event when new messages arrive');
    console.log('   3. Include unread count and last message info');

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

// Run the debug
testNotificationDebug().then(() => {
  console.log('\n🏁 Debug completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Debug failed:', error);
  process.exit(1);
});
