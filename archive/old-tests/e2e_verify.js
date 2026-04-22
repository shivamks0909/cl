const { createClient } = require('@supabase/supabase-js');
const http = require('http');

console.log('--- STARTING COMBINED E2E VERIFICATION ---');

const url = "https://czzbduzmwzoumgzfryou.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emJkdXptd3pvdW1nemZyeW91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE5ODE1MiwiZXhwIjoyMDg3Nzc0MTUyfQ.nNehLISal91FLh8Yy6Y04axIM0BTPozTps8l-HDMG00";
const supabase = createClient(url, key);

async function run() {
    try {
        // 1. Setup Project
        const code = 'e2e_' + Math.floor(Math.random() * 999);
        const testUid = 'user_' + Math.floor(Math.random() * 9999);
        const { data: client } = await supabase.from('clients').select('id').limit(1).single();
        await supabase.from('projects').insert([{
            client_id: client.id,
            project_code: code,
            base_url: 'https://survey.example.com/s?pid=VENDOR_123&uid=[UID]',
            client_pid_param: 'pid',
            client_uid_param: 'uid',
            oi_prefix: 'oi_',
            status: 'active'
        }]);
        console.log('1. Project created:', code);

        // 2. Mock Track
        const trackUrl = `http://127.0.0.1:3000/track?code=${code}&uid=${testUid}&supplier=SUP_E2E`;
        const session = await new Promise((resolve, reject) => {
            http.get(trackUrl, (res) => {
                const loc = res.headers.location;
                console.log('2. Redirect Location:', loc);
                const s = new URL(loc).searchParams.get('oi_session');
                resolve(s);
            }).on('error', reject);
        });
        console.log('3. Session extracted:', session);

        // 3. Mock Callback
        const cbUrl = `http://127.0.0.1:3000/api/callback?oi_session=${session}&status=complete`;
        const cbBody = await new Promise((resolve, reject) => {
            http.get(cbUrl, (res) => {
                let d = '';
                res.on('data', c => d += c);
                res.on('end', () => resolve(d));
            }).on('error', reject);
        });
        console.log('4. Callback Response:', cbBody);

        // 4. Final DB Check
        const { data: resp } = await supabase.from('responses').select('status, supplier, uid').eq('oi_session', session).single();
        console.log('5. Final DB Record:', JSON.stringify(resp));

        if (resp.status === 'complete' && resp.supplier === 'SUP_E2E' && resp.uid === testUid) {
            console.log('\n✅ VERIFICATION SUCCESS: End-to-end flow confirmed!');
        } else {
            console.log('\n❌ VERIFICATION FAILURE: End-to-end data mismatch.');
        }
        process.exit(0);

    } catch (err) {
        console.error('Fatal Error:', err.message);
        process.exit(1);
    }
}

run();
setTimeout(() => { console.log('Final Timeout'); process.exit(1); }, 30000);
