import { test, expect } from '@playwright/test';

test.describe('Production UAT - Clients', () => {

  test('should create new client', async ({ page }) => {
    const timestamp = Date.now();
    const clientName = `TEST_CLIENT_${timestamp}`;

    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@opinioninsights.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin/dashboard');

    // Navigate to Clients
    await page.click('text=Clients');
    await expect(page).toHaveURL('/admin/clients');

    // Fill and submit client form
    await page.fill('input[placeholder*="Client Name"]', clientName);
    await page.click('button:has-text("Add Client")');

    // Verify client appears in list
    await expect(page.locator(`text=${clientName}`)).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to clients page', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@opinioninsights.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin/dashboard');

    await page.click('text=Clients');
    await expect(page).toHaveURL('/admin/clients');
    await expect(page.locator('text=Client Management')).toBeVisible();
  });
});
