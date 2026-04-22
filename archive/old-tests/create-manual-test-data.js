#!/usr/bin/env node

/**
 * Creates test data for manual verification of source-aware redirects
 * Creates: TEST_SRC_978510 project + supp_test_src_1776390978514 supplier
 */

require('dotenv').config({ path: '.env.local.removed' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local.removed');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestData() {
  try {
    console.log('🔧 Creating test data for source-aware redirect verification...\n');

    // 1. Create the test project
    console.log('1. Creating project TEST_SRC_978510...');
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .upsert([{
        id: '00000000-0000-0000-0000-000000000200', // Fixed ID for consistency
        project_code: 'TEST_SRC_978510',
        project_name: 'Source Awareness Test Project',
        base_url: 'https://survey.example.com/complete?uid=[UID]',
        status: 'active',
        pid_prefix: 'TEST_PID_',
        pid_padding: 3,
        pid_counter: 0,
        created_at: new Date().toISOString()
      }], { onConflict: 'project_code' })
      .select()
      .single();

    if (projErr) throw projErr;
    console.log(`   ✅ Project created/found: ID=${project.id}, code=${project.project_code}\n`);

    // 2. Create the test supplier with redirect URLs
    console.log('2. Creating supplier supp_test_src_1776390978514...');
    const { data: supplier, error: suppErr } = await supabase
      .from('suppliers')
      .upsert([{
        id: '00000000-0000-0000-0000-000000000201',
        supplier_token: 'supp_test_src_1776390978514',
        name: 'Test Supplier for Source Routing',
        status: 'active',
        complete_redirect_url: 'https://dashboard.example.com/complete?pid={pid}&uid={uid}',
        terminate_redirect_url: 'https://dashboard.example.com/terminate?pid={pid}&uid={uid}',
        quotafull_redirect_url: 'https://dashboard.example.com/quotafull?pid={pid}&uid={uid}',
        landing_page_url: 'https://dashboard.example.com/landing',
        uid_param_name: 'uid',
        pid_param_name: 'pid',
        respondent_id_aliases: ['uid', 'id', 'rid', 'respondent_id'],
        created_at: new Date().toISOString()
      }], { onConflict: 'supplier_token' })
      .select()
      .single();

    if (suppErr) throw suppErr;
    console.log(`   ✅ Supplier created/found: ID=${supplier.id}, token=${supplier.supplier_token}\n`);

    // 3. Create supplier-project link
    console.log('3. Linking supplier to project...');
    const linkId = '00000000-0000-0000-0000-000000000202';
    const { error: linkErr } = await supabase
      .from('supplier_project_links')
      .upsert([{
        id: linkId,
        supplier_id: supplier.id,
        project_id: project.id,
        status: 'active',
        quota_allocated: -1, // unlimited
        quota_used: 0,
        created_at: new Date().toISOString()
      }], { onConflict: 'supplier_id,project_id' });

    if (linkErr) throw linkErr;
    console.log(`   ✅ Supplier-project link created (quota: unlimited)\n`);

    // 4. Verify data
    console.log('4. Verifying setup...');
    const { data: checkProject } = await supabase
      .from('projects')
      .select('project_code, status')
      .eq('project_code', 'TEST_SRC_978510')
      .single();

    const { data: checkSupplier } = await supabase
      .from('suppliers')
      .select('supplier_token, status, complete_redirect_url')
      .eq('supplier_token', 'supp_test_src_1776390978514')
      .single();

    const { data: checkLink } = await supabase
      .from('supplier_project_links')
      .select('status, quota_allocated, quota_used')
      .eq('supplier_id', supplier.id)
      .eq('project_id', project.id)
      .maybeSingle();

    console.log('   Project:', checkProject);
    console.log('   Supplier:', { token: checkSupplier.supplier_token, redirect: checkSupplier.complete_redirect_url });
    console.log('   Link:', checkLink);
    console.log('\n✅ Test data setup complete!\n');

    console.log('📝 Test URLs to use:');
    console.log(`   Direct: http://localhost:3000/start/TEST_SRC_978510?uid=TEST_USER_001`);
    console.log(`   Supplier: http://localhost:3000/start/TEST_SRC_978510?supplier=supp_test_src_1776390978514&uid=TEST_USER_002`);
    console.log('\n🧪 Manual verification steps:');
    console.log('1. Open direct link in browser, complete survey, check final redirect to /complete');
    console.log('2. Open supplier link in browser, complete survey, check redirect to https://dashboard.example.com/...');
    console.log('3. Verify database: responses.source = "direct" or "supplier"\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    if (error.code) console.error('   Code:', error.code);
    process.exit(1);
  }
}

createTestData();
