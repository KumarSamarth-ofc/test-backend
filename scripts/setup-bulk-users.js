const axios = require('axios');
const API_URL = 'http://localhost:3000/api';

async function createUser(name, email, phone, role) {
    try {
        // 1. Send Registration OTP
        console.log(`Creating user ${name} (${phone})...`);
        try {
            await axios.post(`${API_URL}/auth/send-registration-otp`, { phone, role });
        } catch (e) {
            // If it fails, maybe user exists. Proceed to try verify/login or check error.
            console.log(`Send OTP Result for ${phone}:`, e.response?.status);
        }

        // 2. Verify OTP (assuming mock OTP 123456)
        // Providing userData triggers creation/update
        const res = await axios.post(`${API_URL}/auth/verify-otp`, {
            phone,
            token: '123456',
            userData: {
                name,
                email,
                role,
                is_verified: true // forceful verification if allowed
            }
        });

        console.log(`SUCCESS: Created/Logged in ${role}: ${res.data.user.id}`);
        return res.data.token;

    } catch (error) {
        console.error(`Failed to create user ${phone}:`, error.response?.data || error.message);
    }
}

(async () => {
    await createUser('Brand Owner', 'brand@example.com', '+919999999990', 'brand_owner');
    await createUser('Influencer One', 'influencer1@example.com', '+919999999991', 'influencer');
    console.log('User setup complete');
})();
