/**
 * Test: Verify Redirect Tracking Updates Response Table Correctly
 * 
 * Tests:
 * 1. Complete -> status = complete
 * 2. Terminate -> status = terminate
 * 3. Quota Full -> status = quota_full
 */

import { getDb } from './lib/db';

async function testRedirectTracking() {
    console.log("=== Testing Redirect Response Table Updates ===\n");

    const rdb = getDb();
    
    // Setup test data
    const uniqueTS = Date.now();
    const testProjectCode = `TEST_REDIRECT_${uniqueTS}`;
    const testProjectId = `proj_${uniqueTS}`;
    
    // Create test project
    rdb.prepare(`
        INSERT OR REPLACE INTO projects (id, project_code, project_name, base_url, status) 
        VALUES (?, ?, 'Test Project', 'http://localhost', 'active')
    `).run(testProjectId, testProjectCode);
    
    console.log("\n[2] Creating test response records...");

    // Response 1 - for complete test
    const respCompleteId = `resp_complete_${Date.now()}`;
    const uidComplete = `UID_COMPLETE_${Date.now()}`;
    const clickidComplete = `click_complete_${Date.now()}`;
    rdb.prepare(`
        INSERT OR REPLACE INTO responses (
            id, project_id, project_code, uid, oi_session, clickid, 
            status, source, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'in_progress', 'supplier', datetime('now'))
    `).run(respCompleteId, testProjectId, testProjectCode, uidComplete, clickidComplete, clickidComplete);

    // Response 2 - for terminate test
    const respTerminateId = `resp_terminate_${Date.now() + 1}`;
    const uidTerminate = `UID_TERMINATE_${Date.now() + 1}`;
    const clickidTerminate = `click_terminate_${Date.now() + 1}`;
    rdb.prepare(`
        INSERT OR REPLACE INTO responses (
            id, project_id, project_code, uid, oi_session, clickid, 
            status, source, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'in_progress', 'direct', datetime('now'))
    `).run(respTerminateId, testProjectId, testProjectCode, uidTerminate, clickidTerminate, clickidTerminate);

    // Response 3 - for quota_full test
    const respQuotaId = `resp_quota_${Date.now() + 2}`;
    const uidQuota = `UID_QUOTA_${Date.now() + 2}`;
    const clickidQuota = `click_quota_${Date.now() + 2}`;
    rdb.prepare(`
        INSERT OR REPLACE INTO responses (
            id, project_id, project_code, uid, oi_session, clickid, 
            status, source, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'in_progress', 'supplier', datetime('now'))
    `).run(respQuotaId, testProjectId, testProjectCode, uidQuota, clickidQuota, clickidQuota);

    console.log(`   Created 3 response records for testing`);

    // Simulate redirect callback for COMPLETE
    console.log("\n[3] Testing COMPLETE redirect...");
    const { updateResponseStatus } = await import('./lib/landingService');
    
    const completeResult = await updateResponseStatus(
        testProjectCode,
        uidComplete,
        'complete',
        clickidComplete,
        '/redirect/complete',
        '127.0.0.1',
        true // strictMode
    );

    if (completeResult) {
        console.log(`   ✅ Updated to COMPLETE`);
    } else {
        console.log(`   ❌ Failed to update`);
    }

    // Simulate redirect callback for TERMINATE
    console.log("\n[4] Testing TERMINATE redirect...");
    const terminateResult = await updateResponseStatus(
        testProjectCode,
        uidTerminate,
        'terminate',
        clickidTerminate,
        '/redirect/terminate',
        '127.0.0.1',
        true // strictMode
    );

    if (terminateResult) {
        console.log(`   ✅ Updated to TERMINATE`);
    } else {
        console.log(`   ❌ Failed to update`);
    }

    // Simulate redirect callback for QUOTA_FULL
    console.log("\n[5] Testing QUOTA_FULL redirect...");
    const quotaResult = await updateResponseStatus(
        testProjectCode,
        uidQuota,
        'quota_full',
        clickidQuota,
        '/redirect/quotafull',
        '127.0.0.1',
        true // strictMode
    );

    if (quotaResult) {
        console.log(`   ✅ Updated to QUOTA_FULL`);
    } else {
        console.log(`   ❌ Failed to update`);
    }

    // Verify final state in database
    console.log("\n[6] Verifying final response table state...");

    const allResponses = rdb.prepare(`
        SELECT id, uid, project_code, status, source, 
               completion_time, updated_at, ip, last_landing_page
        FROM responses 
        WHERE project_code = ?
        ORDER BY created_at DESC
    `).all(testProjectCode) as any[];

    console.log("\n   Final Response Table State:");
    console.log("   -------------------------------------------");
    console.log("   | ID                    | Status       |");
    console.log("   -------------------------------------------");
    
    let allCorrect = true;
    const expectedMap: Record<string, string> = {
        [respCompleteId]: 'complete',
        [respTerminateId]: 'terminate',
        [respQuotaId]: 'quota_full'
    };
    
    for (const r of allResponses) {
        const expectedStatus = expectedMap[r.id] || 'unknown';
        const isCorrect = r.status === expectedStatus;
        if (!isCorrect) allCorrect = false;
        
        console.log(`   | ${r.id.substring(0, 20)} | ${r.status.padEnd(12)} | ${isCorrect ? '✅' : '❌'}`);
    }
    console.log("   -------------------------------------------");

    // Show detailed info
    console.log("\n   Detailed Status Info:");
    for (const r of allResponses) {
        console.log(`   - ${r.id.substring(0, 20)}: status=${r.status}, source=${r.source}, completion_time=${r.completion_time ? 'SET' : 'NOT SET'}`);
    }

    // [8] Strict Mode Security Tests
    console.log("\n[8] Strict Mode Security Tests...");

    // Create a fresh response for security testing
    const securityRespId = `resp_security_${Date.now()}`;
    const uidSecurity = `UID_SECURITY_${Date.now()}`;
    const clickidSecurity = `click_security_${Date.now()}`;
    rdb.prepare(`
        INSERT OR REPLACE INTO responses (
            id, project_id, project_code, uid, oi_session, clickid, 
            status, source, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'in_progress', 'supplier', datetime('now'))
    `).run(securityRespId, testProjectId, testProjectCode, uidSecurity, clickidSecurity, clickidSecurity);
    console.log(`   Created security test response`);

    // Test 8a: Valid clickid with strictMode should succeed
    const validStrict = await updateResponseStatus(
        testProjectCode,
        uidSecurity,
        'complete',
        clickidSecurity,
        '/redirect/complete',
        '127.0.0.1',
        true
    );
    if (validStrict) {
        console.log(`   ✅ Strict mode accepted valid clickid`);
    } else {
        console.log(`   ❌ Strict mode rejected valid clickid`);
    }

    // Test 8b: Invalid clickid (wrong) with strictMode should fail
    const invalidStrict = await updateResponseStatus(
        testProjectCode,
        uidSecurity,
        'terminate',
        'wrong-clickid',
        '/redirect/terminate',
        '127.0.0.1',
        true
    );
    if (!invalidStrict) {
        console.log(`   ✅ Strict mode rejected invalid clickid`);
    } else {
        console.log(`   ❌ Strict mode accepted invalid clickid - SECURITY ISSUE!`);
    }

    // Test 8c: Missing clickid (null) with strictMode should fail
    const missingStrict = await updateResponseStatus(
        testProjectCode,
        uidSecurity,
        'quota_full',
        null,
        '/redirect/quotafull',
        '127.0.0.1',
        true
    );
    if (!missingStrict) {
        console.log(`   ✅ Strict mode rejected missing clickid`);
    } else {
        console.log(`   ❌ Strict mode accepted missing clickid - SECURITY ISSUE!`);
    }

    // Cleanup
    console.log("\n[7] Cleaning up test data...");
    rdb.prepare('DELETE FROM responses WHERE project_code = ?').run(testProjectCode);
    rdb.prepare('DELETE FROM projects WHERE id = ?').run(testProjectId);
    console.log("   Cleanup complete");

    // Final summary
    console.log("\n" + "=".repeat(50));
    if (allCorrect) {
        console.log("✅ ALL TESTS PASSED - Response table updates correctly!");
    } else {
        console.log("❌ TESTS FAILED - Some statuses not updated correctly");
    }
    console.log("=".repeat(50));
}

testRedirectTracking().catch(console.error);
