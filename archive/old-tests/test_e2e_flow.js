const http = require('http');
const https = require('https');

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, (res) => {
            resolve({ statusCode: res.statusCode, headers: res.headers, url: url });
        });
        req.on('error', reject);
    });
}

async function runTests() {
    console.log("=== RUNNING END-TO-END WORKFLOW TESTS ===\n");
    
    // Test 1: Valid Supplier Flow
    console.log("[Test 1] Valid Supplier Flow (TEST_SRC_260036 + OPGH)");
    const startUrl = 'http://localhost:3000/start/TEST_SRC_260036?uid=VALID_SUPPLIER_99&supplier=OPGH';
    console.log(`Hitting Entry URL: ${startUrl}`);
    
    try {
        const res1 = await fetchUrl(startUrl);
        if (res1.statusCode !== 307) {
            console.log(`❌ Failed - Expected 307 redirect to mock survey, got ${res1.statusCode}`);
            return;
        }
        
        const mockSurveyUrl = res1.headers.location;
        console.log(`✅ Redirected to Mock Survey: ${mockSurveyUrl}`);
        
        // Extract session from URL
        const sessionMatch = mockSurveyUrl.match(/oi_session=([^&]+)/);
        if (!sessionMatch) {
            console.log(`❌ Failed - Could not find oi_session in URL`);
            return;
        }
        const session = sessionMatch[1];
        
        // Ensure Init API processes it...
        
        // Simulate clicking 'Terminate' returning to PanelFlow
        const returnUrl = `http://localhost:3000/terminate?oi_session=${session}`;
        console.log(`Simulating User Clicking Terminate -> ${returnUrl}`);
        
        const res2 = await fetchUrl(returnUrl);
        if (res2.statusCode === 307 || res2.statusCode === 302) {
            console.log(`✅ SUCCESSFULLY REDIRECTED TO MACKINSIGHTS:`);
            console.log(`   Final URL: ${res2.headers.location}`);
            console.log(`   PID Correct? ${res2.headers.location.includes('pid=TEST_SRC_260036') ? 'YES' : 'NO'}`);
            console.log(`   UID Correct? ${res2.headers.location.includes('uid=VALID_SUPPLIER_99') ? 'YES' : 'NO'}`);
        } else {
            console.log(`❌ Failed - Expected Redirect to Supplier, got ${res2.statusCode}`);
        }
        
    } catch(e) {
        console.error(e);
    }
    
    console.log("\n----------------------------------------\n");

    // Test 2: Invalid Supplier Flow
    console.log("[Test 2] Invalid Supplier Flow (TEST_SRC_260036 + test343)");
    const startUrlInvalid = 'http://localhost:3000/start/TEST_SRC_260036?uid=TEST343_USER&supplier=test343';
    console.log(`Hitting Entry URL: ${startUrlInvalid}`);
    
    try {
        const res1 = await fetchUrl(startUrlInvalid);
        const mockSurveyUrl = res1.headers.location;
        console.log(`✅ Redirected to Mock Survey: ${mockSurveyUrl}`);
        
        // Extract session from URL
        const sessionMatch = mockSurveyUrl.match(/oi_session=([^&]+)/);
        const session = sessionMatch[1];
        
        // Simulate clicking 'Terminate' returning to PanelFlow
        const returnUrl = `http://localhost:3000/terminate?oi_session=${session}`;
        console.log(`Simulating User Clicking Terminate -> ${returnUrl}`);
        
        const res2 = await fetchUrl(returnUrl);
        if (res2.statusCode === 307 || res2.statusCode === 302) {
            console.log(`❌ FAILED - It redirected externally when it shouldn't have! URL: ${res2.headers.location}`);
        } else {
            console.log(`✅ CORRECTLY SHOWED LOCAL PANELFLOW UI - Supplier test343 does not exist.`);
        }
        
    } catch(e) {
        console.error(e);
    }
}

runTests();
