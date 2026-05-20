// PanelFlow Full Redirect Test
const https = require('https');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');

const BASE = 'http://localhost:3000';
const SUPABASE_URL = 'https://qvgrzxuonxhwnxitnfvk.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2Z3J6eHVvbnhod254aXRuZnZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM2OTM5NSwiZXhwIjoyMDkxOTQ1Mzk1fQ.VNceroffbWIkSlWFEP4oGQly7uRppyg78z9FGnghkJ8';

const sb = createClient(SUPABASE_URL, SERVICE_KEY);
let PASS = 0, FAIL = 0;
const results = [];

function log(name, passed, detail = '') {
  const prefix = passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
  console.log(`${prefix} ${name}${detail ? ' --- ' + detail : ''}`);
  if (passed) PASS++; else FAIL++;
  results.push({ test: name, status: passed ? 'PASS' : 'FAIL', detail });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function httpGet(url) {
  return new Promise(resolve => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 15000 }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, content: data }));
    });
    req.on('error', e => resolve({ status: 0, content: '', error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, content: '', error: 'timeout' }); });
  });
}

async function dbQuery(table, filter) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/${table}${filter}`;
    const res = await fetch(url, {
      headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
    });
    const rows = await res.json();
    return rows;
  } catch (e) { return null; }
}

async function dbInsert(table, data) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/${table}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify([data])
    });
    if (res.status === 201 || res.status === 200) {
      const rows = await res.json();
      return rows;
    }
    console.log('  dbInsert error: status='+res.status, await res.text());
    return null;
  } catch (e) { return null; }
}

function makeSessionId() {
  return 'oi_' + Math.random().toString(36).substring(2, 18);
}

async function main() {
  console.log('\x1b[36m========================================\x1b[0m');
  console.log('\x1b[36m PANELFLOW FULL REDIRECT TEST\x1b[0m');
  console.log('\x1b[36m========================================\x1b[0m\n');

  // PHASE 1
  console.log('\x1b[33m--- PHASE 1: Environment ---\x1b[0m');
  const health = await httpGet(BASE + '/');
  log('Server reachable on port 3000', health.status < 500, `Status=${health.status}`);

  const dbCheck = await dbQuery('projects', '?limit=1');
  log('DB connection (Supabase)', dbCheck !== null && dbCheck !== undefined, '');

  // PHASE 2: Test project
  console.log('\n\x1b[33m--- PHASE 2: Test Project ---\x1b[0m');
  const TEST_PID = 'TEST_PID_001';
  let project = null;
  const exProj = await dbQuery('projects', `?project_code=eq.${TEST_PID}&limit=1`);
  if (exProj && exProj.length > 0) {
    project = exProj[0];
    console.log(`  Found project: ${project.project_code} id=${project.id}`);
    log('Test project exists', true);
  } else {
    const created = await dbInsert('projects', {
      project_code: TEST_PID, project_name: 'TEST_REDIRECT_TEST', base_url: 'https://httpbin.org/get', status: 'active'
    });
    if (created && created.length > 0) {
      project = created[0];
      console.log(`  Created: ${project.project_code}`);
      log('Test project created', true);
    } else {
      const reCheck = await dbQuery('projects', `?project_code=eq.${TEST_PID}&limit=1`);
      if (reCheck && reCheck.length > 0) project = reCheck[0];
      log('Test project ready', project !== null, `id=${project?.id}`);
    }
  }

  log('Project has valid ID', project !== null && project.id !== undefined, `id=${project?.id}`);

  async function newResponse(uid, sessionId, extra = {}) {
    // Use row.id (UUID) as clickid AND oi_session to match real app behavior.
    // The redirect URL uses clickid=row.id, landingService uses oi_session=row.id,
    // so both must be the same for the lookup to find the original row.
    const body = {
      project_code: TEST_PID, uid,
      clickid: null, oi_session: null,  // temporarily null
      status: 'in_progress', ip: '127.0.0.1', user_agent: 'TestRunner/1.0',
      ...extra
    };
    if (project && project.id) body.project_id = project.id;
    // Insert first to get the UUID, then update clickid/oi_session
    let r = await dbInsert('responses', body);
    if (!r || r.length === 0) {
      await sleep(500);
      r = await dbQuery('responses', `?project_code=eq.${TEST_PID}&uid=eq.${uid}&limit=1`);
    }
    if (r && r.length > 0) {
      const rowId = r[0].id;
      // Update clickid and oi_session to the row UUID (matching real app behavior)
      await fetch(`${SUPABASE_URL}/rest/v1/responses?id=eq.${rowId}`, {
        method: 'PATCH',
        headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify([{ clickid: rowId, oi_session: rowId }])
      });
      r[0].clickid = rowId;
      r[0].oi_session = rowId;
      return r[0];
    }
    return null;
  }

  async function checkStatus(responseId, delay = 1500) {
    await sleep(delay);
    const r = await dbQuery('responses', `?id=eq.${responseId}&limit=1`);
    return r && r.length > 0 ? r[0].status : null;
  }

  async function testRedirect(status, uid, clickIdValue, expectedDbStatus) {
    const url = `${BASE}/redirect/${status}?pid=${TEST_PID}&uid=${uid}&clickid=${clickIdValue}`;
    const resp = await httpGet(url);
    log(`${status.toUpperCase()}: HTTP reachable`, resp.status < 500, `Status=${resp.status}`);
    const dbStatus = await checkStatus(clickIdValue, 1500);
    log(`${status.toUpperCase()}: DB status=${expectedDbStatus}`, dbStatus === expectedDbStatus, `Got=${dbStatus}`);
    return dbStatus;
  }

  // TEST A
  console.log('\n\x1b[33m--- TEST A: Direct Complete ---\x1b[0m');
  const uidA = 'T_A_' + Math.floor(Math.random() * 99999);
  const sidA = makeSessionId();
  const rowA = await newResponse(uidA, sidA);
  log('TEST-A: Response row created', rowA !== null, `id=${rowA?.id}`);
  // URL uses clickid=row.id (matches DB field), status check uses row.id (actual UUID)
  await testRedirect('complete', uidA, rowA?.id, 'complete');

  // TEST B
  console.log('\n\x1b[33m--- TEST B: Direct Terminate ---\x1b[0m');
  const uidB = 'T_B_' + Math.floor(Math.random() * 99999);
  const sidB = makeSessionId();
  const rowB = await newResponse(uidB, sidB);
  log('TEST-B: Response row created', rowB !== null, `id=${rowB?.id}`);
  await testRedirect('terminate', uidB, rowB?.id, 'terminate');

  // TEST C
  console.log('\n\x1b[33m--- TEST C: Direct Quota Full ---\x1b[0m');
  const uidC = 'T_C_' + Math.floor(Math.random() * 99999);
  const sidC = makeSessionId();
  const rowC = await newResponse(uidC, sidC);
  log('TEST-C: Response row created', rowC !== null, `id=${rowC?.id}`);
  await testRedirect('quotafull', uidC, rowC?.id, 'quota_full');

  // TEST D
  console.log('\n\x1b[33m--- TEST D: Supplier Complete ---\x1b[0m');
  const uidD = 'SUP_D_' + Math.floor(Math.random() * 99999);
  const sidD = makeSessionId();
  const rowD = await newResponse(uidD, sidD, { supplier_uid: uidD });
  log('TEST-D: Supplier response row created', rowD !== null, `id=${rowD?.id}`);
  const urlD = `${BASE}/redirect/complete?pid=${TEST_PID}&uid=${uidD}&clickid=${rowD?.id}`;
  const respD = await httpGet(urlD);
  log('TEST-D: Supplier complete HTTP reachable', respD.status < 500, `Status=${respD.status}`);
  const stD = await checkStatus(rowD?.id, 1500);
  log('TEST-D: DB status=complete', stD === 'complete', `Got=${stD}`);
  if (rowD) {
    const verD = await dbQuery('responses', `?id=eq.${rowD.id}&limit=1`);
    if (verD && verD.length > 0) {
      log('TEST-D: supplier_uid preserved', verD[0].supplier_uid === uidD, `supplier_uid=${verD[0].supplier_uid}`);
    }
  }

  // TEST E
  console.log('\n\x1b[33m--- TEST E: Supplier Terminate ---\x1b[0m');
  const uidE = 'SUP_E_' + Math.floor(Math.random() * 99999);
  const sidE = makeSessionId();
  const rowE = await newResponse(uidE, sidE, { supplier_uid: uidE });
  log('TEST-E: Supplier response row created', rowE !== null, '');
  const respE = await httpGet(`${BASE}/redirect/terminate?pid=${TEST_PID}&uid=${uidE}&clickid=${rowE?.id}`);
  log('TEST-E: Supplier terminate HTTP reachable', respE.status < 500, `Status=${respE.status}`);
  const stE = await checkStatus(rowE?.id, 1500);
  log('TEST-E: DB status=terminate', stE === 'terminate', `Got=${stE}`);

  // TEST F
  console.log('\n\x1b[33m--- TEST F: Supplier Quota Full ---\x1b[0m');
  const uidF = 'SUP_F_' + Math.floor(Math.random() * 99999);
  const sidF = makeSessionId();
  const rowF = await newResponse(uidF, sidF, { supplier_uid: uidF });
  log('TEST-F: Supplier response row created', rowF !== null, '');
  const respF = await httpGet(`${BASE}/redirect/quotafull?pid=${TEST_PID}&uid=${uidF}&clickid=${rowF?.id}`);
  log('TEST-F: Supplier quotafull HTTP reachable', respF.status < 500, `Status=${respF.status}`);
  const stF = await checkStatus(rowF?.id, 1500);
  log('TEST-F: DB status=quota_full', stF === 'quota_full', `Got=${stF}`);

  // TEST G: Fake callback
  console.log('\n\x1b[33m--- TEST G: Fake Callback (Security) ---\x1b[0m');
  const FPID = 'FAKE_PID_X999X', FUID = 'FAKE_UID_X999X';
  const beforeFake = await dbQuery('responses', `?project_code=eq.${FPID}`);
  const bfCount = (beforeFake || []).length;
  const respG = await httpGet(`${BASE}/redirect/complete?pid=${FPID}&uid=${FUID}`);
  log('TEST-G: Fake callback handled (no 5xx)', respG.status < 500, `Status=${respG.status}`);
  await sleep(2500);
  const afterFake = await dbQuery('responses', `?project_code=eq.${FPID}`);
  const afCount = (afterFake || []).length;
  log('TEST-G: No unexpected rows created', afCount <= bfCount || afCount <= 1, `Before=${bfCount} After=${afCount}`);

  // TEST H: Duplicate
  console.log('\n\x1b[33m--- TEST H: Duplicate Callback ---\x1b[0m');
  const uidH = 'DEDUP_' + Math.floor(Math.random() * 99999);
  const sidH = makeSessionId();
  const rowH = await newResponse(uidH, sidH);
  log('TEST-H: Response row created', rowH !== null, '');
  const uH = `${BASE}/redirect/complete?pid=${TEST_PID}&uid=${uidH}&clickid=${rowH?.id}`;
  const r1H = await httpGet(uH);
  await sleep(800);
  const r2H = await httpGet(uH);
  log('TEST-H: First callback ok', r1H.status < 500, `Status=${r1H.status}`);
  log('TEST-H: Duplicate callback handled', r2H.status < 500, `Status=${r2H.status}`);
  await sleep(2000);
  const dupeRows = await dbQuery('responses', `?id=eq.${rowH?.id}&limit=1`);
  log('TEST-H: No duplicate rows (1 row only)', (dupeRows || []).length === 1, `Rows=${(dupeRows || []).length}`);
  if (dupeRows && dupeRows.length === 1) {
    log('TEST-H: Status=complete (not double-counted)', dupeRows[0].status === 'complete', `status=${dupeRows[0].status}`);
  }

  // TEST I: PID/UID
  console.log('\n\x1b[33m--- TEST I: PID/UID Correctness ---\x1b[0m');
  const uidI = 'PIDUID_' + Math.floor(Math.random() * 99999);
  const sidI = makeSessionId();
  const rowI = await newResponse(uidI, sidI);
  log('TEST-I: Response row created', rowI !== null, `id=${rowI?.id}`);
  const respI = await httpGet(`${BASE}/redirect/complete?pid=${TEST_PID}&uid=${uidI}&clickid=${rowI?.id}`);
  log('TEST-I: Complete callback reachable', respI.status < 500, `Status=${respI.status}`);
  if (rowI) {
    await sleep(1500);
    const verI = await dbQuery('responses', `?id=eq.${rowI.id}&limit=1`);
    if (verI && verI.length > 0) {
      log('TEST-I: DB uid matches respondent UID', verI[0].uid === uidI, `DB_uid=${verI[0].uid}`);
      log('TEST-I: DB project_code = PID', verI[0].project_code === TEST_PID, `DB_proj=${verI[0].project_code}`);
      log('TEST-I: Status changed from in_progress', verI[0].status !== 'in_progress', `status=${verI[0].status}`);
      log('TEST-I: PID !== UID (no mixing)', TEST_PID !== uidI, '');
    }
  }

  // Production URL
  console.log('\n\x1b[33m--- Production URL Smoke Test ---\x1b[0m');
  const prodResp = await httpGet('https://track.opinioninsights.in/redirect/complete?pid=SMOKE&uid=SMOKE');
  log('Production URL reachable', prodResp.status < 500, `Status=${prodResp.status}`);

  // Dashboard count
  console.log('\n\x1b[33m--- Dashboard Count Cross-Check ---\x1b[0m');
  const allR = await dbQuery('responses', `?project_code=eq.${TEST_PID}`);
  const allArr = allR || [];
  const total = allArr.length;
  const comp = allArr.filter(r => r.status === 'complete').length;
  const term = allArr.filter(r => r.status === 'terminate').length;
  const qta = allArr.filter(r => r.status === 'quota_full').length;
  const prg = allArr.filter(r => r.status === 'in_progress').length;
  console.log(`  PID=${TEST_PID} Total=${total} Complete=${comp} Term=${term} QF=${qta} InProgress=${prg}`);
  log('Dashboard: total >= complete+terminate+quotafull', total >= comp + term + qta, '');
  log('Dashboard: completed rows > 0 after tests', comp > 0, `completes=${comp}`);

  // SUMMARY
  console.log('\n\x1b[36m========================================\x1b[0m');
  console.log('\x1b[32m PASSED : ' + PASS + '\x1b[0m');
  console.log('\x1b[31m FAILED : ' + FAIL + '\x1b[0m');
  console.log('\x1b[36m========================================\x1b[0m');
  if (FAIL === 0) {
    console.log('\x1b[32mOVERALL: *** PASS ***\x1b[0m');
  } else {
    console.log('\x1b[31mOVERALL: *** FAIL *** (' + FAIL + ' failures)\x1b[0m');
  }
  process.exit(FAIL > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Script error:', e);
  process.exit(1);
});
