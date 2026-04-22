import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Missing Supabase env vars')
  process.exit(1)
}

async function test() {
  try {
    const supabase = createClient(url, key)
    const { data, error } = await supabase.from('projects').select('id').eq('status', 'active').limit(1)
    
    if (error) {
      console.error('Supabase query failed:', error)
      process.exit(1)
    }
    
    console.log('SUCCESS: Connected to Supabase')
    console.log('Data:', data)
    console.log('Source: supabase')
    process.exit(0)
  } catch (err) {
    console.error('Connection error:', err)
    process.exit(1)
  }
}

test()
