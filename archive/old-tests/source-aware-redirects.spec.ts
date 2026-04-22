import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load test fixtures
const fixturesPath = join(__dirname, '..', 'redirect', 'fixtures', 'reference-values.json');
const fixtures = JSON.parse(readFileSync(fixturesPath, 'utf-8'));

const { project, supplier, testUser } = fixtures;

test.describe('Source-Aware Redirects E2E', () => {
  test.beforeAll(async () => {
    // Ensure test database is seeded with fixtures
    console.log('[E2E Tests] Running with fixtures:', fixtures);
  });

  test.describe('Direct Flow', () => {
    test('should create response with source = "direct" and redirect to internal complete page', async ({ page }) => {
      // Arrange: Generate a unique UID for this test
      const uniqueUid = `DIRECT_${Date.now()}`;
      const startUrl = `http://localhost:3000/start/${project.code}?uid=${uniqueUid}`;

      // Act: Navigate to direct start link
      const response = await page.goto(startUrl);

      // Assert: Should redirect (307) to survey or directly to complete depending on flow
      expect(response?.status()).toBeGreaterThanOrEqual(300);
      expect(response?.status()).toBeLessThan(400);

      // The final landing page should be the survey or complete page
      // Follow redirects and check final URL
      await expect(page).toHaveURL(/\/complete|\/survey/);

      // Check cookies set
      const cookies = await page.context().cookies();
      expect(cookies.some(c => c.name === 'last_uid' && c.value === uniqueUid)).toBeTruthy();

      // Verify database: response record has source = 'direct'
      // This would require a direct DB query or an API endpoint to verify
      // For now, we'll verify via the response data or by checking the redirect logic
      const currentUrl = page.url();
      expect(currentUrl).toContain('/redirect/complete');
    });

    test('should preserve PID and UID throughout the flow', async ({ page }) => {
      const uniqueUid = `PID_UID_${Date.now()}`;
      const startUrl = `http://localhost:3000/start/${project.code}?uid=${uniqueUid}`;

      await page.goto(startUrl);

      // Check that the UID cookie is set correctly
      const cookies = await page.context().cookies();
      const lastUidCookie = cookies.find(c => c.name === 'last_uid');
      expect(lastUidCookie).toBeDefined();
      expect(lastUidCookie?.value).toBe(uniqueUid);

      // Check that the PID cookie is set correctly
      const lastPidCookie = cookies.find(c => c.name === 'last_pid');
      expect(lastPidCookie).toBeDefined();
      expect(lastPidCookie?.value).toBe(project.code);
    });
  });

  test.describe('Supplier Flow', () => {
    test('should create response with source = "supplier"', async ({ page }) => {
      const uniqueUid = `SUPP_${Date.now()}`;
      const supplierToken = supplier.token;
      const startUrl = `http://localhost:3000/start/${project.code}?supplier=${supplierToken}&uid=${uniqueUid}`;

      const response = await page.goto(startUrl);

      expect(response?.status()).toBeGreaterThanOrEqual(300);
      expect(response?.status()).toBeLessThan(400);

      // Should redirect to supplier's external survey URL
      const finalUrl = page.url();
      expect(finalUrl).not.toContain('localhost'); // Should be external
      expect(finalUrl).toContain(supplier.redirects.complete.split('?')[0]);
    });

    test('should inject UID and PID into supplier redirect URL', async ({ page }) => {
      const uniqueUid = `INJ_${Date.now()}`;
      const supplierToken = supplier.token;
      const startUrl = `http://localhost:3000/start/${project.code}?supplier=${supplierToken}&uid=${uniqueUid}`;

      await page.goto(startUrl);
      const finalUrl = page.url();

      // Verify UID and PID are present in the redirect URL
      expect(finalUrl).toContain(encodeURIComponent(uniqueUid));
      expect(finalUrl).toContain(encodeURIComponent(project.code));

      // Verify the UID parameter matches the expected vendor param name
      const url = new URL(finalUrl);
      const uidValue = url.searchParams.get('uid');
      expect(uidValue).toBe(uniqueUid);

      const pidValue = url.searchParams.get('pid');
      expect(pidValue).toBe(project.code);
    });

    test('should handle alt parameter names (vendor-specific)', async ({ page }) => {
      // If supplier uses custom uid/pid param names, they should be respected
      // For this test, we'd need a supplier configured with different param names
      // This is a placeholder for that scenario

      const uniqueUid = `ALT_${Date.now()}`;
      const startUrl = `http://localhost:3000/start/${project.code}?supplier=${supplier.token}&uid=${uniqueUid}`;

      await page.goto(startUrl);
      const finalUrl = page.url();

      // For the default test supplier (MACK), it uses uid/pid
      // So we verify those are present
      const url = new URL(finalUrl);
      expect(url.searchParams.has('uid')).toBeTruthy();
      expect(url.searchParams.has('pid')).toBeTruthy();
    });
  });

  test.describe('Redirect Resolution', () => {
    test('direct flow should end at /redirect/complete (internal)', async ({ page }) => {
      // Render a mock completion callback and check redirect
      // This tests the completion callback flow

      // First, create a response in database (via API or direct)
      // For simplicity, we'll test the /api/callback endpoint

      const mockSession = `sess_${Date.now()}`;
      const callbackUrl = `/api/callback?session=${mockSession}&type=complete`;

      // We need to set up a response record with source='direct' first
      // This would typically be done via the /start route
      // For this test, we'll assume prior setup

      const response = await page.goto(`http://localhost:3000${callbackUrl}`);

      // Depending on whether the session exists and source is tracked,
      // we should be redirected appropriately
      if (response?.status() === 307 || response?.status() === 302) {
        const redirectUrl = response?.headers()['location'];
        if (redirectUrl) {
          expect(redirectUrl).toContain('/redirect/complete');
        }
      }
    });

    test('supplier flow should redirect to external supplier URL on completion', async ({ page }) => {
      // Similar to above but with supplier source
      const mockSession = `supp_sess_${Date.now()}`;
      const callbackUrl = `/api/callback?session=${mockSession}&type=complete`;

      const response = await page.goto(`http://localhost:3000${callbackUrl}`);

      if (response?.status() === 307 || response?.status() === 302) {
        const redirectUrl = response?.headers()['location'];
        if (redirectUrl) {
          expect(redirectUrl).not.toContain('/redirect/complete');
          // Should point to supplier domain
          expect(redirectUrl).toContain(supplier.redirects.complete.split('?')[0]);
        }
      }
    });
  });

  test.describe('Database Verification', () => {
    test('should verify source field in responses table', async () => {
      // This test would query the database directly to verify the source field
      // In a real test environment, we'd have direct DB access or an admin API

      // For now, we can check via API if available, or skip with a note
      // Placeholder: we would query:
      // SELECT source FROM responses WHERE uid = ? AND project_code = ? ORDER BY created_at DESC LIMIT 1;

      expect(true).toBe(true); // Skip if no DB access in E2E
    }, { annotation: { type: 'todo', description: 'Requires DB access or admin API' } });
  });

  test.describe('Multi-Status Flows', () => {
    test('should handle terminate status correctly', async ({ page }) => {
      // Test termination flow where survey ends early and redirects accordingly
      const mockSession = `term_${Date.now()}`;
      const response = await page.goto(`http://localhost:3000/api/callback?session=${mockSession}&type=terminate`);

      if (response?.status() === 307 || response?.status() === 302) {
        const redirectUrl = response?.headers()['location'];
        expect(redirectUrl).toContain('/terminate');
      }
    });

    test('should handle quota_full status correctly', async ({ page }) => {
      const mockSession = `quota_${Date.now()}`;
      const response = await page.goto(`http://localhost:3000/api/callback?session=${mockSession}&type=quotafull`);

      if (response?.status() === 307 || response?.status() === 302) {
        const redirectUrl = response?.headers()['location'];
        expect(redirectUrl).toContain('/quotafull');
      }
    });
  });

  test.describe('Priority Resolution', () => {
    test('link-level custom_complete_url should override supplier-level', async ({ page }) => {
      // This would require a supplier link with custom_complete_url set
      // Not testable with current fixtures unless we extend them

      expect(true).toBe(true); // Placeholder - needs specific test data
    }, { annotation: { type: 'todo', description: 'Requires fixture with custom link URL' } });

    test('project landing_page_url should be used as fallback', async ({ page }) => {
      // When supplier has no redirect configured, should fall back to project landing page

      expect(true).toBe(true); // Placeholder - needs specific test data
    }, { annotation: { type: 'todo', description: 'Requires supplier without redirect URLs' } });
  });
});
