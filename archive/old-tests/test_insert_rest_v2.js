const https = require('https');

const data = JSON.stringify({
    project_code: 'dasdasd',
    uid: 'TTT01',
    clickid: 'TTT01',
    status: 'in_progress',
    project_id: '2882f51e-3538-4b3f-83b5-f8f1078ee5df'
});

const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhob25ucW50bWZqaGV5ZW5lYWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTYwODE5MCwiZXhwIjoyMDg3MTg0MTkwfQ.ZIXF0B1DPde80olfKF_v7gcArHkhLGTmGOdwF3f_k_M';

const options = {
    hostname: 'hhonnqntmfjheyeneain.supabase.co',
    port: 443,
    path: '/rest/v1/responses',
    method: 'POST',
    headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('Status code:', res.statusCode);
        try {
            console.log('Response:', JSON.stringify(JSON.parse(body), null, 2));
        } catch (e) {
            console.log('Raw Response:', body);
        }
    });
});

req.on('error', (e) => console.error('Error:', e));
req.write(data);
req.end();
