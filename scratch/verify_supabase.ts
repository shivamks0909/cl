import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verify() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('project_code', 'QC_4343234227682')

  if (error) {
    console.error('Supabase query error:', error)
  } else {
    console.log('Project in Supabase database:', JSON.stringify(data, null, 2))
  }
}

verify()
