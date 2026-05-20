const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: ['.env.local', '.env'] });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const tables = [
  'clients',
  'projects',
  'responses',
  'audit_logs',
  'suppliers',
  'supplier_project_links',
  's2s_config',
  's2s_logs',
  'tracking_sessions',
  'callback_events',
  'callback_logs',
  'users',
  'admins'
];

async function verifyTables() {
  const supabase = createClient(url, key);
  console.log('Verifying tables on Supabase project:', url);
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`❌ Table "${table}" does not exist`);
        } else {
          console.log(`⚠️  Table "${table}" error:`, error.message);
        }
      } else {
        console.log(`✅ Table "${table}" exists!`);
      }
    } catch (err) {
      console.log(`💥 Table "${table}" threw error:`, err.message);
    }
  }
}

verifyTables();
