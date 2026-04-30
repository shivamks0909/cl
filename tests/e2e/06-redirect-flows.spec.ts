import { test, expect } from '@playwright/test';

const PROD_URL = 'https://april-iin9fwtcq-cypher1446-oss-projects.vercel.app';

test.describe('Production UAT - Redirect Flows', () => {

  function genCode(prefix: string) {
    const uniq = Date.now().toString(36).toUpperCase().slice(-6);
    return `${prefix}_${uniq}`;
  }

  async function setupUniqueTestData(page) {
    const ts = Date.now();
    const projectCode = genCode('RDP');
    const supplierToken = genCode('RDS').toUpperCase();
    const projectName = `Redirect Test ${ts}`;
    const supplierName = `Supplier ${ts}`;

    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@opinioninsights.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin/dashboard');

    // Create project
    await page.click('text=Projects');
    await expect(page).toHaveURL('/admin/projects');

    const clientSelect = page.locator('select').first();
    await clientSelect.click();
    await clientSelect.selectOption({ index: 1 });

    await page.fill('input[placeholder*="Samsung Galaxy"]', projectName);
    await page.fill('input[placeholder*="SAMSUNG_S24"]', projectCode);
    await page.fill('input[type="url"]', `${PROD_URL}/client-survey`);
    await page.click('button:has-text("Deploy Enterprise Route")');
    await expect(page.locator(`text=${projectCode}`)).toBeVisible({ timeout: 10000 });

    // Create supplier
    await page.click('text=Suppliers');
    await expect(page).toHaveURL('/admin/suppliers');
    await page.click('button:has-text("Add New Supplier")');
    await page.fill('input[placeholder*="MackInsights"]', supplierName);
    await page.fill('input[placeholder*="MACK / DYN"]', supplierToken);
    await page.fill('input[placeholder*="[uid]"]', '[uid]');
    await page.fill('input[placeholder*="pm@supplier.com"]', `test${ts}@example.com`);
    await page.fill('input[placeholder*="mackinsights.com/status?type=complete"]', 'https://example.com/complete');
    await page.fill('input[placeholder*="mackinsights.com/status?type=terminate"]', 'https://example.com/terminate');
    await page.fill('input[placeholder*="mackinsights.com/status?type=quotafull"]', 'https://example.com/quotafull');
    await page.click('button:has-text("Save Supplier")');
    await expect(page.locator(`text=${supplierName}`)).toBeVisible({ timeout: 10000 });

    // Logout
    await page.click('button:has-text("SIGN OUT")');
    await expect(page).toHaveURL('/login');

    return { projectCode, supplierToken };
  }

  test('should execute direct tracking link flow', async ({ page }) => {
    const { projectCode } = await setupUniqueTestData(page);
    await page.goto(`/track?code=${projectCode}&uid=testuser01`);
    await expect(page).toHaveURL(/client-survey/);
    await page.waitForSelector('input[type="number"]');
    await page.fill('input[type="number"]', '25');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Male")');
    await expect(page.locator('button:has-text("Complete Survey")')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Complete Survey")');
    await page.waitForURL(/status|redirect|example\.com/, { timeout: 10000 });
    await expect(page.locator('main, [class*="outcome"]')).toBeVisible({ timeout: 10000 });
  });

  test('direct flow should NOT open supplier landing page', async ({ page }) => {
    const { projectCode } = await setupUniqueTestData(page);
    await page.goto(`/track?code=${projectCode}&uid=testuser02`);
    await page.waitForSelector('input[type="number"]');
    await page.fill('input[type="number"]', '30');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Male")');
    await page.click('button:has-text("Complete Survey")');
    await expect(page).not.toHaveURL(/r\/.*supplier/);
  });

  test('should execute supplier tracking link flow', async ({ page }) => {
    const { projectCode, supplierToken } = await setupUniqueTestData(page);
    await page.goto(`/r/${projectCode}/${supplierToken}/suppliertest01`);
    await expect(page).toHaveURL(/client-survey/);
    await page.waitForSelector('input[type="number"]');
    await page.fill('input[type="number"]', '35');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Male")');
    await expect(page.locator('button:has-text("Complete Survey")')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Complete Survey")');
    await page.waitForURL(/status|redirect|example\.com/, { timeout: 10000 });
    await expect(page.locator('main, [class*="outcome"]')).toBeVisible({ timeout: 10000 });
  });

  test('supplier flow should NOT open direct tracking link flow', async ({ page }) => {
    const { projectCode, supplierToken } = await setupUniqueTestData(page);
    await page.goto(`/r/${projectCode}/${supplierToken}/suppliertest02`);
    await page.waitForSelector('input[type="number"]');
    await page.fill('input[type="number"]', '40');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Female")');
    await page.click('button:has-text("Complete Survey")');
    await expect(page).not.toHaveURL(/track\?/);
  });
});
