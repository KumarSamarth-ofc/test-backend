const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.log('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('Inspecting bulk_campaigns table...');
    const { data, error } = await supabase
        .from('bulk_campaigns')
        .select('*')
        .limit(1);

    if (error) {
        console.log('Error accessing bulk_campaigns:', error.message);
    } else {
        console.log('bulk_campaigns table exists. Rows:', data.length);
        if (data.length > 0) console.log('Columns:', Object.keys(data[0]));
    }
}

inspect();
