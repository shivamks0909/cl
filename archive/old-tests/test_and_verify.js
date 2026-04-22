const { createClient } = require('@supabase/supabase-js');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 1. Load Env
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length > 0) env[key.trim()] = rest.join('=').trim();
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function runTest() {
    console.log('--- STARTING COMPREHENSIVE E2E TEST ---');
    try {
        const projectCode = 'TEST_T1_' + Math.floor(Math.random() * 1000);
        const supplierUid = 'SUP_UID_' + Math.floor(Math.random() * 10000);
        const clientId = 'dedb571a-c2a3-47aa-a389-f807d80635dd';

        // 1. Create Project
        console.log(`1. Creating project: ${projectCode}`);
        const { data: project, error: pError } = await supabase.from('projects').insert([{
            client_id: clientId,
            project_code: projectCode,
            project_name: 'Verification Test',
            base_url: 'https://client-survey.com/s?pid=[PID]&uid=[UID]',
            client_pid_param: 'pid',
            client_uid_param: 'uid',
            pid_prefix: 'TVER',
            pid_counter: 100,
            pid_padding: 3,
            force_pid_as_uid: true,
            status: 'active'
        }]).select().single();

        if (pError) throw pError;

        // 2. Trigger Track
        console.log(`2. Triggering track for ${projectCode} with supplier UID: ${supplierUid}`);
        const trackUrl = `http://127.0.0.1:3000/track?code=${projectCode}&uid=${supplierUid}&supplier=TEST_SUPPLIER`;

        const redirectData = await new Promise((resolve, reject) => {
            http.get(trackUrl, (res) => {
                resolve({
                    status: res.statusCode,
                    location: res.headers.location
                });
            }).on('error', reject);
        });

        console.log('3. Redirect Location:', redirectData.location);
        const redirectUrl = new URL(redirectData.location);
        const clientUidSent = redirectUrl.searchParams.get('uid');
        const oi_session = redirectUrl.searchParams.get('oi_session');

        console.log(`   Client UID Sent: ${clientUidSent}`);
        console.log(`   Session Token: ${oi_session}`);

        // 3. Check Initial DB Record
        console.log('4. Checking database for initial record...');
        const { data: initialResp, error: rError } = await supabase
            .from('responses')
            .select('supplier_uid, client_uid_sent, status, start_time, hash_identifier')
            .eq('oi_session', oi_session)
            .single();

        if (rError) throw rError;
        console.log('   DB Record Found:', JSON.stringify(initialResp));

        if (initialResp.supplier_uid !== supplierUid) throw new Error('supplier_uid mismatch');
        if (initialResp.client_uid_sent !== clientUidSent) throw new Error('client_uid_sent mismatch');
        if (!initialResp.start_time) throw new Error('start_time missing');
        if (!initialResp.hash_identifier) throw new Error('hash_identifier missing');
        console.log('   Hash Identifier:', initialResp.hash_identifier);

        // 4. Simulate Completion Callback
        console.log('5. Waiting 2 seconds for LOI simulation...');
        await new Promise(r => setTimeout(r, 2000));

        console.log('6. Triggering completion callback...');
        const callbackUrl = `http://127.0.0.1:3000/api/callback?oi_session=${oi_session}&status=complete`;

        const cbBody = await new Promise((resolve) => {
            http.get(callbackUrl, (res) => {
                let d = '';
                res.on('data', c => d += c);
                res.on('end', () => resolve(d));
            });
        });
        console.log('   Callback Response:', cbBody);

        // 5. Verify Final DB Record (status, loi_seconds)
        console.log('7. Verifying final record in DB...');
        const { data: finalResp } = await supabase
            .from('responses')
            .select('status, loi_seconds, start_time, end_time')
            .eq('oi_session', oi_session)
            .single();

        console.log('   Final Status:', finalResp.status);
        console.log('   LOI (seconds):', finalResp.loi_seconds);
        console.log('   End Time:', finalResp.end_time);

        if (finalResp.status === 'complete' && finalResp.loi_seconds >= 2) {
            console.log('\n✅ TEST SUCCESS: End-to-end flow verified!');
        } else {
            console.log('\n❌ TEST FAILURE: Data integrity issue or LOI < 2s.');
            process.exit(1);
        }

    } catch (err) {
        console.error('\n❌ CRITICAL ERROR:', err.message);
        process.exit(1);
    }
}

runTest();
