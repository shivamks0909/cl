import { createClient } from '@insforge/sdk';

const insforge = createClient({
  baseUrl: 'https://3gkhhr9f.us-east.insforge.app',
  anonKey: 'ik_af10599e85b584849a4123fe3b6775dd'
});

async function setupMackInsights() {
  console.log('=== Creating MACKINSIGHTS Project & Supplier ===\n');
  
  // 1. Create Project
  console.log('1. Creating project...');
  const { data: project, error: pError } = await insforge.database
    .from('projects')
    .insert([{
      project_code: 'TEST_PID_001',
      project_name: 'MackInsights Test Survey',
      base_url: 'http://localhost:3000/mock-survey',
      status: 'active',
      pid_prefix: 'OP',
      pid_padding: 3,
      force_pid_as_uid: true,
      pid_counter: 1
    }])
    .select()
    .single();
  
  if (pError) {
    console.log('Project may exist, fetching...');
    const { data: existing } = await insforge.database
      .from('projects')
      .select('*')
      .eq('project_code', 'TEST_PID_001')
      .maybeSingle();
    console.log('Existing project:', existing?.id);
  } else {
    console.log('✅ Project created:', project.id);
  }
  
  // 2. Create Supplier
  console.log('\n2. Creating supplier...');
  const { data: supplier, error: sError } = await insforge.database
    .from('suppliers')
    .insert([{
      name: 'MACKINSIGHTS',
      supplier_token: 'MACK_TEST',
      status: 'active',
      complete_redirect_url: 'https://dashboard.mackinsights.com/redirect/complete?pid={pid}&uid={uid}',
      terminate_redirect_url: 'https://dashboard.mackinsights.com/redirect/terminate?pid={pid}&uid={uid}',
      quota_redirect_url: 'https://dashboard.mackinsights.com/redirect/quotafull?pid={pid}&uid={uid}'
    }])
    .select()
    .single();
  
  if (sError) {
    console.log('Supplier may exist, fetching...');
    const { data: existing } = await insforge.database
      .from('suppliers')
      .select('*')
      .eq('supplier_token', 'MACK_TEST')
      .maybeSingle();
    console.log('Existing supplier:', existing?.id);
  } else {
    console.log('✅ Supplier created:', supplier.id);
  }
  
  // Get project and supplier IDs
  const proj = await insforge.database
    .from('projects')
    .select('id')
    .eq('project_code', 'TEST_PID_001')
    .maybeSingle();
    
  const supp = await insforge.database
    .from('suppliers')
    .select('id')
    .eq('supplier_token', 'MACK_TEST')
    .maybeSingle();
  
  // 3. Link supplier to project
  console.log('\n3. Linking supplier to project...');
  if (proj && supp) {
    const { error: linkError } = await insforge.database
      .from('supplier_project_links')
      .insert([{
        project_id: proj.id,
        supplier_id: supp.id,
        status: 'active'
      }]);
    
    if (linkError && !linkError.message.includes('duplicate')) {
      console.log('Link may exist');
    } else {
      console.log('✅ Linked!');
    }
  }
  
  console.log('\n=== SETUP COMPLETE ===');
  console.log('\n📋 Test Links:');
  console.log('Direct:   http://localhost:3000/start/TEST_PID_001');
  console.log('Supplier: http://localhost:3000/start/TEST_PID_001?supplier=MACK_TEST');
}

setupMackInsights().catch(console.error);
