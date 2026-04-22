const https = require('https');

const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhob25ucW50bWZqaGV5ZW5lYWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTYwODE5MCwiZXhwIjoyMDg3MTg0MTkwfQ.ZIXF0B1DPde80olfKF_v7gcArHkhLGTmGOdwF3f_k_M';
const hostname = 'hhonnqntmfjheyeneain.supabase.co';

async function simulateLandingUpdate() {
    // Record for TTT01: cede48ee-de76-4bf2-ad2e-bd14ebde51cb
    const id = 'cede48ee-de76-4bf2-ad2e-bd14ebde51cb';

    console.log('--- Step 1: Verify current status ---');
    const checkOptions = {
        hostname,
        path: `/rest/v1/responses?id=eq.${id}`,
        method: 'GET',
        headers: { 'apikey': apiKey, 'Authorization': `Bearer ${apiKey}` }
    };

    const checkReq = https.request(checkOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            const resp = JSON.parse(data)[0];
            console.log('Current status:', resp.status);

            if (resp.status !== 'in_progress') {
                console.log('Record is already updated! Skipping...');
                return;
            }

            console.log('\n--- Step 2: Simulate updateResponseStatus logic ---');
            // Mocking the update payload
            const updatePayload = {
                status: 'complete',
                updated_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
                hash: 'TTT01',
                last_landing_page: 'complete'
            };

            const updateOptions = {
                hostname,
                path: `/rest/v1/responses?id=eq.${id}&status=in.("in_progress","started")`,
                method: 'PATCH',
                headers: {
                    'apikey': apiKey,
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                }
            };

            const updateReq = https.request(updateOptions, (updateRes) => {
                let updateData = '';
                updateRes.on('data', (chunk) => updateData += chunk);
                updateRes.on('end', () => {
                    console.log('Update Status Code:', updateRes.statusCode);
                    console.log('Update Response:', updateData);
                });
            });
            updateReq.on('error', (e) => console.error(e));
            updateReq.write(JSON.stringify(updatePayload));
            updateReq.end();
        });
    });
    checkReq.on('error', (e) => console.error(e));
    checkReq.end();
}

simulateLandingUpdate();
