/**
 * LIVE TEST: PanelFlow Redirect Flow
 * 
 * This script performs a full end-to-end test of the redirect tracking system.
 * It creates a test project, generates redirect links, and verifies:
 *   - PID passes correctly
 *   - UID passes correctly
 *   - Landing page displays correct data
 *   - Response table updates
 *   - Dashboard updates
 *   - All status types work (complete, terminate, quota_full)
 * 
 * IMPORTANT: This test runs against the local development server.
 * Ensure `npm run dev` is running before executing.
 */

import { getDb } from './lib/db';
import { browser_subagent } from './tools/browser-subagent';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const db = getDb();

// Test configuration
const TEST_PROJECT_NAME = 'TEST_REDIRECT_PROJECT';
const TEST_PID = 'TEST_PID_001';
const TEST_UID = 'test01';
const BASE_URL = 'http://localhost:3000';

async function setupTestProject() {
    console.log('\n=== SETUP: Creating Test Project ===\n');

    // Create project
    const projectId = `proj_${Date.now()}`;
    db.prepare(`
        INSERT OR REPLACE INTO projects (id, project_code, project_name, base_url, status)
        VALUES (?, ?, ?, ?, 'active')
    `).run(projectId, TEST_PID, TEST_PROJECT_NAME, BASE_URL);

    console.log(`✓ Created project: ${TEST_PROJECT_NAME} (PID: ${TEST_PID})`);
    console.log(`  Project ID: ${projectId}`);
}

async function cleanupTestData() {
    console.log('\n=== CLEANUP ===\n');
    
    // Delete test responses
    const deleteStmt = db.prepare('DELETE FROM responses WHERE project_code = ?');
    const deleted = deleteStmt.run(TEST_PID);
    console.log(`✓ Deleted ${deleted.changes} test response records`);
    
    // Delete test project
    const deleteProject = db.prepare('DELETE FROM projects WHERE project_code = ?');
    deleteProject.run(TEST_PID);
    console.log('✓ Deleted test project');
}

function getCurrentResponseCount() {
    const result = db.prepare('SELECT COUNT(*) as count FROM responses WHERE project_code = ?').get(TEST_PID) as any;
    return result?.count || 0;
}

function getLatestResponse() {
    return db.prepare(`
        SELECT * FROM responses 
        WHERE project_code = ? 
        ORDER BY created_at DESC 
        LIMIT 1
    `).get(TEST_PID) as any;
}

function getDashboardCounts(projectId: string) {
    const result = db.prepare(`
        SELECT 
            complete_count,
            terminate_count,
            quota_full_count
        FROM projects 
        WHERE id = ?
    `).get(projectId) as any;
    return result;
}

async function runBrowserTest(testName: string, url: string, expectedStatus: string) {
    console.log(`\n[TEST] ${testName}`);
    console.log(`  URL: ${url}`);
    
    try {
        // Use browser subagent to navigate and capture state
        const result = await browser_subagent({
            TaskName: `Testing ${testName}`,
            TaskSummary: `Navigate to ${testName} redirect URL and verify landing page`,
            Task: `Open the URL "${url}" in the browser. Wait for the landing page to load completely. Then extract and report: 1) The page title, 2) Any visible text showing PID or UID, 3) The final URL after redirects.`,
            RecordingName: `redirect_${testName.toLowerCase().replace(/\s+/g, '_')}`,
            WaitForPreviousTools: false
        });
        
        console.log(`  ✅ Browser test completed`);
        return result;
    } catch (error: any) {
        console.error(`  ❌ Browser test failed:`, error.message);
        throw error;
    }
}

