require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test basic connection
    const { data, error } = await supabase.from('responses').select('count').limit(1);
    if (error) throw error;
    console.log('✅ Supabase connection successful\n');
    
    // Get table counts
    const tables = ['projects', 'suppliers', 'responses', 'audit_logs', 's2s_config', 'clients'];
    console.log('Database Schema:');
    for (const table of tables) {
      const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
      console.log('  ✓ ' + table + ': ' + (count || 0) + ' rows');
    }
    
    // Check for recent activity
    const { data: recent } = await supabase
      .from('responses')
      .select('id, project_code, uid, status, created_at')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (recent && recent.length > 0) {
      console.log('\nRecent responses:');
      recent.forEach(r => {
        console.log('  - ' + r.project_code + ' / ' + r.uid + ' / ' + r.status + ' (' + r.created_at + ')');
      });
    }
    
    console.log('\n✅ Database check complete');
  } catch (err) {
    console.error('❌ Supabase connection failed:', err.message);
    process.exit(1);
  }
}

testConnection();
