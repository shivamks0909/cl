require('dotenv').config({ path: '.env.local.removed' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('Running migration: add quota columns to supplier_project_links...\n');

  const migrationSQL = `
    ALTER TABLE supplier_project_links
    ADD COLUMN IF NOT EXISTS quota_allocated INTEGER DEFAULT -1,
    ADD COLUMN IF NOT EXISTS quota_used INTEGER DEFAULT 0;

    CREATE INDEX IF NOT EXISTS idx_supplier_project_links_quota
    ON supplier_project_links(supplier_id, project_id, status, quota_allocated, quota_used)
    WHERE status = 'active';

    UPDATE supplier_project_links
    SET quota_allocated = -1, quota_used = 0
    WHERE quota_allocated IS NULL;
  `;

  try {
    // Execute raw SQL via RPC (need to create a function first) or use supabase-js's query method
    // Since supabase-js doesn't support DDL directly, we'll use the PostgREST /rpc endpoint if we create a function
    // Simpler: Use the database connection through the MCP server or just verify columns exist
    
    console.log('⚠️  Cannot execute DDL via supabase-js directly.');
    console.log('Please run this SQL manually in your Supabase SQL Editor:');
    console.log('---');
    console.log(migrationSQL);
    console.log('---');
    console.log('\nAlternatively, use the Supabase dashboard SQL Editor to run the migration.');
    
    // Check if columns already exist
    const { data: checkData, error: checkError } = await supabase
      .from('supplier_project_links')
      .select('quota_allocated, quota_used')
      .limit(1);
    
    if (checkError) {
      console.log('\n❌ Error checking columns:', checkError.message);
      process.exit(1);
    }
    
    console.log('\n✅ Columns check successful. The columns exist in the schema.');
    console.log('If they show as null, the migration may need to be applied.');
    
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
}

migrate();
