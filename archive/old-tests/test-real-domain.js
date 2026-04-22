const { createClient } = require('@supabase/supabase-js');

// Config
const DOMAIN = 'https://new12-main.vercel.app';
const SUPABASE_URL = 'https://qvgrzxuonxhwnxitnfvk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2Z3J6eHVvbnhod254aXRuZnZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM2OTM5NSwiZXhwIjoyMDkxOTQ1Mzk1fQ.VNceroffbWIkSlWFEP4oGQly7uRppyg78z9FGnghkJ8';
const PID = 'LIVE_TEST_PID';
const SUPPLIER = 'MACK001';
const UID = `TEST_${Date.now()}`;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runTest() {
    console.log(`\n🚀 STARTING REAL DOMAIN TEST: ${DOMAIN}`);
    console.log(`--------------------------------------------------`);

    // 1. Health Check
    console.log(`\n1. Checking API Health...`);
    try {
        const healthRes = await fetch(`${DOMAIN}/api/health`);
        const health = await healthRes.json();
        if (health.status === 'healthy') {
            console.log(`✅ Health Check Passed:`, health);
        } else {
            console.error(`❌ Health Check Failed:`, health);
            return;
        }
    } catch (e) {
        console.error(`❌ Health Check Error:`, e.message);
        return;
    }

    // 2. Simulate User Entry
    const entryUrl = `${DOMAIN}/r/${PID}/${SUPPLIER}/${UID}`;
    console.log(`\n2. Simulating User Entry...`);
    console.log(`   URL: ${entryUrl}`);

    let oiSession = '';
    try {
        const entryRes = await fetch(entryUrl, { redirect: 'manual' });
        const location = entryRes.headers.get('location');
        console.log(`   Status: ${entryRes.status}`);
        console.log(`   Redirected To: ${location}`);

        if (location && (entryRes.status === 302 || entryRes.status === 307)) {
            console.log(`✅ Entry Redirect Successful`);
            const urlObj = new URL(location);
            oiSession = urlObj.searchParams.get('oi_session');
            console.log(`   Captured Session (oi_session): ${oiSession}`);
        } else {
            console.error(`❌ Entry Failed. Output:`, await entryRes.text());
            return;
        }
    } catch (e) {
        console.error(`❌ Entry Error:`, e.message);
        return;
    }

    if (!oiSession) {
        console.error(`❌ Error: Session token (oi_session) not found in redirect URL.`);
        return;
    }

    // 3. Verify in Database (Supabase)
    console.log(`\n3. Verifying Entry in Supabase...`);
    try {
        // Wait a bit for DB consistency
        await new Promise(r => setTimeout(r, 2000));
        
        const { data: response, error } = await supabase
            .from('responses')
            .select('*, suppliers(*)')
            .eq('oi_session', oiSession)
            .single();

        if (error || !response) {
            console.error(`❌ Database Verification Failed:`, error?.message || 'Record not found');
            return;
        }

        console.log(`✅ Database Record Found:`);
        console.log(`   ID: ${response.id}`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Source: ${response.source}`);
        console.log(`   Supplier Token: ${response.supplier_token}`);
        console.log(`   Supplier ID: ${response.supplier_id}`);
        console.log(`   Joined Supplier:`, response.suppliers ? (Array.isArray(response.suppliers) ? 'ARRAY' : 'OBJECT') : 'MISSING');
        if (response.suppliers) {
            const s = Array.isArray(response.suppliers) ? response.suppliers[0] : response.suppliers;
            console.log(`   Supplier Object Found:`, s ? 'YES' : 'NO');
            if (s) {
                console.log(`   Redirect URLs:`, {
                    complete: s.complete_redirect_url,
                    terminate: s.terminate_redirect_url,
                    quota: s.quotafull_redirect_url
                });
            }
        }
    } catch (e) {
        console.error(`❌ DB Verification Error:`, e.message);
        return;
    }

    // 4. Simulate Completion Callback
    const callbackUrl = `${DOMAIN}/api/callback?pid=${PID}&cid=${oiSession}&type=complete`;
    console.log(`\n4. Simulating Completion Callback...`);
    console.log(`   URL: ${callbackUrl}`);

    try {
        const cbRes = await fetch(callbackUrl, { redirect: 'manual' });
        console.log(`   Status: ${cbRes.status}`);
        
        if (cbRes.status === 302 || cbRes.status === 307) {
            console.log(`✅ Callback Redirect Successful (Respondent sent to status page)`);
        } else {
            console.error(`❌ Callback Failed with status ${cbRes.status}`);
            return;
        }
    } catch (e) {
        console.error(`❌ Callback Error:`, e.message);
        return;
    }

    // 5. Final Verification in Database
    console.log(`\n5. Verifying Final Status in Supabase...`);
    try {
        // Wait a bit more for DB update and sync
        await new Promise(r => setTimeout(r, 3000));
        
        const { data: response, error } = await supabase
            .from('responses')
            .select('status')
            .eq('oi_session', oiSession)
            .single();

        if (error || !response) {
            console.error(`❌ Final Verification Failed:`, error?.message || 'Record not found');
            return;
        }

        console.log(`   Current Status: ${response.status}`);
        if (response.status === 'complete') {
            console.log(`\n🎉 ALL TESTS PASSED! Real domain is fully functional.`);
        } else {
            console.error(`❌ Final Status is NOT 'complete'. Found: ${response.status}`);
            console.log(`   Note: Large latency in Supabase sync might sometimes cause this to fail on first check.`);
        }
    } catch (e) {
        console.error(`❌ Final Verification Error:`, e.message);
        return;
    }

    console.log(`\n--------------------------------------------------`);
    console.log(`🚀 TEST COMPLETE`);
}

runTest();
