require('dotenv').config();
const fcmService = require('../services/fcmService');

const testToken = 'fD9Nn0ECkk3BsND_fRotI9:APA91bGxFGvlElud-N0RAlih0rLsZGQ-KT2npYluvRCjjRd70e_fYh2h7pb8Nk0XX7rMWL0fXMTuhITjI90O_qevkjjRXgza-18-Braz3_4wWf8YVx_LG7I';

async function testSend() {
    console.log('🚀 Starting FCM test for token:', testToken);

    const notification = {
        title: 'Test Notification',
        body: 'This is a test notification from the backend script.',
        data: {
            type: 'test',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK'
        }
    };

    try {
        // We use sendToTokens directly to bypass user lookup
        const result = await fcmService.sendToTokens([testToken], notification);
        console.log('✅ Test complete. Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ Test failed:', error);
    }

    process.exit(0);
}

testSend();
