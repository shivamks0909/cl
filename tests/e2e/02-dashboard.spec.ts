import { test, expect } from '@playwright/test';

test.describe('Production UAT - Dashboard', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@opinioninsights.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin/dashboard');
  });

  test('should load dashboard quickly (< 5s)', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL('/admin/dashboard');
    await expect(page.locator('text=Intelligence Command')).toBeVisible();
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000);
  });

  test('should display stats cards correctly', async ({ page }) => {
    await page.goto('/admin/dashboard');
    
    // Stats cards appear multiple times per card; use .first() to avoid strict mode errors
    await expect(page.locator('text=Total Clicks').first()).toBeVisible();
    await expect(page.locator('text=Completes').first()).toBeVisible();
    await expect(page.locator('text=In Progress').first()).toBeVisible();
    await expect(page.locator('text=Conversion').first()).toBeVisible();
    await expect(page.locator('text=Quota Full').first()).toBeVisible();
    await expect(page.locator('text=Duplicates').first()).toBeVisible();
    await expect(page.locator('text=Security').first()).toBeVisible();
    await expect(page.locator('text=Projects').first()).toBeVisible();
  });

  test('should show recent activity', async ({ page }) => {
    await page.goto('/admin/dashboard');
    
    // The Live Activity component heading is "Live Activity"
    await expect(page.locator('text=Live Activity')).toBeVisible({ timeout: 10000 });
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('/admin/dashboard');
    
    // Use precise navigation link selectors
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Projects' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Suppliers' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Responses' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Audit Logs' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
  });
});
