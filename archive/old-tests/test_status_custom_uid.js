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

async function runTest(statusType, testPrefix) {
    console.log(`\n--- TESTING STATUS: ${statusType.toUpperCase()} ---`);
    try {
        const projectCode = `TEST_${testPrefix}_` + Math.floor(Math.random() * 1000);
        const supplierUid = `SUP_${testPrefix}_` + Math.floor(Math.random() * 10000);
        const targetUid = `TARGET_CUSTOM_${testPrefix}_` + Math.floor(Math.random() * 10000);
        const clientId = 'dedb571a-c2a3-47aa-a389-f807d80635dd';

        // 1. Create Project with target_uid (Custom UID override)
        console.log(`1. Creating project: ${projectCode} with Target UID: ${targetUid}`);
        const { data: project, error: pError } = await supabase.from('projects').insert([{
            client_id: clientId,
            project_code: projectCode,
            project_name: `Verification Test ${statusType}`,
            base_url: 'https://client-survey.com/s?pid=[PID]&uid=[UID]',
            client_pid_param: 'pid',
            client_uid_param: 'uid',
            target_uid: targetUid, // USING CUSTOM TARGET UID
            status: 'active'
        }]).select().single();

        if (pError) throw pError;

        // 2. Trigger Track
        console.log(`2. Triggering track for ${projectCode} with supplier UID: ${supplierUid}`);
        const trackUrl = `http://127.0.0.1:3000/track?code=${projectCode}&uid=${supplierUid}`;

        const redirectData = await new Promise((resolve, reject) => {
            http.get(trackUrl, (res) => {
                resolve({
                    status: res.statusCode,
                    location: res.headers.location
                });
            }).on('error', reject);
        });

        const redirectUrl = new URL(redirectData.location);
        const outgoingUid = redirectUrl.searchParams.get('uid');
        console.log(`3. Redirect to Client with UID: ${outgoingUid}`);

        if (outgoingUid !== targetUid) {
            console.log(`Warning: outgoingUid (${outgoingUid}) != targetUid (${targetUid})`);
        }

        // 3. User finishes survey on client side. Client redirects back to our /status route or S2S callback.
        // We will simulate the Client pinging our /status route USING ONLY THE TARGET UID (without oi_session).
        console.log(`4. Simulating Client Callback using ONLY custom UID: ${outgoingUid}`);
        const cbUrl = `http://127.0.0.1:3000/status?uid=${outgoingUid}&pid=${projectCode}&type=${statusType}`;
        const cbData = await new Promise((resolve, reject) => {
            http.get(cbUrl, (res) => {
                resolve({
                    status: res.statusCode,
                    location: res.headers.location
                });
            }).on('error', reject);
        });

        console.log('   Callback Redirect Location:', cbData.location);

        // 4. Verify Final DB Record
        console.log('5. Verifying final record in DB...');
        const { data: finalResp, error: fetchErr } = await supabase
            .from('responses')
            .select('status, supplier_uid, client_uid_sent')
            .eq('client_uid_sent', outgoingUid)
            .single();

        if (fetchErr) {
            console.log('   Error fetching record:', fetchErr.message);
        } else if (finalResp) {
            console.log('   Final Status:', finalResp.status);
            console.log('   Supplier UID:', finalResp.supplier_uid);
            console.log('   Client UID Sent:', finalResp.client_uid_sent);

            const expectedMap = {
                'complete': 'complete',
                'terminate': 'terminated',
                'quota': 'quota_full'
            };

            const expectedStatus = expectedMap[statusType];

            if (finalResp.status === expectedStatus) {
                console.log(`✅ TEST ${statusType.toUpperCase()} SUCCESS! Custom UID was correctly mapped back.`);
            } else {
                console.log(`❌ TEST FAILURE: Expected ${expectedStatus}, got ${finalResp.status}`);
            }
        }

    } catch (err) {
        console.error(`\n❌ ERROR IN ${statusType}:`, err.message);
    }
}

async function runAll() {
    await runTest('complete', 'CMP');
    await runTest('terminate', 'TRM');
    await runTest('quota', 'QTA');
    process.exit(0);
}

runAll();
