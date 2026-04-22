require('dotenv').config({ path: '.env.local.removed' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local.removed');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🔧 Applying database migration...\n');

  const migrationSQL = `
    -- Add quota columns to supplier_project_links
    ALTER TABLE supplier_project_links 
      ADD COLUMN IF NOT EXISTS quota_allocated INTEGER DEFAULT -1,
      ADD COLUMN IF NOT EXISTS quota_used INTEGER DEFAULT 0;
    
    -- Add S2S config columns
    ALTER TABLE s2s_config 
      ADD COLUMN IF NOT EXISTS require_s2s_for_complete BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS allow_test_mode BOOLEAN DEFAULT FALSE;
    
    -- Create index for quota queries
    CREATE INDEX IF NOT EXISTS idx_supplier_project_links_quota 
      ON supplier_project_links(supplier_id, project_id, status, quota_allocated, quota_used) 
      WHERE status = 'active';
    
    -- Initialize quota values for existing rows
    UPDATE supplier_project_links 
    SET quota_allocated = -1, quota_used = 0 
    WHERE quota_allocated IS NULL;
    
    -- Add updated_at column if missing
    ALTER TABLE supplier_project_links 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
    
    ALTER TABLE s2s_config 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
  `;

  try {
    // Try executing via RPC if we have a function, otherwise we'll use a workaround
    console.log('Attempting to execute DDL via Supabase client...');
    
    // Split into individual statements
    const statements = migrationSQL.split(';').filter(s => s.trim());
    
    for (const stmt of statements) {
      if (!stmt.trim()) continue;
      console.log(`Executing: ${stmt.substring(0, 50)}...`);
      
      try {
        // Use the PostgREST /rpc endpoint by calling a non-existent function with the SQL as a parameter?
        // That won't work. We need to use the sql=true query parameter or create an admin function.
        
        // Alternative: Use the Supabase management API if we have the service key
        // The service key can execute SQL via the /rest/v1/ endpoint with Prefer: params=...?
        
        // Actually, with service_role key, we can use the PostgREST API to execute SQL via the /rpc endpoint
        // if there's a function. But we don't have one.
        
        // Let's try using the pg_extension functions directly via RPC
        const { error } = await supabase.rpc('exec_sql', { sql: stmt }).catch(() => ({ error: { message: 'RPC not available' } }));
        
        if (error && error.message.includes('function') && error.message.includes('does not exist')) {
          console.log('   ⚠️  exec_sql function does not exist. Will need manual execution.');
          console.log('   Please run this SQL in Supabase SQL Editor:\n');
          console.log(migrationSQL);
          console.log('\n---');
          throw new Error('Migration requires manual SQL execution');
        }
      } catch (err) {
        console.log('   ⚠️  Could not execute automatically:', err.message);
        console.log('   This is expected if no admin RPC function exists.');
        console.log('   Please apply the migration manually in Supabase dashboard.\n');
        throw err;
      }
    }
    
    console.log('✅ Migration applied successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.log('\n📋 MANUAL MIGRATION REQUIRED:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Navigate to SQL Editor');
    console.log('4. Run the following:\n');
    console.log(migrationSQL);
    console.log('\n---');
    process.exit(1);
  }
}

applyMigration();
