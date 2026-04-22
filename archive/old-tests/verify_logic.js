const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyTracking() {
    console.log('--- Step 1: Create Test Project ---');
    const projectCode = 'test_iso_' + Date.now();

    // Create a client first
    const { data: client } = await supabase.from('clients').insert([{ name: 'Test Client' }]).select().single();

    const { data: project, error: pError } = await supabase
        .from('projects')
        .insert([{
            client_id: client.id,
            project_name: 'Isolation Test',
            project_code: projectCode,
            base_url: 'https://survey.example.com/s?pid=VENDOR_PID_123&uid=[UID]&existing=true',
            client_pid_param: 'pid', // Collision point
            client_uid_param: 'uid',
            oi_prefix: 'oi_',
            status: 'active'
        }])
        .select()
        .single();

    if (pError) {
        console.error('Project creation failed:', pError);
        return;
    }
    console.log('Project created:', projectCode);

    console.log('\n--- Step 2: Simulate Tracking Request ---');
    const trackUrl = `http://127.0.0.1:3000/track?code=${projectCode}&uid=MOCK_USER_1&supplier=MOCK_SUPPLIER`;
    console.log('Requesting:', trackUrl);

    try {
        const response = await fetch(trackUrl, { redirect: 'manual' });
        const location = response.headers.get('location');
        console.log('Status:', response.status);
        console.log('Redirect Location:', location);

        if (location) {
            const url = new URL(location);
            const params = url.searchParams;

            console.log('\n--- Parameter Check ---');
            console.log('Original pid:', params.get('pid')); // Should be VENDOR_PID_123
            console.log('Original existing:', params.get('existing'));
            console.log('Internal oi_session:', params.get('oi_session'));
            console.log('Internal oi_uid:', params.get('oi_uid'));
            console.log('Internal oi_supplier:', params.get('oi_supplier'));

            const pidCount = location.split('pid=').length - 1;
            console.log('Count of "pid=" in URL:', pidCount);

            if (pidCount === 1 && params.get('pid') === 'VENDOR_PID_123' && params.has('oi_session')) {
                console.log('\n✅ SUCCESS: Parameter isolation working. No pid collision.');
            } else {
                console.log('\n❌ FAILURE: Parameter logic issue or collision detected.');
            }

            console.log('\n--- Step 3: Test Callback with oi_session ---');
            const session = params.get('oi_session');
            const callbackUrl = `http://127.0.0.1:3000/api/callback?oi_session=${session}&status=complete`;
            console.log('Requesting Callback:', callbackUrl);

            const cbResponse = await fetch(callbackUrl);
            const cbData = await cbResponse.json();
            console.log('Callback Response:', cbData);

            if (cbData.success) {
                console.log('✅ SUCCESS: Callback matched using oi_session.');

                // Final check: Is response record updated?
                const { data: resp } = await supabase.from('responses').select('status').eq('oi_session', session).single();
                console.log('Response status in DB:', resp?.status);
                if (resp?.status === 'complete') {
                    console.log('✅ SUCCESS: DB record updated to complete.');
                }
            }
        }
    } catch (err) {
        console.error('Fetch error:', err.message);
        console.log('Make sure dev server is running on port 3000');
    }
}

verifyTracking();
