import { test, expect } from '@playwright/test';

test.describe('Production UAT - Response Table', () => {

  test('should display responses table with correct columns', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@opinioninsights.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin/dashboard');

    // Navigate to Responses
    await page.click('text=Responses');
    await expect(page).toHaveURL('/admin/responses');

    // Check table headers exist using exact columnheader role
    const headers = [
      'Supplier UID (Incoming)',
      'Supplier',
      'Client UID Sent',
      'Project',
      'IP Address',
      'Device',
      'User Agent',
      'Status',
      'Timestamp'
    ];

    for (const header of headers) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible({ timeout: 5000 });
    }

    // Table should be present
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });

  test('filter controls should work', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@opinioninsights.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin/dashboard');

    await page.click('text=Responses');
    await expect(page).toHaveURL('/admin/responses');

    // Check filter inputs exist
    await expect(page.locator('input[name="ip"]')).toBeVisible();
    await expect(page.locator('select[name="status"]')).toBeVisible();
    await expect(page.locator('select[name="device_type"]')).toBeVisible();
    await expect(page.locator('button:has-text("Filter")')).toBeVisible();
  });
});
