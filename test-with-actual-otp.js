const axios = require('axios');
const { supabaseAdmin } = require('./supabase/client');

async function testWithActualOTP() {
    const baseURL = 'http://localhost:3000/api/auth';
    
    console.log('🧪 Testing with Actual OTP\n');
    
    const phone = '+919876543210';
    
    try {
        // Get the latest OTP from database
        console.log('📱 Getting latest OTP from database...');
        const { data: otps, error } = await supabaseAdmin
            .from('otp_codes')
            .select('*')
            .eq('phone', phone)
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (error || !otps || otps.length === 0) {
            console.log('❌ No OTP found. Please send OTP first.');
            return;
        }
        
        const latestOTP = otps[0];
        console.log('✅ Found OTP:', latestOTP.otp);
        console.log('📅 Expires:', latestOTP.expires_at);
        
        // Test verification with actual OTP
        console.log('\n📱 Testing OTP verification with actual OTP...');
        const response = await axios.post(`${baseURL}/verify-otp`, {
            phone: phone,
            token: latestOTP.otp, // Use actual OTP
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
        
        console.log('Response:', JSON.stringify(response.data, null, 2));
        
        if (response.data.success) {
            console.log('✅ OTP verification successful!');
            console.log('👤 User created:', response.data.user);
            console.log('🔑 Token:', response.data.token);
        } else {
            console.log('❌ OTP verification failed:', response.data.message);
        }
        
    } catch (error) {
        console.error('💥 Error:', error.response?.data || error.message);
    }
}

testWithActualOTP(); 