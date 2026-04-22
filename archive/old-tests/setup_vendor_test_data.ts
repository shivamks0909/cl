// Script to set up test data for vendor flow testing
// Run with: npx tsx setup_vendor_test_data.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qvgrzxuonxhwnxitnfvk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_API_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function setupTestData() {
  console.log('🚀 Setting up test data for vendor flow testing...\n');

  // 1. Create test project
  const testProjectCode = 'TEST_PID_VENDOR_001';
  const testProjectName = 'TEST_VENDOR_FLOW_PROJECT';
  
  console.log('📋 Creating test project...');
  const { data: existingProject } = await supabase
    .from('projects')
    .select('id, project_code')
    .eq('project_code', testProjectCode)
    .maybeSingle();

  let projectId;
  if (existingProject) {
    projectId = existingProject.id;
    console.log(`✅ Project already exists: ${testProjectCode} (${projectId})`);
  } else {
    projectId = `proj_test_${Date.now()}`;
    const { error } = await supabase.from('projects').insert({
      id: projectId,
      project_code: testProjectCode,
      project_name: testProjectName,
      base_url: 'https://example.mysurvey.com/?uid={uid}&pid={pid}',
      status: 'active',
      country: 'US'
    });
    if (error) {
      console.error('❌ Failed to create project:', error.message);
    } else {
      console.log(`✅ Created project: ${testProjectCode} (${projectId})`);
    }
  }

  // 2. Create test supplier (MACK)
  const testSupplierToken = 'MACKTEST';
  const testSupplierName = 'TEST_SUPPLIER_MACK';
  
  console.log('\n📋 Creating test supplier...');
  const { data: existingSupplier } = await supabase
    .from('suppliers')
    .select('id, name, supplier_token')
    .eq('supplier_token', testSupplierToken)
    .maybeSingle();

  let supplierId;
  if (existingSupplier) {
    supplierId = existingSupplier.id;
    console.log(`✅ Supplier already exists: ${testSupplierName} (${supplierId})`);
  } else {
    supplierId = `supplier_test_${Date.now()}`;
    const { error } = await supabase.from('suppliers').insert({
      id: supplierId,
      name: testSupplierName,
      supplier_token: testSupplierToken,
      status: 'active',
      // Redirect URLs
      complete_redirect_url: 'https://dashboard.mackinsights.com/redirect/complete?pid={pid}&uid={uid}',
      terminate_redirect_url: 'https://dashboard.mackinsights.com/redirect/terminate?pid={pid}&uid={uid}',
      quotafull_redirect_url: 'https://dashboard.mackinsights.com/redirect/quotafull?pid={pid}&uid={uid}',
      // Landing page
      landing_page_url: 'https://dashboard.mackinsights.com/landing'
    });
    if (error) {
      console.error('❌ Failed to create supplier:', error.message);
    } else {
      console.log(`✅ Created supplier: ${testSupplierName} (${supplierId})`);
    }
  }

  // 3. Link supplier to project with quota
  console.log('\n📋 Creating supplier-project link...');
  const { data: existingLink } = await supabase
    .from('supplier_project_links')
    .select('*')
    .eq('supplier_id', supplierId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (existingLink) {
    console.log(`✅ Link already exists with quota_allocated: ${existingLink.quota_allocated}`);
  } else {
    const { error } = await supabase.from('supplier_project_links').insert({
      supplier_id: supplierId,
      project_id: projectId,
      quota_allocated: 100, // Set to 100 for testing - set to 0 to test the bug
      status: 'active'
    });
    if (error) {
      console.error('❌ Failed to create link:', error.message);
    } else {
      console.log(`✅ Created link with quota_allocated: 100`);
    }
  }

  // Summary of test links
  console.log('\n' + '='.repeat(60));
  console.log('📝 TEST LINKS GENERATED:');
  console.log('='.repeat(60));
  console.log(`\nDirect Link:`);
  console.log(`  http://localhost:3000/track?code=${testProjectCode}&uid=TSTUSER001`);
  console.log(`  http://localhost:3000/r/${testProjectCode}?uid=TSTUSER001`);
  console.log(`\nSupplier Link:`);
  console.log(`  http://localhost:3000/r/${testProjectCode}/${testSupplierToken}?uid=TSTUSER001`);
  console.log('\n' + '='.repeat(60));

  // Show existing data
  console.log('\n📊 Current Database State:');
  
  const { data: projects } = await supabase
    .from('projects')
    .select('id, project_code, project_name, status')
    .ilike('project_code', 'TEST_%')
    .limit(10);
  console.log('\nProjects:', projects?.length || 0);
  projects?.forEach(p => console.log(`  - ${p.project_code}: ${p.project_name}`));

  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('id, name, supplier_token, status')
    .ilike('name', 'TEST_%')
    .limit(10);
  console.log('\nSuppliers:', suppliers?.length || 0);
  suppliers?.forEach(s => console.log(`  - ${s.supplier_token}: ${s.name}`));

  console.log('\n✅ Test data setup complete!');
}

setupTestData().catch(console.error);
