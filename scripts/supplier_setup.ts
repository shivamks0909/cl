import { getUnifiedDb } from '@/lib/unified-db';

async function setupTestData() {
  console.log('=== Setting up Test Data ===');
  const { database: db } = await getUnifiedDb();
  
  if (!db) {
    console.error('Database not available');
    return;
  }
  
  // 1. Create Supplier
  console.log('Creating supplier...');
  await db.from('suppliers').upsert({
    supplier_token: 'QVENDOR',
    name: 'QA_VENDOR_TEST',
    status: 'active',
    complete_redirect_url: 'https://vendor.test.com/complete?pid={pid}&uid={uid}',
    terminate_redirect_url: 'https://vendor.test.com/terminate?pid={pid}&uid={uid}',
    quotafull_redirect_url: 'https://vendor.test.com/quota?pid={pid}&uid={uid}'
  }, { onConflict: 'supplier_token' });
  
  // 2. Create Project
  console.log('Creating project...');
  await db.from('projects').upsert({
    project_code: 'LIVETEST',
    project_name: 'LIVE Supplier Test Project',
    status: 'active',
    base_url: 'https://example.com/survey'
  }, { onConflict: 'project_code' });
  
  // 3. Link Project to Supplier
  console.log('Linking project to supplier...');
  const { data: supplier } = await db.from('suppliers').select('id').eq('supplier_token', 'QVENDOR').maybeSingle();
  const { data: project } = await db.from('projects').select('id').eq('project_code', 'LIVETEST').maybeSingle();
  
  if (supplier && project) {
    await db.from('supplier_project_links').upsert({
      project_id: project.id,
      supplier_id: supplier.id,
      quota_allocated: 1000,
      status: 'active'
    }, { onConflict: 'project_id,supplier_id' });
  }
  
  console.log('=== Setup Complete ===');
  console.log('Supplier: QVENDOR (active)');
  console.log('Project: LIVETEST (active)');
  console.log('Link: Created');
}

setupTestData().catch(console.error);
