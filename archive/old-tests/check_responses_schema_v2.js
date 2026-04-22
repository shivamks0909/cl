import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load .env.local manually
const envPath = join(process.cwd(), '.env.local')
try {
  const envContent = readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      if (key && value && !process.env[key]) {
        process.env[key] = value
      }
    }
  })
} catch (e) {
  console.warn('Could not load .env.local:', e.message)
}

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
