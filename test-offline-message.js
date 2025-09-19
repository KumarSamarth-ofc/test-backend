const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const TEST_CONVERSATION_ID = 'ebde0d24-8e76-4db1-b3ca-0ae23d2c2b43';
const TEST_SENDER_ID = 'ec248800-859e-4ce8-981e-8e4d82c078ff';
const TEST_RECEIVER_ID = 'offline-user-test'; // Simulate offline user

console.log('🧪 Testing FCM Notifications for Offline Users...\n');

async function testOfflineUserMessage() {
  console.log('1️⃣ Testing message to offline user...');
  
  try {
    const response = await axios.post(`${BASE_URL}/test-message`, {
      conversationId: TEST_CONVERSATION_ID,
      senderId: TEST_SENDER_ID,
      receiverId: TEST_RECEIVER_ID,
      message: 'Test message to offline user - should trigger FCM notification'
    });

    console.log('✅ Test message sent:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Test message failed:', error.response?.data || error.message);
    return false;
  }
}

async function testRealMessageFlow() {
  console.log('\n2️⃣ Testing real message flow via REST API...');
  
  try {
    // This will require authentication, so it might fail
    const response = await axios.post(`${BASE_URL}/api/conversations/${TEST_CONVERSATION_ID}/messages`, {
      message: 'Real message test for offline user',
      sender_id: TEST_SENDER_ID,
      receiver_id: TEST_RECEIVER_ID
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test_token' // This will fail but we can see the flow
      }
    });

    console.log('✅ Real message sent:', response.data);
    return true;
  } catch (error) {
    console.log('ℹ️ Real message test (expected to fail auth):', error.response?.data || error.message);
    return false;
  }
}

async function checkFCMTokensForOfflineUser() {
  console.log('\n3️⃣ Checking FCM tokens for offline user...');
  
  try {
    const { supabaseAdmin } = require('./supabase/client');
    const { data: tokens, error } = await supabaseAdmin
      .from('fcm_tokens')
      .select('*')
      .eq('user_id', TEST_RECEIVER_ID)
      .eq('is_active', true);

    if (error) {
      console.error('❌ Database query failed:', error);
      return false;
    }

    console.log(`ℹ️ Found ${tokens.length} active FCM tokens for offline user ${TEST_RECEIVER_ID}`);
    if (tokens.length === 0) {
      console.log('⚠️ No FCM tokens found for offline user - this is why notifications might not be sent');
    } else {
      tokens.forEach((token, index) => {
        console.log(`  ${index + 1}. Token: ${token.token.substring(0, 20)}... (${token.device_type})`);
      });
    }

    return tokens.length > 0;
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    return false;
  }
}

async function testFCMDirectly() {
  console.log('\n4️⃣ Testing FCM service directly...');
  
  try {
    const fcmService = require('./services/fcmService');
    
    // Test with offline user
    const testMessage = {
      id: `test_${Date.now()}`,
      conversation_id: TEST_CONVERSATION_ID,
      sender_id: TEST_SENDER_ID,
      receiver_id: TEST_RECEIVER_ID,
      message: 'Direct FCM test for offline user',
      created_at: new Date().toISOString(),
      seen: false
    };

    const result = await fcmService.sendMessageNotification(
      TEST_CONVERSATION_ID,
      testMessage,
      TEST_SENDER_ID,
      TEST_RECEIVER_ID
    );

    console.log('✅ Direct FCM test result:', result);
    return result.success;
  } catch (error) {
    console.error('❌ Direct FCM test failed:', error.message);
    return false;
  }
}

async function runOfflineTests() {
  console.log('🚀 Starting Offline User FCM Tests...\n');
  
  const results = {
    offlineMessage: await testOfflineUserMessage(),
    realMessage: await testRealMessageFlow(),
    offlineTokens: await checkFCMTokensForOfflineUser(),
    directFCM: await testFCMDirectly()
  };

  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  Object.entries(results).forEach(([test, result]) => {
    console.log(`${result ? '✅' : '❌'} ${test}: ${result ? 'PASSED' : 'FAILED'}`);
  });

  console.log('\n🔍 Analysis:');
  if (!results.offlineTokens) {
    console.log('⚠️  No FCM tokens found for offline user - this is the likely cause');
    console.log('💡 Solution: Users need to register FCM tokens when they install the app');
  }
  if (results.offlineTokens && !results.directFCM) {
    console.log('❌ FCM tokens exist but direct FCM test failed - check FCM service');
  }
  if (results.offlineTokens && results.directFCM) {
    console.log('✅ FCM is working - the issue might be in the message flow logic');
  }

  console.log('\n🏁 Offline User Tests completed!');
  process.exit(0);
}

runOfflineTests().catch(console.error);
