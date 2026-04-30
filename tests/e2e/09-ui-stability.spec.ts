import { test, expect } from '@playwright/test';

test.describe('Production UAT - UI Stability & Bug Hunt', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@opinioninsights.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin/dashboard');
  });

  test('should have no broken buttons', async ({ page }) => {
    // Already on dashboard after login
    const buttons = page.locator('button, [role="button"]');
    const count = await buttons.count();
    
    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      if (await btn.isVisible()) {
        await expect(btn).not.toHaveAttribute('disabled');
      }
    }
  });

  test('should have no infinite loading spinners', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const spinners = page.locator('[class*="spinner"], [class*="loading"]');
    expect(await spinners.count()).toBe(0);
  });

  test('should have no blank pages', async ({ page }) => {
    // The main content should be visible
    await expect(page.locator('main').first()).toBeVisible();
  });

  test('should have no raw code display errors', async ({ page }) => {
    const errors = page.locator('text=[object Object], text=TypeError, text=Uncaught');
    await expect(errors).toHaveCount(0);
  });

  test('page load times should be acceptable', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/admin/dashboard'); // reload to measure load
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000);
  });

  test('navigation should work', async ({ page }) => {
    const navLinks = page.locator('nav a, a[href*="/admin"]');
    const linkCount = await navLinks.count();
    
    for (let i = 0; i < Math.min(linkCount, 5); i++) {
      const link = navLinks.nth(i);
      const href = await link.getAttribute('href');
      if (href && !href.startsWith('http') && !href.startsWith('#') && !href.includes('logout')) {
        await link.click();
        await page.waitForLoadState('domcontentloaded');
        await expect(page.locator('body')).not.toContainText('404');
      }
    }
  });

  test('should handle mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/admin/dashboard'); // go to dashboard after login? Actually need to login again; but we can just go to page that is not yet logged. We need to login for mobile as well. Use a separate login or keep earlier login? After beforeEach, we are already on dashboard. So this test can just check something after resizing.
    // Simpler: verify that after viewport change, main content still visible
    await expect(page.locator('main')).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 720 });
  });
});
