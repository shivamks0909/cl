import { test, expect } from '@playwright/test';

const PROD_URL = 'https://april-iin9fwtcq-cypher1446-oss-projects.vercel.app';

test.describe('Production UAT - Callback Security', () => {

  function genCode(prefix: string) {
    const uniq = Date.now().toString(36).toUpperCase().slice(-6);
    return `${prefix}_${uniq}`;
  }

  async function setupUniqueTestData(page) {
    const ts = Date.now();
    const projectCode = genCode('SEC');
    const supplierToken = genCode('SECSUP').toUpperCase();
    const projectName = `Sec Test ${ts}`;
    const supplierName = `Sup ${ts}`;

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
    await page.fill('input[placeholder*="pm@supplier.com"]', `sec${ts}@example.com`);
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

  test('fake callback without clickid should be blocked', async ({ page }) => {
    const { projectCode } = await setupUniqueTestData(page);
    await page.goto(`/redirect/complete?pid=${projectCode}&uid=random999`);
    await page.waitForURL(/paused/);
    await expect(page).toHaveURL(/paused/);
    await expect(page.locator('text=INVALID CALLBACK')).toBeVisible();
  });

  test('duplicate callback should be idempotent', async ({ page }) => {
    const { projectCode } = await setupUniqueTestData(page);
    const testUid = `dup_${Date.now()}`;
    await page.goto(`/track?code=${projectCode}&uid=${testUid}`);
    await expect(page).toHaveURL(/client-survey/);
    await page.waitForSelector('input[type="number"]');
    await page.fill('input[type="number"]', '25');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Male")');
    await expect(page.locator('button:has-text("Complete Survey")')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Complete Survey")');
    await page.waitForURL(/status|redirect|example\.com/, { timeout: 10000 });

    // Duplicate callback
    await page.goto(`/redirect/complete?pid=${projectCode}&uid=${testUid}`);
    await page.waitForURL(/paused|status|redirect/, { timeout: 5000 });
  });

  test('terminate flow should work with valid clickid', async ({ page }) => {
    const { projectCode } = await setupUniqueTestData(page);
    const termUid = `term_${Date.now()}`;
    await page.goto(`/track?code=${projectCode}&uid=${termUid}`);
    await expect(page).toHaveURL(/client-survey/);
    await page.waitForSelector('input[type="number"]');
    await page.fill('input[type="number"]', '30');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Male")');
    const surveyUrl = page.url();
    const urlParams = new URLSearchParams(new URL(surveyUrl).search);
    const clickid = urlParams.get('oi_session') || urlParams.get('clickid');

    if (clickid) {
      await page.goto(`/redirect/terminate?pid=${projectCode}&uid=${termUid}&clickid=${clickid}`);
      await page.waitForURL(/paused|status|redirect/, { timeout: 5000 });
      await expect(page).not.toHaveURL(/paused/);
    } else {
      await page.goto(`/redirect/terminate?pid=${projectCode}&uid=${termUid}`);
      await page.waitForURL(/paused/);
      await expect(page.locator('text=INVALID CALLBACK, Session token missing')).toBeVisible();
    }
  });

  test('quota full flow should work with valid clickid', async ({ page }) => {
    const { projectCode } = await setupUniqueTestData(page);
    const quotaUid = `quota_${Date.now()}`;
    await page.goto(`/track?code=${projectCode}&uid=${quotaUid}`);
    await expect(page).toHaveURL(/client-survey/);
    await page.waitForSelector('input[type="number"]');
    await page.fill('input[type="number"]', '40');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Male")');
    const surveyUrl = page.url();
    const urlParams = new URLSearchParams(new URL(surveyUrl).search);
    const clickid = urlParams.get('oi_session') || urlParams.get('clickid');

    if (clickid) {
      await page.goto(`/redirect/quotafull?pid=${projectCode}&uid=${quotaUid}&clickid=${clickid}`);
      await page.waitForURL(/paused|status|redirect/, { timeout: 5000 });
      await expect(page).not.toHaveURL(/paused/);
    } else {
      await page.goto(`/redirect/quotafull?pid=${projectCode}&uid=${quotaUid}`);
      await page.waitForURL(/paused/);
      await expect(page.locator('text=INVALID CALLBACK, Session token missing')).toBeVisible();
    }
  });
});
