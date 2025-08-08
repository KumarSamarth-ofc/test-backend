const axios = require('axios');

async function testConsoleOTP() {
    const baseURL = 'http://localhost:3000/api/auth';
    
    console.log('🧪 Testing OTP with Console Mode\n');
    
    const testPhone = '+919876543214';
    
    // Step 1: Send registration OTP
    console.log('📱 Step 1: Send registration OTP...');
    try {
        const response1 = await axios.post(`${baseURL}/send-registration-otp`, {
            phone: testPhone
        });
        
        console.log('Response:', JSON.stringify(response1.data, null, 2));
        
        if (response1.data.success) {
            console.log('✅ Registration OTP sent successfully');
            console.log('📝 Check the server console above for the OTP message');
            console.log('📝 Look for a message like: "🔐 Your Stoory verification code is: *123456*"');
            
            // Wait for OTP to be displayed
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log('\n📱 Step 2: Now try to verify with the OTP from console...');
            console.log('⚠️  Replace "123456" with the actual OTP you see in the server console');
            
        } else {
            console.log('❌ Registration OTP failed:', response1.data);
        }
        
    } catch (error) {
        console.error('💥 Error:', error.response?.data || error.message);
    }
}

testConsoleOTP(); 