const { createClient } = require('@insforge/sdk');
require('dotenv').config();

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const anonKey = process.env.INSFORGE_API_KEY || process.env.NEXT_PUBLIC_ANON_KEY;

const client = createClient({ baseUrl, anonKey });

async function runTest() {
    console.log('--- Starting Source-Aware Routing Test ---');

    const testProject = 'SOURCE_TEST_PROJ';
    const testSupplier = 'SOURCE_TEST_SUPPLIER';
    const directUid = 'DIRECT_USER_001';
    const supplierUid = 'SUPPLIER_USER_001';

    // 1. Setup Test Data
    console.log('1. Setting up test project and supplier...');
    await client.database.from('projects').upsert([{ 
        project_code: testProject, 
        project_name: 'Source Test Project',
        base_url: 'https://example.com/survey?uid={uid}',
        status: 'active',
        project_landing_page_url: 'https://pflow.com/thanks'
    }], { onConflict: 'project_code' });

    await client.database.from('suppliers').upsert([{
        supplier_token: testSupplier,
        name: 'Source Test Supplier',
        status: 'active',
        complete_redirect_url: 'https://vendor.com/complete?uid=[uid]'
    }], { onConflict: 'supplier_token' });
    
    const { data: projData, error: projErr } = await client.database.from('projects').select('id').eq('project_code', testProject).single();
    if (projErr) throw new Error(`Project fetch failed: ${projErr.message}`);
    const proj = projData;

    const { data: suppData, error: suppErr } = await client.database.from('suppliers').select('id').eq('supplier_token', testSupplier).single();
    if (suppErr) throw new Error(`Supplier fetch failed: ${suppErr.message}`);
    const supp = suppData;

    await client.database.from('supplier_project_links').upsert([{
        project_id: proj.id,
        supplier_id: supp.id,
        status: 'active',
        quota_allocated: 100
    }], { onConflict: 'supplier_id,project_id' });

    // 2. Test Direct Flow Entry
    console.log('2. Testing Direct Flow Entry...');
    // Simulated entry (mimicking TrackingService.processEntry)
    const { data: directResp } = await client.database.from('responses').insert([{
        project_code: testProject,
        project_id: proj.id,
        uid: directUid,
        source: 'direct',
        status: 'in_progress',
        created_at: new Date().toISOString()
    }]).select().single();
    
    console.log(`   Direct entry created with source: ${directResp.source}`);

    // 3. Test Supplier Flow Entry
    console.log('3. Testing Supplier Flow Entry...');
    const { data: supplierResp } = await client.database.from('responses').insert([{
        project_code: testProject,
        project_id: proj.id,
        uid: supplierUid,
        supplier_token: testSupplier,
        supplier_id: supp.id,
        source: 'supplier',
        status: 'in_progress',
        created_at: new Date().toISOString()
    }]).select().single();

    console.log(`   Supplier entry created with source: ${supplierResp.source}`);

    // 4. Verify DB State
    console.log('4. Verifying DB state...');
    const { data: stats } = await client.database.from('responses').select('source, count(*)').in('uid', [directUid, supplierUid]).group('source');
    console.log('   Response counts by source:', stats);

    console.log('--- Test Setup Complete ---');
    console.log('Use terminal or browser to verify redirects for:');
    console.log(`Direct: http://localhost:3001/complete?pid=${testProject}&uid=${directUid}`);
    console.log(`Supplier: http://localhost:3001/complete?pid=${testProject}&uid=${supplierUid}`);
}

runTest().catch(console.error);
