const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

// Helpers
async function login(phone, role) {
    try {
        // 1. Send OTP (optional if mock)
        try { await axios.post(`${API_URL}/auth/send-otp`, { phone }); } catch (e) { }

        // 2. Verify OTP
        const res = await axios.post(`${API_URL}/auth/verify-otp`, {
            phone,
            token: '123456',
            userData: { role } // ensure role if needed
        });
        return res.data.token;
    } catch (error) {
        console.error(`Login failed for ${phone}:`, error.response?.data?.message || error.message);
        throw error;
    }
}

async function ensureSubscription(token) {
    try {
        // 1. Get plans
        const plansRes = await axios.get(`${API_URL}/subscriptions/plans`);
        const plans = plansRes.data.plans;
        if (!plans || plans.length === 0) throw new Error('No plans found');
        const planId = plans[0].id; // Use first plan

        // 2. Create test subscription
        try {
            await axios.post(`${API_URL}/subscriptions/test-create`, {
                plan_id: planId
            }, { headers: { Authorization: `Bearer ${token}` } });
            console.log('Test subscription created (or already active)');
        } catch (e) {
            // Ignore if already active or other minor issues, log warning
            console.log('Subscription creation note:', e.response?.data?.message || e.message);
        }
    } catch (error) {
        console.error('Ensure subscription failed:', error.message);
        throw error;
    }
}

async function createCampaign(token) {
    try {
        const res = await axios.post(`${API_URL}/campaigns`, {
            title: `Bulk Test Campaign ${Date.now()}`,
            description: 'Testing bulk hire features',
            budget: 5000,
            campaign_type: 'service',
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 86400000).toISOString(),
            requirements: 'Test requirements',
            deliverables: ['Reel', 'Story'],
            platform: 'instagram'
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log('Campaign created:', res.data.campaign.id);
        return res.data.campaign.id;
    } catch (error) {
        console.error('Create campaign failed:', error.response?.data || error.message);
        throw error;
    }
}

async function applyToCampaign(token, campaignId) {
    try {
        const res = await axios.post(`${API_URL}/requests`, {
            campaign_id: campaignId,
            proposed_amount: 1000,
            message: 'I am interested!'
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log('Applied to campaign:', res.data.request.id);
        return res.data.request.id;
    } catch (error) {
        console.error('Apply failed:', error.response?.data || error.message);
        throw error;
    }
}

async function bulkApprove(token, requestIds, message) {
    try {
        const res = await axios.post(`${API_URL}/requests/bulk-action`, {
            request_ids: requestIds,
            action: 'approve',
            message: message
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log('Bulk approve result:', res.data);
        return res.data;
    } catch (error) {
        console.error('Bulk approve failed:', error.response?.data || error.message);
        throw error;
    }
}

async function checkMessages(token, conversationId) {
    try {
        const res = await axios.get(`${API_URL}/messages/conversations/${conversationId}/messages`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`Messages for conv ${conversationId}:`, res.data.messages.length);
        if (res.data.messages.length > 0) {
            console.log('Last message:', res.data.messages[res.data.messages.length - 1].message);
        }
    } catch (error) {
        console.error('Check messages failed:', error.response?.data || error.message);
    }
}

async function tryReply(token, conversationId) {
    try {
        await axios.post(`${API_URL}/messages`, {
            conversation_id: conversationId,
            message: 'Trying to reply in read-only mode'
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.error('❌ Influencer reply SUCCEEDED (Should have failed)');
    } catch (error) {
        if (error.response?.status === 403) {
            console.log('✅ Influencer reply BLOCKED (Expected)');
        } else {
            console.error('Influencer reply failed with unexpected error:', error.response?.data || error.message);
        }
    }
}


(async () => {
    try {
        // 1. Setup tokens (Use mock credentials that work out of the box in utils/auth.js)
        const brandToken = await login('+919876543211', 'brand_owner');
        const inf1Token = await login('+919876543212', 'influencer');

        // 2. Create Campaign
        await ensureSubscription(brandToken);
        const campaignId = await createCampaign(brandToken);

        // 3. Apply
        const req1 = await applyToCampaign(inf1Token, campaignId);

        // 4. Bulk Approve
        const approval = await bulkApprove(brandToken, [req1], "Welcome to the campaign!");

        // 5. Verify Conversation & Read-only
        const convId = approval.processed_conversations[0];

        // Check messages
        await checkMessages(inf1Token, convId);

        // Try to reply
        await tryReply(inf1Token, convId);

        console.log('Test completed');

    } catch (error) {
        console.error('Test failed');
    }
})();
