const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length > 0) {
        env[key.trim()] = value.join('=').trim();
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    console.log('--- Full Tool Verification ---');

    // 1. Get or Create a Test Client
    let { data: client } = await supabase.from('clients').select('id').eq('name', 'Verification Client').single();
    if (!client) {
        const { data: newClient } = await supabase.from('clients').insert([{ name: 'Verification Client' }]).select().single();
        client = newClient;
    }
    console.log('Client:', client.id);

    // 2. Create a Test Project with PID Tool
    const projectCode = 'VERIFY_' + Math.floor(Math.random() * 10000);
    const { data: project, error: pError } = await supabase.from('projects').insert([{
        client_id: client.id,
        project_name: 'Verification Project',
        project_code: projectCode,
        pid_prefix: 'TEST',
        pid_counter: 100,
        pid_padding: 3,
        base_url: 'https://verification.com/survey?pid=[PID]&uid=[UID]',
        status: 'active'
    }]).select().single();

    if (pError) {
        console.error('Project creation failed:', pError);
        return;
    }
    console.log('Project Created:', project.project_code, '(ID:', project.id, ')');

    // 3. Simulate Hits to /track
    // NOTE: We need the server to be running. Assuming it's on localhost:3000
    const trackUrl = `${env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/track?pid=${project.project_code}`;

    console.log('\nSimulating 3 hits...');
    for (let i = 1; i <= 3; i++) {
        const uid = `tester_${i}`;
        console.log(`Hit ${i}: uid=${uid}`);
        try {
            const resp = await fetch(`${trackUrl}&uid=${uid}`, { redirect: 'manual' });
            const location = resp.headers.get('location');
            console.log(`  Redirect to: ${location}`);
        } catch (e) {
            console.error(`  Hit ${i} failed:`, e.message);
        }
    }

    // 4. Verify Responses Table
    console.log('\nVerifying Responses Table...');
    const { data: responses, error: rError } = await supabase
        .from('responses')
        .select('client_pid, supplier_token')
        .eq('project_id', project.id)
        .order('created_at', { ascending: true });

    if (rError) {
        console.error('Error fetching responses:', rError);
    } else {
        console.log(`Found ${responses.length} response records.`);
        responses.forEach((r, idx) => {
            console.log(`  Hit ${idx + 1}: client_pid=${r.client_pid}, uid=${r.supplier_token}`);
        });

        const expected = ['TEST100', 'TEST101', 'TEST102'];
        const pids = responses.map(r => r.client_pid);
        const success = expected.every((p, i) => pids[i] === p);

        if (success) {
            console.log('\n✅ VERIFICATION SUCCESSFUL: Unique incrementing PIDs generated and tracked.');
        } else {
            console.log('\n❌ VERIFICATION FAILED: PIDs do not match expectation.');
        }
    }
}

test();
