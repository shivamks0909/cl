import { test, expect } from '@playwright/test';

const PROD_URL = 'https://april-iin9fwtcq-cypher1446-oss-projects.vercel.app';

test.describe('Production UAT - PID Generation as UID Feature', () => {

  function genCode(prefix: string) {
    const uniq = Date.now().toString(36).toUpperCase().slice(-6);
    return `${prefix}_${uniq}`;
  }

  test('should generate PID and use it as UID when enabled', async ({ page }) => {
    const projectCode = genCode('PID');
    const projectName = `PID Test ${Date.now()}`;

    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@opinioninsights.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin/dashboard');

    await page.click('text=Projects');
    await expect(page).toHaveURL('/admin/projects');

    const clientSelect = page.locator('select').first();
    await clientSelect.click();
    await clientSelect.selectOption({ index: 1 });

    await page.fill('input[placeholder*="Samsung Galaxy"]', projectName);
    await page.fill('input[placeholder*="SAMSUNG_S24"]', projectCode);

    // PID configuration
    await page.fill('input[placeholder="OPGH"]', 'PIDT');
    // Padding: select 4 (index 3)
    await page.selectOption('select:has-text("1")', { index: 3 });
    // Use full internal survey page
    await page.fill('input[type="url"]', `${PROD_URL}/client-survey`);

    // Toggle enabled
    await page.getByTestId('force-pid-as-uid-toggle').click();

    await page.click('button:has-text("Deploy Enterprise Route")');
    await expect(page.locator(`text=${projectCode}`)).toBeVisible({ timeout: 10000 });

    // Simulate direct flow
    await page.click('button:has-text("SIGN OUT")');

    await page.goto(`/track?code=${projectCode}&uid=anyuser`);
    await page.waitForURL(/client-survey/);
    await page.waitForSelector('input[type="number"]');
    await page.fill('input[type="number"]', '30');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Male")');
    await expect(page.locator('button:has-text("Complete Survey")')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Complete Survey")');

    await page.waitForURL(/status|redirect|example\.com/, { timeout: 10000 });
    await expect(page.locator('main, [class*="outcome"]')).toBeVisible({ timeout: 10000 });
  });
});
