require('dotenv').config({ path: ['.env.local', '.env'] });
const { createClient } = require('@supabase/supabase-js');

async function createKroGoogleTest() {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_ANON_KEY;

  if (!baseUrl || !apiKey) {
    console.error('Missing Supabase configuration. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_ANON_KEY) are set.');
    process.exit(1);
  }

  const supabase = createClient(baseUrl, apiKey);

  try {
    console.log('Connecting to database...');
    // Verify connection by checking health
    const { error: healthError } = await supabase.from('projects').select('id', { count: 'exact', head: true });
    if (healthError) throw new Error('DB connection failed: ' + healthError.message);

    // Generate unique project code with kro prefix and timestamp
    const timestamp = Date.now();
    const projectCode = `kro_google_test_${timestamp}`;

    console.log(`Creating project with code: ${projectCode}`);

    const { data: project, error: insertError } = await supabase
      .from('projects')
      .insert([{
        project_code: projectCode,
        project_name: 'KRO Google Test',
        base_url: 'https://www.google.com',
        project_landing_page_url: 'https://www.google.com',
        status: 'active',
        country: 'Global',
        is_multi_country: false,
        has_prescreener: false,
        prescreener_url: '',
        pid_prefix: '',
        pid_counter: 1,
        pid_padding: 2,
        force_pid_as_uid: false,
        target_uid: '',
        client_pid_param: '',
        client_uid_param: '',
        oi_prefix: 'oi_',
        uid_params: null,
        source: 'manual'
      }])
      .select('*')
      .single();

    if (insertError) {
      // Check for duplicate code (shouldn't happen)
      if (insertError.code === '23505') {
        console.error('Project code already exists. This should not happen with timestamp.');
      }
      throw insertError;
    }

    console.log('✅ Project created successfully!');
    console.log('\nProject details:');
    console.log(`  ID: ${project.id}`);
    console.log(`  Code: ${project.project_code}`);
    console.log(`  Name: ${project.project_name}`);
    console.log(`  Landing URL: ${project.project_landing_page_url}`);
    console.log(`  Status: ${project.status}`);

    const testLink = `http://localhost:3001/start/${projectCode}`;
    console.log('\n🧪 Test Link (direct flow):');
    console.log(`  ${testLink}`);
    console.log('\n👉 Open this URL in your browser, complete the survey, and you should be redirected to Google.');
    console.log('   You can use any UID; the system will generate one automatically.');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

createKroGoogleTest();
