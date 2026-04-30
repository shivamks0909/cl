import { test, expect } from '@playwright/test';

test.describe('Production UAT - Audit Logs', () => {

  test('should navigate to audit logs page', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@opinioninsights.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin/dashboard');

    // Navigate using sidebar link
    await page.getByRole('link', { name: 'Audit Logs' }).click();
    await expect(page).toHaveURL('/admin/audit-logs');
    await expect(page.getByRole('heading', { name: 'Audit Logs' })).toBeVisible();
    await expect(page.locator('text=System-wide event tracking')).toBeVisible();
  });

  test('should display audit logs table', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@opinioninsights.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin/dashboard');

    await page.getByRole('link', { name: 'Audit Logs' }).click();
    await expect(page).toHaveURL('/admin/audit-logs');

    // Check table columns exist
    const headers = ['Action', 'Admin', 'Timestamp', 'IP Address', 'Details'];
    for (const header of headers) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
    }
  });

  test('should load logs with filters', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@opinioninsights.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin/dashboard');

    await page.getByRole('link', { name: 'Audit Logs' }).click();
    await expect(page).toHaveURL('/admin/audit-logs');

    // Filter controls
    await expect(page.locator('select[name="action"]')).toBeVisible();
    await expect(page.locator('input[name="admin"]')).toBeVisible();
    await expect(page.locator('button:has-text("Apply Filters")')).toBeVisible();
  });
});
