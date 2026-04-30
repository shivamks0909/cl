import { test, expect } from '@playwright/test';

const PROD_URL = 'https://april-iin9fwtcq-cypher1446-oss-projects.vercel.app';

test.describe('Production UAT - Projects', () => {

  function genCode(prefix: string) {
    const uniq = Date.now().toString(36).toUpperCase().slice(-6);
    return `${prefix}_${uniq}`;
  }

  test('should create new project', async ({ page }) => {
    const projectCode = genCode('TESTPROJ');
    const projectName = `Test Project ${Date.now()}`;

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
    // Use full survey URL
    await page.fill('input[type="url"]', `${PROD_URL}/client-survey`);

    await page.click('button:has-text("Deploy Enterprise Route")');
    await expect(page.locator(`text=${projectCode}`)).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to projects page', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@opinioninsights.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin/dashboard');

    await page.click('text=Projects');
    await expect(page).toHaveURL('/admin/projects');
    await expect(page.locator('text=Project Management')).toBeVisible();
  });
});
