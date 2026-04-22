const { createClient } = require('@supabase/supabase-js');
const http = require('http');

console.log('--- STARTING SIMPLIFIED VERIFICATION ---');

const url = "https://czzbduzmwzoumgzfryou.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emJkdXptd3pvdW1nemZyeW91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE5ODE1MiwiZXhwIjoyMDg3Nzc0MTUyfQ.nNehLISal91FLh8Yy6Y04axIM0BTPozTps8l-HDMG00";

const supabase = createClient(url, key);

async function run() {
    try {
        console.log('1. Connecting to Supabase...');
        const projectCode = 'verify_' + Math.floor(Math.random() * 1000);

        const { data: client } = await supabase.from('clients').select('id').limit(1).single();
        console.log('   Client found:', client.id);

        const { data: project, error } = await supabase.from('projects').insert([{
            client_id: client.id,
            project_code: projectCode,
            project_name: 'Verification Proj',
            base_url: 'https://survey.example.com/s?pid=EXISTING_PID&uid=[UID]',
            client_pid_param: 'pid',
            client_uid_param: 'uid',
            oi_prefix: 'oi_',
            status: 'active'
        }]).select().single();

        if (error) throw error;
        console.log('2. Project created:', projectCode);

        console.log('3. Triggering Tracking Request...');
        const trackUrl = `http://127.0.0.1:3000/track?code=${projectCode}&uid=TEST_USER&supplier=TEST_SUP`;

        http.get(trackUrl, (res) => {
            console.log('   Status:', res.statusCode);
            console.log('   Headers:', JSON.stringify(res.headers, null, 2));
            const location = res.headers.location;
            if (location) {
                console.log('4. Redirect Location:', location);
                const pidMatches = location.match(/pid=/g) || [];
                console.log('   "pid=" count:', pidMatches.length);
                if (pidMatches.length === 1 && location.includes('oi_session=')) {
                    console.log('\n✅ VERIFICATION SUCCESS: Param isolation confirmed.');
                } else {
                    console.log('\n❌ VERIFICATION FAILURE: Unexpected redirect URL.');
                }
            }
            process.exit(0);
        }).on('error', (e) => {
            console.error('   Request error:', e.message);
            process.exit(1);
        });

    } catch (err) {
        console.error('Fatal Error:', err.message);
        process.exit(1);
    }
}

run();
setTimeout(() => { console.log('Timeout reached'); process.exit(1); }, 20000);
