const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: ['.env.local', '.env'] });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

async function listFunctions() {
  const supabase = createClient(url, key);
  
  try {
    console.log('Listing schema tables...');
    const { data: tables, error: err1 } = await supabase.from('information_schema.tables').select('table_name').eq('table_schema', 'public');
    if (err1) {
      console.error('Error listing tables:', err1);
    } else {
      console.log('Tables:', tables.map(t => t.table_name).join(', '));
    }

    console.log('\nListing routines (functions) in public schema...');
    const { data: routines, error: err2 } = await supabase.from('information_schema.routines').select('routine_name').eq('routine_schema', 'public');
    if (err2) {
      console.error('Error listing routines:', err2);
    } else {
      console.log('Routines:', routines.map(r => r.routine_name).join(', '));
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

listFunctions();
