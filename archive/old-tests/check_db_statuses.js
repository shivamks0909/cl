const https = require('https');

const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhob25ucW50bWZqaGV5ZW5lYWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTYwODE5MCwiZXhwIjoyMDg3MTg0MTkwfQ.ZIXF0B1DPde80olfKF_v7gcArHkhLGTmGOdwF3f_k_M';
const hostname = 'hhonnqntmfjheyeneain.supabase.co';

async function checkConstraint() {
    // We can't query information_schema easily via REST unless we have a view or RPC.
    // However, I can try to guess or use the error message "quotafull" failed.
    // Let's try "quota_full" which was used before?
    // or better, I will try to update the constraint via a migration if I can.

    // I previously saw "quotafull" in statusMap in callback route.
    // Wait! Let's look at what statuses are CURRENTLY in the DB.

    const url = '/responses?select=status';
    const options = {
        hostname,
        path: '/rest/v1' + url,
        method: 'GET',
        headers: {
            'apikey': apiKey,
            'Authorization': `Bearer ${apiKey}`
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            const statuses = JSON.parse(data).map(r => r.status);
            console.log('Unique statuses in DB:', [...new Set(statuses)]);
        });
    });
    req.end();
}

checkConstraint();
