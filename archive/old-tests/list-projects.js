require('dotenv').config({ path: '.env.local.removed' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listProjects() {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id, project_code, status, base_url, pid_prefix, is_multi_country, country_urls')
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`\n=== TOTAL PROJECTS: ${data.length} ===\n`);
    data.forEach((p, i) => {
      console.log(`${i+1}. ${p.project_code} (${p.status})`);
      console.log(`   ID: ${p.id}`);
      console.log(`   Base URL: ${p.base_url}`);
      if (p.pid_prefix) console.log(`   PID Prefix: ${p.pid_prefix}`);
      if (p.is_multi_country) console.log(`   Multi-country: YES`);
      if (p.country_urls) console.log(`   Countries: ${p.country_urls}`);
      console.log('');
    });

    // Also check for test projects that tests expect
    const testCodes = ['TEST_SINGLE', 'TEST_PAUSED', 'TEST_MULTI', 'DYNAMIC_ENTRY'];
    console.log('=== TEST PROJECTS STATUS ===');
    for (const code of testCodes) {
      const exists = data.some(p => p.project_code === code);
      console.log(`${code}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

listProjects();
