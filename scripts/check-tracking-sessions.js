const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Helper to load env variables from a file
function loadEnv(filePath) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) {
        process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
      }
    });
  }
}

// Load env files
loadEnv(path.join(__dirname, '..', '.env'));
loadEnv(path.join(__dirname, '..', '.env.local'));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL or Service/Anon Key not found in env variables.');
  process.exit(1);
}

async function check() {
  console.log('Connecting to Supabase at:', supabaseUrl);
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    const { data, error } = await supabase.from('tracking_sessions').select('*').limit(1);
    if (error) {
      console.log('Error querying tracking_sessions:', error.message);
      if (error.message.includes('relation "public.tracking_sessions" does not exist')) {
        console.log('RESULT: Table tracking_sessions DOES NOT exist in Supabase.');
      }
    } else {
      console.log('RESULT: Table tracking_sessions EXISTS! Found rows:', data);
    }
  } catch (e) {
    console.error('Exception:', e.message);
  }
}

check();
