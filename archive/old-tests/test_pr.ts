import { getUnifiedDb } from './lib/unified-db';
import { normalizeParams, updateResponseTracking } from './lib/tracking-resolver';
import { getDb } from './lib/db';

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
        
        const uniqueTS = Date.now();
        const testProjectId = '12345678-abc-1234-1234-123456789abc';
        const projectCode = `TEST_TRACK_${uniqueTS}`;
        const testResponseId = '23456789-def-2345-2345-234567890def';
        const clickid = `test-session-${uniqueTS}`;
        const uid = `UID-${uniqueTS}`;

        // Insert directly using synchronous sqlite to ensure it's there
        const rdb = getDb();
        
        // Ensure test project
        rdb.prepare(`
            INSERT OR REPLACE INTO projects (id, project_code, project_name, base_url, status) 
            VALUES (?, ?, 'Test Project', 'http://localhost', 'active')
        `).run(testProjectId, projectCode);
        
        // Insert a pending response
        rdb.prepare(`
            INSERT OR REPLACE INTO responses (id, project_id, project_code, uid, oi_session, clickid, status, source) 
            VALUES (?, ?, ?, ?, ?, ?, 'in_progress', 'direct')
        `).run(testResponseId, testProjectId, projectCode, uid, clickid, clickid);
        
        console.log("Test data setup complete:", { clickid, uid, projectCode });

        // 3. Test Normalizer
        console.log("\n[3] Testing normalizeParams...");
        const oldCallbackParams = { clickid: clickid, status: 'terminate' };
        let normOld = normalizeParams(oldCallbackParams as Record<string, string>);
        console.log("Old Format Normalization:", normOld);
        
        const redirectParams = { pid: projectCode, uid: uid };
        let normRed = normalizeParams(redirectParams as Record<string, string>); 
        console.log("Redirect Normalization:", normRed);
        
        const exrParams = { code: 'test', uid: uid, type: 'quota' };
        let normExr = normalizeParams(exrParams as Record<string, string>);
        console.log("EXR Normalization:", normExr);

        // 4. Test Response Update
        console.log("\n[4] Testing Response Update (Tracking Resolver)...");
        // Update response to complete
        const updateRes = await updateResponseTracking(projectCode, uid, clickid, 'complete', '127.0.0.1');
        
        if (updateRes && updateRes.status === 'complete') {
             console.log("✅ Response Update SUCCESS");
        } else {
             console.log("❌ Response Update FAILED", updateRes);
        }

        // Verify in db
        const checkStatus = (rdb.prepare('SELECT status FROM responses WHERE id = ?').get(testResponseId) as any).status;
        console.log("Final DB Status:", checkStatus);

        // 5. Cleanup
        console.log("\n[5] Cleaning up test data...");
        rdb.prepare('DELETE FROM responses WHERE id = ?').run(testResponseId);
        rdb.prepare('DELETE FROM projects WHERE id = ?').run(testProjectId); 
        console.log("Cleanup complete.");

    } catch (e) {
        console.error("Test failed:", e);
    }
}

testPR();
