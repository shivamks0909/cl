const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupTestData() {
    console.log('--- Setting up test data ---');

    // 1. Create a client
    const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert([{ name: 'Test Client' }])
        .select()
        .single();

    if (clientError) {
        console.error('Error creating client:', clientError);
        return;
    }
    console.log('Client created:', client.id);

    // 2. Create a project with a base URL that has a colliding 'pid'
    const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert([{
            client_id: client.id,
            project_name: 'Test Isolation Project',
            project_code: 'iso_test',
            base_url: 'https://survey-vendor.com/s?pid=VENDOR_PROJ_123&cid=[UID]',
            client_pid_param: 'pid', // The param name we want to protect
            client_uid_param: 'cid', // The param name we want to use for UID
            oi_prefix: 'oi_',
            status: 'active'
        }])
        .select()
        .single();

    if (projectError) {
        console.error('Error creating project:', projectError);
        return;
    }
    console.log('Project created:', project.project_code);
    console.log('--- Setup complete ---');
}

setupTestData();
