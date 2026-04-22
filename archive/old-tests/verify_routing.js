const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load env
const envFile = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

const baseUrl = 'http://localhost:3000';

async function testRouting() {
    console.log("--- SETUP ---");
    // Ensure Client
    const { data: client } = await supabase.from('clients').upsert({ id: 'f8d16719-7988-46c5-8f6a-000000000001', name: 'TestClient' }).select().single();

    // Ensure Project OPI563
    const { data: project } = await supabase.from('projects').upsert({
        id: 'f8d16719-7988-46c5-8f6a-000000000002',
        client_id: client.id,
        project_name: 'Test Project OPI563',
        project_code: 'OPI563',
        country: 'US',
        base_url: 'https://client-survey.com/start',
        has_prescreener: false,
        is_multi_country: false,
        status: 'active'
    }).select().single();

    // Ensure Supplier MACK
    const { data: supplier } = await supabase.from('suppliers').upsert({
        supplier_token: 'MACK',
        name: 'MackInsights',
        platform_type: 'custom',
        complete_redirect_url: 'https://mackinsights.com/status?type=complete',
        terminate_redirect_url: 'https://mackinsights.com/status?type=terminate',
        quotafull_redirect_url: 'https://mackinsights.com/status?type=quotafull',
        status: 'active'
    }, { onConflict: 'supplier_token' }).select().single();

    console.log("Setup complete. MACK supplier and OPI563 project exist.\n");

    // ─────────────────────────────────────────────────────────────
    console.log("TEST 1: Entry routing (/r/OPI563/MACK/TESTUID001)");
    const t1Url = `${baseUrl}/r/OPI563/MACK/TESTUID001`;
    const t1Res = await fetch(t1Url, { redirect: 'manual' });
    console.log(`Status: ${t1Res.status}`);
    console.log(`Redirects to: ${t1Res.headers.get('location')}`);

    // Check DB for record
    const { data: dbRows1 } = await supabase.from('responses').select('uid, supplier_token, supplier_name, status, last_landing_page').eq('uid', 'TESTUID001').order('created_at', { ascending: false }).limit(1);
    console.log("DB Record for TESTUID001:", dbRows1[0]);
    console.log("");

    // ─────────────────────────────────────────────────────────────
    console.log("TEST 2: Completion redirect (/status?code=OPI563&uid=TESTUID001&type=complete)");
    const t2Url = `${baseUrl}/status?code=OPI563&uid=TESTUID001&type=complete`;
    const t2Res = await fetch(t2Url, { redirect: 'manual' });
    console.log(`Status: ${t2Res.status}`);
    console.log(`Redirects to: ${t2Res.headers.get('location')}`);

    // Check DB for record
    const { data: dbRows2 } = await supabase.from('responses').select('uid, status').eq('uid', 'TESTUID001').order('created_at', { ascending: false }).limit(1);
    console.log("DB Record for TESTUID001 after status:", dbRows2[0]);
    console.log("");

    // ─────────────────────────────────────────────────────────────
    console.log("TEST 3: Terminate redirect (TESTUID002)");
    const t3Entry = `${baseUrl}/r/OPI563/MACK/TESTUID002`;
    await fetch(t3Entry, { redirect: 'manual' });

    const t3Url = `${baseUrl}/status?code=OPI563&uid=TESTUID002&type=terminate`;
    const t3Res = await fetch(t3Url, { redirect: 'manual' });
    console.log(`Status: ${t3Res.status}`);
    console.log(`Redirects to: ${t3Res.headers.get('location')}`);
    console.log("");

    // ─────────────────────────────────────────────────────────────
    console.log("TEST 4: Direct traffic (DIRECTUID001)");
    const t4Entry = `${baseUrl}/r/OPI563/DIRECTUID001`;
    await fetch(t4Entry, { redirect: 'manual' });

    const t4Url = `${baseUrl}/status?code=OPI563&uid=DIRECTUID001&type=complete`;
    const t4Res = await fetch(t4Url, { redirect: 'manual' });
    console.log(`Status: ${t4Res.status}`);
    console.log(`Redirects to: ${t4Res.headers.get('location')}`);
    console.log("");

    // ─────────────────────────────────────────────────────────────
    console.log("TEST 5: Admin Responses Simulation");
    console.log("Fetching latest 3 records from DB to check supplier mapping...");
    const { data: adminRows } = await supabase.from('responses').select('uid, supplier_name').in('uid', ['TESTUID001', 'TESTUID002', 'DIRECTUID001']).order('created_at', { ascending: false }).limit(3);
    adminRows.forEach(row => {
        console.log(`- UID: ${row.uid} | Supplier: ${row.supplier_name || '—'}`);
    });
}

testRouting().catch(console.error);
