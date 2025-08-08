const { supabaseAdmin } = require('./supabase/client');

async function debugOTP() {
    console.log('🔍 Debugging OTP Storage and Verification\n');
    
    const phone = '+919876543210'; // Replace with your phone number
    const otp = '123456'; // Replace with your OTP
    
    try {
        // Check what OTPs are stored for this phone
        console.log('📱 Checking OTPs for phone:', phone);
        const { data: otps, error } = await supabaseAdmin
            .from('otp_codes')
            .select('*')
            .eq('phone', phone)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ Database error:', error);
            return;
        }
        
        console.log('📊 Found OTPs:', otps);
        
        if (otps && otps.length > 0) {
            console.log('\n🔍 Latest OTP details:');
            const latestOTP = otps[0];
            console.log('   Phone:', latestOTP.phone);
            console.log('   OTP:', latestOTP.otp);
            console.log('   Created:', latestOTP.created_at);
            console.log('   Expires:', latestOTP.expires_at);
            console.log('   Is Expired:', new Date() > new Date(latestOTP.expires_at));
            
            // Check if the OTP you're trying matches
            console.log('\n🔍 OTP Verification Check:');
            console.log('   Your OTP:', otp);
            console.log('   Stored OTP:', latestOTP.otp);
            console.log('   OTP Match:', otp === latestOTP.otp);
            console.log('   Phone Match:', phone === latestOTP.phone);
            console.log('   Not Expired:', new Date() < new Date(latestOTP.expires_at));
            
            // Try the exact query that verifyStoredOTP uses
            console.log('\n🔍 Testing exact verification query...');
            const { data: verificationResult, error: verifyError } = await supabaseAdmin
                .from('otp_codes')
                .select('*')
                .eq('phone', phone)
                .eq('otp', otp)
                .gt('expires_at', new Date())
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            console.log('   Verification Result:', verificationResult);
            console.log('   Verification Error:', verifyError);
            
        } else {
            console.log('❌ No OTPs found for this phone number');
        }
        
    } catch (error) {
        console.error('💥 Error:', error);
    }
}

debugOTP(); 