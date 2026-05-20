const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: ['.env.local', '.env'] });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

async function checkSchema() {
  const supabase = createClient(url, key);
  
  console.log('Checking projects table columns...\n');
  
  try {
    const { data, error } = await supabase
      .rpc('get_column_names', { table_name: 'projects' });
    
    if (error) {
      console.log('RPC method not available, trying information_schema...');
      const { data: raw, error: rawError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'projects')
        .order('ordinal_position');
      
      if (rawError) {
        console.error('Query failed:', rawError);
        process.exit(1);
      }
      
      if (!raw || raw.length === 0) {
        console.error('No columns found!');
        process.exit(1);
      }
      
      const columns = raw.map((r) => r.column_name);
      console.log('Columns:', columns.join(', '));
      
      const required = ['complete_target', 'pid_prefix', 'pid_counter', 'pid_padding', 'force_pid_as_uid'];
      const missing = required.filter(c => !columns.includes(c));
      
      if (missing.length > 0) {
        console.log('\n❌ Missing columns:', missing.join(', '));
        process.exit(1);
      } else {
        console.log('\n✅ All required columns present');
      }
    } else {
      console.log('Columns via RPC:', data);
    }
  } catch (err) {
    console.error('Error checking schema:', err);
    process.exit(1);
  }
}

checkSchema();
