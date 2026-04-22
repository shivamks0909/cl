
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const http = require('http');
const fs = require('fs');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const PORT = 3004;
const RESULTS_FILE = 'scratch/test_results.json';

async function log(msg) {
    console.log(msg);
    fs.appendFileSync('scratch/test_log.txt', msg + '\n');
}

async function makeRequest(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
        }).on('error', reject);
    });
}

async function verify() {
    if (!fs.existsSync('scratch')) fs.mkdirSync('scratch');
    fs.writeFileSync('scratch/test_log.txt', 'Starting verification...\n');

    const results = {
        project_exists: false,
        supplier_exists: false,
        direct_link_works: false,
        supplier_link_works: false,
        responses_updated: false,
        errors: []
    };

    try {
        // 1. Check Project
        const { data: project } = await supabase.from('projects').select('*').eq('project_code', 'testlocal').maybeSingle();
        if (project) {
            results.project_exists = true;
            log('✅ Project "testlocal" found.');
        } else {
            results.errors.push('Project "testlocal" not found.');
        }

        // 2. Check Supplier
        const { data: supplier } = await supabase.from('suppliers').select('*').eq('supplier_token', 'TEST_SUPPLIER_MACK').maybeSingle();
        if (supplier) {
            results.supplier_exists = true;
            log('✅ Supplier "TEST_SUPPLIER_MACK" found.');
        } else {
            results.errors.push('Supplier "TEST_SUPPLIER_MACK" not found.');
        }

        // 3. Test Direct Link
        log('Testing direct link...');
        const directUrl = `http://localhost:${PORT}/track?code=testlocal&uid=VERIFY_DIRECT_${Date.now()}`;
        try {
            const res = await makeRequest(directUrl);
            if (res.status === 200 || res.status === 302) {
                results.direct_link_works = true;
                log('✅ Direct link responded with ' + res.status);
            }
        } catch (e) {
            log('❌ Direct link failed: ' + e.message);
        }

        // 4. Test Supplier Link
        log('Testing supplier link...');
        const supplierUrl = `http://localhost:${PORT}/r/testlocal/TEST_SUPPLIER_MACK/VERIFY_SUPPLIER_${Date.now()}`;
        try {
            const res = await makeRequest(supplierUrl);
            if (res.status === 200 || res.status === 302) {
                results.supplier_link_works = true;
                log('✅ Supplier link responded with ' + res.status);
            }
        } catch (e) {
            log('❌ Supplier link failed: ' + e.message);
        }

        // 5. Verify Responses Table
        const { data: responses } = await supabase.from('responses').select('*').ilike('uid', 'VERIFY_%').order('created_at', { ascending: false }).limit(5);
        if (responses && responses.length >= 1) {
            results.responses_updated = true;
            log(`✅ Found ${responses.length} test responses in DB.`);
        } else {
            results.errors.push('No test responses found in DB.');
        }

    } catch (e) {
        log('❌ Fatal error during verification: ' + e.message);
        results.errors.push(e.message);
    }

    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    log('Done. Results saved to ' + RESULTS_FILE);
}

verify();
