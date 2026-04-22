import { getDb } from './lib/db';

const db = getDb();

function createResponse(uid: string, status: string = 'in_progress') {
    const respId = `resp_${status}_${Date.now()}`;
    const clickid = `click_${status}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    db.prepare(`
        INSERT INTO responses (id, project_id, project_code, uid, clickid, oi_session, status, source, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
        respId,
        'proj_1776471339178',
        'TEST_PID_001',
        uid,
        clickid,
        clickid,
        status,
        'direct'
    );
    
    console.log(`Created response for ${status.toUpperCase()}:`);
    console.log(`  UID: ${uid}`);
    console.log(`  ClickID: ${clickid}`);
    console.log(`  ID: ${respId}`);
    
    return { uid, clickid };
}

// Create test responses
console.log('=== Creating Test Responses ===\n');

// For TERMINATE test
const termResp = createResponse('test_term', 'in_progress');

// For QUOTA test
const quotaResp = createResponse('test_quota', 'in_progress');

console.log('\n=== Test Data Ready ===');
console.log('TERMINATE test: UID=test_term, ClickID=' + termResp.clickid);
console.log('QUOTA test: UID=test_quota, ClickID=' + quotaResp.clickid);
console.log('\nUse these clickids in the redirect URLs.');
