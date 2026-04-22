const { Client } = require('pg');

// Use IPv6 address directly
const connectionString = 'postgresql://postgres:kfITNCWTN56M99NY@[2406:da1a:6b0:f609:5fa8:ab52:a3ac:ca26]:5432/postgres?sslmode=require';

const client = new Client({ connectionString });

async function applyMigration() {
  console.log('🔧 Connecting via IPv6...');
  try {
    await client.connect();
    console.log('✅ Connected\n');
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    console.log('\nPossible issues:');
    console.log('- IPv6 not enabled on this network');
    console.log('- Firewall blocks port 5432');
    console.log('- SSL handshake failed\n');
    process.exit(1);
  }

  const migrationSQL = `
    ALTER TABLE supplier_project_links 
      ADD COLUMN IF NOT EXISTS quota_allocated INTEGER DEFAULT -1,
      ADD COLUMN IF NOT EXISTS quota_used INTEGER DEFAULT 0;
    
    ALTER TABLE s2s_config 
      ADD COLUMN IF NOT EXISTS require_s2s_for_complete BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS allow_test_mode BOOLEAN DEFAULT FALSE;
    
    CREATE INDEX IF NOT EXISTS idx_supplier_project_links_quota 
      ON supplier_project_links(supplier_id, project_id, status, quota_allocated, quota_used) 
      WHERE status = 'active';
    
    UPDATE supplier_project_links 
    SET quota_allocated = -1, quota_used = 0 
    WHERE quota_allocated IS NULL;
  `;

  try {
    console.log('Executing migration...\n');
    const statements = migrationSQL.split(';').filter(s => s.trim());
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (!stmt) continue;
      try {
        await client.query(stmt);
        console.log(`✅ ${stmt.substring(0, 60)}...`);
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('duplicate')) {
          console.log(`⚠️  ${err.message}`);
        } else {
          throw err;
        }
      }
    }
    console.log('\n✅ Migration applied!\n');
    
    // Verify
    const { rows } = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'supplier_project_links' 
      AND column_name IN ('quota_allocated', 'quota_used')
    `);
    console.log('Verification:', rows.map(r => r.column_name).join(', ') || 'columns not found');
    
  } catch (err) {
    console.error('\n❌ Migration error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
