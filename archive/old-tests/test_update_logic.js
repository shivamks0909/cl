const https = require('https');

const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhob25ucW50bWZqaGV5ZW5lYWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTYwODE5MCwiZXhwIjoyMDg3MTg0MTkwfQ.ZIXF0B1DPde80olfKF_v7gcArHkhLGTmGOdwF3f_k_M';
const baseUrl = 'https://hhonnqntmfjheyeneain.supabase.co/rest/v1';

function request(path, method, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'hhonnqntmfjheyeneain.supabase.co',
            port: 443,
            path: path,
            method: method,
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
            res.on('end', () => resolve({ status: res.statusCode, body: body }));
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function runTest() {
    console.log('Searching for record...');
    const findRes = await request('/responses?clickid=eq.TTT01&status=in.(in_progress,started)', 'GET');
    const findData = JSON.parse(findRes.body);

    if (findData.length === 0) {
        console.log('No record found.');
        return;
    }

    const existing = findData[0];
    console.log('Found record:', existing.id, 'Status:', existing.status);

    console.log('Updating...');
    const updatePayload = {
        status: 'quotafull',
        updated_at: new Date().toISOString()
    };

    const updateRes = await request(`/responses?id=eq.${existing.id}&status=in.(in_progress,started)`, 'PATCH', updatePayload);
    console.log('Update Status:', updateRes.status);
    console.log('Update Response:', updateRes.body);
}

runTest();
