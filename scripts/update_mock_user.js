require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function updateMockUser() {
    let phone = '9876543210';
    console.log(`Searching for user with phone: ${phone}`);

    // Try finding user with raw phone
    let { data: user, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('id, name, role, phone')
        .eq('phone', phone)
        .maybeSingle();

    // If not found, try with country code
    if (!user) {
        const phoneWithCode = '+91' + phone;
        console.log(`Not found. Searching with country code: ${phoneWithCode}`);
        const { data: userWithCode, error: fetchErrorCode } = await supabaseAdmin
            .from('users')
            .select('id, name, role, phone')
            .eq('phone', phoneWithCode)
            .maybeSingle();

        if (userWithCode) {
            user = userWithCode;
            phone = phoneWithCode;
        }
    }

    // If still not found, create the user
    if (!user) {
        console.log('User not found. Creating new user...');
        // Create auth user first if possible, but here we are directly manipulating the public.users table? 
        // Usually Supabase auth manages users in auth.users and triggers create entries in public.users.
        // However, if we just want a mock user in `public.users` for testing endpoints that don't strictly check auth.users linkage (or if we can't write to auth.users easily via client), we might try inserting directly if constraints allow.
        // But typically we need an auth user. 
        // Let's assume we can just insert into public.users for now as "mock" or if the system allows.
        // Specifying a random UUID for ID.

        const newUserId = uuidv4();
        const newUser = {
            id: newUserId,
            phone: phone,
            role: 'influencer',
            name: 'Mock User',
            is_verified: false // Will be updated below
        };

        const { data: createdUser, error: createError } = await supabaseAdmin
            .from('users')
            .insert(newUser)
            .select()
            .single();

        if (createError) {
            console.error('Error creating user:', createError);
            // If it fails because of auth linkage, we might be stuck without creating an auth user.
            return;
        }
        user = createdUser;
        console.log(`Created new user: ${user.id}`);
    } else {
        console.log(`Found user: ${user.id} (${user.name})`);
    }

    const updateData = {
        date_of_birth: '1990-01-01',
        name: user.name || 'Mock User',
        gender: 'male',
        pan_number: 'ABCDE1234F',
        pan_verified: true,
        pan_verified_at: new Date().toISOString(),
        pan_holder_name: user.name || 'Mock User',
        // upi_id: 'mock@upi', // Exists in schema
        brand_name: 'Mock Brand',
        brand_description: 'Mock Brand Description',
        // bio: 'This is a mock user bio.', // Removed - not in schema
        // address_line1: '123 Mock Street', // Removed - not in schema
        // address_city: 'Mock City', // Removed - not in schema
        // address_state: 'Mock State', // Removed - not in schema
        // address_pincode: '123456', // Removed - not in schema
        verification_image_url: 'https://placehold.co/600x400',
        verification_status: 'verified',
        is_verified: true,
        // verified_at: new Date().toISOString(), // Removed - not in schema
        languages: ['english', 'hindi'],
        categories: ['lifestyle', 'tech'],
        // experience_years: 5, // Removed - not in schema
        // specializations: ['review', 'unboxing'], // Removed - not in schema
        min_range: 1000,
        max_range: 10000,
        locations: ['Delhi', 'Mumbai'] // Added as it exists in schema
    };

    console.log('Updating user with data:', updateData);

    const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();

    if (updateError) {
        console.error('Error updating user:', updateError);
        return;
    }

    console.log('User updated successfully!');

    // Check for social platforms
    const { data: platforms, error: platformError } = await supabaseAdmin
        .from('social_platforms')
        .select('*')
        .eq('user_id', user.id);

    if (platformError) {
        console.error('Error fetching platforms:', platformError);
    } else if (!platforms || platforms.length === 0) {
        console.log('No social platforms found. Adding a dummy one.');
        const { error: insertError } = await supabaseAdmin
            .from('social_platforms')
            .insert({
                user_id: user.id,
                platform_name: 'Instagram',
                platform: 'instagram',
                username: 'mock_insta',
                profile_link: 'https://instagram.com/mock_insta',
                followers_count: 10000,
                engagement_rate: 5.5,
                is_connected: true
            });

        if (insertError) {
            console.error('Error inserting social platform:', insertError);
        } else {
            console.log('Social platform added successfully.');
        }
    } else {
        console.log('Social platforms already exist.');
    }

    // Also check wallet and create if not exists
    const { data: wallet, error: walletError } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

    if (!wallet) {
        console.log('Creating wallet for user...');
        await supabaseAdmin.from('wallets').insert({ user_id: user.id, balance: 0, status: 'active' });
    }

}

updateMockUser();
