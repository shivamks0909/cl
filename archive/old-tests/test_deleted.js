const https = require('https');

const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhob25ucW50bWZqaGV5ZW5lYWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTYwODE5MCwiZXhwIjoyMDg3MTg0MTkwfQ.ZIXF0B1DPde80olfKF_v7gcArHkhLGTmGOdwF3f_k_M';
const hostname = 'hhonnqntmfjheyeneain.supabase.co';

async function testDeletedStatus() {
    const body = { status: 'deleted' };
    const options = {
        hostname,
        path: '/rest/v1/projects?id=eq.2882f51e-3538-4b3f-83b5-f8f1078ee5df',
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

testDeletedStatus();
