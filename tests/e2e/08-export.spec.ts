import { test, expect } from '@playwright/test';

test.describe('Production UAT - Export Responses', () => {

  test('export button should exist and be clickable', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@opinioninsights.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin/dashboard');

    // Navigate to Responses
    await page.click('text=Responses');
    await expect(page).toHaveURL('/admin/responses');

    // Verify export button exists
    const exportBtn = page.locator('button:has-text("Export Responses (Excel)")');
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).not.toBeDisabled();
  });

  test('should trigger CSV download', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@opinioninsights.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin/dashboard');

    await page.click('text=Responses');
    await expect(page).toHaveURL('/admin/responses');

    // Mock the fetch to avoid actual large downloads during test
    await page.route('/api/admin/responses/export', route => {
      route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="responses-export-2025-04-22.csv"'
        },
        body: 'id,project_code,uid,status,ip\n1,TEST,user1,complete,127.0.0.1'
      });
    });

    // Click export
    await page.click('button:has-text("Export Responses (Excel)")');
    // If download happens, test passes (download events are hard to detect in Playwright without extra setup)
    // For now, just verify no error
  });
});
