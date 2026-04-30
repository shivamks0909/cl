import { test, expect } from '@playwright/test';

test.describe('Production UAT - Login & Authentication', () => {

  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL('/login');
    await expect(page.locator('text=Admin Login')).toBeVisible();
    await expect(page.locator('[name="email"]')).toBeVisible();
    await expect(page.locator('[name="password"]')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@opinioninsights.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/admin/dashboard');
    await expect(page.locator('text=Intelligence Command')).toBeVisible();
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'wrong@email.com');
    await page.fill('[name="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    
    // Should stay on login page and show error
    await expect(page).toHaveURL('/login');
    // Error appears in red text
    const errorDiv = page.locator('.text-red-600').first();
    await expect(errorDiv).toBeVisible();
  });

  test('should persist session after refresh', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@opinioninsights.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin/dashboard');

    // Refresh the page
    await page.reload();
    await expect(page).toHaveURL('/admin/dashboard');
    await expect(page.locator('text=Intelligence Command')).toBeVisible();
  });

  test('should redirect unauthenticated user to login', async ({ page }) => {
    // Clear cookies to ensure no auth
    await page.context().clearCookies();
    
    // Try to access protected route
    await page.goto('/admin/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test('should logout successfully', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@opinioninsights.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin/dashboard');

    // Find and click logout button - text is "SIGN OUT"
    await page.click('button:has-text("SIGN OUT")');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });
});
