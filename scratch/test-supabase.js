const { createClient } = require('@supabase/supabase-js');

// Load env from .env.local
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  Object.assign(process.env, envConfig);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.log('❌ Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('🔍 Testing Supabase connection...');
console.log('URL:', url);

const supabase = createClient(url, key);

// Test connection by querying projects table
supabase.from('projects').select('count', { count: 'exact' }).limit(1)
  .then(res => {
    if (res.error) {
      console.log('❌ Supabase connection FAILED:', res.error.message);
      process.exit(1);
    }
    console.log('✅ Supabase connection LIVE');
    console.log('Response status:', res.status);
    console.log('Count:', res.count);
    process.exit(0);
  })
  .catch(err => {
    console.log('❌ Supabase connection FAILED:', err.message);
    process.exit(1);
  });
