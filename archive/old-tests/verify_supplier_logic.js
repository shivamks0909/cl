const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(url, key);

async function verifyFlow() {
    console.log('--- Phase 1: Adding Mack Insights Supplier ---');
    const supplier = {
        name: 'Mack Insights',
        supplier_token: 'MACK-INSIGHTS',
        contact_email: 'support@mackinsights.com',
        complete_redirect_url: 'https://dashboard.mackinsights.com/redirect/complete?pid={{pid}}&uid={{uid}}',
        terminate_redirect_url: 'https://dashboard.mackinsights.com/redirect/terminate?pid={{pid}}&uid={{uid}}',
        quotafull_redirect_url: 'https://dashboard.mackinsights.com/redirect/quotafull?pid={{pid}}&uid={{uid}}',
        status: 'active'
    };

    const { data: sData, error: sError } = await supabase
        .from('suppliers')
        .upsert([supplier], { onConflict: 'supplier_token' })
        .select();

    if (sError) {
        console.error('Error adding supplier:', sError);
        return;
    }
    console.log('Supplier Mack Insights is active.');

    console.log('\n--- Phase 2: Verifying Data Retrieval Logic ---');
    // We simulate what getLandingPageData would do
    // 1. Create a dummy response for this supplier
    const { data: project } = await supabase.from('projects').select('id, project_code').limit(1).single();
    if (!project) {
        console.error('No project found to test with.');
        return;
    }

    const testUid = 'TEST-USER-' + Date.now();
    const testSession = 'SESSION-' + Date.now();

    const { error: iError } = await supabase.from('responses').insert({
        project_id: project.id,
        project_code: project.project_code,
        uid: testUid,
        oi_session: testSession,
        supplier_token: 'MACK-INSIGHTS',
        status: 'in_progress'
    });

    if (iError) {
        console.error('Error inserting test response:', iError);
        return;
    }
    console.log(`Created test response for PID: ${project.project_code}, UID: ${testUid}`);

    // 3. Simulate getLandingPageData lookup
    const { data: finalData, error: fError } = await supabase
        .from('responses')
        .select('*, suppliers(*)')
        .eq('oi_session', testSession)
        .single();

    if (fError || !finalData) {
        console.error('Logic Test Failed: Could not retrieve response with supplier data:', fError);
    } else if (finalData.suppliers?.name === 'Mack Insights') {
        console.log('Logic Test Passed: Successfully retrieved supplier info via foreign key JOIN.');
        console.log('Complete Redirect Template:', finalData.suppliers.complete_redirect_url);

        const finalRedirect = finalData.suppliers.complete_redirect_url
            .replace('{{pid}}', finalData.project_code)
            .replace('{{uid}}', finalData.uid);

        console.log('Generated Final Redirect URL:', finalRedirect);
        if (finalRedirect.includes(finalData.project_code) && finalRedirect.includes(finalData.uid)) {
            console.log('Placeholder Replacement: SUCCESS');
        } else {
            console.error('Placeholder Replacement: FAILED');
        }
    } else {
        console.error('Logic Test Failed: Supplier data missing or incorrect in join.', finalData.suppliers);
    }

    // Cleanup
    await supabase.from('responses').delete().eq('oi_session', testSession);
}

verifyFlow();
