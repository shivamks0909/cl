const https = require('https');

const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhob25ucW50bWZqaGV5ZW5lYWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTYwODE5MCwiZXhwIjoyMDg3MTg0MTkwfQ.ZIXF0B1DPde80olfKF_v7gcArHkhLGTmGOdwF3f_k_M';
const hostname = 'hhonnqntmfjheyeneain.supabase.co';

async function checkResponseConstraint() {
    // Try to update a dummy record to 'terminated' or 'quota_full' to see if it fails
    // We'll use the first record from the user's SQL: 5a74eab9-b09a-4d76-a8fd-5a1c91b9a971
    const body = { status: 'quota_full' };
    const options = {
        hostname,
        path: '/rest/v1/responses?id=eq.5a74eab9-b09a-4d76-a8fd-5a1c91b9a971',
        method: 'PATCH',
        headers: {
            'apikey': apiKey,
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log('Status Code:', res.statusCode);
            console.log('Response:', data);
        });
    });
    req.on('error', (e) => console.error(e));
    req.write(JSON.stringify(body));
    req.end();
}

checkResponseConstraint();
