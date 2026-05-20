import { config } from 'dotenv';
config({ path: ['.env', '.env.local', '.env.local.test'], override: true });

const { dashboardService } = await import('../lib/dashboardService');
const { getUnifiedDb } = await import('../lib/unified-db');

const TEST_CONFIG = {
  clientName: 'pentaglobe',
  projectCode: 'OPI433',
  projectName: 'QUANTCLIX_TEST',
  baseUrl: 'https://opinion.quantclix.com/survey/supplier-auth?projectid=8551234228769&supplierid=48001338053&url=0&uid=[UID]',
  completeTarget: 100
};

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('PHASE 1: PROJECT SETUP VALIDATION');
  console.log('='.repeat(60));
  
  try {
    const { database: db } = await getUnifiedDb();
    if (!db) throw new Error('Database unavailable');
    
    console.log('\n[1] Checking database connection...');
    const { data: testQuery, error: connErr } = await db
      .from('projects')
      .select('count')
      .limit(1);
    if (connErr) throw connErr;
    console.log('    ✅ Database connected');
    
    console.log('\n[2] Creating test client...');
    let client: any;
    // Try to insert client
    const { data: newClient, error: createErr } = await db
      .from('clients')
      .insert([{ name: TEST_CONFIG.clientName }])
      .select('*')
      .single();
    
    if (createErr) {
      if (createErr.code === '23505') {
        console.log('    ℹ️  Client already exists, fetching...');
        const { data: existing } = await db
          .from('clients')
          .select('*')
          .eq('name', TEST_CONFIG.clientName)
          .maybeSingle();
        if (!existing) {
          throw new Error(`Client "${TEST_CONFIG.clientName}" not found after duplicate error`);
        }
        client = existing;
      } else {
        throw createErr;
      }
    } else {
      client = newClient;
    }
    console.log(`    ✅ Client ready: ${client.name} (id: ${client.id})`);
    
    console.log('\n[3] Creating test project with PID config...');
    const projectData = {
      client_id: client.id,
      project_name: TEST_CONFIG.projectName,
      project_code: TEST_CONFIG.projectCode,
      base_url: TEST_CONFIG.baseUrl,
      status: 'active',
      complete_target: TEST_CONFIG.completeTarget,
      pid_prefix: 'QTC',
      pid_counter: 1,
      pid_padding: 3,
      force_pid_as_uid: false,
      client_pid_param: 'pid',
      client_uid_param: 'uid',
      oi_prefix: 'oi_',
      uid_params: null
    };
    
    let project: any;
    try {
      const result = await dashboardService.createProject(projectData);
      project = result.data || result;
    } catch (err: any) {
      console.error('    ❌ Project creation failed:', err.message);
      
      if (err.message && (err.message.includes('complete_target') || err.message.includes('column') || err.code === '42703')) {
        console.log('\n    ⚠️  DETECTED: Missing complete_target column (or other required column) in projects table!');
        console.log('    💡 FIX: Apply database migration to add missing columns.');
        console.log('       Run: node scripts/fix-missing-fields.js');
      }
      throw err;
    }
    
    console.log('    ✅ Project created:');
    console.log(`       Code: ${project.project_code}`);
    console.log(`       ID: ${project.id}`);
    console.log(`       complete_target: ${project.complete_target}`);
    console.log(`       force_pid_as_uid: ${project.force_pid_as_uid}`);
    console.log(`       pid_prefix: ${project.pid_prefix}`);
    
    console.log('\n[4] Verifying project saved correctly...');
    const { data: saved, error: saveErr } = await db
      .from('projects')
      .select('project_code, complete_target, pid_prefix, force_pid_as_uid')
      .eq('id', project.id)
      .single();
    if (saveErr) throw saveErr;
    
    console.log('    ✅ Project verified in DB');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ PHASE 1 COMPLETE');
    console.log('='.repeat(60));
    console.log('\nProject created successfully. Ready for Phase 2 (Entry Flow).');
    
    process.exit(0);
    
  } catch (err: any) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ PHASE 1 FAILED');
    console.error('='.repeat(60));
    console.error(`\nError: ${err.message}`);
    console.error('Error details:');
    console.error('  - Name:', err.name);
    if (err.code) console.error('  - Code:', err.code);
    if (err.cause) {
      console.error('  - Cause:', typeof err.cause === 'object' ? JSON.stringify(err.cause, null, 2) : err.cause);
    }
    console.error('  - Stack:', err.stack);
    process.exit(1);
  }
}

main();
