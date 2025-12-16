const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:3000/api';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedData() {
    console.log('🌱 Seeding Bulk Dashboard Data...');

    // 1. Get Brand Owner ID (ensure user exists)
    const brandPhone = '+919876543210';
    let userId;

    // Login to get ID or just query DB
    const { data: user } = await supabase.from('users').select('id').eq('phone', brandPhone).single();
    if (user) {
        userId = user.id;
        console.log(`Found Brand Owner: ${userId}`);
    } else {
        console.log('Brand owner not found, please run basic setup first.');
        return;
    }

    // 2. Clear existing bulk data for clean state
    await supabase.from('bulk_submissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('bulk_campaigns').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('Cleared existing bulk data.');

    // 3. Create Bulk Campaigns
    const campaigns = [
        {
            title: 'Summer Launch Campaign',
            status: 'active',
            budget: 50000,
            created_by: userId,
            platform: 'instagram'
        },
        {
            title: 'Winter Collection Teaser',
            status: 'active',
            budget: 30000,
            created_by: userId,
            platform: 'youtube'
        },
        {
            title: 'Draft Campaign Event',
            status: 'draft',
            budget: 10000,
            created_by: userId,
            platform: 'instagram'
        }
    ];

    const { data: createdCampaigns, error: campError } = await supabase
        .from('bulk_campaigns')
        .insert(campaigns)
        .select();

    if (campError) {
        console.error('Error creating campaigns:', campError);
        return;
    }
    console.log(`Created ${createdCampaigns.length} campaigns.`);

    const activeCamp1 = createdCampaigns.find(c => c.title === 'Summer Launch Campaign');
    const activeCamp2 = createdCampaigns.find(c => c.title === 'Winter Collection Teaser');

    // 4. Create dummy influencers
    // We'll just create a few user IDs on the fly or fetch existing ones.
    // For simplicity, let's fetch any existing influencers or users who are not brand owner
    const { data: influencers } = await supabase.from('users').select('id').neq('id', userId).limit(5);

    if (!influencers || influencers.length < 3) {
        console.log('Not enough influencers found, create them manually if needed.');
    }

    // 5. Create Submissions
    const submissions = [];

    // Campaign 1: 2 Applied, 1 Work Submitted, 1 Completed
    if (influencers[0]) {
        submissions.push({
            bulk_campaign_id: activeCamp1.id,
            influencer_id: influencers[0].id,
            status: 'applied',
            proposed_amount: 5000
        });
    }
    if (influencers[1]) {
        submissions.push({
            bulk_campaign_id: activeCamp1.id,
            influencer_id: influencers[1].id,
            status: 'work_submitted',
            proposed_amount: 6000,
            final_agreed_amount: 5500
        });
    }
    if (influencers[2]) {
        submissions.push({
            bulk_campaign_id: activeCamp1.id,
            influencer_id: influencers[2].id,
            status: 'completed',
            proposed_amount: 4000,
            final_agreed_amount: 4000
        });
    }

    // Campaign 2: 1 Applied
    if (influencers[0]) { // reuse influencer 1 for another campaign
        submissions.push({
            bulk_campaign_id: activeCamp2.id,
            influencer_id: influencers[0].id,
            status: 'applied',
            proposed_amount: 3000
        });
    }

    const { error: subError } = await supabase.from('bulk_submissions').insert(submissions);
    if (subError) {
        console.error('Error creating submissions:', subError);
        return;
    }
    console.log(`Created ${submissions.length} submissions.`);

    console.log('✅ Seeding Complete.');
    console.log('Expected Stats:');
    console.log('Active Campaigns: 2');
    console.log('Total Creators (Active): 2 (Influencer 1 & 2 in active states is flawed logic in controller? Let\'s check definition)');
    console.log('Pending Submission Reviews: 1');
    console.log('Pending Application Reviews: 2 (Camp1: Inf0, Camp2: Inf0)');
    console.log('Financials: Committed: 80000, Spent: 4000');
}

seedData();
