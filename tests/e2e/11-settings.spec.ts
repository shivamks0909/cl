import { test, expect } from '@playwright/test';

test.describe('Production UAT - Settings', () => {

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@opinioninsights.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin/dashboard');

    // Click Settings in sidebar
    await page.click('text=Settings');
    await expect(page).toHaveURL('/admin/settings');
    await expect(page.locator('text=Admin settings functionality coming soon.')).toBeVisible();
  });
});
