/**
 * PanelFlow Vendor Flow E2E Test Suite
 * Automates 12 test cases against the local dev server and InsForge backend.
 */
const { createClient } = require('@insforge/sdk');
const dotenv = require('dotenv');
const crypto = require('crypto');
const path = require('path');

dotenv.config({ path: '.env.local' });

const APP_URL = 'http://localhost:3001';
const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL;
const INSFORGE_KEY = process.env.INSFORGE_API_KEY;

const insforge = createClient({
  baseUrl: INSFORGE_URL,
  anonKey: INSFORGE_KEY
});

const TEST_PROJECT_CODE = 'E2E_PROJ_01';
const TEST_PROJECT_ID = '00000000-0000-0000-0000-000000000001';
const TEST_SUPPLIER_TOKEN = 'TVE01';
const TEST_SUPPLIER_ID = '00000000-0000-0000-0000-000000000002';
const TEST_PID = 'TEST_PID_001';
const TEST_UID = 'TEST_UID_001';

async function runTest() {
  console.log('🚀 Starting Vendor Flow E2E Test Suite...\n');

  const results = [];

  // --- Helpers ---
  const report = (name, pass, actual, expected, details = '') => {
    results.push({ name, pass, actual, expected, details });
    console.log(`${pass ? '✅' : '❌'} ${name}`);
  };

  const getResponse = async (uid, code = TEST_PROJECT_CODE) => {
    const { data } = await insforge.database.from('responses').select('*').eq('uid', uid).eq('project_code', code).maybeSingle();
    return data;
  };

  const clearResponses = async () => {
    await insforge.database.from('responses').delete().eq('project_code', TEST_PROJECT_CODE);
  };

  try {
    // PRE-CLEANUP
    await clearResponses();

    // TEST CASE 1: VENDOR CONFIG LOADING
    console.log('Testing Config...');
    const { data: supplier } = await insforge.database.from('suppliers').select('*').eq('supplier_token', TEST_SUPPLIER_TOKEN).single();
    const { data: project } = await insforge.database.from('projects').select('*').eq('project_code', TEST_PROJECT_CODE).single();
    
    report('CASE 1: VENDOR CONFIG LOADING', 
      !!supplier && !!project && supplier.landing_page_url.includes('{uid}'), 
      'Config Found', 'Config Found');

    // TEST CASE 12: PARAMETER ALIAS TEST (Entering via various aliases)
    console.log('Testing Aliases...');
    const aliasUid = 'ALIAS_UID_' + Date.now();
    const entryUrl = `${APP_URL}/r/${TEST_PROJECT_CODE}/${TEST_SUPPLIER_TOKEN}/${aliasUid}?rid=${aliasUid}`;
    const entryRes = await fetch(entryUrl, { redirect: 'manual' });
    const location = entryRes.headers.get('location');
    
    const aliasEntryRecord = await getResponse(aliasUid);
    report('CASE 12: PARAMETER ALIAS TEST', 
      !!aliasEntryRecord && aliasEntryRecord.uid === aliasUid, 
      aliasEntryRecord?.uid, aliasUid);

    // TEST CASE 2: COMPLETE REDIRECT
    console.log('Testing Complete Redirect...');
    const compUid = 'COMP_UID_' + Date.now();
    // 1. Enter
    await fetch(`${APP_URL}/r/${TEST_PROJECT_CODE}/${TEST_SUPPLIER_TOKEN}/${compUid}`, { redirect: 'manual' });
    const compResp = await getResponse(compUid);
    const clickId = compResp.oi_session;
    
    // 2. Complete
    const compUrl = `${APP_URL}/complete?pid=${TEST_PROJECT_CODE}&uid=${compUid}&oi_session=${clickId}`;
    console.log(`Getting ${compUrl}...`);
    const compRedirectRes = await fetch(compUrl, { redirect: 'manual' });
    const finalLocation = compRedirectRes.headers.get('location');
    console.log(`Complete Redirect Status: ${compRedirectRes.status}, Location: ${finalLocation}`);
    
    const updatedResp = await getResponse(compUid);
    report('CASE 2: COMPLETE REDIRECT', 
      updatedResp.status === 'complete' && finalLocation && finalLocation.includes('status=complete'), 
      `status=${updatedResp.status}, landing=${finalLocation}`, 'status=complete, landing includes status=complete');

    // TEST CASE 3: TERMINATE REDIRECT
    console.log('Testing Terminate Redirect...');
    const termUid = 'TERM_UID_' + Date.now();
    await fetch(`${APP_URL}/r/${TEST_PROJECT_CODE}/${TEST_SUPPLIER_TOKEN}/${termUid}`, { redirect: 'manual' });
    const termUrl = `${APP_URL}/terminate?pid=${TEST_PROJECT_CODE}&uid=${termUid}`;
    const termRedirectRes = await fetch(termUrl, { redirect: 'manual' });
    const termLocation = termRedirectRes.headers.get('location');
    
    const termResp = await getResponse(termUid);
    report('CASE 3: TERMINATE REDIRECT', 
      termResp.status === 'terminate' && termLocation.includes('vendor-landing.example.com'), 
      `status=${termResp.status}`, 'status=terminate');

    // TEST CASE 4: QUOTA FULL REDIRECT
    console.log('Testing Quota Full Redirect...');
    const quotaUid = 'QUOTA_UID_' + Date.now();
    await fetch(`${APP_URL}/r/${TEST_PROJECT_CODE}/${TEST_SUPPLIER_TOKEN}/${quotaUid}`, { redirect: 'manual' });
    const quotaUrl = `${APP_URL}/quotafull?pid=${TEST_PROJECT_CODE}&uid=${quotaUid}`;
    const quotaRedirectRes = await fetch(quotaUrl, { redirect: 'manual' });
    const quotaLocation = quotaRedirectRes.headers.get('location');
    
    const qResp = await getResponse(quotaUid);
    report('CASE 4: QUOTA FULL REDIRECT', 
      qResp.status === 'quota_full' && quotaLocation.includes('vendor-landing.example.com'), 
      `status=${qResp.status}`, 'status=quota_full');

    // TEST CASE 5 & 6: PID/UID CONSISTENCY
    report('CASE 5: PID CONSISTENCY', 
      updatedResp.project_code === TEST_PROJECT_CODE, 
      updatedResp.project_code, TEST_PROJECT_CODE);
    report('CASE 6: UID CONSISTENCY', 
      updatedResp.uid === compUid, 
      updatedResp.uid, compUid);

    // TEST CASE 7: RESPONSE TABLE UPDATE
    report('CASE 7: RESPONSE TABLE UPDATE', 
      !!updatedResp.ip && !!updatedResp.created_at, 
      'Metadata OK', 'Metadata OK');

    // TEST CASE 8: DASHBOARD UPDATE
    console.log('Testing Dashboard Metrics...');
    const { data: kpis } = await insforge.database.rpc('get_kpis');
    // We expect at least one complete and one terminate in today's kpis
    report('CASE 8: DASHBOARD UPDATE', 
      kpis && kpis.total_responses >= 3, 
      kpis?.total_responses, '>= 3');

    // TEST CASE 10: DUPLICATE UID TEST
    console.log('Testing Duplicate UID...');
    const dupeRes = await fetch(`${APP_URL}/r/${TEST_PROJECT_CODE}/${TEST_SUPPLIER_TOKEN}/${compUid}`, { redirect: 'manual' });
    const dupeLocation = dupeRes.headers.get('location');
    report('CASE 10: DUPLICATE UID TEST', 
      dupeLocation.includes('status') && dupeLocation.includes('duplicate_string'), 
      dupeLocation, 'Redirect to duplicate error');

    // TEST CASE 11: INVALID PARAMETER TEST
    console.log('Testing Invalid Params...');
    const invRes = await fetch(`${APP_URL}/r/NON_EXISTENT/TVE01/UID`, { redirect: 'manual' });
    const invLocation = invRes.headers.get('location');
    report('CASE 11: INVALID PARAMETER TEST', 
      invLocation.includes('PROJECT_NOT_FOUND'), 
      invLocation, 'Redirect to error page');

    // TEST CASE 9: FALLBACK LOGIC
    console.log('Testing Fallback Logic...');
    // Remove vendor landing page override
    await insforge.database.from('suppliers').update({ landing_page_url: null }).eq('id', TEST_SUPPLIER_ID);
    
    const fallbackUid = 'FALLBACK_UID_' + Date.now();
    await fetch(`${APP_URL}/r/${TEST_PROJECT_CODE}/${TEST_SUPPLIER_TOKEN}/${fallbackUid}`, { redirect: 'manual' });
    const fallbackUrl = `${APP_URL}/quotafull?pid=${TEST_PROJECT_CODE}&uid=${fallbackUid}`;
    const fallbackRedirectRes = await fetch(fallbackUrl, { redirect: 'manual' });
    const fallbackLocation = fallbackRedirectRes.headers.get('location');
    
    // Default fallback should be the wave status page (internal route) OR project landing page
    report('CASE 9: FALLBACK LOGIC', 
      !fallbackLocation || (!fallbackLocation.includes('vendor-landing')), 
      fallbackLocation || 'Internal page', 'NO vendor-landing');

    // RESTORE
    await insforge.database.from('suppliers').update({ landing_page_url: 'https://vendor-landing.example.com?status={status}&uid={uid}' }).eq('id', TEST_SUPPLIER_ID);

    console.log('\n--- Final results ---');
    console.table(results);

    const allPassed = results.every(r => r.pass);
    if (!allPassed) process.exit(1);

  } catch (err) {
    console.error('Test Execution Failed:', err);
    process.exit(1);
  }
}

runTest();
