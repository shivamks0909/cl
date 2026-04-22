import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qvgrzxuonxhwnxitnfvk.supabase.co'
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, key)

async function checkSchema() {
  console.log('=== CHECKING RESPONSES TABLE SCHEMA ===')
  
  // Query information_schema for columns
  const { data, error } = await supabase
    .from('responses')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Query error:', error)
    // Try to get column list by fetching with wrong column name
    return
  }

  if (data && data.length > 0) {
    console.log('Actual columns in responses table:')
    Object.keys(data[0]).forEach(col => {
      console.log(' -', col, '=', typeof data[0][col], ':', data[0][col] === null ? 'NULL' : String(data[0][col]).substring(0, 60))
    })
  } else {
    console.log('No rows found but table exists')
    // Insert a temporary row to check schema
    const { data: test, error: insErr } = await supabase
      .from('responses')
      .select('*')
      .eq('status', 'nonexistent_status')
      .limit(1)
    // This won't work either, but let's try querying the information schema directly
    const { data: cols, error: colErr } = await supabase
      .rpc('execute_sql', { query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'responses' AND table_schema = 'public' ORDER BY ordinal_position" })
    console.log('Column query result:', JSON.stringify(cols, null, 2), colErr)
  }
  
  console.log('\n=== CHECKING SUPPLIERS TABLE SCHEMA ===')
  const { data: sd, error: se } = await supabase
    .from('suppliers')
    .select('*')
    .limit(1)

  if (sd && sd.length > 0) {
    console.log('Actual columns in suppliers table:')
    Object.keys(sd[0]).forEach(col => {
      console.log(' -', col, ':', String(sd[0][col]).substring(0, 80))
    })
  } else {
    console.log('suppliers:', JSON.stringify(sd, null, 2), se)
  }
  
  console.log('\n=== CHECKING supplier_project_links TABLE SCHEMA ===')
  const { data: ld, error: le } = await supabase
    .from('supplier_project_links')
    .select('*')
    .limit(1)

  if (ld && ld.length > 0) {
    console.log('Actual columns in supplier_project_links:')
    Object.keys(ld[0]).forEach(col => {
      console.log(' -', col, ':', String(ld[0][col]).substring(0, 80))
    })
  } else {
    console.log('supplier_project_links:', JSON.stringify(ld, null, 2), le)
  }
}

checkSchema()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1) })
