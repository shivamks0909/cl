import { test, expect } from '@playwright/test';

test.describe('Production UAT - Settings', () => {

  test('should navigate to settings page with Security Settings', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@opinioninsights.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin/dashboard');

    // Click Settings in sidebar
    await page.click('text=Settings');
    await expect(page).toHaveURL('/admin/settings');
    
    // Verify Security Settings section is visible
    await expect(page.locator('text=Security Settings')).toBeVisible();
    await expect(page.locator('text=Manage your admin credentials')).toBeVisible();
  });

  test('should show credential regeneration form fields', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@opinioninsights.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin/dashboard');

    await page.click('text=Settings');
    await expect(page).toHaveURL('/admin/settings');
    
    // Verify form fields exist
    await expect(page.locator('text=Current Username')).toBeVisible();
    await expect(page.locator('text=New Username')).toBeVisible();
    await expect(page.locator('text=New Password')).toBeVisible();
    await expect(page.locator('text=Confirm Password')).toBeVisible();
    
    // Verify buttons exist
    await expect(page.locator('text=Generate Strong Password')).toBeVisible();
    await expect(page.locator('text=Save Credentials')).toBeVisible();
  });

  test('should generate strong password', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@opinioninsights.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin/dashboard');

    await page.click('text=Settings');
    await expect(page).toHaveURL('/admin/settings');
    
    // Click generate password button
    await page.click('text=Generate Strong Password');
    
    // Should show generated password
    await expect(page.locator('text=Generated Password:')).toBeVisible();
    await expect(page.locator('text=Save this password somewhere safe!')).toBeVisible();
  });

  test('should validate empty fields', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@opinioninsights.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin/dashboard');

    await page.click('text=Settings');
    await expect(page).toHaveURL('/admin/settings');
    
    // Clear fields and try to save
    await page.locator('input[placeholder="Enter new password"]').fill('');
    await page.locator('text=Save Credentials').click();
    
    // Should show validation error
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should show password requirements', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@opinioninsights.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin/dashboard');

    await page.click('text=Settings');
    await expect(page).toHaveURL('/admin/settings');
    
    // Verify password requirements section exists
    await expect(page.locator('text=Password Requirements:')).toBeVisible();
    await expect(page.locator('text=At least 10 characters')).toBeVisible();
    await expect(page.locator('text=One uppercase letter')).toBeVisible();
    await expect(page.locator('text=One lowercase letter')).toBeVisible();
    await expect(page.locator('text=One number')).toBeVisible();
    await expect(page.locator('text=One special character')).toBeVisible();
  });
});
