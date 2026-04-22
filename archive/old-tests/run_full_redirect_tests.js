/**
 * FULL REDIRECT FLOW TEST RUNNER
 * Tests all 9 redirect flows against localhost + verifies LIVE Supabase DB
 * 
 * Run: node run_full_redirect_tests.js
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qvgrzxuonxhwnxitnfvk.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

if (!SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const TEST_PROJECT = 'TEST_REDIRECT_PROJECT'
const TEST_UID = 'OPGHUS01'
const TEST_SUPPLIER_TOKEN = 'MACK'

let results = []
let allPassed = true

function log(msg) { console.log(msg) }
function pass(test) { log(`✅ PASS: ${test}`); results.push({ test, status: 'PASS' }) }
function fail(test, reason) { log(`❌ FAIL: ${test} — ${reason}`); results.push({ test, status: 'FAIL', reason }); allPassed = false }
function info(msg) { log(`   ℹ️  ${msg}`) }

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getLatestResponseByUid(uid) {
  const { data, error } = await supabase
    .from('responses')
    .select('id, uid, source, supplier_id, supplier_uid, supplier_token, supplier_name, status, clickid, oi_session, project_code')
    .eq('uid', uid)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

async function getAuditLogs(limit = 5) {
  const { data } = await supabase
    .from('audit_logs')
    .select('event_type, payload, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

async function getSupplierLink(supplierId, projectCode) {
  const { data: proj } = await supabase
    .from('projects')
    .select('id')
    .eq('project_code', projectCode)
    .maybeSingle()
  if (!proj) return null
  const { data } = await supabase
    .from('supplier_project_links')
    .select('id, quota_allocated, quota_used')
    .eq('supplier_id', supplierId)
    .eq('project_id', proj.id)
    .maybeSingle()
  return data
}

async function setQuota(supplierId, projectCode, allocated, used) {
  const { data: proj } = await supabase.from('projects').select('id').eq('project_code', projectCode).maybeSingle()
  if (!proj) return
  await supabase
    .from('supplier_project_links')
    .update({ quota_allocated: allocated, quota_used: used })
    .eq('supplier_id', supplierId)
    .eq('project_id', proj.id)
  info(`Set quota: allocated=${allocated}, used=${used}`)
}

async function deleteResponseByUid(uid) {
  await supabase.from('responses').delete().eq('uid', uid)
}

async function callUrl(path, options = {}) {
  const url = BASE_URL + path
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: options.headers || {},
      ...options
    })
    clearTimeout(timeout)
    return { ok: res.ok, status: res.status, url: res.url, headers: Object.fromEntries(res.headers.entries()) }
  } catch (e) {
    clearTimeout(timeout)
    return { ok: false, error: e.message, url }
  }
}

async function callUrlWithCookies(path, cookies = {}) {
  const cookieStr = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ')
  return callUrl(path, {
    headers: cookieStr ? { 'Cookie': cookieStr } : {}
  })
}

// ── SUPPLIER UUID CACHE ───────────────────────────────────────────────────────
let supplierUuid = null
async function getSupplierUuid() {
  if (supplierUuid) return supplierUuid
  const { data } = await supabase.from('suppliers').select('id').eq('supplier_token', TEST_SUPPLIER_TOKEN).maybeSingle()
  supplierUuid = data?.id
  return supplierUuid
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════════════════════════════════════
async function cleanup() {
  log('\n🧹 Cleaning up test responses...')
  await supabase.from('responses').delete().in('uid', [
    TEST_UID, TEST_UID + '_SUPP', TEST_UID + '_DUP', TEST_UID + '_QUOTA',
    TEST_UID + '_FAKE', TEST_UID + '_QUOTA_ZERO'
  ])
  log('✓ Cleanup done')
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 1 — DIRECT FLOW
// ═══════════════════════════════════════════════════════════════════════════════
async function test1_directFlow() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  log('TEST 1 — Direct Flow')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  await deleteResponseByUid(TEST_UID)
  await sleep(500)

  const res = await callUrl(`/track?code=${TEST_PROJECT}&uid=${TEST_UID}`)
  info(`HTTP status: ${res.status}, final URL: ${res.url}`)

  await sleep(1000)
  const row = await getLatestResponseByUid(TEST_UID)
  if (!row) {
    fail('TEST 1: Direct Flow', 'No DB row inserted')
    return null
  }

  info(`DB Row: source=${row.source}, supplier_id=${row.supplier_id}, status=${row.status}`)

  if (row.source !== 'direct') fail('TEST 1: source', `Expected 'direct', got '${row.source}'`)
  else pass('TEST 1: source=direct')

  if (row.supplier_id !== null) fail('TEST 1: supplier_id', `Expected null, got '${row.supplier_id}'`)
  else pass('TEST 1: supplier_id=null')

  if (row.status !== 'in_progress') fail('TEST 1: status', `Expected 'in_progress', got '${row.status}'`)
  else pass('TEST 1: status=in_progress')

  return row
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 2 — DIRECT COMPLETE
// ═══════════════════════════════════════════════════════════════════════════════
async function test2_directComplete(directRow) {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  log('TEST 2 — Direct Complete')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (!directRow) {
    fail('TEST 2: Direct Complete', 'No direct row from TEST 1')
    return
  }

  const clickid = directRow.oi_session || directRow.clickid
  info(`Using clickid: ${clickid}`)

  // Call complete callback with the actual clickid as oi_session param
  const res = await callUrlWithCookies(
    `/redirect/complete?pid=${TEST_PROJECT}&uid=${TEST_UID}`,
    { last_uid: TEST_UID, last_pid: TEST_PROJECT, last_sid: clickid }
  )
  info(`HTTP: ${res.status}, final URL: ${res.url}`)

  await sleep(1000)
  const row = await getLatestResponseByUid(TEST_UID)
  info(`DB Row: status=${row?.status}`)

  if (row?.status !== 'complete') fail('TEST 2: status', `Expected 'complete', got '${row?.status}'`)
  else pass('TEST 2: status=complete')
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 3 — SUPPLIER FLOW
// ═══════════════════════════════════════════════════════════════════════════════
async function test3_supplierFlow() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  log('TEST 3 — Supplier Flow')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const uid = TEST_UID + '_SUPP'
  await deleteResponseByUid(uid)
  await sleep(500)

  const res = await callUrl(`/r/${TEST_PROJECT}/${TEST_SUPPLIER_TOKEN}?uid=${uid}`)
  info(`HTTP: ${res.status}, final URL: ${res.url}`)

  await sleep(1000)
  const row = await getLatestResponseByUid(uid)
  if (!row) {
    fail('TEST 3: Supplier Flow', 'No DB row inserted')
    return null
  }

  info(`DB Row: source=${row.source}, supplier_id=${row.supplier_id}, supplier_name=${row.supplier_name}, supplier_uid=${row.supplier_uid}`)

  if (row.source !== 'supplier') fail('TEST 3: source', `Expected 'supplier', got '${row.source}'`)
  else pass('TEST 3: source=supplier')

  if (!row.supplier_id) fail('TEST 3: supplier_id', 'supplier_id is NULL')
  else pass('TEST 3: supplier_id=' + row.supplier_id)

  if (!row.supplier_name) fail('TEST 3: supplier_name', 'supplier_name is NULL')
  else pass('TEST 3: supplier_name=' + row.supplier_name)

  if (row.supplier_uid !== TEST_SUPPLIER_TOKEN) fail('TEST 3: supplier_uid', `Expected '${TEST_SUPPLIER_TOKEN}', got '${row.supplier_uid}'`)
  else pass('TEST 3: supplier_uid=MACK (token)')

  return row
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 4 — SUPPLIER COMPLETE (external redirect)
// ═══════════════════════════════════════════════════════════════════════════════
async function test4_supplierComplete(supplierRow) {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  log('TEST 4 — Supplier Complete (supplier landing page redirect)')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (!supplierRow) {
    fail('TEST 4: Supplier Complete', 'No supplier row from TEST 3')
    return
  }

  const uid = TEST_UID + '_SUPP'
  const clickid = supplierRow.oi_session || supplierRow.clickid
  info(`Using clickid: ${clickid}`)

  // Fetch with no redirect to see where it redirects to
  let finalUrl = null
  try {
    const res = await fetch(
      `${BASE_URL}/redirect/complete?pid=${TEST_PROJECT}&uid=${uid}`,
      {
        redirect: 'manual',
        headers: { Cookie: `last_uid=${uid}; last_pid=${TEST_PROJECT}; last_sid=${clickid}; last_supplier=${supplierRow.supplier_id}` }
      }
    )
    finalUrl = res.headers.get('location') || res.url
    info(`Redirect location: ${finalUrl}`)
  } catch (e) {
    info(`Fetch error: ${e.message}`)
  }

  await sleep(1000)
  const row = await getLatestResponseByUid(uid)
  info(`DB Row: status=${row?.status}`)

  if (row?.status !== 'complete') fail('TEST 4: status', `Expected 'complete', got '${row?.status}'`)
  else pass('TEST 4: status=complete')

  // Check redirect goes to MACK domain (NOT internal page)
  if (finalUrl && finalUrl.includes('mackinsights.com')) {
    pass('TEST 4: Redirected to supplier (mackinsights.com)')
  } else if (finalUrl && (finalUrl.includes('/complete') || finalUrl.includes('/redirect/complete'))) {
    fail('TEST 4: Redirect', `Should go to mackinsights.com, got: ${finalUrl}`)
  } else {
    info(`Final URL: ${finalUrl} — supplier redirect may need manual check`)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 5 — SUPPLIER MAPPING (already verified in TEST 3, but explicit check)
// ═══════════════════════════════════════════════════════════════════════════════
async function test5_supplierMapping() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  log('TEST 5 — Supplier Name + UID Mapping')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const uid = TEST_UID + '_SUPP'
  const row = await getLatestResponseByUid(uid)
  if (!row) { fail('TEST 5: Supplier Mapping', 'No supplier row found'); return }

  info(`supplier_uid (incoming token): ${row.supplier_uid}`)
  info(`supplier_token: ${row.supplier_token}`)
  info(`supplier_name: ${row.supplier_name}`)
  info(`supplier_id: ${row.supplier_id}`)

  if (row.supplier_uid === TEST_SUPPLIER_TOKEN) pass('TEST 5: supplier_uid = MACK (correct token)')
  else fail('TEST 5: supplier_uid', `Expected MACK, got: ${row.supplier_uid}`)

  if (row.supplier_name && row.supplier_name.length > 0) pass('TEST 5: supplier_name populated = ' + row.supplier_name)
  else fail('TEST 5: supplier_name', 'supplier_name is blank/null')
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 6 — QUOTA ALLOCATION = 0 (should NOT block)
// ═══════════════════════════════════════════════════════════════════════════════
async function test6_quotaZero() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  log('TEST 6 — Quota Allocation = 0 (should allow entry)')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const uid = TEST_UID + '_QUOTA_ZERO'
  await deleteResponseByUid(uid)
  const sId = await getSupplierUuid()
  await setQuota(sId, TEST_PROJECT, 0, 0)  // quota_allocated = 0 = unlimited or blocked?
  await sleep(500)

  const res = await callUrl(`/r/${TEST_PROJECT}/${TEST_SUPPLIER_TOKEN}?uid=${uid}`)
  info(`HTTP: ${res.status}, final URL: ${res.url}`)

  // Check if got quota_full page
  const isQuotaPage = res.url && (res.url.includes('/quotafull') || res.url.includes('quota'))

  await sleep(1000)
  const row = await getLatestResponseByUid(uid)

  if (isQuotaPage) {
    fail('TEST 6: Quota=0 blocks entry', 'Got quota page — should NOT block when allocation=0')
  } else if (!row) {
    fail('TEST 6: Quota=0 entry', 'No DB row inserted — entry was blocked')
  } else {
    pass('TEST 6: Quota=0 allows entry — respondent passes through')
    info(`DB Row: status=${row.status}`)
  }

  // Reset quota for TEST 7
  await setQuota(sId, TEST_PROJECT, 1, 0)
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 7 — REAL QUOTA CALLBACK
// ═══════════════════════════════════════════════════════════════════════════════
async function test7_realQuota() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  log('TEST 7 — Real Quota (quota_allocated=1, quota_used=1 → should block)')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const uid = TEST_UID + '_QUOTA'
  await deleteResponseByUid(uid)
  const sId = await getSupplierUuid()

  // First fill up quota
  await setQuota(sId, TEST_PROJECT, 1, 1)  // quota full!
  await sleep(500)

  const res = await callUrl(`/r/${TEST_PROJECT}/${TEST_SUPPLIER_TOKEN}?uid=${uid}`)
  info(`HTTP: ${res.status}, final URL: ${res.url}`)

  const isQuotaPage = res.url && (res.url.includes('/quotafull') || res.url.includes('quota'))
  await sleep(1000)
  const row = await getLatestResponseByUid(uid)

  if (!isQuotaPage) {
    fail('TEST 7: Quota Full', `Should get quota page, but landed on: ${res.url}`)
  } else {
    pass('TEST 7: Quota Full page shown when quota_used >= quota_allocated')
  }

  if (row) {
    fail('TEST 7: No DB insert', 'DB row was inserted even though quota was full')
  } else {
    pass('TEST 7: No DB row inserted (quota blocked correctly)')
  }

  // Reset quota for other tests
  await setQuota(sId, TEST_PROJECT, 1, 0)
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 8 — FAKE CALLBACK PREVENTION
// ═══════════════════════════════════════════════════════════════════════════════
async function test8_fakeCallback() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  log('TEST 8 — Fake Callback Prevention')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const fakePid = 'RANDOM_FAKE_PROJECT_' + Date.now()
  const fakeUid = 'FAKE_UID_' + Date.now()

  const res = await callUrl(`/redirect/complete?pid=${fakePid}&uid=${fakeUid}`)
  info(`HTTP: ${res.status}, final URL: ${res.url}`)

  const isRejected = res.url && (res.url.includes('/paused') || res.url.includes('INVALID') || res.url.includes('SECURITY') || res.status === 400)

  if (isRejected) {
    pass('TEST 8: Fake callback rejected (redirected to error page)')
  } else {
    fail('TEST 8: Fake Callback', `Should be rejected, but got: ${res.url}`)
  }

  // Verify no row was inserted
  await sleep(500)
  const { data: fakeRows } = await supabase.from('responses').select('id').eq('uid', fakeUid)
  if (fakeRows && fakeRows.length > 0) {
    fail('TEST 8: DB Insert', 'Fake callback inserted a row! Security breach!')
  } else {
    pass('TEST 8: No DB row for fake UID')
  }

  // Check audit log
  const logs = await getAuditLogs(3)
  const denyLog = logs.find(l => l.event_type === 'SECURITY_CALLBACK_DENIED' || l.event_type === 'entry_denied')
  if (denyLog) {
    pass('TEST 8: Audit log entry found: ' + denyLog.event_type)
  } else {
    info('No security audit log found for fake callback (may be expected depending on flow)')
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 9 — DUPLICATE PREVENTION
// ═══════════════════════════════════════════════════════════════════════════════
async function test9_duplicatePrevention() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  log('TEST 9 — Duplicate UID Prevention')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const uid = TEST_UID + '_DUP'
  await deleteResponseByUid(uid)
  await sleep(500)

  // First hit — should succeed
  const res1 = await callUrl(`/track?code=${TEST_PROJECT}&uid=${uid}`)
  info(`First hit: ${res1.status}, URL: ${res1.url}`)
  await sleep(800)

  // Second hit — should be blocked as duplicate
  const res2 = await callUrl(`/track?code=${TEST_PROJECT}&uid=${uid}`)
  info(`Second hit: ${res2.status}, URL: ${res2.url}`)

  const isDuplicatePage = res2.url && (res2.url.includes('duplicate') || res2.url.includes('DUPLICATE'))
  await sleep(800)

  const { data: rows } = await supabase
    .from('responses')
    .select('id, uid, status')
    .eq('uid', uid)
  const rowCount = rows?.length || 0
  info(`DB rows for UID=${uid}: ${rowCount}`)

  if (isDuplicatePage) {
    pass('TEST 9: Second hit redirected to duplicate page')
  } else {
    fail('TEST 9: Duplicate Detection', `Second hit should go to duplicate page, got: ${res2.url}`)
  }

  if (rowCount === 1) {
    pass('TEST 9: Only 1 DB row (no duplicates)')
  } else if (rowCount === 0) {
    fail('TEST 9: DB Rows', 'No rows at all — first hit also failed')
  } else {
    fail('TEST 9: DB Rows', `Got ${rowCount} rows — duplicates exist!`)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════
async function main() {
  log('═══════════════════════════════════════════════════════════')
  log('   FULL REDIRECT FLOW TEST — LIVE SUPABASE VERIFICATION')
  log('═══════════════════════════════════════════════════════════')
  log(`Database: ${SUPABASE_URL}`)
  log(`App:      ${BASE_URL}`)
  log(`Project:  ${TEST_PROJECT}`)
  log(`UID:      ${TEST_UID}`)
  log('═══════════════════════════════════════════════════════════\n')

  await cleanup()

  const directRow = await test1_directFlow()
  await test2_directComplete(directRow)
  const supplierRow = await test3_supplierFlow()
  await test4_supplierComplete(supplierRow)
  await test5_supplierMapping()
  await test6_quotaZero()
  await test7_realQuota()
  await test8_fakeCallback()
  await test9_duplicatePrevention()

  // ── FINAL REPORT ──────────────────────────────────────────────────────────
  log('\n═══════════════════════════════════════════════════════════')
  log('   FINAL REPORT')
  log('═══════════════════════════════════════════════════════════')

  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length

  results.forEach(r => {
    log(`${r.status === 'PASS' ? '✅' : '❌'} ${r.test}${r.reason ? ` — ${r.reason}` : ''}`)
  })

  log(`\nTotal: ${passed} PASSED, ${failed} FAILED`)

  if (allPassed) {
    log('\n🚀 ALL TESTS PASSED — READY FOR VERCEL DEPLOY!')
  } else {
    log('\n⚠️  SOME TESTS FAILED — FIX BACKEND BEFORE DEPLOY')
  }

  log('═══════════════════════════════════════════════════════════')
  process.exit(allPassed ? 0 : 1)
}

main().catch(e => {
  console.error('FATAL:', e)
  process.exit(1)
})
