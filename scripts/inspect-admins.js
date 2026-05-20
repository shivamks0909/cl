const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: ['.env.local', '.env'] });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

async function inspectAdmins() {
  const supabase = createClient(url, key);
  
  try {
    console.log('Querying admins table...');
    const { data: admins, error: err1 } = await supabase.from('admins').select('id, email, role, created_at');
    if (err1) {
      console.error('Error querying admins:', err1);
    } else {
      console.log('Admins count:', admins.length);
      console.log('Admins:', JSON.stringify(admins, null, 2));
    }

    console.log('\nQuerying users table...');
    const { data: users, error: err2 } = await supabase.from('users').select('id, email, role, created_at');
    if (err2) {
      console.error('Error querying users:', err2);
    } else {
      console.log('Users count:', users.length);
      console.log('Users:', JSON.stringify(users, null, 2));
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

inspectAdmins();
