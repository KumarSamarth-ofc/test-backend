const axios = require('axios');

const API_URL = 'http://localhost:3000/api/auth/bulk-login';
const OTP = '123456';

const users = {
    brandOwner: { phone: '+919876543211', role: 'brand_owner' },
    admin: { phone: '+919999999999', role: 'admin' },
    influencer: { phone: '+919876543212', role: 'influencer' }
};

async function testLogin(role, userData) {
    console.log(`\nTesting login for ${role} (${userData.phone})...`);
    try {
        const response = await axios.post(API_URL, {
            phone: userData.phone,
            token: OTP,
            userData: {} // Optional
        }, {
            validateStatus: () => true // Allow handling all status codes
        });

        console.log(`Status: ${response.status}`);

        // precise check for cookies
        const cookies = response.headers['set-cookie'];
        if (cookies) {
            console.log('Cookies received:');

            const tokenCookie = cookies.find(c => c.startsWith('token='));
            if (tokenCookie) {
                console.log('✅ Token cookie present');
            } else {
                console.log('❌ Token cookie missing');
            }

            const refreshCookie = cookies.find(c => c.startsWith('refreshToken='));
            if (refreshCookie) {
                console.log('✅ RefreshToken cookie present');
            } else {
                console.log('❌ RefreshToken cookie missing');
            }

            if (tokenCookie && refreshCookie) {
                console.log('✅ All expected cookies present');
            }

        } else {
            console.log('❌ No cookies received (if forbidden, this is correct)');
        }

        if (response.status === 200) {
            if (role === 'influencer') {
                console.log('❌ FAILURE: Influencer should have been forbidden!');
            } else {
                console.log('✅ SUCCESS: Login successful as expected.');
            }
        } else if (response.status === 403) {
            if (role === 'influencer') {
                console.log('✅ SUCCESS: Influencer correctly forbidden.');
            } else {
                console.log('❌ FAILURE: Valid role was forbidden!', response.data);
            }
        } else {
            console.log(`⚠️ UNEXPECTED STATUS: ${response.status}`, response.data);
        }

    } catch (error) {
        console.error('Error during request:', error.message);
    }
}

async function runTests() {
    console.log('Starting Bulk Login Verification (with Refresh Token)...');

    await testLogin('brandOwner', users.brandOwner);
    await testLogin('admin', users.admin);
    await testLogin('influencer', users.influencer);

    console.log('\nVerification Complete.');
}

runTests();
