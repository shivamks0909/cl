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

async function verify() {
    console.log('--- Deep Database Verification ---');

    // Use a query to check information_schema
    const { data: cols, error: cError } = await supabase
        .from('projects')
        .select('id')
        .limit(1);

    if (cError) {
        console.error('Error querying projects:', cError);
    } else {
        console.log('Projects query: OK');
    }

    // Check RPC specifically
    console.log('\nTesting RPC call...');
    const { data, error } = await supabase.rpc('fn_generate_next_client_pid', { target_project_id: '00000000-0000-0000-0000-000000000000' });

    if (error) {
        if (error.message.includes('Project not found')) {
            console.log('✅ RPC Function fn_generate_next_client_pid: EXISTS & WORKING');
        } else {
            console.log('❌ RPC Function Error:', error.message);
        }
    } else {
        console.log('RPC result (unexpected for dummy ID):', data);
    }

    // Check responses table via a simple insert attempt (rollback would be better but we'll just check columns)
    const { data: respCols, error: rError } = await supabase.from('responses').select('client_pid').limit(1);
    if (rError) {
        if (rError.code === '42703') { // undefined_column
            console.log('❌ Column client_pid: MISSING');
        } else {
            console.log('Response select error:', rError.message);
        }
    } else {
        console.log('✅ Column client_pid: PRESENT');
    }
}

verify();
