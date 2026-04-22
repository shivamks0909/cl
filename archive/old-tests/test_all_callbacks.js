/**
 * Local test for testing all callback formats
 * Simulates requests locally to see if they pass without errors 
 */

async function testAll() {
    console.log("=== Testing Callback Routes ===");

    // Test 1: Old Callback
    console.log("\n[1] Testing Old Callback Route");
    try {
        const res1 = await fetch('http://localhost:3000/api/callback?clickid=test-session-1&status=complete');
        console.log(`Status: ${res1.status}`);
        const data1 = await res1.text();
        console.log(`Response: ${data1.substring(0, 100)}...`);
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }

    // Test 2: New Redirect Format
    console.log("\n[2] Testing New Redirect Format");
    try {
        const res2 = await fetch('http://localhost:3000/redirect/complete?pid=TEST&uid=U001', { redirect: 'manual' });
        console.log(`Status: ${res2.status}`);
        // redirect usually returns 30x
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }

    // Test 3: EXR Status URL
    console.log("\n[3] Testing EXR Status Callback");
    try {
        const res3 = await fetch('http://localhost:3000/api/status?code=test&uid=U002&type=terminate');
        console.log(`Status: ${res3.status}`);
        const data3 = await res3.text();
        console.log(`Response: ${data3.substring(0, 100)}...`);
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }
}

testAll();
