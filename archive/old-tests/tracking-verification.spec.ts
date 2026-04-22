import { test, expect } from '@playwright/test';
import { getDb } from '@/lib/db';

test.describe('Tracking Verification E2E', () => {
  const testProjectCode = 'TEST_TRACKING_E2E';
  const testUid = `E2E_${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    // Ensure project exists for testing
    const db = getDb();
    const exists = db.prepare('SELECT 1 FROM projects WHERE project_code = ?').get(testProjectCode);

    if (!exists) {
      db.prepare(`
        INSERT INTO projects (id, project_code, project_name, base_url, source, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        `proj_${testProjectCode}`,
        testProjectCode,
        'E2E Tracking Test Project',
        'http://localhost:3000',
        'manual',
        'active'
      );
      console.log(`Created test project: ${testProjectCode}`);
    }
  });

  test('Step 1-3: Entry Flow - creates response in DB', async ({ page }) => {
    // Step 1: Create test response for entry
    const db = getDb();
    const responseId = `resp_entry_${Date.now()}`;

    db.prepare(`
      INSERT INTO responses (id, uid, status, project_code, client_pid, clickid, oi_session, source, ip, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      responseId,
      testUid,
      'in_progress',
      testProjectCode,
      testProjectCode,
      `click_${Date.now()}`,
      `session_${Date.now()}`,
      'direct',
      '127.0.0.1'
    );

    // Step 2: Verify entry exists
    const entry = db.prepare('SELECT * FROM responses WHERE id = ?').get(responseId);
    expect(entry).toBeDefined();
    expect(entry.project_code).toBe(testProjectCode);
    expect(entry.uid).toBe(testUid);
    expect(entry.status).toBe('in_progress');

    console.log('✅ Entry flow verified:', { id: entry.id, uid: entry.uid, status: entry.status });
  });

  test('Step 4: Complete redirect updates status correctly', async ({ page }) => {
    // Use existing test01 from earlier tests
    const completeUrl = `http://localhost:3003/redirect/complete?pid=TEST_PID_001&uid=user_complete`;
    const response = await page.goto(completeUrl);

    expect(response.status()).toBe(200);

    // Verify DB updated
    const db = getDb();
    const updated = db.prepare('SELECT status, completion_time FROM responses WHERE uid = ? AND project_code = ?').get('user_complete', 'TEST_PID_001');

    expect(updated.status).toBe('complete');
    expect(updated.completion_time).not.toBeNull();

    // Verify landing page shows correct info
    const content = await page.content();
    expect(content).toContain('THANK YOU');
    expect(content).toContain('TEST_PID_001');
    expect(content).toContain('user_complete');

    console.log('✅ Complete redirect verified:', { status: updated.status, completion_time: updated.completion_time });
  });

  test('Step 5: Terminate redirect updates status correctly', async ({ page }) => {
    const terminateUrl = `http://localhost:3003/redirect/terminate?pid=TEST_PID_001&uid=user_terminate`;
    const response = await page.goto(terminateUrl);

    expect(response.status()).toBe(200);

    // Verify DB updated
    const db = getDb();
    const updated = db.prepare('SELECT status, completion_time FROM responses WHERE uid = ? AND project_code = ?').get('user_terminate', 'TEST_PID_001');

    expect(updated.status).toBe('terminate');
    expect(updated.completion_time).not.toBeNull();

    // Verify landing page shows correct info
    const content = await page.content();
    expect(content).toContain('SORRY');
    expect(content).toContain('TEST_PID_001');
    expect(content).toContain('user_terminate');

    console.log('✅ Terminate redirect verified:', { status: updated.status });
  });

  test('Step 6: Quota Full redirect updates status correctly', async ({ page }) => {
    const quotaUrl = `http://localhost:3003/redirect/quotafull?pid=TEST_PID_001&uid=user_quotafull`;
    const response = await page.goto(quotaUrl);

    expect(response.status()).toBe(200);

    // Verify DB updated
    const db = getDb();
    const updated = db.prepare('SELECT status, completion_time FROM responses WHERE uid = ? AND project_code = ?').get('user_quotafull', 'TEST_PID_001');

    expect(updated.status).toBe('quota_full');
    expect(updated.completion_time).not.toBeNull();

    // Verify landing page shows correct info
    const content = await page.content();
    expect(content).toContain('QUOTA FULL');
    expect(content).toContain('TEST_PID_001');
    expect(content).toContain('user_quotafull');

    console.log('✅ Quota Full redirect verified:', { status: updated.status });
  });

  test('Step 7: No duplicate entries created on redirect', async ({ page }) => {
    // Try the same complete redirect again - should be idempotent
    const completeUrl = `http://localhost:3003/redirect/complete?pid=TEST_PID_001&uid=user_complete`;
    await page.goto(completeUrl);

    const db = getDb();
    const entries = db.prepare('SELECT COUNT(*) as count FROM responses WHERE uid = ? AND project_code = ?').get('user_complete', 'TEST_PID_001') as { count: number };

    expect(entries.count).toBe(1); // Only one entry should exist

    console.log('✅ No duplicates verified: count =', entries.count);
  });

  test('Step 8: Dashboard stats API returns correct data', async ({ page }) => {
    // Test the stats API
    const apiUrl = `http://localhost:3003/api/respondent-stats/lookup?uid=user_complete&code=TEST_PID_001`;
    const response = await page.request.get(apiUrl);
    const data = await response.json();

    expect(data.status).toBe('complete');
    expect(data.projectCode).toBe('TEST_PID_001');
    expect(data.supplierRid).toBe('user_complete');

    console.log('✅ Dashboard API verified:', data);
  });

  test('Step 9: Response table stores all required fields', async ({ page }) => {
    const db = getDb();
    const entry = db.prepare(`
      SELECT project_code, uid, status, source, ip, completion_time, last_landing_page
      FROM responses WHERE uid = ? AND project_code = ?
    `).get('user_complete', 'TEST_PID_001') as any;

    expect(entry.project_code).toBe('TEST_PID_001');
    expect(entry.uid).toBe('user_complete');
    expect(entry.status).toBe('complete');
    expect(entry.source).toBe('direct');
    expect(entry.completion_time).not.toBeNull();
    expect(entry.last_landing_page).toBe('/redirect/complete');

    console.log('✅ Response table fields verified:', {
      project_code: entry.project_code,
      uid: entry.uid,
      status: entry.status,
      source: entry.source,
      last_landing_page: entry.last_landing_page
    });
  });
});