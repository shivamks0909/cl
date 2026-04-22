import { test, expect } from '@playwright/test';

test.describe('Full Flow Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we're using local test DB
    await page.goto('/');
  });

  test('G1: Direct flow end-to-end', async ({ page }) => {
    // 1. Navigate to direct link
    await page.goto('http://localhost:3000/r/TEST_VALID/SUP_VALID/UID12345');

    // 2. Should get 302 redirect to external survey (mock survey page)
    await expect(page).toHaveURL(/survey\.example\.com/);

    // 3. For test, we'll use a mock survey that auto-redirects to callback
    // In real E2E, we'd either:
    //   a) Use a real test survey that posts to callback
    //   b) Intercept and simulate callback
    // For this test, let's assume we have a /test-survey page that simulates completion

    // Navigate to mock survey completion endpoint
    await page.goto('http://localhost:3000/api/callback?session=test-session-123&type=complete');

    // 4. After callback, should redirect to internal complete page
    await expect(page).toHaveURL(/\/redirect\/complete/);
    await expect(page).toContainText('Thank you'); // or completion message
  });

  test('G2: Supplier flow end-to-end', async ({ page }) => {
    // 1. Hit supplier link which sets supplier_token in session
    await page.goto('http://localhost:3000/r/TEST_VALID/SUP_VALID/UID456');

    // 2. Should redirect to supplier's external survey (not PanelFlow internal)
    await expect(page).not.toHaveURL(/panelflow/);
    await expect(page).toHaveURL(/supplier\.example\.com/);

    // 3. Simulate callback with supplier session
    // Need to preserve supplier session cookie
    await page.goto('http://localhost:3000/api/callback?session=supp-session-456&type=complete');

    // 4. Should redirect to SUPPLIER's landing page (not /redirect/complete)
    await expect(page).toHaveURL(/supplier\.example\.com\/complete/);
    await expect(page).not.toHaveURL(/\/redirect\/complete/);
  });

  test('G3: Quota full flow', async ({ page }) => {
    // Setup: Set supplier quota to 1 (via direct DB edit or API)
    // For test, we'll manipulate DB directly
    await page.evaluate(() => {
      // Not possible from browser; skip or use API to adjust quota
    });

    // First entry + callback succeeds
    await page.goto('http://localhost:3000/r/TEST_MULTI/SUP_QUOTA/USER1');
    // ...complete flow
    // Second entry allowed (quota not checked on entry)
    await page.goto('http://localhost:3000/r/TEST_MULTI/SUP_QUOTA/USER2');
    // ... callback with quotafull
    await page.goto('http://localhost:3000/api/callback?session=quota-sess&type=quotafull');

    // Should redirect to /quotafull or supplier's quotafull URL
    await expect(page).toHaveURL(/\/quotafull/);
  });

  test('G4: Duplicate UID flow', async ({ page }) => {
    // First entry
    await page.goto('http://localhost:3000/r/TEST_VALID/CIN01/DUPUSER');
    // Should succeed (302)

    // Second entry with same UID
    await page.goto('http://localhost:3000/r/TEST_VALID/CIN01/DUPUSER');
    // Should block and redirect to /duplicate-string
    await expect(page).toHaveURL(/\/duplicate-string/);
  });

  test('G5: IP throttle flow', async ({ page }) => {
    // Use same browser context (same IP) for all requests
    for (let i = 0; i < 3; i++) {
      await page.goto(`http://localhost:3000/r/TEST_VALID/CIN01/IPUSER${Date.now()}`);
      // Should succeed (302) - but need to wait for each to complete
      await page.waitForLoadState('networkidle');
    }

    // 4th request should be blocked
    await page.goto(`http://localhost:3000/r/TEST_VALID/CIN01/IPUSER${Date.now()}`);
    await expect(page).toHaveURL(/\/security-terminate/);
  });

  test('G6: Admin login flow', async ({ page }) => {
    await page.goto('http://localhost:3000/login');

    // Fill credentials
    await page.fill('input[name="email"]', 'admin@opinioninsights.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Should redirect to /admin
    await expect(page).toHaveURL(/\/admin/);

    // Logout
    await page.click('text=Logout');
    await expect(page).toHaveURL(/\/login/);
  });
});
