import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qvgrzxuonxhwnxitnfvk.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function checkResponsesSchema() {
  console.log('🔍 Querying responses table schema from Supabase...\n')
  
  // Try to get sample row to infer columns
  const { data: sample } = await supabase
    .from('responses')
    .select('*')
    .limit(1)
    .maybeSingle()
  
  if (sample) {
    console.log('Columns in responses table (from sample row):')
    Object.keys(sample).forEach(key => {
      console.log(`  - ${key}`)
    })
  } else {
    console.log('No rows in responses table')
  }
}

checkResponsesSchema()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
