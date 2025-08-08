const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const TEST_PHONE = '+1234567890';

async function testWhatsAppAuth() {
    console.log('🧪 Testing WhatsApp OTP Authentication\n');

    try {
        // Step 1: Send OTP
        console.log('1️⃣ Sending OTP...');
        const sendOTPResponse = await axios.post(`${BASE_URL}/api/auth/send-otp`, {
            phone: TEST_PHONE
        });

        console.log('✅ OTP sent successfully');
        console.log('Response:', sendOTPResponse.data);

        // Step 2: Wait a moment for OTP to be processed
        console.log('\n⏳ Waiting for OTP processing...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Step 3: Verify OTP (you'll need to check console logs for the actual OTP)
        console.log('\n2️⃣ Verifying OTP...');
        console.log('📝 Note: Check server console logs for the actual OTP code');
        
        // For testing, we'll use a placeholder OTP
        // In real testing, you'd get this from WhatsApp or console logs
        const testOTP = '123456'; // Replace with actual OTP from logs

        const verifyOTPResponse = await axios.post(`${BASE_URL}/api/auth/verify-otp`, {
            phone: TEST_PHONE,
            token: testOTP,
            userData: {
                email: 'test@example.com',
                role: 'influencer'
            }
        });

        console.log('✅ OTP verified successfully');
        console.log('Response:', verifyOTPResponse.data);

        // Step 4: Test authenticated endpoint
        if (verifyOTPResponse.data.token) {
            console.log('\n3️⃣ Testing authenticated endpoint...');
            
            const token = verifyOTPResponse.data.token;
            const campaignsResponse = await axios.get(`${BASE_URL}/api/campaigns`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('✅ Authenticated request successful');
            console.log('Campaigns response:', campaignsResponse.data);
        }

        console.log('\n🎉 All tests passed!');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.log('\n💡 Tip: Make sure to use the actual OTP from server console logs');
        }
    }
}

async function testHealthCheck() {
    try {
        console.log('🏥 Testing health check...');
        const response = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Health check passed:', response.data);
        return true;
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
        return false;
    }
}

async function runTests() {
    console.log('🚀 Starting WhatsApp Authentication Tests\n');

    // Check if server is running
    const isHealthy = await testHealthCheck();
    if (!isHealthy) {
        console.log('\n❌ Server is not running. Please start the server first:');
        console.log('   npm start');
        return;
    }

    console.log('\n' + '='.repeat(50));
    await testWhatsAppAuth();
    console.log('\n' + '='.repeat(50));
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testWhatsAppAuth, testHealthCheck }; 