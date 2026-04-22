const https = require('https');

const url = 'https://hhonnqntmfjheyeneain.supabase.co/rest/v1/responses?uid=eq.TTT01&select=id,uid,clickid,status,created_at&order=created_at.desc';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhob25ucW50bWZqaGV5ZW5lYWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTYwODE5MCwiZXhwIjoyMDg3MTg0MTkwfQ.ZIXF0B1DPde80olfKF_v7gcArHkhLGTmGOdwF3f_k_M';

const options = {
    method: 'GET',
    headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    }
};

const req = https.request(url, options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        try {
            console.log('Results:', JSON.stringify(JSON.parse(body), null, 2));
        } catch (e) {
            console.log('Error parsing response:', body);
        }
    });
});

req.on('error', (e) => console.error('Request error:', e));
req.end();
