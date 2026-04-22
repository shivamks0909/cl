const https = require('https');

const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhob25ucW50bWZqaGV5ZW5lYWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTYwODE5MCwiZXhwIjoyMDg3MTg0MTkwfQ.ZIXF0B1DPde80olfKF_v7gcArHkhLGTmGOdwF3f_k_M';
const hostname = 'hhonnqntmfjheyeneain.supabase.co';

async function testLookup() {
    // We want to find TTT01 by project_code and uid
    const pid = 'dasdasd';
    const uid = 'TTT01';

    console.log(`Testing lookup for pid=${pid}, uid=${uid}`);

    const options = {
        hostname,
        path: `/rest/v1/responses?project_code=eq.${pid}&uid=eq.${uid}&select=id,status`,
        method: 'GET',
        headers: { 'apikey': apiKey, 'Authorization': `Bearer ${apiKey}` }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log('Results (Exact):', data);

            // Try Case-Insensitive lookup
            const ilikeOptions = {
                hostname,
                path: `/rest/v1/responses?project_code=ilike.${pid}&uid=ilike.${uid}&select=id,status`,
                method: 'GET',
                headers: { 'apikey': apiKey, 'Authorization': `Bearer ${apiKey}` }
            };
            const ilikeReq = https.request(ilikeOptions, (ires) => {
                let idata = '';
                ires.on('data', (chunk) => idata += chunk);
                ires.on('end', () => {
                    console.log('Results (ILike):', idata);
                });
            });
            ilikeReq.end();
        });
    });
    req.end();
}

testLookup();
