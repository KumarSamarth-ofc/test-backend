const axios = require('axios');
const { supabaseAdmin } = require('./supabase/client');

async function testNameGenderSaving() {
    const baseURL = 'http://localhost:3000/api/auth';
    
    console.log('🧪 Testing Name and Gender Saving\n');
    
    const phone = '+919876543216';
    
    try {
        // Step 1: Send registration OTP
        console.log('📱 Step 1: Send registration OTP...');
        const response1 = await axios.post(`${baseURL}/send-registration-otp`, {
            phone: phone
        });
        
        console.log('Response:', JSON.stringify(response1.data, null, 2));
        
        if (response1.data.success) {
            console.log('✅ Registration OTP sent successfully');
            
            // Step 2: Get the actual OTP from database
            console.log('\n📱 Step 2: Getting actual OTP from database...');
            const { data: otps, error } = await supabaseAdmin
                .from('otp_codes')
                .select('*')
                .eq('phone', phone)
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (error || !otps || otps.length === 0) {
                console.log('❌ No OTP found');
                return;
            }
            
            const actualOTP = otps[0].otp;
            console.log('✅ Found OTP:', actualOTP);
            
            // Step 3: Verify OTP with name and gender
            console.log('\n📱 Step 3: Verifying OTP with name and gender...');
            const response2 = await axios.post(`${baseURL}/verify-otp`, {
                phone: phone,
                token: actualOTP,
                userData: {
                    name: 'John Doe',
                    email: 'john@example.com',
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
                console.log('✅ User created successfully!');
                console.log('👤 User data:', response2.data.user);
                
                // Step 4: Check database directly
                console.log('\n📱 Step 4: Checking database directly...');
                const { data: dbUser, error: dbError } = await supabaseAdmin
                    .from('users')
                    .select('*')
                    .eq('phone', phone)
                    .single();
                
                if (dbError) {
                    console.log('❌ Database error:', dbError);
                } else {
                    console.log('✅ Database record:', dbUser);
                    console.log('   Name:', dbUser.name);
                    console.log('   Gender:', dbUser.gender);
                    console.log('   Email:', dbUser.email);
                    console.log('   Role:', dbUser.role);
                }
                
            } else {
                console.log('❌ User creation failed:', response2.data.message);
            }
            
        } else {
            console.log('❌ Registration OTP failed:', response1.data);
        }
        
    } catch (error) {
        console.error('💥 Error:', error.response?.data || error.message);
    }
}

testNameGenderSaving(); 