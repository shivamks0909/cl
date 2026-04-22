require('dotenv').config({ path: '.env.local.removed' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupTestData() {
  try {
    console.log('🔧 Setting up test data (without quota columns)...\n');

    // 1. TEST_SINGLE
    console.log('1. Creating TEST_SINGLE project...');
    const { error: e1 } = await supabase
      .from('projects')
      .insert([{
        id: crypto.randomUUID(),
        project_code: 'TEST_SINGLE',
        project_name: 'Test Single Country',
        base_url: 'https://survey.example.com/complete?uid=[UID]',
        status: 'active',
        pid_prefix: 'TEST',
        pid_padding: 2,
        oi_prefix: 'oi_',
        client_pid_param: 'pid',
        client_uid_param: 'uid',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    if (e1 && e1.code !== '23505') throw e1;
    console.log('   ✅ Created/Verified TEST_SINGLE');

    // 2. TEST_PAUSED
    console.log('2. Creating TEST_PAUSED project...');
    const { error: e2 } = await supabase
      .from('projects')
      .insert([{
        id: crypto.randomUUID(),
        project_code: 'TEST_PAUSED',
        project_name: 'Test Paused Project',
        base_url: 'https://example.com/survey?uid=[UID]',
        status: 'paused',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    if (e2 && e2.code !== '23505') throw e2;
    console.log('   ✅ Created/Verified TEST_PAUSED');

    // 3. TEST_MULTI
    console.log('3. Creating TEST_MULTI project...');
    const { error: e3 } = await supabase
      .from('projects')
      .insert([{
        id: crypto.randomUUID(),
        project_code: 'TEST_MULTI',
        project_name: 'Test Multi-Country',
        base_url: 'https://survey.example.com/complete?uid=[UID]',
        status: 'active',
        is_multi_country: true,
        country_urls: JSON.stringify([
          { country_code: 'US', target_url: 'https://survey.example.com/us?uid=[UID]', active: true },
          { country_code: 'GB', target_url: 'https://survey.example.com/gb?uid=[UID]', active: true },
          { country_code: 'IN', target_url: 'https://survey.example.com/in?uid=[UID]', active: true }
        ]),
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    if (e3 && e3.code !== '23505') throw e3;
    console.log('   ✅ Created/Verified TEST_MULTI');

    // 4. DYNAMIC_ENTRY
    console.log('4. Creating DYNAMIC_ENTRY project...');
    const { error: e4 } = await supabase
      .from('projects')
      .insert([{
        id: crypto.randomUUID(),
        project_code: 'DYNAMIC_ENTRY',
        project_name: 'Dynamic Entry Project',
        base_url: 'https://example.com/survey?uid=[UID]',
        status: 'active',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    if (e4 && e4.code !== '23505') throw e4;
    console.log('   ✅ Created/Verified DYNAMIC_ENTRY');

    // 5. Supplier
    console.log('5. Creating test supplier...');
    const { error: e5 } = await supabase
      .from('suppliers')
      .insert([{
        id: crypto.randomUUID(),
        supplier_token: 'TEST_SUPPLIER',
        name: 'Test Supplier',
        status: 'active',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    if (e5 && e5.code !== '23505') throw e5;
    console.log('   ✅ Created/Verified supplier TEST_SUPPLIER');

    // 6. Supplier link (without quota columns for now)
    console.log('6. Creating supplier_project_link (no quota yet)...');
    const { data: proj } = await supabase.from('projects').select('id').eq('project_code', 'TEST_SINGLE').single();
    const { data: sup } = await supabase.from('suppliers').select('id').eq('supplier_token', 'TEST_SUPPLIER').single();

    // Try to insert with quota if columns exist, otherwise without
    try {
      const { error: e6 } = await supabase
        .from('supplier_project_links')
        .insert([{
          id: crypto.randomUUID(),
          supplier_id: sup.id,
          project_id: proj.id,
          status: 'active',
          quota_allocated: 10,
          quota_used: 0,
          created_at: new Date().toISOString()
        }]);
      if (e6 && e6.code !== '23505') {
        if (e6.message.includes('quota_allocated')) {
          console.log('   ⚠️  Quota columns not yet added. Inserting without quota...');
          const { error: e6b } = await supabase
            .from('supplier_project_links')
            .insert([{
              id: crypto.randomUUID(),
              supplier_id: sup.id,
              project_id: proj.id,
              status: 'active',
              created_at: new Date().toISOString()
            }]);
          if (e6b && e6b.code !== '23505') throw e6b;
          console.log('   ✅ Created supplier link (quota columns pending migration)');
        } else {
          throw e6;
        }
      } else {
        console.log('   ✅ Supplier link already exists');
      }
    } catch (err) {
      throw err;
    }

    // 7. S2S config
    console.log('7. Creating S2S config...');
    const { error: e7 } = await supabase
      .from('s2s_config')
      .insert([{
        id: crypto.randomUUID(),
        project_id: proj.id,
        secret_key: 'test-secret-key-12345',
        require_s2s_for_complete: true,
        unverified_action: 'log_only',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    if (e7 && e7.code !== '23505') throw e7;
    console.log('   ✅ Created/Verified S2S config');

    console.log('\n✅ Test data setup complete!');
    console.log('\n⚠️  NEXT STEP: Apply the quota migration!');
    console.log('   Run this SQL in Supabase SQL Editor:');
    console.log('   ---');
    console.log('   ALTER TABLE supplier_project_links ADD COLUMN IF NOT EXISTS quota_allocated INTEGER DEFAULT -1, ADD COLUMN IF NOT EXISTS quota_used INTEGER DEFAULT 0;');
    console.log('   CREATE INDEX IF NOT EXISTS idx_supplier_project_links_quota ON supplier_project_links(supplier_id, project_id, status, quota_allocated, quota_used) WHERE status = \'active\';');
    console.log('   UPDATE supplier_project_links SET quota_allocated = -1, quota_used = 0 WHERE quota_allocated IS NULL;');
    console.log('   ---');
    console.log('\n📝 Test URLs:');
    console.log('  - Direct: https://april-ilety69y8-cypher1446-oss-projects.vercel.app/r/TEST_SINGLE/DYN01/UID123');
    console.log('  - Supplier: https://april-ilety69y8-cypher1446-oss-projects.vercel.app/r/TEST_SINGLE/TEST_SUPPLIER/UID456');
    console.log('  - Paused: https://april-ilety69y8-cypher1446-oss-projects.vercel.app/r/TEST_PAUSED/DYN01/UID789');
    console.log('  - Multi-country: https://april-ilety69y8-cypher1446-oss-projects.vercel.app/r/TEST_MULTI/DYN01/UID101?country=US');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Setup failed:', err.message);
    if (err.code) console.error('Code:', err.code);
    process.exit(1);
  }
}

setupTestData();