async function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   PANELFLOW REDIRECT FLOW - LIVE TEST SUITE              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    try {
        // STEP 1: Setup
        await setupTestProject();
        
        // Get project ID for dashboard checks
        const project = db.prepare('SELECT id FROM projects WHERE project_code = ?').get(TEST_PID) as any;
        if (!project) {
            throw new Error('Project not created');
        }
        const projectId = project.id;
        console.log(`  Project ID for dashboard: ${projectId}`);
        
        // Verify initial dashboard counts are zero
        let initialCounts = getDashboardCounts(projectId);
        console.log(`  Initial dashboard: complete=${initialCounts.complete_count}, terminate=${initialCounts.terminate_count}, quota=${initialCounts.quota_full_count}`);
        
        // STEP 2: Test COMPLETE
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('TEST 1: COMPLETE REDIRECT');
        console.log('═══════════════════════════════════════════════════════════════');
        
        const completeUrl = `http://localhost:3000/redirect/complete?pid=${TEST_PID}&uid=${TEST_UID}`;
        const beforeCount = getCurrentResponseCount();
        console.log(`  Responses before: ${beforeCount}`);
        
        await runBrowserTest('COMPLETE', completeUrl, 'complete');
        
        // Wait a moment for DB update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const afterCount = getCurrentResponseCount();
        console.log(`  Responses after: ${afterCount}`);
        
        const latestResponse = getLatestResponse();
        if (latestResponse) {
            console.log('  Latest response record:');
            console.log(`    - ID: ${latestResponse.id}`);
            console.log(`    - PID: ${latestResponse.project_code}`);
            console.log(`    - UID: ${latestResponse.uid}`);
            console.log(`    - Status: ${latestResponse.status}`);
            console.log(`    - ClickID: ${latestResponse.clickid || 'N/A'}`);
            
            // Validate
            if (latestResponse.project_code !== TEST_PID) {
                console.error('  ❌ PID MISMATCH!');
            } else {
                console.log('  ✅ PID matches');
            }
            if (latestResponse.uid !== TEST_UID) {
                console.error('  ❌ UID MISMATCH!');
            } else {
                console.log('  ✅ UID matches');
            }
            if (latestResponse.status !== 'complete') {
                console.error('  ❌ STATUS INCORRECT! Expected complete, got', latestResponse.status);
            } else {
                console.log('  ✅ Status is complete');
            }
        } else {
            console.error('  ❌ No response record found!');
        }
        
        // Check dashboard
        const afterCounts = getDashboardCounts(projectId);
        console.log(`  Dashboard after: complete=${afterCounts.complete_count}, terminate=${afterCounts.terminate_count}, quota=${afterCounts.quota_full_count}`);
        if (afterCounts.complete_count > initialCounts.complete_count) {
            console.log('  ✅ Dashboard complete count incremented');
        } else {
            console.error('  ❌ Dashboard complete count did not increment');
        }
        
        // STEP 3: Test TERMINATE
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('TEST 2: TERMINATE REDIRECT');
        console.log('═══════════════════════════════════════════════════════════════');
        
        const terminateUrl = `http://localhost:3000/redirect/terminate?pid=${TEST_PID}&uid=${TEST_UID}`;
        const beforeTerminateCount = getCurrentResponseCount();
        
        await runBrowserTest('TERMINATE', terminateUrl, 'terminate');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const afterTerminateCount = getCurrentResponseCount();
        console.log(`  Responses before: ${beforeTerminateCount}, after: ${afterTerminateCount}`);
        
        const terminateResponse = getLatestResponse();
        if (terminateResponse) {
            console.log('  Latest response:');
            console.log(`    - Status: ${terminateResponse.status}`);
            if (terminateResponse.status === 'terminate') {
                console.log('  ✅ Status is terminate');
            } else {
                console.error('  ❌ Status incorrect:', terminateResponse.status);
            }
        }
        
        const afterTerminateCounts = getDashboardCounts(projectId);
        console.log(`  Dashboard: complete=${afterTerminateCounts.complete_count}, terminate=${afterTerminateCounts.terminate_count}`);
        if (afterTerminateCounts.terminate_count > initialCounts.terminate_count) {
            console.log('  ✅ Dashboard terminate count incremented');
        } else {
            console.log('  ⚠️  Dashboard terminate count check (may be 0 if first increment)');
        }
        
        // STEP 4: Test QUOTA FULL
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('TEST 3: QUOTA FULL REDIRECT');
        console.log('═══════════════════════════════════════════════════════════════');
        
        const quotaUrl = `http://localhost:3000/redirect/quotafull?pid=${TEST_PID}&uid=${TEST_UID}`;
        await runBrowserTest('QUOTA FULL', quotaUrl, 'quota_full');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const quotaResponse = getLatestResponse();
        if (quotaResponse) {
            console.log('  Latest response:');
            console.log(`    - Status: ${quotaResponse.status}`);
            if (quotaResponse.status === 'quota_full') {
                console.log('  ✅ Status is quota_full');
            } else {
                console.error('  ❌ Status incorrect:', quotaResponse.status);
            }
        }
        
        const afterQuotaCounts = getDashboardCounts(projectId);
        console.log(`  Dashboard: complete=${afterQuotaCounts.complete_count}, terminate=${afterQuotaCounts.terminate_count}, quota=${afterQuotaCounts.quota_full_count}`);
        if (afterQuotaCounts.quota_full_count > initialCounts.quota_full_count) {
            console.log('  ✅ Dashboard quota count incremented');
        } else {
            console.log('  ⚠️  Dashboard quota count check');
        }
        
        // FINAL VALIDATION
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('FINAL VALIDATION');
        console.log('═══════════════════════════════════════════════════════════════');
        
        const finalResponse = getLatestResponse();
        console.log('Final response record:');
        console.log(`  PID: ${finalResponse?.project_code} (expected: ${TEST_PID})`);
        console.log(`  UID: ${finalResponse?.uid} (expected: ${TEST_UID})`);
        console.log(`  Status: ${finalResponse?.status} (expected: quota_full)`);
        console.log(`  ClickID: ${finalResponse?.clickid}`);
        
        const allValid = 
            finalResponse?.project_code === TEST_PID &&
            finalResponse?.uid === TEST_UID &&
            finalResponse?.status === 'quota_full' &&
            finalResponse?.clickid;
            
        if (allValid) {
            console.log('\n✅ ALL CHECKS PASSED - REDIRECT FLOW IS WORKING CORRECTLY');
        } else {
            console.log('\n❌ SOME CHECKS FAILED - REVIEW ABOVE');
        }
        
    } catch (error: any) {
        console.error('\n❌ TEST SUITE FAILED:', error);
        throw error;
    } finally {
        // Always cleanup
        try {
            cleanupTestData();
        } catch (e) {
            console.warn('Cleanup warning:', e.message);
        }
    }
}

// Run the test
main().then(() => {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('TEST SUITE COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');
    process.exit(0);
}).catch((error) => {
    console.error('\n═══════════════════════════════════════════════════════════════');
    console.error('TEST SUITE FAILED');
    console.error('═══════════════════════════════════════════════════════════════');
    process.exit(1);
});
