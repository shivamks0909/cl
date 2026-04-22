const https = require('https');

const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhob25ucW50bWZqaGV5ZW5lYWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTYwODE5MCwiZXhwIjoyMDg3MTg0MTkwfQ.ZIXF0B1DPde80olfKF_v7gcArHkhLGTmGOdwF3f_k_M';
const hostname = 'hhonnqntmfjheyeneain.supabase.co';

async function checkProjectStatusConstraint() {
    // We try to update a test project to 'deleted' to see if it fails and what the error says
    // or we try to insert a dummy row that we know will fail to see the check constraint in the error message if possible.
    // Better yet, I'll try to update a project to 'deleted' and see the error.

    const body = { status: 'deleted' };
    const options = {
        hostname,
        path: '/rest/v1/projects?id=eq.00000000-0000-0000-0000-000000000000', // invalid id but check if it gives constraint error or not found
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

checkProjectStatusConstraint();
