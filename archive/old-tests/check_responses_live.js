import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qvgrzxuonxhwnxitnfvk.supabase.co'
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!key) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key)

async function checkResponses() {
  const { data, error } = await supabase
    .from('responses')
    .select('id, uid, source, supplier_id, supplier_uid, supplier_token, supplier_name, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Query error:', error)
    process.exit(1)
  }

  console.log('=== LATEST 10 RESPONSES ===')
  console.log(JSON.stringify(data, null, 2))
  console.log('============================')
  
  // Specific check for OPGHUS01
  const testUid = 'OPGHUS01'
  const testResp = data.find(r => r.uid === testUid)
  if (testResp) {
    console.log(`\n[CHECK] Found response for UID=${testUid}:`)
    console.log('  source:', testResp.source)
    console.log('  supplier_id:', testResp.supplier_id)
    console.log('  supplier_uid (token):', testResp.supplier_uid)
    console.log('  supplier_token:', testResp.supplier_token)
    console.log('  supplier_name:', testResp.supplier_name)
    console.log('  status:', testResp.status)
  } else {
    console.log(`\n[CHECK] No response found for UID=${testUid}`)
  }
}

checkResponses()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1) })
