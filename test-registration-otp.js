const axios = require('axios');

async function testRegistrationFlow() {
    const baseURL = 'http://localhost:3000/api/auth';
    
    console.log('🧪 Testing Complete Registration Flow\n');
    
    const newPhone = '+919876543212';
    
    // Step 1: Send registration OTP for new user
    console.log('📱 Step 1: Send registration OTP for new user...');
    try {
        const response1 = await axios.post(`${baseURL}/send-registration-otp`, {
            phone: newPhone
        });
        
        console.log('Response:', JSON.stringify(response1.data, null, 2));
        
        if (response1.data.success) {
            console.log('✅ Registration OTP sent successfully');
            console.log('📝 Note: Check server console for the actual OTP (console mode)');
            
            // Wait a moment for OTP to be processed
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Step 2: Verify OTP and create account
            console.log('\n📱 Step 2: Verify OTP and create account...');
            console.log('⚠️  You need to check the server console for the actual OTP');
            console.log('⚠️  Replace "123456" with the actual OTP from console');
            
            const response2 = await axios.post(`${baseURL}/verify-otp`, {
                phone: newPhone,
                token: '123456', // Replace with actual OTP from console
                userData: {
                    name: 'Test User',
                    email: 'test@example.com',
                    role: 'influencer',
                    gender: 'male',
                    languages: ['English'],
                    categories: ['Technology'],
                    min_range: 1000,
                    max_range: 50000
                }
            });
            
            console.log('Response:', JSON.stringify(response2.data, null, 2));
            
            if (response2.data.success) {
                console.log('✅ Account created successfully');
                console.log('👤 User:', response2.data.user);
                console.log('🔑 Token:', response2.data.token);
                
                // Step 3: Try to send registration OTP again (should fail)
                console.log('\n📱 Step 3: Try to send registration OTP again (should fail)...');
                const response3 = await axios.post(`${baseURL}/send-registration-otp`, {
                    phone: newPhone
                });
                
                console.log('Response:', JSON.stringify(response3.data, null, 2));
                
                if (response3.data.code === 'USER_ALREADY_EXISTS') {
                    console.log('✅ Correctly prevented duplicate registration');
                } else {
                    console.log('❌ Expected USER_ALREADY_EXISTS but got:', response3.data);
                }
                
                // Step 4: Try to send login OTP (should work)
                console.log('\n📱 Step 4: Try to send login OTP (should work)...');
                const response4 = await axios.post(`${baseURL}/send-otp`, {
                    phone: newPhone
                });
                
                console.log('Response:', JSON.stringify(response4.data, null, 2));
                
                if (response4.data.success) {
                    console.log('✅ Login OTP sent successfully for existing user');
                } else {
                    console.log('❌ Expected login OTP to work but got:', response4.data);
                }
                
            } else {
                console.log('❌ Account creation failed:', response2.data);
            }
            
        } else {
            console.log('❌ Registration OTP failed:', response1.data);
        }
        
    } catch (error) {
        console.error('💥 Error:', error.response?.data || error.message);
    }
}

async function testLoginFlow() {
    const baseURL = 'http://localhost:3000/api/auth';
    
    console.log('\n🧪 Testing Login Flow for Non-Existent User\n');
    
    const nonExistentPhone = '+919876543213';
    
    // Test: Try to send login OTP for non-existent user
    console.log('📱 Test: Send login OTP for non-existent user...');
    try {
        const response = await axios.post(`${baseURL}/send-otp`, {
            phone: nonExistentPhone
        });
        
        console.log('Response:', JSON.stringify(response.data, null, 2));
        
        if (response.data.code === 'USER_NOT_FOUND') {
            console.log('✅ Correctly prevented login for non-existent user');
        } else {
            console.log('❌ Expected USER_NOT_FOUND but got:', response.data);
        }
        
    } catch (error) {
        console.error('💥 Error:', error.response?.data || error.message);
    }
}

// Run the tests
async function runTests() {
    await testRegistrationFlow();
    await testLoginFlow();
}

runTests(); 