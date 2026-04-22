const { createClient } = require('@supabase/supabase-js');
const http = require('http');

console.log('--- STARTING CALLBACK VERIFICATION ---');

const url = "https://czzbduzmwzoumgzfryou.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emJkdXptd3pvdW1nemZyeW91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE5ODE1MiwiZXhwIjoyMDg3Nzc0MTUyfQ.nNehLISal91FLh8Yy6Y04axIM0BTPozTps8l-HDMG00";
const supabase = createClient(url, key);

// The session from previous successful track
const session = "7e9fda10-ad17-4235-bf47-619dd6d22cbc";

async function run() {
    try {
        console.log('1. Checking initial status in DB...');
        const { data: initial } = await supabase.from('responses').select('status').eq('oi_session', session).single();
        console.log('   Initial Status:', initial?.status);

        console.log('2. Triggering Callback Request...');
        const callbackUrl = `http://127.0.0.1:3000/api/callback?oi_session=${session}&status=complete`;

        http.get(callbackUrl, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', async () => {
                console.log('   Response Body:', data);
                const json = JSON.parse(data);
                if (json.success) {
                    console.log('3. Verifying updated status in DB...');
                    const { data: updated } = await supabase.from('responses').select('status').eq('oi_session', session).single();
                    console.log('   Updated Status:', updated?.status);

                    if (updated?.status === 'complete') {
                        console.log('\n✅ VERIFICATION SUCCESS: Callback matching and DB update verified.');
                    } else {
                        console.log('\n❌ VERIFICATION FAILURE: DB status not updated.');
                    }
                }
                process.exit(0);
            });
        }).on('error', (e) => {
            console.error('Request error:', e.message);
            process.exit(1);
        });

    } catch (err) {
        console.error('Fatal Error:', err.message);
        process.exit(1);
    }
}

run();
setTimeout(() => { console.log('Timeout reached'); process.exit(1); }, 15000);
