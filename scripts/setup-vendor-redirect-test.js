require('dotenv').config({ path: ['.env.local', '.env'] });
const { createClient } = require('@supabase/supabase-js');

async function setupTestData() {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_ANON_KEY;

  if (!baseUrl || !apiKey) {
    console.error('Missing Supabase configuration.');
    process.exit(1);
  }

  const supabase = createClient(baseUrl, apiKey);

  try {
    console.log('=== VENDOR REDIRECT TEST SETUP ===\n');

    // 1. Create test project
    const projectCode = 'GOOGLE_TEST';
    console.log(`1. Creating/verifying project: ${projectCode}`);

    const { data: existingProject, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('project_code', projectCode)
      .single();

    let project;
    if (existingProject) {
      console.log(`   Project already exists (ID: ${existingProject.id})`);
      console.log(`   Updating to ensure correct configuration...`);
      const { data: updated, error: updateError } = await supabase
        .from('projects')
        .update({
          project_name: 'Google Vendor Test',
          base_url: 'https://www.google.com',
          project_landing_page_url: 'https://www.google.com',
          status: 'active',
          country: 'Global',
          is_multi_country: false,
          has_prescreener: false,
          prescreener_url: '',
          pid_prefix: '',
          pid_counter: 1,
          pid_padding: 2,
          force_pid_as_uid: false,
          target_uid: '',
          client_pid_param: '',
          client_uid_param: '',
          oi_prefix: 'oi_',
          uid_params: null
        })
        .eq('project_code', projectCode)
        .select()
        .single();
      if (updateError) throw updateError;
      project = updated;
    } else {
      const { data: newProject, error: insertError } = await supabase
        .from('projects')
        .insert([{
          project_code: projectCode,
          project_name: 'Google Vendor Test',
          base_url: 'https://www.google.com',
          project_landing_page_url: 'https://www.google.com',
          status: 'active',
          country: 'Global',
          is_multi_country: false,
          has_prescreener: false,
          prescreener_url: '',
          pid_prefix: '',
          pid_counter: 1,
          pid_padding: 2,
          force_pid_as_uid: false,
          target_uid: '',
          client_pid_param: '',
          client_uid_param: '',
          oi_prefix: 'oi_',
          uid_params: null,
          source: 'manual'
        }])
        .select('*')
        .single();
      if (insertError) throw insertError;
      project = newProject;
      console.log(`   Created new project (ID: ${project.id})`);
    }

    console.log(`   ✓ Project ready: ${project.project_code} → ${project.project_landing_page_url}\n`);

    // 2. Create test supplier
    const supplierToken = 'MACK01';
    console.log(`2. Creating/verifying supplier: ${supplierToken}`);

    const { data: existingSupplier } = await supabase
      .from('suppliers')
      .select('*')
      .eq('supplier_token', supplierToken)
      .single();

    let supplier;
    if (existingSupplier) {
      console.log(`   Supplier already exists (ID: ${existingSupplier.id})`);
      console.log(`   Updating redirect URLs...`);
      const { data: updated, error: updateError } = await supabase
        .from('suppliers')
        .update({
          name: 'TestMackInsights',
          platform_type: 'custom',
          complete_redirect_url: 'https://dashboard.mackinsights.com/redirect/complete?pid={pid}&uid={uid}',
          terminate_redirect_url: 'https://dashboard.mackinsights.com/redirect/terminate?pid={pid}&uid={uid}',
          quotafull_redirect_url: 'https://dashboard.mackinsights.com/redirect/quotafull?pid={pid}&uid={uid}',
          landing_page_url: null,
          fallback_landing_page_url: null,
          status: 'active',
          vendor_slug: 'mackinsights',
          uid_param_name: 'uid',
          pid_param_name: 'pid',
          status_param_name: 'status',
          respondent_id_aliases: ['uid', 'id', 'rid', 'respondent_id']
        })
        .eq('supplier_token', supplierToken)
        .select()
        .single();
      if (updateError) throw updateError;
      supplier = updated;
    } else {
      const { data: newSupplier, error: insertError } = await supabase
        .from('suppliers')
        .insert([{
          name: 'TestMackInsights',
          supplier_token: supplierToken,
          platform_type: 'custom',
          complete_redirect_url: 'https://dashboard.mackinsights.com/redirect/complete?pid={pid}&uid={uid}',
          terminate_redirect_url: 'https://dashboard.mackinsights.com/redirect/terminate?pid={pid}&uid={uid}',
          quotafull_redirect_url: 'https://dashboard.mackinsights.com/redirect/quotafull?pid={pid}&uid={uid}',
          landing_page_url: null,
          fallback_landing_page_url: null,
          status: 'active',
          vendor_slug: `mackinsights-${Date.now()}`,
          uid_param_name: 'uid',
          pid_param_name: 'pid',
          status_param_name: 'status',
          respondent_id_aliases: ['uid', 'id', 'rid', 'respondent_id']
        }])
        .select('*')
        .single();
      if (insertError) throw insertError;
      supplier = newSupplier;
      console.log(`   Created new supplier (ID: ${supplier.id})`);
    }

    console.log(`   ✓ Supplier ready: ${supplier.supplier_token}`);
    console.log(`     Complete → ${supplier.complete_redirect_url}`);
    console.log(`     Terminate → ${supplier.terminate_redirect_url}`);
    console.log(`     QuotaFull → ${supplier.quotafull_redirect_url}\n`);

    // 3. Link supplier to project
    console.log(`3. Linking supplier to project`);

    const { data: existingLink } = await supabase
      .from('supplier_project_links')
      .select('*')
      .eq('supplier_id', supplier.id)
      .eq('project_id', project.id)
      .single();

    if (existingLink) {
      console.log(`   Link already exists (ID: ${existingLink.id})`);
      const { data: updated, error: updateError } = await supabase
        .from('supplier_project_links')
        .update({
          quota_allocated: 100,
          status: 'active'
        })
        .eq('id', existingLink.id)
        .select()
        .single();
      if (updateError) throw updateError;
      console.log(`   ✓ Link updated with quota: 100`);
    } else {
      const { data: newLink, error: insertError } = await supabase
        .from('supplier_project_links')
        .insert([{
          supplier_id: supplier.id,
          project_id: project.id,
          quota_allocated: 100,
          status: 'active',
          custom_landing_page_url: null
        }])
        .select()
        .single();
      if (insertError) throw insertError;
      console.log(`   ✓ Link created (ID: ${newLink.id}) with quota: 100`);
    }

    console.log('\n=== TEST DATA READY ===\n');

    // 4. Generate test URLs
    console.log('Test URLs:\n');
    console.log('TEST 1 - Direct Flow (no supplier):');
    console.log(`  http://localhost:3001/start/${projectCode}?uid=testuser001\n`);

    console.log('TEST 2-4 - Supplier Flow (with MACK01):');
    console.log(`  Route URL: http://localhost:3001/r/${projectCode}/MACK01/testuser002`);
    console.log(`  Callback URL: http://localhost:3001/api/callback?pid=${projectCode}&cid=<session_token>&type=complete&sig=<HMAC>\n`);

    console.log('TEST 5 - Supplier Flow (without supplier redirects - fallback to project):');
    console.log(`  (Set supplier redirect URLs to NULL, then use same URL as above)\n`);

    console.log('Dashboard:');
    console.log(`  Admin: http://localhost:3001/admin\n`);

    console.log('Database verification queries:\n');
    console.log(`-- Check projects`);
    console.log(`SELECT id, project_code, project_name, project_landing_page_url, status FROM projects WHERE project_code='${projectCode}';\n`);
    console.log(`-- Check supplier`);
    console.log(`SELECT id, supplier_token, complete_redirect_url, terminate_redirect_url, quotafull_redirect_url FROM suppliers WHERE supplier_token='${supplierToken}';\n`);
    console.log(`-- Check link`);
    console.log(`SELECT * FROM supplier_project_links WHERE supplier_id='${supplier.id}' AND project_id='${project.id}';\n`);
    console.log(`-- Check responses`);
    console.log(`SELECT id, project_code, uid, source, supplier_id, status, clickid, oi_session, last_landing_page FROM responses WHERE project_code='${projectCode}' ORDER BY created_at DESC;\n`);

    console.log('=== NEXT STEPS ===');
    console.log('1. Open browser to the test URLs above');
    console.log('2. For callback testing, you need to capture the session token (oi_session) from the entry record');
    console.log('3. Simulate supplier callbacks by calling /api/callback with proper HMAC signature');
    console.log('4. Verify redirects go to correct destinations (Google for direct, MackInsights for supplier)');
    console.log('5. Check dashboard metrics update correctly');
    console.log('6. Verify response table records');

  } catch (err) {
    console.error('\n❌ Setup failed:', err.message);
    process.exit(1);
  }
}

setupTestData();
