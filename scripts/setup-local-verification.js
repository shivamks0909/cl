const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setup() {
  console.log('Setting up LOCAL_TEST project...');
  
  // 1. Create Project
  const { data: project, error: pError } = await supabase
    .from('projects')
    .upsert({
      project_code: 'LOCAL_TEST',
      project_name: 'Local Verification Project',
      base_url: 'http://localhost:3000/mock-survey?pid={pid}&uid={uid}',
      status: 'active',
      project_landing_page_url: 'http://localhost:3000/status?msg=SUCCESS'
    }, { onConflict: 'project_code' })
    .select()
    .single();

  if (pError) {
    console.error('Error creating project:', pError);
    return;
  }

  console.log('✅ Project "LOCAL_TEST" is ready.');
  console.log('Project ID:', project.id);
  
  console.log('\n--- HOW TO TEST ---');
  console.log('1. Open Entry: http://localhost:3000/r/LOCAL_TEST/DIRECT/tester_001');
  console.log('2. After arriving at survey, trigger the callback:');
  console.log('   http://localhost:3000/redirect/complete?pid=LOCAL_TEST&uid=tester_001');
  console.log('-------------------\n');
}

setup();
