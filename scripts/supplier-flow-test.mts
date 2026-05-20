import { config } from 'dotenv'
config({ path: ['.env', '.env.local', '.env.local.test'], override: true })

const { TrackingService } = await import('../lib/tracking-service')
const { createAdminClient } = await import('../lib/supabase-server')

async function testSupplierFlow() {
  console.log('──────── SUPPLIER FLOW TEST ────────\n')

  const db = await createAdminClient()
  if (!db) throw new Error('DB unavailable')

  const projectCode = 'OPI433'
  const supplierToken = 'GUDDU'
  const testUid = 'TESTSUPPLIER01'

  // CLEANUP
  await db.database.from('responses').delete().in('uid', [testUid]).eq('project_code', projectCode)
  console.log('✅ Cleaned up previous test data')

  // Fetch project ID
  const { data: project } = await db.database
    .from('projects')
    .select('id, project_code')
    .eq('project_code', projectCode)
    .maybeSingle()
  if (!project) throw new Error(`Project ${projectCode} not found`)
  const projectId = project.id

  // STEP 1: Entry via TrackingService.processEntry
  console.log('\nSTEP 1: Supplier entry via TrackingService.processEntry')
  const entryResult = await TrackingService.processEntry({
    projectId,
    supplierToken,
    rid: testUid,
    ip: '127.0.0.1',
    userAgent: 'test-agent',
    queryParams: {},
    source: 'supplier_test'
  })

  if (!entryResult.success || !entryResult.redirectUrl) {
    throw new Error(`Entry failed: ${JSON.stringify(entryResult)}`)
  }
  console.log('✅ Entry successful')
  console.log('   Redirect URL:', entryResult.redirectUrl)

  // Extract response data
  const response = entryResult.responseData
  if (!response) throw new Error('No response data returned')
  console.log('✅ Response row created:', { id: response.id, status: response.status, supplier_uid: response.supplier_uid, supplier_token: response.supplier_token, client_pid: response.client_pid, project_code: response.project_code })

  // Validate data
  if (response.project_code !== projectCode) {
    throw new Error(`Project code mismatch: expected ${projectCode}, got ${response.project_code}`)
  }
  if (response.supplier_uid !== testUid) {
    throw new Error(`Incoming UID not preserved: expected ${testUid}, got ${response.supplier_uid}`)
  }
  if (response.supplier_token !== supplierToken) {
    throw new Error(`Supplier token mismatch: expected ${supplierToken}, got ${response.supplier_token}`)
  }
  if (!response.client_pid) {
    throw new Error('client_pid not generated')
  }
  console.log('✅ Validation: project_code, incoming UID, supplier_token, client_pid correct')

  const responseId = response.id
  const clickid = response.clickid

  // STEP 2: Terminate callback
  console.log('\nSTEP 2: Terminate callback via localhost redirect')
  const terminateUrl = `http://localhost:3000/redirect/terminate?pid=${projectCode}&uid=${testUid}&clickid=${clickid}`
  const terminateResp = await fetch(terminateUrl)
  if (!terminateResp.ok) {
    throw new Error(`Terminate request failed: ${terminateResp.status}`)
  }
  console.log('✅ Terminate request succeeded')

  // Check response after terminate
  const { data: afterTerminate } = await db.database
    .from('responses')
    .select('status, completion_time')
    .eq('id', responseId)
    .single()

  if (afterTerminate.status !== 'terminate') {
    throw new Error(`Status not updated: expected terminate, got ${afterTerminate.status}`)
  }
  if (!afterTerminate.completion_time) {
    throw new Error('completion_time not set')
  }
  console.log('✅ Response updated to terminate with completion_time')

  // STEP 3: Dashboard metrics
  console.log('\nSTEP 3: Dashboard metrics')
  const { data: metrics } = await db.database
    .rpc('get_project_health_metrics')

  if (!metrics || metrics.length === 0) {
    throw new Error('Dashboard metrics not available')
  }
  const metric = metrics.find((m: any) => m.project_code === projectCode)
  if (!metric) {
    throw new Error(`No metrics found for project ${projectCode}`)
  }
  if (metric.terminates_today < 1) {
    throw new Error(`terminates_today should be >=1, got ${metric.terminates_today}`)
  }
  console.log('✅ Dashboard terminates_today incremented:', metric.terminates_today)

  // STEP 4: Complete callback
  console.log('\nSTEP 4: Complete callback')
  const completeUid = 'TESTSUPPLIER02'
  await db.database.from('responses').delete().eq('uid', completeUid).eq('project_code', projectCode)

  const entryResult2 = await TrackingService.processEntry({
    projectId,
    supplierToken,
    rid: completeUid,
    ip: '127.0.0.1',
    userAgent: 'test-agent',
    queryParams: {},
    source: 'supplier_test'
  })
  if (!entryResult2.success) throw new Error('Second entry failed')
  const response2 = entryResult2.responseData
  const completeUrl = `http://localhost:3000/redirect/complete?pid=${projectCode}&uid=${completeUid}&clickid=${response2.clickid}`
  const completeFetch = await fetch(completeUrl)
  if (!completeFetch.ok) throw new Error(`Complete callback failed: ${completeFetch.status}`)

  const { data: afterComplete } = await db.database
    .from('responses')
    .select('status')
    .eq('id', response2.id)
    .single()

  if (afterComplete.status !== 'complete') {
    throw new Error(`Complete status failed: got ${afterComplete.status}`)
  }
  console.log('✅ Complete callback succeeded')

  // STEP 5: Quota_full callback
  console.log('\nSTEP 5: Quota_full callback')
  const quotaUid = 'TESTSUPPLIER03'
  await db.database.from('responses').delete().eq('uid', quotaUid).eq('project_code', projectCode)

  const entryResult3 = await TrackingService.processEntry({
    projectId,
    supplierToken,
    rid: quotaUid,
    ip: '127.0.0.1',
    userAgent: 'test-agent',
    queryParams: {},
    source: 'supplier_test'
  })
  if (!entryResult3.success) throw new Error('Third entry failed')
  const response3 = entryResult3.responseData
  const quotaUrl = `http://localhost:3000/redirect/quotafull?pid=${projectCode}&uid=${quotaUid}&clickid=${response3.clickid}`
  const quotaFetch = await fetch(quotaUrl)
  if (!quotaFetch.ok) throw new Error(`Quota callback failed: ${quotaFetch.status}`)

  const { data: afterQuota } = await db.database
    .from('responses')
    .select('status')
    .eq('id', response3.id)
    .single()

  if (afterQuota.status !== 'quota_full') {
    throw new Error(`Quota status failed: got ${afterQuota.status}`)
  }
  console.log('✅ Quota_full callback succeeded')

  // FINAL CLEANUP
  await db.database.from('responses').delete().in('uid', [testUid, completeUid, quotaUid]).eq('project_code', projectCode)
  console.log('\n✅ Cleanup complete')

  console.log('\n========================================')
  console.log('SUPPLIER FLOW TEST: ALL PASSED')
  console.log('========================================')
}

testSupplierFlow().catch(e => {
  console.error('❌ TEST FAILED:', e)
  process.exit(1)
})
