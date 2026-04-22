import { createClient } from '@supabase/supabase-js'

const url = 'https://qvgrzxuonxhwnxitnfvk.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2Z3J6eHVvbnhod254aXRuZnZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjkzOTUsImV4cCI6MjA5MTk0NTM5NX0.staDuV_QCJuDsO39p4ErzB7sJmCBb4ukGxBuDAAuhNg'

async function test() {
  try {
    const supabase = createClient(url, key)
    const { data, error } = await supabase.from('projects').select('id').eq('status', 'active').limit(1)
    
    if (error) throw error
    
    console.log('SUCCESS: Supabase connection established')
    console.log('Data retrieved:', data)
    process.exit(0)
  } catch (err) {
    console.error('FAILED:', err.message || err)
    process.exit(1)
  }
}

test()
