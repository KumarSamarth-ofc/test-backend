const axios = require('axios');

async function testGenderRegistration() {
    const baseURL = 'http://localhost:3000/api/auth';
    
    console.log('🧪 Testing Gender Field in Registration\n');
    
    // Step 1: Send OTP
    console.log('📱 Step 1: Sending OTP...');
    try {
        const sendOTPResponse = await axios.post(`${baseURL}/send-otp`, {
            phone: '+919876543210'
        });
        
        if (sendOTPResponse.data.success) {
            console.log('✅ OTP sent successfully');
            
            // Step 2: Verify OTP with gender
            console.log('\n👤 Step 2: Verifying OTP with gender...');
            const verifyResponse = await axios.post(`${baseURL}/verify-otp`, {
                phone: '+919876543210',
                token: '123456', // Use the actual OTP received
                userData: {
                    name: 'John Doe',
                    email: 'test@example.com',
                    role: 'influencer',
                    gender: 'male', // ✅ Gender field included
                    languages: ['English', 'Hindi'],
                    categories: ['Fashion', 'Lifestyle'],
                    min_range: 1000,
                    max_range: 50000
                }
            });
            
            if (verifyResponse.data.success) {
                console.log('✅ Registration successful with gender!');
                console.log('👤 User data:', JSON.stringify(verifyResponse.data.user, null, 2));
            } else {
                console.log('❌ Registration failed:', verifyResponse.data.message);
            }
        } else {
            console.log('❌ OTP send failed:', sendOTPResponse.data.message);
        }
    } catch (error) {
        console.error('💥 Error:', error.response?.data || error.message);
    }
}

// Run the test
testGenderRegistration(); 