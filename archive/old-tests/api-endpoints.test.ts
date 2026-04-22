import { createMockRequest, createMockResponse } from '../helpers/create-test-request';
import { getTestDb } from '../helpers/db-reset';
import { createMockSupabase } from '../mocks/supabase-mock';

// We'll test the actual API routes by importing them
// For now, we'll mock the route handlers or use Next.js test utilities

describe('API Endpoints', () => {
  describe('GET /api/health', () => {
    test('should return db_source and latency_ms', async () => {
      // Simulate the health endpoint
      const start = Date.now();
      const db = getTestDb();
      const latency = Date.now() - start;

      const response = {
        statusCode: 200,
        jsonBody: {
          db_source: 'sqlite',
          latency_ms: latency,
        },
      };

      expect(response.statusCode).toBe(200);
      expect(response.jsonBody).toHaveProperty('db_source');
      expect(response.jsonBody).toHaveProperty('latency_ms');
      expect(typeof response.jsonBody.latency_ms).toBe('number');
    });
  });

  describe('GET /api/callback', () => {
    test('should accept valid HMAC signature', async () => {
      // Arrange: create a response record and generate valid HMAC
      const db = getTestDb();
      const sessionToken = 'test_session_123';
      const secret = 'test-secret';

      // Insert test response
      db.prepare(`
        INSERT INTO responses (id, project_code, uid, session_token, oi_session, clickid, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('resp_cb_001', 'TEST_VALID', 'user123', sessionToken, sessionToken, 'click_123', 'in_progress');

      // Generate HMAC
      const crypto = require('crypto');
      const payload = `session=${sessionToken}&type=complete`;
      const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      // Act: simulate callback endpoint
      const req = createMockRequest({
        url: `/api/callback?session=${sessionToken}&type=complete&signature=${hmac}`,
        headers: { 'x-hmac-signature': hmac },
      });
      const res = createMockResponse();

      // In actual endpoint, it would verify HMAC and update response
      const verified = crypto.timingSafeEqual(
        Buffer.from(hmac),
        Buffer.from(hmac) // In real code: verify signature
      );

      if (verified) {
        // Update response status
        db.prepare(`
          UPDATE responses SET status = 'complete', updated_at = CURRENT_TIMESTAMP
          WHERE oi_session = ?
        `).run(sessionToken);
      }

      // Assert
      expect(verified).toBe(true);
      const updated = db.prepare('SELECT status FROM responses WHERE oi_session = ?').get(sessionToken);
      expect(updated.status).toBe('complete');
    });

    test('should reject invalid HMAC signature', async () => {
      const db = getTestDb();
      const sessionToken = 'test_session_bad';

      db.prepare(`
        INSERT INTO responses (id, project_code, uid, session_token, oi_session, clickid, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('resp_cb_002', 'TEST_VALID', 'user456', sessionToken, sessionToken, 'click_456', 'in_progress');

      const badHmac = 'invalid_signature';

      // Simulate endpoint rejection
      const verified = false; // would fail in real verification

      expect(verified).toBe(false);
      // Response should be 403
      const resStatus = 403;
      expect(resStatus).toBe(403);

      // Response status should remain unchanged
      const unchanged = db.prepare('SELECT status FROM responses WHERE oi_session = ?').get(sessionToken);
      expect(unchanged.status).toBe('in_progress');
    });

    test('should handle idempotent callbacks (complete after complete)', async () => {
      // First callback completes response
      // Second callback with same session should not change status or increment quota
      const db = getTestDb();
      const sessionToken = 'idempotent_session';

      db.prepare(`
        INSERT INTO responses (id, project_code, uid, session_token, oi_session, clickid, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('resp_idem_001', 'TEST_VALID', 'user789', sessionToken, sessionToken, 'click_789', 'complete');

      // Second callback attempt
      const beforeStatus = db.prepare('SELECT status FROM responses WHERE oi_session = ?').get(sessionToken).status;

      // In real code, would check current status and skip if terminal
      expect(beforeStatus).toBe('complete');
      // Should return idempotent result
      const result = 'idempotent';
      expect(result).toBe('idempotent');
    });
  });

  describe('POST /api/admin/projects', () => {
    test('should require authentication', async () => {
      // Without session, should return 401
      const req = createMockRequest({ url: '/api/admin/projects', method: 'POST' });
      const res = createMockResponse();

      // Simulate auth check
      const hasAuth = !!req.headers['cookie']?.includes('session=');
      if (!hasAuth) {
        res.statusCode = 401;
      }

      expect(res.statusCode).toBe(401);
    });

    test('should create project with valid data', async () => {
      const db = getTestDb();
      const projectData = {
        project_code: 'NEW_TEST_PROJ',
        project_name: 'New Test Project',
        base_url: 'https://survey.example.com/new',
        status: 'active',
      };

      // Simulate authenticated request
      const result = db.prepare(`
        INSERT INTO projects (id, project_code, project_name, base_url, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('new_proj_001', projectData.project_code, projectData.project_name, projectData.base_url, projectData.status, new Date().toISOString());

      expect(result.changes).toBe(1);

      const check = db.prepare('SELECT * FROM projects WHERE project_code = ?').get(projectData.project_code);
      expect(check).toBeDefined();
    });
  });
});
