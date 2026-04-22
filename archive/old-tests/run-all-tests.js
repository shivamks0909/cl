require('dotenv').config({ path: '.env.local.removed' });
const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const results = { passed: 0, failed: 0, tests: [] };

function log(message, type = 'info') {
  const prefix = type === 'pass' ? '✅' : type === 'fail' ? '❌' : type === 'warn' ? '⚠️' : 'ℹ️';
  console.log(`${prefix} ${message}`);
}

async function runTest(name, testFn) {
  try {
    await testFn();
    results.passed++;
    results.tests.push({ name, status: 'passed' });
    log(`${name}`, 'pass');
  } catch (err) {
    results.failed++;
    results.tests.push({ name, status: 'failed', error: err.message });
    log(`${name}: ${err.message}`, 'fail');
  }
}

async function checkSchema() {
  log('Checking database schema...');
  try {
    const { error } = await supabase
      .from('supplier_project_links')
      .select('quota_allocated, quota_used')
      .limit(1);
    
    if (error && error.message.includes('quota_allocated')) {
      throw new Error('Missing quota columns - migration required');
    }
    log('Schema check passed (quota columns exist)');
    return true;
  } catch (err) {
    log('Schema issue: ' + err.message, 'warn');
    return false;
  }
}

async function setupTestData() {
  log('Setting up test data...');
  
  // Helper: get or create
  async function getOrCreate(table, uniqueFields, extraFields = {}) {
    const query = supabase.from(table).select('*');
    Object.keys(uniqueFields).forEach(key => query.eq(key, uniqueFields[key]));
    const { data: existing } = await query.maybeSingle();
    if (existing) return existing;
    
    const { data: newRow, error } = await supabase
      .from(table)
      .insert([{ ...uniqueFields, ...extraFields }])
      .select()
      .single();
    if (error) throw error;
    return newRow;
  }
  
  // Create project
  const project = await getOrCreate('projects', { project_code: 'TEST_SINGLE' }, {
    project_name: 'Test Single Country',
    base_url: 'https://survey.example.com/complete?uid=[UID]',
    status: 'active',
    pid_prefix: 'TEST',
    pid_padding: 2,
    oi_prefix: 'oi_',
    client_pid_param: 'pid',
    client_uid_param: 'uid',
    created_at: new Date().toISOString()
  });
  log(`Project: ${project.project_code} (ID: ${project.id})`);
  
  // Create supplier
  const supplier = await getOrCreate('suppliers', { supplier_token: 'TEST_SUPPLIER' }, {
    name: 'Test Supplier',
    status: 'active',
    created_at: new Date().toISOString()
  });
  log(`Supplier: ${supplier.supplier_token} (ID: ${supplier.id})`);
  
  // Create link with quota (handle duplicate gracefully)
  try {
    await supabase
      .from('supplier_project_links')
      .insert([{
        supplier_id: supplier.id,
        project_id: project.id,
        status: 'active',
        quota_allocated: 10,
        quota_used: 0,
        created_at: new Date().toISOString()
      }]);
  } catch (err) {
    if (err.code === '23505') {
      // Update existing
      await supabase
        .from('supplier_project_links')
        .update({ quota_allocated: 10, quota_used: 0 })
        .eq('supplier_id', supplier.id)
        .eq('project_id', project.id);
    } else {
      throw err;
    }
  }
  
  const { data: link } = await supabase
    .from('supplier_project_links')
    .select('quota_allocated')
    .eq('supplier_id', supplier.id)
    .eq('project_id', project.id)
    .single();
  log(`Link with quota: ${link.quota_allocated}`);
  
  // Create S2S config
  try {
    await supabase
      .from('s2s_config')
      .insert([{
        project_id: project.id,
        secret_key: 'test-secret-key-12345',
        require_s2s_for_complete: true,
        allow_test_mode: false,
        created_at: new Date().toISOString()
      }]);
  } catch (err) {
    if (err.code === '23505') {
      // Already exists, ok
    } else {
      throw err;
    }
  }
  log('S2S config created');
  
  return { projectId: project.id, supplierId: supplier.id };
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: { 'User-Agent': 'TestBot/1.0' }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

async function testDirectLink(projectCode, uid) {
  const url = `https://april-3umc2d6wb-cypher1446-oss-projects.vercel.app/r/${projectCode}/DYN01/${uid}`;
  const res = await httpGet(url);
  if (res.status !== 302) throw new Error(`Expected 302, got ${res.status}`);
  if (!res.headers.location) throw new Error('No Location header');
  if (!res.headers.location.includes('oi_') && !res.headers.location.includes('session')) {
    throw new Error(`Redirect missing session token: ${res.headers.location}`);
  }
  return { status: res.status, location: res.headers.location };
}

async function testSupplierLink(projectCode, supplierToken, uid) {
  const url = `https://april-3umc2d6wb-cypher1446-oss-projects.vercel.app/r/${projectCode}/${supplierToken}/${uid}`;
  const res = await httpGet(url);
  if (res.status !== 302) throw new Error(`Expected 302, got ${res.status}`);
  
  const { data: response } = await supabase
    .from('responses')
    .select('id, supplier_token')
    .eq('uid', uid)
    .eq('project_code', projectCode)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (!response) throw new Error('No response record');
  if (response.supplier_token !== supplierToken) {
    throw new Error(`Supplier mismatch: expected ${supplierToken}, got ${response.supplier_token}`);
  }
  return { status: res.status, location: res.headers.location, responseId: response.id };
}

async function testQuotaExhaustion(projectCode, supplierToken) {
  const url1 = `https://april-3umc2d6wb-cypher1446-oss-projects.vercel.app/r/${projectCode}/${supplierToken}/QUOTA_TEST_1`;
  const res1 = await httpGet(url1);
  if (res1.status !== 302) throw new Error(`First request failed: ${res1.status}`);
  
  const { data: link } = await supabase
    .from('supplier_project_links')
    .select('quota_used')
    .eq('supplier_token', supplierToken)
    .eq('project_code', projectCode)
    .maybeSingle();
  
  if (!link || link.quota_used < 1) throw new Error('Quota not incremented');
  
  // Simulate exhaustion
  const { data: linkData } = await supabase
    .from('supplier_project_links')
    .select('id')
    .eq('supplier_token', supplierToken)
    .eq('project_code', projectCode)
    .maybeSingle();
  
  if (linkData) {
    await supabase
      .from('supplier_project_links')
      .update({ quota_used: 10 })
      .eq('id', linkData.id);
  }
  
  const url2 = `https://april-3umc2d6wb-cypher1446-oss-projects.vercel.app/r/${projectCode}/${supplierToken}/QUOTA_TEST_2`;
  const res2 = await httpGet(url2);
  if (res2.status !== 302) throw new Error(`Exhausted request should redirect, got ${res2.status}`);
  if (!res2.headers.location.includes('/quotafull')) {
    throw new Error(`Should redirect to /quotafull, got ${res2.headers.location}`);
  }
  return { status: 'quota_exhausted_works', location: res2.headers.location };
}

async function testDuplicateDetection(projectCode, uid) {
  const url = `https://april-3umc2d6wb-cypher1446-oss-projects.vercel.app/r/${projectCode}/DUP01/${uid}`;
  await httpGet(url);
  await new Promise(r => setTimeout(r, 300));
  const res2 = await httpGet(url);
  if (res2.status !== 302) throw new Error(`Second request should redirect, got ${res2.status}`);
  if (!res2.headers.location.includes('/duplicate-string')) {
    throw new Error(`Should redirect to duplicate-string, got ${res2.headers.location}`);
  }
  return { status: 'duplicate_detected' };
}

async function testPausedProject(projectCode, uid) {
  const url = `https://april-3umc2d6wb-cypher1446-oss-projects.vercel.app/r/${projectCode}/PAUSED01/${uid}`;
  const res = await httpGet(url);
  if (res.status !== 302) throw new Error(`Expected 302, got ${res.status}`);
  if (!res.headers.location.includes('/paused')) {
    throw new Error(`Should redirect to /paused, got ${res.headers.location}`);
  }
  return { status: 'paused_redirect_works' };
}

async function testMultiCountry(projectCode, uid, country) {
  const url = `https://april-3umc2d6wb-cypher1446-oss-projects.vercel.app/r/${projectCode}/MULTI01/${uid}?country=${country}`;
  const res = await httpGet(url);
  if (res.status !== 302) throw new Error(`Expected 302, got ${res.status}`);
  if (!res.headers.location.toLowerCase().includes(`/${country.toLowerCase()}`)) {
    throw new Error(`Should include country ${country} in URL, got ${res.headers.location}`);
  }
  return { status: 'multi_country_works', location: res.headers.location };
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 SURVEY ROUTING PLATFORM - END-TO-END TESTS');
  console.log('='.repeat(60) + '\n');
  
  try {
    const schemaOk = await checkSchema();
    if (!schemaOk) {
      log('⚠️  Schema migration required. Some tests may fail.', 'warn');
      console.log('   Please apply: scripts/migrate-full-schema.sql\n');
    }
    
    await runTest('Test Data Setup', async () => {
      global.testData = await setupTestData();
    });
    
    await runTest('Direct Link Routing', async () => {
      const result = await testDirectLink('TEST_SINGLE', 'UID_DIRECT_001');
      console.log(`   → ${result.location}`);
    });
    
    await runTest('Supplier Link Routing', async () => {
      const result = await testSupplierLink('TEST_SINGLE', 'TEST_SUPPLIER', 'UID_SUPPLIER_001');
      console.log(`   → Response ${result.responseId}, ${result.location}`);
    });
    
    await runTest('Quota Exhaustion Detection', async () => {
      const result = await testQuotaExhaustion('TEST_SINGLE', 'TEST_SUPPLIER');
      console.log(`   → ${result.location}`);
    });
    
    await runTest('Duplicate UID Detection', async () => {
      const result = await testDuplicateDetection('TEST_SINGLE', 'UID_DUPLICATE_001');
      console.log(`   → detected`);
    });
    
    await runTest('Paused Project Redirect', async () => {
      const result = await testPausedProject('TEST_PAUSED', 'UID_PAUSED_001');
      console.log(`   → ${result.location}`);
    });
    
    await runTest('Multi-Country Routing', async () => {
      const result = await testMultiCountry('TEST_MULTI', 'UID_MULTI_001', 'US');
      console.log(`   → ${result.location}`);
    });
    
  } catch (err) {
    log('Test suite error: ' + err.message, 'fail');
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total: ${results.passed + results.failed} | Passed: ${results.passed} | Failed: ${results.failed}`);
  
  if (results.failed > 0) {
    console.log('\n❌ Failed tests:');
    results.tests.filter(t => t.status === 'failed').forEach(t => console.log(`   ${t.name}: ${t.error}`));
  }
  
  console.log('='.repeat(60) + '\n');
  process.exit(results.failed > 0 ? 1 : 0);
}

main();
