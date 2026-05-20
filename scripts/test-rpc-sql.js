const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: ['.env.local', '.env'] });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

async function testRpcSql() {
  const supabase = createClient(url, key);
  
  try {
    console.log('Testing run_raw_sql RPC function...');
    const { data, error } = await supabase.rpc('run_raw_sql', { sql: 'SELECT 1 as test' });
    if (error) {
      console.log('run_raw_sql error:', error.message);
    } else {
      console.log('run_raw_sql success:', data);
      return;
    }

    console.log('Testing exec_sql RPC function...');
    const { data: data2, error: error2 } = await supabase.rpc('exec_sql', { sql: 'SELECT 1 as test' });
    if (error2) {
      console.log('exec_sql error:', error2.message);
    } else {
      console.log('exec_sql success:', data2);
      return;
    }

    console.log('No SQL execution RPC function found.');
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testRpcSql();
