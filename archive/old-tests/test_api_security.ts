
import { GET as statusGET } from './app/api/status/route';
import { GET as callbackGET } from './app/api/callback/route';
import { NextRequest } from 'next/server';
import { getDb } from './lib/db';
import path from 'path';
import fs from 'fs';

// Mock the environment
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
process.env.LOCAL_DB_PATH = path.join(dataDir, 'local.db');

async function testApiSecurity() {
    console.log("=== Testing API Security Hardening ===\n");

    const db = getDb();
    
    // Setup test data
    const testPid = 'API_TEST_PROJ';
    const testUid = 'api_user_123';
    const testClickId = 'api_token_abc_789';

    db.prepare('DELETE FROM responses WHERE project_code = ?').run(testPid);
    db.prepare('INSERT INTO responses (id, project_code, uid, oi_session, clickid, status, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\'))')
      .run('resp_api_1', testPid, testUid, testClickId, testClickId, 'in_progress');

    console.log("[1] Test Data Created");

    // Helper to create mock NextRequest
    const createReq = (url: string) => new NextRequest(new URL(url, 'http://localhost'));

    // --- TEST 1: /api/status (EXR) ---
    console.log("\n[2] Testing /api/status (EXR)...");

    // Case A: Valid clickid
    const clickA = 'click_status_valid';
    db.prepare('INSERT INTO responses (id, project_code, uid, clickid, status, created_at) VALUES (?, ?, ?, ?, \'in_progress\', datetime(\'now\'))')
      .run('resp_status_A', testPid, 'uid_A', clickA);
    const resA = await statusGET(createReq(`http://localhost/api/status?code=${testPid}&uid=uid_A&type=complete&clickid=${clickA}`));
    console.log(`   - Case A (Valid clickid): Status ${resA.status} (Expected 307 redirect)`);

    // Case B: Missing clickid (PID+UID only)
    const resB = await statusGET(createReq(`http://localhost/api/status?code=${testPid}&uid=any&type=complete`));
    console.log(`   - Case B (Missing clickid): Status ${resB.status} (Expected 403)`);

    // Case C: Wrong clickid
    const clickC = 'click_status_wrong';
    db.prepare('INSERT INTO responses (id, project_code, uid, clickid, status, created_at) VALUES (?, ?, ?, ?, \'in_progress\', datetime(\'now\'))')
      .run('resp_status_C', testPid, 'uid_C', clickC);
    const resC = await statusGET(createReq(`http://localhost/api/status?code=${testPid}&uid=uid_C&type=complete&clickid=WRONG`));
    console.log(`   - Case C (Wrong clickid): Status ${resC.status} (Expected 307 error redirect)`);

    // --- TEST 2: /api/callback ---
    console.log("\n[3] Testing /api/callback...");

    // Case A: Valid cid (used as clickid)
    const click2A = 'click_callback_valid';
    db.prepare('INSERT INTO responses (id, project_code, uid, clickid, status, created_at) VALUES (?, ?, ?, ?, \'in_progress\', datetime(\'now\'))')
      .run('resp_callback_A', testPid, 'uid_2A', click2A);
    const res2A = await callbackGET(createReq(`http://localhost/api/callback?pid=${testPid}&cid=${click2A}&type=complete`));
    console.log(`   - Case A (Valid cid): Status ${res2A.status} (Expected 200 JSON or 307 Redirect)`);

    // Case B: Missing cid
    const res2B = await callbackGET(createReq(`http://localhost/api/callback?pid=${testPid}&type=complete`));
    console.log(`   - Case B (Missing cid): Status ${res2B.status} (Expected 400/403)`);

    // Case C: cid is just UID (old insecure format)
    const click2C = 'click_callback_token';
    db.prepare('INSERT INTO responses (id, project_code, uid, clickid, status, created_at) VALUES (?, ?, ?, ?, \'in_progress\', datetime(\'now\'))')
      .run('resp_callback_C', testPid, 'uid_2C', click2C);
    const res2C = await callbackGET(createReq(`http://localhost/api/callback?pid=${testPid}&cid=uid_2C&type=complete`));
    console.log(`   - Case C (Insecure cid=UID): Status ${res2C.status} (Expected 307 error redirect)`);

    // Cleanup
    db.prepare('DELETE FROM responses WHERE project_code = ?').run(testPid);
    console.log("\n[4] Cleanup complete");
}

testApiSecurity().catch(console.error);
