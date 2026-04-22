const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(url, key);

async function addMackInsights() {
    const supplier = {
        name: 'Mack Insights',
        supplier_token: 'MACK-INSIGHTS',
        contact_email: 'support@mackinsights.com',
        complete_redirect_url: 'https://dashboard.mackinsights.com/redirect/complete?pid={{pid}}&uid={{uid}}',
        terminate_redirect_url: 'https://dashboard.mackinsights.com/redirect/terminate?pid={{pid}}&uid={{uid}}',
        quotafull_redirect_url: 'https://dashboard.mackinsights.com/redirect/quotafull?pid={{pid}}&uid={{uid}}',
        status: 'active'
    };

    const { data, error } = await supabase
        .from('suppliers')
        .upsert([supplier], { onConflict: 'supplier_token' })
        .select();

    if (error) {
        console.error('Error adding Mack Insights:', error);
    } else {
        console.log('Successfully added/updated Mack Insights supplier:', data);
    }
}

addMackInsights();
