const https = require('https');

const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhob25ucW50bWZqaGV5ZW5lYWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTYwODE5MCwiZXhwIjoyMDg3MTg0MTkwfQ.ZIXF0B1DPde80olfKF_v7gcArHkhLGTmGOdwF3f_k_M';
const hostname = 'hhonnqntmfjheyeneain.supabase.co';

function apiRequest(path, method, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname,
            path: '/rest/v1' + path,
            method,
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
            res.on('end', () => resolve({ status: res.statusCode, data: data }));
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function main() {
    try {
        console.log('Step 1: Finding record TTT01...');
        const find = await apiRequest('/responses?clickid=eq.TTT01&status=in.(in_progress,started)', 'GET');
        const records = JSON.parse(find.data);

        if (records.length === 0) {
            console.log('No record found with clickid TTT01 and status in_progress/started.');
            return;
        }

        const record = records[0];
        console.log(`Found record: ${record.id} with status: ${record.status}`);

        console.log('Step 2: Updating to quotafull...');
        const update = await apiRequest(`/responses?id=eq.${record.id}`, 'PATCH', {
            status: 'quotafull',
            updated_at: new Date().toISOString()
        });

        console.log('Update Status:', update.status);
        console.log('Update Data:', update.data);

    } catch (err) {
        console.error('Error:', err);
    }
}

main();
