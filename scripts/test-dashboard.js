const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const API_URL = 'http://localhost:3000/api';

// Use same setup as bulk test
async function testDashboard() {
    console.log('Testing Dashboard Stats...');

    try {
        // 1. Send OTP
        const brandPhone = '+919876543210';
        console.log(`Sending OTP to ${brandPhone}...`);
        await axios.post(`${API_URL}/auth/send-registration-otp`, {
            phone: brandPhone,
            role: 'brand_owner',
            name: 'Brand Owner'
        });

        // 2. Verify OTP to get token
        console.log('Verifying OTP...');
        const verifyRes = await axios.post(`${API_URL}/auth/verify-otp`, {
            phone: brandPhone,
            token: '123456',
            role: 'brand_owner'
        });

        const token = verifyRes.data.token;
        console.log('Got auth token');

        // 3. Get Stats
        console.log('Fetching dashboard stats...');
        const statsRes = await axios.get(`${API_URL}/dashboard/stats`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Dashboard Stats Response:', JSON.stringify(statsRes.data, null, 2));

        if (statsRes.data.success && statsRes.data.data.kpis) {
            console.log('✅ Dashboard Stats Verified');
        } else {
            console.log('❌ InvalidStats Response');
        }

    } catch (error) {
        console.error('Test Failed:', error.response ? error.response.data : error.message);
    }
}

testDashboard();
