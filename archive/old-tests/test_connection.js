const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = envFile.split('\n').reduce((acc, line) => {
    const [key, ...val] = line.split('=');
    if (key && val) acc[key.trim()] = val.join('=').trim();
    return acc;
}, {});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Testing connection to Supabase...', supabaseUrl);
    const { data, error } = await supabase.from('users').select('*').limit(1);
    if (error) {
        if (error.code === '42P01') {
            console.error('SCHEMA_MISSING: users table does not exist.');

            // Attempt to apply schema
            const schema = fs.readFileSync('supabase_schema.sql', 'utf8');
            console.log('Attempting to apply schema via RPC or manual check...');
            // Note: applying raw SQL via supabase-js client is typically done via RPC, which requires a custom function, or we just tell the user.
            // But let's see if there's a way. Supabase JS doesn't have a direct `execute_sql` method for security reasons unless we use postgres connection string.
        } else {
            console.error('Connection Error:', error);
        }
    } else {
        console.log('Connection successful and schema is present!');
    }
}

checkSchema();
