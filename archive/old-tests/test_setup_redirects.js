import { createClient } from '@supabase/supabase-js'

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });



const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qvgrzxuonxhwnxitnfvk.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[SETUP] Missing SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function setupTestData() {
  console.log('[SETUP] Creating test data in Supabase...')

  // 1. Clean up old test responses for UID OPGHUS01
  console.log('[SETUP] Cleaning up old test responses for UID=OPGHUS01')
  const { error: deleteError } = await supabase
    .from('responses')
    .delete()
    .in('uid', ['OPGHUS01', 'TEST_UID_REDIRECT'])
  if (deleteError) {
    console.warn('[SETUP] Cleanup warning:', deleteError.message)
  } else {
    console.log('[SETUP] Cleanup complete')
  }

  // 2. Find or Create Project: TEST_REDIRECT_PROJECT
  console.log('[SETUP] Ensuring project TEST_REDIRECT_PROJECT exists')
  const { data: existingProject } = await supabase
    .from('projects')
    .select('id, project_code, pid_prefix, pid_counter, base_url')
    .eq('project_code', 'TEST_REDIRECT_PROJECT')
    .maybeSingle()

  let projectId
  if (existingProject) {
    projectId = existingProject.id
    console.log('[SETUP] Found existing project id:', projectId)
    const { error: upErr } = await supabase
      .from('projects')
      .update({
        pid_prefix: 'TEST_PID_',
        pid_padding: 3,
        pid_counter: 0,
        base_url: 'https://track.opinioninsights.in/redirect/complete?pid={pid}&uid={uid}',
        project_name: 'TEST REDIRECT PROJECT',
        status: 'active'
      })
      .eq('id', projectId)
    if (upErr) console.warn('[SETUP] Update warning:', upErr.message)
    else console.log('[SETUP] Updated project PID config')
  } else {
    const { data: newProject, error: insertError } = await supabase
      .from('projects')
      .insert([{
        project_code: 'TEST_REDIRECT_PROJECT',
        project_name: 'TEST REDIRECT PROJECT',
        base_url: 'https://track.opinioninsights.in/redirect/complete?pid={pid}&uid={uid}',
        pid_prefix: 'TEST_PID_',
        pid_padding: 3,
        pid_counter: 0,
        status: 'active',
        source: 'test'
      }])
      .select('id')
      .single()
    if (insertError) {
      console.error('[SETUP] Failed to create project:', insertError)
      process.exit(1)
    }
    projectId = newProject.id
    console.log('[SETUP] Created new project with id:', projectId)
  }

  // 3. Find or Create Supplier: TEST_SUPPLIER_MACK (token = MACK)
  console.log('[SETUP] Ensuring supplier TEST_SUPPLIER_MACK exists (token=MACK)')
  const { data: existingSupplier } = await supabase
    .from('suppliers')
    .select('id, name, supplier_token')
    .eq('supplier_token', 'MACK')
    .maybeSingle()

  let supplierId
  if (existingSupplier) {
    supplierId = existingSupplier.id
    console.log('[SETUP] Found existing supplier id:', supplierId)
    const { error: upErr } = await supabase
      .from('suppliers')
      .update({
        name: 'TEST_SUPPLIER_MACK',
        complete_redirect_url: 'https://dashboard.mackinsights.com/redirect/complete?pid={pid}&uid={uid}',
        terminate_redirect_url: 'https://dashboard.mackinsights.com/redirect/terminate?pid={pid}&uid={uid}',
        quotafull_redirect_url: 'https://dashboard.mackinsights.com/redirect/quotafull?pid={pid}&uid={uid}',
        status: 'active'
      })
      .eq('id', supplierId)
    if (upErr) console.warn('[SETUP] Supplier update warning:', upErr.message)
    else console.log('[SETUP] Updated supplier redirect URLs')
  } else {
    const { data: newSupplier, error: insertError } = await supabase
      .from('suppliers')
      .insert([{
        name: 'TEST_SUPPLIER_MACK',
        supplier_token: 'MACK',
        complete_redirect_url: 'https://dashboard.mackinsights.com/redirect/complete?pid={pid}&uid={uid}',
        terminate_redirect_url: 'https://dashboard.mackinsights.com/redirect/terminate?pid={pid}&uid={uid}',
        quotafull_redirect_url: 'https://dashboard.mackinsights.com/redirect/quotafull?pid={pid}&uid={uid}',
        status: 'active'
      }])
      .select('id')
      .single()
    if (insertError) {
      console.error('[SETUP] Failed to create supplier:', insertError)
      process.exit(1)
    }
    supplierId = newSupplier.id
    console.log('[SETUP] Created new supplier with id:', supplierId)
  }

  // 4. Find or Create Supplier-Project Link
  console.log('[SETUP] Ensuring supplier-project link exists')
  const { data: existingLink } = await supabase
    .from('supplier_project_links')
    .select('id, quota_allocated, quota_used')
    .eq('supplier_id', supplierId)
    .eq('project_id', projectId)
    .maybeSingle()

  if (existingLink) {
    console.log('[SETUP] Found existing link, resetting quota (quota_allocated=1, quota_used=0)')
    const { error: upErr } = await supabase
      .from('supplier_project_links')
      .update({
        quota_allocated: 1,
        quota_used: 0,
        status: 'active'
      })
      .eq('id', existingLink.id)
    if (upErr) console.warn('[SETUP] Link update warning:', upErr.message)
    else console.log('[SETUP] Reset quota state')
  } else {
    const { data: newLink, error: insertError } = await supabase
      .from('supplier_project_links')
      .insert([{
        supplier_id: supplierId,
        project_id: projectId,
        quota_allocated: 1,
        quota_used: 0,
        status: 'active'
      }])
      .select('id')
      .single()
    if (insertError) {
      console.error('[SETUP] Failed to create link:', insertError)
      process.exit(1)
    }
    console.log('[SETUP] Created new supplier-project link id:', newLink.id)
  }

  console.log('\n[SETUP] ✓ Test data setup complete')
  console.log('----------------------------------------------------------------------')
  console.log('  Project Code : TEST_REDIRECT_PROJECT')
  console.log('  Project UUID : ' + projectId)
  console.log('  Supplier Token: MACK')
  console.log('  Supplier UUID : ' + supplierId)
  console.log('  Test UID      : OPGHUS01')
  console.log('----------------------------------------------------------------------')
  console.log('  Direct link  : https://track.opinioninsights.in/track?code=TEST_REDIRECT_PROJECT&uid=OPGHUS01')
  console.log('  Supplier link: https://track.opinioninsights.in/r/TEST_REDIRECT_PROJECT/MACK?uid=OPGHUS01')
  console.log('  Complete     : https://track.opinioninsights.in/redirect/complete?pid=TEST_PID_001&uid=OPGHUS01')
  console.log('  Terminate    : https://track.opinioninsights.in/redirect/terminate?pid=TEST_PID_001&uid=OPGHUS01')
  console.log('  QuotaFull    : https://track.opinioninsights.in/redirect/quotafull?pid=TEST_PID_001&uid=OPGHUS01')
  console.log('----------------------------------------------------------------------')

  return { projectId, supplierId }
}

async function verifySetup() {
  console.log('\n[VERIFY] Current database state:')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, project_code, pid_prefix, pid_counter, base_url, status')
    .eq('project_code', 'TEST_REDIRECT_PROJECT')
  console.log('\nProject:', JSON.stringify(projects, null, 2))

  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('id, name, supplier_token, complete_redirect_url, terminate_redirect_url, quotafull_redirect_url, status')
    .eq('supplier_token', 'MACK')
  console.log('\nSupplier:', JSON.stringify(suppliers, null, 2))

  if (suppliers?.[0]?.id) {
    const { data: links } = await supabase
      .from('supplier_project_links')
      .select('id, supplier_id, project_id, quota_allocated, quota_used, status')
      .eq('supplier_id', suppliers[0].id)
    console.log('\nLinks:', JSON.stringify(links, null, 2))
  }
}

setupTestData()
  .then(() => verifySetup())
  .then(() => {
    console.log('\n[SETUP] All done. Ready to run tests.')
    process.exit(0)
  })
  .catch(err => {
    console.error('[SETUP] Fatal error:', err.message || err)
    process.exit(1)
  })

