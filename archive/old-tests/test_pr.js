const { getUnifiedDb } = require('./lib/unified-db');
const { incrementDashboardCounts, normalizeParams } = require('./lib/tracking-resolver');
const { getDb } = require('./lib/db');
const fs = require('fs');

async function testPR() {
    console.log("=== Testing Callback Tracking Logic ===");

    // 1. Check database connectivity
    console.log("\n[1] Checking Database...");
    const { database: db } = await getUnifiedDb();
    if (!db) {
        console.error("Failed to connect to unified db.");
        return;
    }
    console.log("Connected to Unified DB.");

    try {
        // Create a test project and dummy response
        console.log("\n[2] Setting up Test Data...");
        
        const testProjectId = '12345678-1234-1234-1234-123456789abc';
        const testResponseId = '23456789-2345-2345-2345-234567890def';
        const clickid = `test-session-${Date.now()}`;
        const uid = `UID-${Date.now()}`;

        // Insert directly using synchronous sqlite to ensure it's there
        const rdb = getDb();
        
        // Ensure test project
        rdb.prepare(`
            INSERT OR IGNORE INTO projects (id, project_code, complete_count, terminate_count, quota_full_count) 
            VALUES (?, 'TEST_TRACK', 0, 0, 0)
        `).run(testProjectId);
        
        // Insert a pending response
        rdb.prepare(`
            INSERT OR REPLACE INTO responses (id, project_id, project_code, uid, oi_session, clickid, status, source) 
            VALUES (?, ?, 'TEST_TRACK', ?, ?, ?, 'in_progress', 'direct')
        `).run(testResponseId, testProjectId, uid, clickid, clickid);
        
        console.log("Test data setup complete:", { clickid, uid });

        // 3. Test Normalizer
        console.log("\n[3] Testing normalizeParams...");
        const oldCallbackParams = { clickid: clickid, status: 'terminate' };
        let normOld = await normalizeParams(oldCallbackParams);
        console.log("Old Format Normalization:", normOld);
        
        const redirectParams = { pid: 'TEST_TRACK', uid: uid };
        let normRed = await normalizeParams(redirectParams); // normally has clickid from cookie but this is the URL params
        console.log("Redirect Normalization:", normRed);
        
        const exrParams = { code: 'test', uid: uid, type: 'quota' };
        let normExr = await normalizeParams(exrParams);
        console.log("EXR Normalization:", normExr);

        // 4. Test Dashboard Increment
        console.log("\n[4] Testing Dashboard Increment...");
        // initial quota_full_count
        let initialCount = rdb.prepare('SELECT quota_full_count FROM projects WHERE id = ?').get(testProjectId).quota_full_count;
        console.log("Initial quota_full_count:", initialCount);
        
        await incrementDashboardCounts(testProjectId, 'quota_full');
        
        let newCount = rdb.prepare('SELECT quota_full_count FROM projects WHERE id = ?').get(testProjectId).quota_full_count;
        console.log("New quota_full_count:", newCount);
        
        if (newCount > initialCount) {
             console.log("✅ Dashboard Increment SUCCESS");
        } else {
             console.log("❌ Dashboard Increment FAILED");
        }

        // 5. Cleanup
        console.log("\n[5] Cleaning up test data...");
        rdb.prepare('DELETE FROM responses WHERE id = ?').run(testResponseId);
        // rdb.prepare('DELETE FROM projects WHERE id = ?').run(testProjectId); 
        console.log("Cleanup complete.");

    } catch (e) {
        console.error("Test failed:", e);
    }
}

testPR();
