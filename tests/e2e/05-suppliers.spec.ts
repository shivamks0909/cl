import { test, expect } from '@playwright/test';

test.describe('Production UAT - Suppliers', () => {

  test('should create new supplier', async ({ page }) => {
    const timestamp = Date.now();
    const supplierName = `TEST_SUPPLIER_${timestamp}`;
    const supplierToken = `TESTSUP_${timestamp}`.toUpperCase();

    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@opinioninsights.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin/dashboard');

    // Navigate to suppliers
    await page.click('text=Suppliers');
    await expect(page).toHaveURL('/admin/suppliers');

    // Click "Add New Supplier"
    await page.click('button:has-text("Add New Supplier")');

    // Fill form
    await page.fill('input[placeholder*="MackInsights"]', supplierName);
    await page.fill('input[placeholder*="MACK / DYN"]', supplierToken);
    await page.fill('input[placeholder*="[uid]"]', '[uid]'); // UID Macro
    await page.fill('input[placeholder*="pm@supplier.com"]', `test${timestamp}@example.com`);
    
    // Redirect URLs
    await page.fill('input[placeholder*="mackinsights.com/status?type=complete"]', 'https://example.com/complete');
    await page.fill('input[placeholder*="mackinsights.com/status?type=terminate"]', 'https://example.com/terminate');
    await page.fill('input[placeholder*="mackinsights.com/status?type=quotafull"]', 'https://example.com/quotafull');

    // Submit
    await page.click('button:has-text("Save Supplier")');

    // Verify supplier created
    await expect(page.locator(`text=${supplierName}`)).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to suppliers page', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@opinioninsights.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin/dashboard');

    await page.click('text=Suppliers');
    await expect(page).toHaveURL('/admin/suppliers');
    await expect(page.locator('text=Supplier Management')).toBeVisible();
  });
});
