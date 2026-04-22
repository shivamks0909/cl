require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    // Test connection by querying projects
    const { count, error } = await supabase.from('projects').select('*', { count: 'exact', head: true });
    if (error) throw error;
    console.log('SUCCESS: Connected to Supabase');
    console.log('Projects count:', count);
    
    // Check other critical tables
    const tables = ['suppliers', 'responses', 'audit_logs', 's2s_config'];
    for (const table of tables) {
      const { count: c } = await supabase.from(table).select('*', { count: 'exact', head: true });
      console.log(table + ':', c);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Connection failed:', err.message);
    if (err.code === 'ENOTFOUND') {
      console.error('DNS resolution failed - check Supabase URL');
    }
    process.exit(1);
  }
}

test();
