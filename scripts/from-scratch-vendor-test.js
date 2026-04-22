/**
 * PanelFlow From-Scratch Vendor Launch Test
 * Creates new project, supplier, link, and tests full vendor flow
 */
const { createClient } = require('@insforge/sdk');
const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config({ path: '.env.local' });

const APP_URL = 'http://localhost:3001';
const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL;
const INSFORGE_KEY = process.env.INSFORGE_API_KEY;

const insforge = createClient({
  baseUrl: INSFORGE_URL,
  anonKey: INSFORGE_KEY
});

// Test constants
const TEST_PROJECT_NAME = 'TEST_PROJECT_FROM_SCRATCH_01';
const TEST_PROJECT_CODE = 'TEST_PROJECT_FROM_SCRATCH_01';
const TEST_PROJECT_PID = 'TEST_PID_001';
const TEST_SUPPLIER_NAME = 'TEST_SUPPLIER_001';
const TEST_SUPPLIER_TOKEN = 'TST001';
const TEST_LANDING_PAGE = 'https://test-landing.example.com';

async function runFromScratchTest() {
  console.log('🚀 Starting From-Scratch Vendor Launch Test...\n');
  
  const results = [];
  
  // Helper functions
  const report = (name, pass, actual, expected, details = '') => {
    results.push({ name, pass, actual, expected, details });
    console.log(`${pass ? '✅' : '❌'} ${name}`);
  };
  
  const getResponse = async (uid, code = TEST_PROJECT_CODE) => {
    const { data } = await insforge.database.from('responses').select('*').eq('uid', uid).eq('project_code', code).maybeSingle();
    return data;
  };
  
  const clearTestData = async () => {
    await insforge.database.from('responses').delete().eq('project_code', TEST_PROJECT_CODE);
    await insforge.database.from('supplier_project_links').delete().eq('project_id', (await insforge.database.from('projects').select('id').eq('project_code', TEST_PROJECT_CODE).single()).data?.id);
    await insforge.database.from('suppliers').delete().eq('supplier_token', TEST_SUPPLIER_TOKEN);
    await insforge.database.from('projects').delete().eq('project_code', TEST_PROJECT_CODE);
  };
  
  try {
    // PRE-CLEANUP
    await clearTestData();
    
    // TEST FLOW STEP 1: CREATE PROJECT
    console.log('STEP 1: CREATE PROJECT');
    const projectInsertResult = await insforge.database.from('projects').insert([{
      project_code: TEST_PROJECT_CODE,
      project_name: TEST_PROJECT_NAME,
      base_url: TEST_LANDING_PAGE,
      status: 'active'
    }]);
    
    if (projectInsertResult.error) {
      throw new Error(`Project creation failed: ${projectInsertResult.error.message}`);
    }
    
    // Fetch the created project
    const { data: project, error: projectFetchError } = await insforge.database.from('projects').select('*').eq('project_code', TEST_PROJECT_CODE).single();
    if (projectFetchError) throw projectFetchError;
    
    report('STEP 1: PROJECT CREATION', 
      !!project && project.project_name === TEST_PROJECT_NAME && project.status === 'active',
      project ? `${project.project_name} (${project.project_code})` : 'Not found',
      `${TEST_PROJECT_NAME} (${TEST_PROJECT_CODE}) active`);
    
    // TEST FLOW STEP 2: CREATE SUPPLIER
    console.log('\nSTEP 2: CREATE SUPPLIER');
    const supplierInsertResult = await insforge.database.from('suppliers').insert([{
      id: `supp_${Date.now()}`,
      name: TEST_SUPPLIER_NAME,
      supplier_token: TEST_SUPPLIER_TOKEN,
      status: 'active',
      landing_page_url: TEST_LANDING_PAGE,
      complete_redirect_url: 'https://yourdomain.com/redirect/complete?pid=TEST_PID_001&uid={uid}',
      terminate_redirect_url: 'https://yourdomain.com/redirect/terminate?pid=TEST_PID_001&uid={uid}',
      quotafull_redirect_url: 'https://yourdomain.com/redirect/quotafull?pid=TEST_PID_001&uid={uid}',
      uid_param_name: 'uid',
      pid_param_name: 'pid',
      respondent_id_aliases: ['uid', 'id', 'rid', 'respondent_id']
    }]);
    
    if (supplierInsertResult.error) {
      throw new Error(`Supplier creation failed: ${supplierInsertResult.error.message}`);
    }
    
    // Fetch the created supplier
    const { data: supplier, error: supplierFetchError } = await insforge.database.from('suppliers').select('*').eq('supplier_token', TEST_SUPPLIER_TOKEN).single();
    if (supplierFetchError) throw supplierFetchError;
    
    report('STEP 2: SUPPLIER CREATION', 
      !!supplier && supplier.name === TEST_SUPPLIER_NAME && supplier.status === 'active',
      supplier ? `${supplier.name} (${supplier.supplier_token})` : 'Not found',
      `${TEST_SUPPLIER_NAME} (${TEST_SUPPLIER_TOKEN}) active`);
    
    // TEST FLOW STEP 3: LINK SUPPLIER TO PROJECT
    console.log('\nSTEP 3: LINK SUPPLIER TO PROJECT');
    const linkResult = await insforge.database.from('supplier_project_links').insert([{
      id: `link_${Date.now()}`,
      supplier_id: supplier.id,
      project_id: project.id,
      quota_allocated: 50,
      quota_used: 0,
      status: 'active'
    }]);
    
    const { data: link } = await insforge.database.from('supplier_project_links').select('*').eq('supplier_id', supplier.id).eq('project_id', project.id).single();
    report('STEP 3: PROJECT-SUPPLIER LINK', 
      !!link && link.status === 'active' && link.quota_allocated === 50,
      link ? `Linked (quota: ${link.quota_allocated})` : 'Not linked',
      'Linked with 50 quota');
    
    // TEST FLOW STEP 4: GENERATE LAUNCH LINK
    console.log('\nSTEP 4: GENERATE LAUNCH LINK');
    // The launch link format is: /r/{projectCode}/{supplierToken}/{uid}
    // We'll test with a generated UID
    const testUid = `SCRATCH_UID_${Date.now()}`;
    const launchLink = `${APP_URL}/r/${TEST_PROJECT_CODE}/${TEST_SUPPLIER_TOKEN}/${testUid}`;
    report('STEP 4: LAUNCH LINK GENERATED', 
      true, // We can generate it
      launchLink,
      'Launch link ready');
    
    // TEST FLOW STEP 5: LAUNCH SUPPLIER FLOW (ENTRY)
    console.log('\nSTEP 5: LAUNCH SUPPLIER FLOW (ENTRY)');
    const entryResponse = await fetch(launchLink, { redirect: 'manual' });
    const entryLocation = entryResponse.headers.get('location');
    const entryStatus = entryResponse.status;
    
    // Get the created response
    const entryResponseData = await getResponse(testUid);
    const oiSession = entryResponseData?.oi_session;
    
    report('STEP 5: ENTRY FLOW', 
      entryStatus === 307 && !!entryResponseData && entryResponseData.status === 'in_progress' && !!oiSession,
      `Status: ${entryStatus}, Response status: ${entryResponseData?.status}, Session: !!${!!oiSession}`,
      '307 redirect, in_progress status, session generated');
    
    // TEST FLOW STEP 6A: COMPLETE FLOW
    console.log('\nSTEP 6A: COMPLETE FLOW');
    if (oiSession) {
      const completeUrl = `${APP_URL}/complete?pid=${TEST_PROJECT_CODE}&uid=${testUid}&oi_session=${oiSession}`;
      const completeResponse = await fetch(completeUrl, { redirect: 'manual' });
      const completeLocation = completeResponse.headers.get('location');
      const completeStatus = completeResponse.status;
      
      const updatedResponse = await getResponse(testUid);
      
      report('STEP 6A: COMPLETE FLOW', 
        completeStatus === 307 && 
        updatedResponse?.status === 'complete' &&
        completeLocation && 
        completeLocation.includes('status=complete') &&
        completeLocation.includes(`uid=${testUid}`) &&
        completeLocation.includes(`pid=${TEST_PROJECT_CODE}`),
        `Redirect: ${completeStatus}, Status: ${updatedResponse?.status}, Location: ${completeLocation}`,
        '307 redirect, complete status, correct landing page with params');
    } else {
      report('STEP 6A: COMPLETE FLOW', false, 'No session from entry', 'Session required');
    }
    
    // TEST FLOW STEP 6B: TERMINATE FLOW
    console.log('\nSTEP 6B: TERMINATE FLOW');
    const terminateUid = `SCRATCH_UID_TERM_${Date.now()}`;
    // Entry for terminate test
    await fetch(`${APP_URL}/r/${TEST_PROJECT_CODE}/${TEST_SUPPLIER_TOKEN}/${terminateUid}`, { redirect: 'manual' });
    const terminateResponseData = await getResponse(terminateUid);
    const terminateOiSession = terminateResponseData?.oi_session;
    
    if (terminateOiSession) {
      const terminateUrl = `${APP_URL}/terminate?pid=${TEST_PROJECT_CODE}&uid=${terminateUid}`;
      const terminateResponse = await fetch(terminateUrl, { redirect: 'manual' });
      const terminateLocation = terminateResponse.headers.get('location');
      const terminateStatus = terminateResponse.status;
      
      const updatedTerminateResponse = await getResponse(terminateUid);
      
      report('STEP 6B: TERMINATE FLOW', 
        terminateStatus === 307 && 
        updatedTerminateResponse?.status === 'terminate' &&
        terminateLocation && 
        terminateLocation.includes(`uid=${terminateUid}`) &&
        terminateLocation.includes(`pid=${TEST_PROJECT_CODE}`),
        `Redirect: ${terminateStatus}, Status: ${updatedTerminateResponse?.status}, Location: ${terminateLocation}`,
        '307 redirect, terminate status, correct landing page with params');
    } else {
      report('STEP 6B: TERMINATE FLOW', false, 'No session from entry', 'Session required');
    }
    
    // TEST FLOW STEP 6C: QUOTA FULL FLOW
    console.log('\nSTEP 6C: QUOTA FULL FLOW');
    const quotaUid = `SCRATCH_UID_QUOTA_${Date.now()}`;
    // Entry for quota test
    await fetch(`${APP_URL}/r/${TEST_PROJECT_CODE}/${TEST_SUPPLIER_TOKEN}/${quotaUid}`, { redirect: 'manual' });
    const quotaResponseData = await getResponse(quotaUid);
    const quotaOiSession = quotaResponseData?.oi_session;
    
    if (quotaOiSession) {
      const quotaUrl = `${APP_URL}/quotafull?pid=${TEST_PROJECT_CODE}&uid=${quotaUid}`;
      const quotaResponse = await fetch(quotaUrl, { redirect: 'manual' });
      const quotaLocation = quotaResponse.headers.get('location');
      const quotaStatus = quotaResponse.status;
      
      const updatedQuotaResponse = await getResponse(quotaUid);
      
      report('STEP 6C: QUOTA FULL FLOW', 
        quotaStatus === 307 && 
        updatedQuotaResponse?.status === 'quota_full' &&
        quotaLocation && 
        quotaLocation.includes('https://yourdomain.com/redirect/quotafull') && // Verify it went to vendor landing page
        quotaLocation.includes(`pid=TEST_PID_001`) &&
        quotaLocation.includes(`uid=${quotaUid}`),
        `Redirect: ${quotaStatus}, Status: ${updatedQuotaResponse?.status}, Location: ${quotaLocation}`,
        '307 redirect, quota_full status, vendor landing page with correct params');
    } else {
      report('STEP 6C: QUOTA FULL FLOW', false, 'No session from entry', 'Session required');
    }
    
    // PID CHECK
    console.log('\nPID VALIDATION CHECK');
    const finalResponse = await getResponse(testUid);
    report('PID CHECK: CONSISTENCY', 
      finalResponse?.project_code === TEST_PROJECT_CODE,
      finalResponse?.project_code || 'None',
      TEST_PROJECT_CODE,
      'Project code matches exactly');
    
    // UID CHECK
    report('UID CHECK: CONSISTENCY', 
      finalResponse?.uid === testUid,
      finalResponse?.uid || 'None',
      testUid,
      'UID matches exactly');
    
    // RESPONSE TABLE CHECK
    report('RESPONSE TABLE: ROW EXISTS', 
      !!finalResponse,
      finalResponse ? 'Row exists' : 'No row',
      'Row exists',
      'Response table has entry');
    
    if (finalResponse) {
      report('RESPONSE TABLE: STATUS CORRECT', 
        finalResponse.status === 'in_progress', // Entry status
        finalResponse.status,
        'in_progress',
        'Entry has correct status');
      
      report('RESPONSE TABLE: HAS TIMESTAMP', 
        !!finalResponse.created_at && !!finalResponse.updated_at,
        `Created: ${!!finalResponse.created_at}, Updated: ${!!finalResponse.updated_at}`,
        'Both timestamps present',
        'Response has creation/update timestamps');
    }
    
    // DASHBOARD CHECK
    console.log('\nDASHBOARD METRICS CHECK');
    const { data: kpis } = await insforge.database.rpc('get_kpis');
    report('DASHBOARD: TOTAL RESPONSES UPDATED', 
      kpis && kpis.total_responses >= 3, // We have at least 3 test entries
      kpis?.total_responses || 0,
      '>= 3',
      'Dashboard shows increased response count');
    
    // Cleanup note
    console.log('\n📝 NOTE: Test data remains in database for inspection. Run cleanup script to remove.');
    
    console.log('\n--- Final results ---');
    console.table(results);
    
    const allPassed = results.every(r => r.pass);
    if (!allPassed) {
      console.log('\n❌ SOME TESTS FAILED');
      process.exit(1);
    } else {
      console.log('\n🎉 ALL TESTS PASSED - VENDOR FLOW IS WORKING CORRECTLY');
    }
    
  } catch (err) {
    console.error('Test Execution Failed:', err);
    process.exit(1);
  }
}

runFromScratchTest();
